import { downloadFile } from "@/lib/email-utils"
import fs from "fs"

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
}

export interface EmailInfo {
  uid: string
  subject: string
  from: string
  date: Date
  hasAttachments: boolean
  attachments: AttachmentInfo[]
}

export interface AttachmentInfo {
  filename: string
  size: number
  contentType: string
  cid?: string
  disposition?: string
  content?: Buffer
}

export interface BillEmail {
  uid: string
  subject: string
  from: string
  date: Date
  provider: 'wechatpay' | 'alipay'
  attachments: AttachmentInfo[]
}

export interface EmailSearchOptions {
  since?: Date
  before?: Date
  hasAttachments?: boolean
}

export interface EmailSearchResponse {
  success: boolean
  message: string
  data?: BillEmail[]
}

export interface EmailDownloadResponse {
  success: boolean
  message: string
  data?: any
}

export interface EmailContentInfo {
  uid: string
  subject: string
  from: string
  date: Date
  content: string
  hasAttachments: boolean
  attachments: AttachmentInfo[]
}

export type EmailProvider = 'wechatpay' | 'alipay'

export interface EmailProviderConfig {
  name: string
  fromPattern?: RegExp,
  subjectPattern?: RegExp,
  downloadAttachment: ( emailInfo: EmailInfo, emailContent: string ) => Promise<string>
}

export const EMAIL_PROVIDERS: Record<EmailProvider, EmailProviderConfig> = {
  wechatpay: {
    name: '微信支付',
    fromPattern: /wechatpay/i,
    downloadAttachment: async (emailInfo: EmailInfo, emailContent: string) => {
      // extract the url from the html a tag
      const urlMatch = emailContent.match(/<a href="([^"]+)"[\s\S]+?>[\s\S]+?点击下载/);
      // console.log(`urlMatch: ${urlMatch}`)
      if (urlMatch && urlMatch[1]) {
        const downloadUrl = urlMatch[1];
        console.log(`下载链接: ${downloadUrl}`);
        
        // download the file using axios
        const file = await downloadFile(downloadUrl, "tmp", emailInfo.subject + ".zip")
        return file;
      } else {
        throw new Error("未找到下载链接");
      }
    }
  },
  alipay: {
    name: '支付宝',
    subjectPattern: /支付宝交易流水明细/i,
    downloadAttachment: async (emailInfo: EmailInfo, emailContent: string) => {
      const attachment = emailInfo.attachments.find(att => att.contentType.includes('application/zip'))
      if (attachment && attachment.content) {
        const file = `tmp/${attachment.filename}`
        await fs.promises.writeFile(file, attachment.content)
        return file
      }
      throw new Error("未找 zip 附件");
    }
  }
} 