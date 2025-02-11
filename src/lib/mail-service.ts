import { ImapFlow } from 'imapflow';

interface MailConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
}

interface SearchFilter {
    since: Date;
    from?: string;
}

interface SearchOptions {
    since: Date;
    from?: string;
}

interface EmailAttachment {
    filename: string;
    content: Buffer;
}

interface Email {
    messageId: string;
    subject: string;
    date: Date;
    from?: {
        value: Array<{
            address?: string;
            name?: string;
        }>;
    };
    html?: string;
    attachments?: EmailAttachment[];
}

export class MailService {
    private client: ImapFlow;

    constructor(config: MailConfig) {
        this.client = new ImapFlow({
            host: config.host,
            port: config.port,
            secure: config.tls,
            auth: {
                user: config.user,
                pass: config.password
            },
            logger: false
        });
    }

    async connect() {
        await this.client.connect();
    }

    async disconnect() {
        await this.client.logout();
    }

    async searchEmails({ since, from }: SearchOptions): Promise<Email[]> {
        const results: Email[] = [];

        // 选择收件箱
        await this.client.mailboxOpen('INBOX');

        // 构建搜索条件
        const searchFilter: SearchFilter = { since };
        if (from) searchFilter.from = from;

        // 搜索邮件
        for await (const message of this.client.fetch(searchFilter, {
            envelope: true,
            bodyStructure: true,
            bodyParts: ['TEXT', 'HTML']
        })) {
            const email: Email = {
                messageId: message.envelope.messageId,
                subject: message.envelope.subject,
                date: message.envelope.date,
                from: {
                    value: message.envelope.from.map(f => ({
                        address: f.address,
                        name: f.name
                    }))
                }
            };

            if (message.bodyStructure?.childNodes) {
                // 处理 HTML 内容
                const htmlPart = message.bodyStructure.childNodes.find(
                    part => part.type === 'text/html'
                );
                if (htmlPart) {
                    const { content } = await this.client.download(message.uid.toString(), htmlPart.part);
                    const chunks: Buffer[] = [];
                    for await (const chunk of content) {
                        chunks.push(chunk);
                    }
                    email.html = Buffer.concat(chunks).toString();
                }

                // 处理 ZIP 附件
                const zipAttachments = message.bodyStructure.childNodes
                    .filter(part => 
                        part.disposition === 'attachment'
                    )
                    .map(part => ({
                        filename: part.dispositionParameters!.filename,
                        content: Buffer.from([])
                    }));

                if (zipAttachments.length > 0) {
                    email.attachments = zipAttachments;
                }
            }

            results.push(email);
        }

        return results;
    }
} 