import { MailService } from "@/lib/mail-service";
import { NextRequest, NextResponse } from "next/server";

// 从环境变量获取邮箱配置
const EMAIL_CONFIG = {
    user: process.env.EMAIL_USER!,
    password: process.env.EMAIL_PASSWORD!,
    host: process.env.EMAIL_HOST!,
    port: Number(process.env.EMAIL_PORT!),
    tls: process.env.EMAIL_TLS === 'true'
};

interface EmailCheckResult {
    id: string;  // 用于标识邮件
    subject: string;
    date: Date;
    provider: string;
    downloadLink?: string;
}

// 账单提供商配置
const BILL_PROVIDERS = {
    wechatpay: {
        from: "wechatpay@tencent.com",
        extractLink: (email: any) => {
            const html = email.html;
            return html.match(/<a href="([^"]+)"/)?.[1];
        }
    },
    alipay: {
        from: "service@mail.alipay.com",
        extractLink: (email: any) => {
            // 支付宝账单直接以附件形式发送
            if (email.attachments && email.attachments.length > 0) {
                // 找到第一个 zip 附件
                const zipAttachment = email.attachments.find(
                    (att: any) => att.filename.toLowerCase().endsWith('.zip')
                );
                if (zipAttachment) {
                    // 将附件内容转换为 base64
                    const base64Content = zipAttachment.content.toString('base64');
                    // 创建 data URL
                    return `data:application/zip;base64,${base64Content}`;
                }
            }
            return null;
        }
    }
};

export async function GET(
    request: NextRequest,
    { params }: { params: { provider: string } }
) {
    try {
        const provider = params.provider;

        if (!BILL_PROVIDERS[provider as keyof typeof BILL_PROVIDERS]) {
            return NextResponse.json({
                success: false,
                error: 'Invalid bill provider'
            }, { status: 400 });
        }

        const providerConfig = BILL_PROVIDERS[provider as keyof typeof BILL_PROVIDERS];
        const mailService = new MailService(EMAIL_CONFIG);
        await mailService.connect();

        const since = new Date(Date.now() - 60 * 60 * 1000);

        const emails = await mailService.searchEmails({
            since,
            from: providerConfig.from
        });

        let results: EmailCheckResult[] = [];
        
        if (emails.length > 0) {
            // 按日期降序排序
            emails.sort((a, b) => b.date.getTime() - a.date.getTime());
            
            // 处理最新的邮件
            const email = emails[0];
            const downloadLink = providerConfig.extractLink(email);

            if (downloadLink) {
                results.push({
                    id: email.messageId || Date.now().toString(),
                    subject: email.subject,
                    date: email.date,
                    provider,
                    downloadLink
                });
            }
        }

        await mailService.disconnect();

        return NextResponse.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Failed to check emails:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to check emails' },
            { status: 500 }
        );
    }
} 