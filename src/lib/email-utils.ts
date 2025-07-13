import Imap from 'imap'
import { ParsedMail, simpleParser } from 'mailparser'
import JSZip from 'jszip'
import { parse } from 'csv-parse'
import { decode } from 'iconv-lite'
import {
  EmailInfo,
  AttachmentInfo,
  BillEmail,
  EmailProvider,
  EMAIL_PROVIDERS,
  CSVParseResult,
  EmailSearchOptions
} from '@/types/email'
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

          console.log('Parsed email:', parsed)

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

          console.log('Parsed email header:', emailInfo)

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
          console.log('Parsed email:', parsed || '')

          resolve(parsed.text || '')
        })
      })
    })

    fetch.once('error', reject)
  })
}

export async function extractZipFile(zipFilePath: string, password?: string): Promise<{ filename: string; content: Buffer }[]> {
  const zip = new JSZip()

  const fileContent = await fs.promises.readFile(zipFilePath)

  try {
    const loaded = await zip.loadAsync(fileContent, { password: password })

    const files: { filename: string; content: Buffer }[] = []

    for (const filename in loaded.files) {
      const file = loaded.files[filename]
      if (!file.dir) {
        try {
          const content = await file.async('nodebuffer')
          files.push({ filename, content })
        } catch (error) {
          // 如果提供了密码，说明可能是加密的zip文件
          if (password) {
            throw new Error(`需要密码解压文件: ${filename}`)
          }
          throw error
        }
      }
    }

    return files
  } catch (error) {
    if (password) {
      throw new Error('解压缩失败，请检查密码是否正确')
    }
    throw error
  }
}

export async function parseCSV(csvBuffer: Buffer, filename: string): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    let csvContent: string

    // 检测文件编码并转换
    if (filename.toLowerCase().includes('alipay') || filename.toLowerCase().includes('zhifubao')) {
      // 支付宝账单通常使用 GBK 编码
      csvContent = decode(csvBuffer, 'gbk')
    } else if (filename.toLowerCase().includes('wechat') || filename.toLowerCase().includes('weixin')) {
      // 微信账单通常使用 UTF-8 编码
      csvContent = decode(csvBuffer, 'utf8')
    } else {
      // 默认尝试 UTF-8，如果失败则尝试 GBK
      try {
        csvContent = decode(csvBuffer, 'utf8')
      } catch {
        csvContent = decode(csvBuffer, 'gbk')
      }
    }

    const data: any[] = []
    let headers: string[] = []

    const parser = parse({
      columns: false,
      skip_empty_lines: true,
      trim: true,
    })

    parser.on('readable', function () {
      let record
      while (record = parser.read()) {
        if (data.length === 0) {
          // 第一行作为标题
          headers = record
        } else {
          // 将数据转换为对象
          const rowData: any = {}
          headers.forEach((header, index) => {
            rowData[header] = record[index] || ''
          })
          data.push(rowData)
        }
      }
    })

    parser.on('error', reject)

    parser.on('end', () => {
      resolve({
        headers,
        data,
        rowCount: data.length
      })
    })

    parser.write(csvContent)
    parser.end()
  })
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

export function validateCSVData(data: any[], provider: EmailProvider): boolean {
  if (!data || data.length === 0) return false

  const firstRow = data[0]

  if (provider === 'alipay') {
    // 支付宝账单应该包含这些字段
    const requiredFields = ['商户订单号', '交易号', '交易时间', '付款方式', '交易金额', '交易状态']
    return requiredFields.some(field => field in firstRow)
  } else if (provider === 'wechat') {
    // 微信账单应该包含这些字段
    const requiredFields = ['交易时间', '交易类型', '交易对方', '商品', '收/支', '金额', '支付方式', '交易状态']
    return requiredFields.some(field => field in firstRow)
  }

  return true
}

export async function downloadZipFile(imap: any, uid: string, provider: EmailProvider): Promise<string> {
  const emailInfo = await parseEmailHeader(imap, uid)
  const emailContent = await getEmailContent(imap, uid)
  let file = await EMAIL_PROVIDERS[provider].downloadAttachment(emailInfo, emailContent)

  if (!file.endsWith('.zip')) {
    await fs.promises.rename(file, `${file}.zip`)
    file = `${file}.zip`
  }

  return file
}

export async function downloadFile(url: string, dir: string): Promise<string> {
  const resp = await axios.get(url, {
    responseType: 'blob',
  });

  const dummyFilename = Date.now().toString()
  const filename = url.split('/').pop() || dummyFilename
  const filePath = `${dir}/${filename}`;

  await fs.promises.writeFile(filePath, resp.data)
  return filePath
}