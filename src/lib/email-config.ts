import Imap from 'imap'
import { EmailConfig } from '@/types/email'

// 默认邮件服务器配置
export const DEFAULT_EMAIL_CONFIGS: Record<string, EmailConfig> = {
  qq: {
    host: 'imap.qq.com',
    port: 993,
    secure: true,
    username: '',
    password: '',
  },
  gmail: {
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    username: '',
    password: '',
  },
  '163': {
    host: 'imap.163.com',
    port: 993,
    secure: true,
    username: '',
    password: '',
  },
  '126': {
    host: 'imap.126.com',
    port: 993,
    secure: true,
    username: '',
    password: '',
  },
  outlook: {
    host: 'imap-mail.outlook.com',
    port: 993,
    secure: true,
    username: '',
    password: '',
  },
}

export class EmailConnection {
  private imap: Imap | null = null
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap = new Imap({
        user: this.config.username,
        password: this.config.password,
        host: this.config.host,
        port: this.config.port,
        tls: this.config.secure,
        tlsOptions: { rejectUnauthorized: false },
      })

      this.imap.once('ready', () => {
        console.log('邮件连接成功')
        resolve()
      })

      this.imap.once('error', (err: Error) => {
        console.error('邮件连接失败:', err)
        reject(err)
      })

      this.imap.once('end', () => {
        console.log('邮件连接结束')
      })

      this.imap.connect()
    })
  }

  async openInbox(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.imap) {
        reject(new Error('邮件连接未建立'))
        return
      }

      this.imap.openBox('INBOX', false, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  getConnection(): Imap | null {
    return this.imap
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.imap) {
        this.imap.end()
        this.imap = null
      }
      resolve()
    })
  }
}

export function getEmailConfig(provider: string, username: string, password: string): EmailConfig {
  const baseConfig = DEFAULT_EMAIL_CONFIGS[provider]
  if (!baseConfig) {
    throw new Error(`不支持的邮件服务商: ${provider}`)
  }

  return {
    ...baseConfig,
    username,
    password,
  }
}

export function detectEmailProvider(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase()
  
  const providerMap: Record<string, string> = {
    'qq.com': 'qq',
    'gmail.com': 'gmail',
    '163.com': '163',
    '126.com': '126',
    'outlook.com': 'outlook',
    'hotmail.com': 'outlook',
    'live.com': 'outlook',
  }

  return providerMap[domain] || 'custom'
} 