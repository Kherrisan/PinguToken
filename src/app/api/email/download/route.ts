import { NextResponse } from 'next/server'
import { EmailConnection } from '@/lib/email-config'
import {
  extractZipFile,
  downloadZipFile
} from '@/lib/email-utils'
import { EmailDownloadResponse, EmailProvider } from '@/types/email'
import { getEmailConfigFromEnv, getMissingEnvVars } from '@/lib/email-env'
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
        const csvFile = await extractZipFile(zipFile, zipPassword)
        if (!csvFile) {
          throw new Error('提取CSV文件失败')
        }

        // 创建FormData发送到微信支付API
        const formData = new FormData()
        const file = await fs.promises.readFile(csvFile)
        const blob = new Blob([file], { type: 'text/csv' })
        formData.append('file', blob, csvFile)

        let api = ""
        if (provider === 'wechat') {
          api = `${process.env.NEXT_PUBLIC_BASE_URL}/api/import/wechatpay`
        } else if (provider === 'alipay') {
          api = `${process.env.NEXT_PUBLIC_BASE_URL}/api/import/alipay`
        }

                 // 内部API调用
         const importResponse = await fetch(api, {
           method: 'POST',
           body: formData
         })

         if (!importResponse.ok) {
           throw new Error('导入CSV文件失败')
         }

         const importResult = await importResponse.json()
         
         return NextResponse.json(importResult)
      } catch (error) {
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