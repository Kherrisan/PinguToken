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
  encoding?: string
  disposition?: string
}

export interface BillEmail {
  uid: string
  subject: string
  from: string
  date: Date
  provider: 'wechat' | 'alipay'
  attachments: AttachmentInfo[]
}

export interface EmailSearchOptions {
  since?: Date
  before?: Date
  subject?: string
  from?: string
  hasAttachments?: boolean
}

export interface EmailSearchRequest {
  // 搜索范围固定为今日，无需参数
}

export interface EmailDownloadRequest {
  uid: string
  zipPassword?: string
}

export interface EmailDownloadResponse {
  success: boolean
  message: string
  data?: {
    filename: string
    csvData?: any[]
    extractedFiles?: string[]
  }
}

export interface EmailSearchResponse {
  success: boolean
  message: string
  data?: BillEmail[]
}

export interface CSVParseResult {
  headers: string[]
  data: any[]
  rowCount: number
}

export type EmailProvider = 'wechat' | 'alipay'

export interface EmailProviderConfig {
  name: string
  fromPattern: RegExp
  subjectPattern: RegExp
  attachmentPattern: RegExp
}

export const EMAIL_PROVIDERS: Record<EmailProvider, EmailProviderConfig> = {
  wechat: {
    name: '微信支付',
    fromPattern: /wechatpay/i,
    subjectPattern: /(微信支付|wechat.*pay|账单|bill)/i,
    attachmentPattern: /\.(zip|csv)$/i
  },
  alipay: {
    name: '支付宝',
    fromPattern: /alipay|zhifubao/i,
    subjectPattern: /(支付宝|alipay|账单|bill)/i,
    attachmentPattern: /\.(zip|csv)$/i
  }
} 