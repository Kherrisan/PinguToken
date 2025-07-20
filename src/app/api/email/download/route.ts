import { NextResponse } from 'next/server'
import { EmailConnection } from '@/lib/email-config'
import {
  extractZipFile,
  downloadZipFile
} from '@/lib/email-utils'
import { EmailDownloadResponse, EmailProvider } from '@/types/email'
import { getEmailConfigFromEnv, getMissingEnvVars } from '@/lib/email-env'
import { processCsvBuffer, processCsvFile, Provider } from '@/lib/importers/processor'
import fs from 'fs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { uid, zipPassword, provider } = body
    console.log(`uid: ${uid}, zipPassword: ${zipPassword}, provider: ${provider}`)

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

      try {
        console.log(`extracting zip file ${zipFile} with password ${zipPassword}`)
        const csvFile = await extractZipFile(zipFile, zipPassword)
        if (!csvFile) {
          throw new Error('提取CSV文件失败')
        }

        console.log(`extracted csv file: ${csvFile}`);

        // 读取CSV文件并使用通用处理函数
        const fileBuffer = await fs.promises.readFile(csvFile)
        
        // 验证provider类型
        if (provider !== 'wechatpay' && provider !== 'alipay') {
          throw new Error(`不支持的提供商: ${provider}`)
        }

        // 直接使用统一的provider名称
        const result = await processCsvFile({
          provider: provider as Provider,
          csvFilePath: csvFile
        })

        return NextResponse.json(result)
      } catch (error) {
        console.error('解压缩文件失败:', error)
        return NextResponse.json<EmailDownloadResponse>(
          {
            success: false,
            message: `解压缩文件失败: ${error.message}`
          },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error('下载账单文件失败:', error)
      return NextResponse.json<EmailDownloadResponse>(
        {
          success: false,
          message: `下载账单文件失败: ${error.message}`
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('下载账单文件失败:', error)
    return NextResponse.json<EmailDownloadResponse>(
      {
        success: false,
        message: `下载账单文件失败: ${error.message}`
      },
      { status: 500 }
    )
  }
}