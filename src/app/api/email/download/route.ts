import { NextResponse } from 'next/server'
import { EmailConnection } from '@/lib/email-config'
import { 
  getEmailAttachments, 
  extractZipFile, 
  parseCSV, 
  identifyBillEmailProvider,
  validateCSVData,
  parseEmailHeader,
  downloadZipFile
} from '@/lib/email-utils'
import { EMAIL_PROVIDERS, EmailDownloadResponse, EmailProvider } from '@/types/email'
import { getEmailConfigFromEnv, getMissingEnvVars } from '@/lib/email-env'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { uid, zipPassword, provider } = body

    if (!uid) {
      return NextResponse.json<EmailDownloadResponse>(
        { 
          success: false, 
          message: '邮件UID是必需的' 
        },
        { status: 400 }
      )
    }

    // 从环境变量获取邮件配置
    const missingVars = getMissingEnvVars()
    if (missingVars.length > 0) {
      return NextResponse.json<EmailDownloadResponse>(
        { 
          success: false, 
          message: `缺少必要的环境变量: ${missingVars.join(', ')}` 
        },
        { status: 500 }
      )
    }

    // 获取邮件配置
    const config = getEmailConfigFromEnv()
    
    // 建立邮件连接
    const connection = new EmailConnection(config)
    
    try {
      await connection.connect()
      await connection.openInbox()
      
      const imap = connection.getConnection()
      if (!imap) {
        throw new Error('无法建立邮件连接')
      }

      const zipFile = await downloadZipFile(imap, uid, provider)

      let csvData: any[] = []
      let extractedFiles: string[] = []

      try {
        const files = await extractZipFile(zipFile, zipPassword)
      } catch (error) {
        return NextResponse.json<EmailDownloadResponse>(
          { 
            success: false, 
            message: `解压缩文件失败: ${error.message}` 
          },
          { status: 500 }
        )
      }
}

export async function GET() {
  return NextResponse.json({
    message: '邮件附件下载API',
    usage: {
      method: 'POST',
      body: {
        uid: 'string (必需) - 邮件UID',
        zipPassword: 'string (可选) - 压缩包密码'
      },
      response: {
        success: 'boolean',
        message: 'string',
        data: {
          filename: 'string - 附件文件名',
          csvData: 'array - CSV数据',
          extractedFiles: 'array - 解压后的文件列表'
        }
      },
      note: '邮件配置从环境变量读取: EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USERNAME, EMAIL_PASSWORD'
    }
  })
} 

