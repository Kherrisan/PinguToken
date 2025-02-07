import { MailService } from "@/lib/mail-service";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

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
    hasAttachment: boolean;
    attachmentName?: string;
}

const extractWechatBillDownloadLink = (email: any) => {
    const html = email.html;
    const link = html.match(/<a href="([^"]+)"/)?.[1];
    return link;
}

export async function GET() {
    try {
        const mailService = new MailService(EMAIL_CONFIG);
        await mailService.connect();

        const emails = await mailService.searchEmails({
            // from: "wechatpay@tencent.com",
            since: new Date(Date.now() - 60 * 60 * 1000),
        });

        const filteredEmails = emails.filter(email =>
            email.from?.value?.[0]?.address?.toLowerCase() === "wechatpay@tencent.com"
        );
        console.log(filteredEmails);

        let results: EmailCheckResult[] = [];
        // Sort emails by date in descending order (newest first)
        filteredEmails.sort((a, b) => b.date.getTime() - a.date.getTime());

        // Only process the most recent email
        const latestEmails = filteredEmails.slice(0, 1);
        let email = latestEmails[0];
        const link = extractWechatBillDownloadLink(email);
        console.log(link);
        const attachments = await mailService.downloadAttachment(email);
        if (attachments.length > 0) {
            // 保存附件到临时目录
            const attachment = attachments[0]; // 假设只处理第一个附件
            const emailId = Date.now().toString();
            const filePath = path.join(process.cwd(), 'tmp', `${emailId}_${attachment.filename}`);

            await writeFile(filePath, attachment.content);

            results.push({
                id: emailId,
                subject: email.subject,
                date: email.date,
                hasAttachment: true,
                attachmentName: attachment.filename
            });
        }

        mailService.disconnect();

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