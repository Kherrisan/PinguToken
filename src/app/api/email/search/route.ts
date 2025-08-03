import { NextResponse } from 'next/server'
import { EmailConnection } from '@/lib/email-config'
import { searchBillEmails } from '@/lib/email-utils'
import { EmailSearchResponse } from '@/types/email'
import { getEmailConfigFromEnv, getMissingEnvVars } from '@/lib/email-env'

export async function GET(request: Request) {
  try {
    // 从URL获取查询参数
    const { searchParams } = new URL(request.url)
    const billSource = searchParams.get('billSource')

    // 检查环境变量
    const missingVars = getMissingEnvVars()
    if (missingVars.length > 0) {
      return NextResponse.json<EmailSearchResponse>(
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

      // 搜索今日的账单邮件
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      
      const searchOptions = {
        since: startOfDay,
        // before: endOfDay,
      }
      console.log('搜索选项:', searchOptions)

      const billEmails = await searchBillEmails(imap, searchOptions)
      
      // 如果指定了billSource，只返回该来源的邮件
      const filteredEmails = billSource 
        ? billEmails.filter(email => email.provider === billSource)
        : billEmails
      
      return NextResponse.json<EmailSearchResponse>({
        success: true,
        message: `找到 ${filteredEmails.length} 封今日账单邮件`,
        data: filteredEmails
      })

    } finally {
      await connection.close()
    }

  } catch (error) {
    console.error('搜索账单邮件失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    
    return NextResponse.json<EmailSearchResponse>(
      { 
        success: false, 
        message: `搜索失败: ${errorMessage}` 
      },
      { status: 500 }
    )
  }
}