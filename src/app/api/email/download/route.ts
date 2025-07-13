import { NextResponse } from 'next/server'
import { EmailConnection } from '@/lib/email-config'
import { 
  getEmailAttachments, 
  extractZipFile, 
  parseCSV, 
  identifyBillEmailProvider,
  validateCSVData
} from '@/lib/email-utils'
import { EmailDownloadResponse } from '@/types/email'
import { getEmailConfigFromEnv, getMissingEnvVars } from '@/lib/email-env'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { uid, zipPassword } = body

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

      // 获取邮件附件
      const attachments = await getEmailAttachments(imap, uid)
      
      if (attachments.length === 0) {
        return NextResponse.json<EmailDownloadResponse>(
          { 
            success: false, 
            message: '该邮件没有附件' 
          },
          { status: 404 }
        )
      }

      // 查找账单附件（zip或csv文件）
      const billAttachment = attachments.find(att => 
        att.filename.toLowerCase().endsWith('.zip') || 
        att.filename.toLowerCase().endsWith('.csv')
      )

      if (!billAttachment) {
        return NextResponse.json<EmailDownloadResponse>(
          { 
            success: false, 
            message: '没有找到账单附件（zip或csv文件）' 
          },
          { status: 404 }
        )
      }

      let csvData: any[] = []
      let extractedFiles: string[] = []

      if (billAttachment.filename.toLowerCase().endsWith('.zip')) {
        // 处理zip文件
        try {
          const files = await extractZipFile(billAttachment.content, zipPassword)
          extractedFiles = files.map(f => f.filename)
          
          // 查找CSV文件
          const csvFile = files.find(f => f.filename.toLowerCase().endsWith('.csv'))
          
          if (!csvFile) {
            return NextResponse.json<EmailDownloadResponse>(
              { 
                success: false, 
                message: '压缩包中没有找到CSV文件' 
              },
              { status: 404 }
            )
          }

          // 解析CSV
          const parseResult = await parseCSV(csvFile.content, csvFile.filename)
          csvData = parseResult.data

        } catch (error) {
          console.error('解压缩失败:', error)
          return NextResponse.json<EmailDownloadResponse>(
            { 
              success: false, 
              message: error instanceof Error ? error.message : '解压缩失败' 
            },
            { status: 400 }
          )
        }
      } else {
        // 直接处理CSV文件
        try {
          const parseResult = await parseCSV(billAttachment.content, billAttachment.filename)
          csvData = parseResult.data
        } catch (error) {
          console.error('CSV解析失败:', error)
          return NextResponse.json<EmailDownloadResponse>(
            { 
              success: false, 
              message: 'CSV文件解析失败' 
            },
            { status: 400 }
          )
        }
      }

      // 验证CSV数据
      const emailInfo = {
        uid,
        subject: '',
        from: '',
        date: new Date(),
        hasAttachments: true,
        attachments: []
      }

      const billProvider = identifyBillEmailProvider(emailInfo)
      
      if (billProvider && !validateCSVData(csvData, billProvider)) {
        return NextResponse.json<EmailDownloadResponse>(
          { 
            success: false, 
            message: '账单数据格式不正确' 
          },
          { status: 400 }
        )
      }

      return NextResponse.json<EmailDownloadResponse>({
        success: true,
        message: `成功解析 ${csvData.length} 条账单记录`,
        data: {
          filename: billAttachment.filename,
          csvData,
          extractedFiles: extractedFiles.length > 0 ? extractedFiles : undefined
        }
      })

    } finally {
      await connection.close()
    }

  } catch (error) {
    console.error('下载邮件附件失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    
    return NextResponse.json<EmailDownloadResponse>(
      { 
        success: false, 
        message: `下载失败: ${errorMessage}` 
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