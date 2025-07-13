import Imap from 'imap'
import { simpleParser } from 'mailparser'
import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js'
import {
  EmailInfo,
  BillEmail,
  EmailProvider,
  EMAIL_PROVIDERS,
  EmailSearchOptions
} from '@/types/email'
import * as XLSX from 'xlsx';
import { Stream } from 'stream'
import axios from 'axios'
import fs from 'fs'

export async function parseEmailHeader(imap: Imap, uid: string): Promise<EmailInfo> {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch(uid, { bodies: 'HEADER' })

    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        simpleParser(stream as unknown as Stream, (err, parsed) => {
          if (err) {
            console.error('Error parsing email header:', err)
            reject(err)
            return
          }

          // console.log('Parsed email:', parsed)

          const emailInfo: EmailInfo = {
            uid,
            subject: parsed.subject || '',
            from: parsed.from?.text || '',
            date: parsed.date || new Date(),
            hasAttachments: parsed.attachments.length > 0,
            attachments: parsed.attachments.map(att => ({
              filename: att.filename || '',
              size: att.size || 0,
              contentType: att.contentType || '',
              cid: att.cid,
              disposition: att.disposition,
            }))
          }

          // console.log('Parsed email header:', emailInfo)

          resolve(emailInfo)
        })
      })
    })

    fetch.once('error', reject)
  })
}

export async function getEmailAttachments(imap: Imap, uid: string): Promise<{ filename: string; content: Buffer }[]> {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch(uid, { bodies: '' })

    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        parseMailParser(stream, (err, parsed) => {
          if (err) {
            reject(err)
            return
          }

          const attachments = parsed.attachments.map(att => ({
            filename: att.filename || '',
            content: att.content as Buffer
          }))

          resolve(attachments)
        })
      })
    })

    fetch.once('error', reject)
  })
}

export async function getEmailContent(imap: Imap, uid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch(uid, { bodies: '' })

    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        simpleParser(stream as unknown as Stream, (err, parsed) => {
          if (err) {
            reject(err)
            return
          }
          // console.log('Parsed email:', parsed || '')

          resolve(parsed.html || '')
        })
      })
    })

    fetch.once('error', reject)
  })
}

export function xlsxToCsv(xlsxPath: string, csvPath: string, sheetName?: string): void {
  // 读取XLSX文件
  const workbook = XLSX.readFile(xlsxPath);

  // 获取工作表名称（如果未指定，使用第一个）
  const wsName = sheetName || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[wsName];

  // 转换为CSV
  const csvData = XLSX.utils.sheet_to_csv(worksheet);

  // 写入CSV文件
  fs.writeFileSync(csvPath, csvData, 'utf8');
}

export function xlsxBufferToCsv(buffer: Buffer, sheetName?: string): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const wsName = sheetName || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[wsName];

  return XLSX.utils.sheet_to_csv(worksheet);
}

export async function extractZipFile(zipFilePath: string, password?: string): Promise<string | null> {
  try {
    const fileContent = await fs.promises.readFile(zipFilePath)
    const zipReader = new ZipReader(new BlobReader(new Blob([fileContent])), { password })
    const entries = await zipReader.getEntries()

    const files: { filename: string; content: Buffer }[] = []

    for (const entry of entries) {
      const filename = entry.filename
      if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls') && !filename.endsWith('.csv')) {
        continue
      }

      console.log(`entry file: ${entry.filename}`)

      let bufWritter = new BlobWriter()
      const data = await entry.getData?.(bufWritter)
      if (data) {
        const dataBuffer = await data.bytes()
        console.log(`dataBuffer: ${dataBuffer.length} bytes`)
        const csv = xlsxBufferToCsv(Buffer.from(dataBuffer))
        console.log(`csv: ${csv.length} bytes`)

        const csvFilePath = zipFilePath.replace('.zip', '.csv')
        fs.writeFileSync(csvFilePath, csv, 'utf8')
        return csvFilePath
      } else {
        console.log(`entry file: ${entry.filename} data is null`)
        return null
      }
    }
  } catch (error) {
    if (password) {
      throw new Error('解压缩失败，请检查密码是否正确')
    }
    throw error
  }

  return null
}

export function identifyBillEmailProvider(email: EmailInfo): EmailProvider | null {
  for (const [provider, config] of Object.entries(EMAIL_PROVIDERS)) {
    const providerConfig = config as any

    // 检查发件人
    if (providerConfig.fromPattern.test(email.from)) {
      return provider as EmailProvider
    }

    // 检查主题
    if (providerConfig.subjectPattern.test(email.subject)) {
      return provider as EmailProvider
    }
  }

  return null
}

export function isBillEmail(email: EmailInfo): boolean {
  const provider = identifyBillEmailProvider(email)
  return provider as EmailProvider ? true : false
}

export async function searchBillEmails(imap: Imap, options: EmailSearchOptions = {}): Promise<BillEmail[]> {
  return new Promise((resolve, reject) => {
    const searchCriteria: any[] = [['FROM', 'wechatpay@tencent.com']]

    if (options.since) {
      searchCriteria.push(['SINCE', options.since])
    }

    if (options.before) {
      searchCriteria.push(['BEFORE', options.before])
    }

    if (options.hasAttachments) {
      // searchCriteria.push('HEADER')
    }

    imap.search(searchCriteria, async (err, results) => {
      if (err) {
        reject(err)
        return
      }

      if (!results || results.length === 0) {
        resolve([])
        return
      }

      try {
        const billEmails: BillEmail[] = []

        for (const uid of results) {
          console.log('uid ', uid)
          const emailInfo = await parseEmailHeader(imap, uid.toString())

          if (isBillEmail(emailInfo)) {
            const provider = identifyBillEmailProvider(emailInfo)
            if (provider) {
              billEmails.push({
                uid: emailInfo.uid,
                subject: emailInfo.subject,
                from: emailInfo.from,
                date: emailInfo.date,
                provider,
                attachments: emailInfo.attachments
              })
            }
          }
        }

        resolve(billEmails)
      } catch (error) {
        reject(error)
      }
    })
  })
}

export async function downloadZipFile(imap: any, uid: string, provider: EmailProvider): Promise<string> {
  const emailInfo = await parseEmailHeader(imap, uid)
  const emailContent = await getEmailContent(imap, uid)
  // console.log(`emailInfo: ${emailInfo}, emailContent: ${emailContent}`)
  let file = await EMAIL_PROVIDERS[provider].downloadAttachment(emailInfo, emailContent)

  if (!file.endsWith('.zip')) {
    await fs.promises.rename(file, `${file}.zip`)
    file = `${file}.zip`
  }

  return file
}

export async function downloadFile(url: string, dir: string, filename: string): Promise<string> {
  const resp = await axios.get(url, {
    responseType: 'arraybuffer',
  });

  console.log(`download file bytes: ${resp.data.length}`)
  const filePath = `${dir}/${filename}`;

  const buf = new Uint8Array(resp.data)
  await fs.promises.writeFile(filePath, buf)

  console.log(`downloadFile: ${filePath}`)
  return filePath
}