import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { Readable } from 'stream';

interface EmailConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
}

interface EmailSearchOptions {
    subject?: string;
    since?: Date;
    to?: string;
    from?: string;
}

const formatDate = (date: Date) => {
    // 格式化为 "1-Jan-2024" 格式
    return date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).replace(/,/g, '');
};

export class MailService {
    private imap: Imap;

    constructor(config: EmailConfig) {
        this.imap = new Imap({
            user: config.user,
            password: config.password,
            host: config.host,
            port: config.port,
            tls: config.tls,
        });
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.imap.once('ready', resolve);
            this.imap.once('error', reject);
            this.imap.connect();
        });
    }


    async searchEmails(options: EmailSearchOptions): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err, box) => {
                if (err) reject(err);

                const searchCriteria: (string | string[])[] = [];
                if (options.subject) searchCriteria.push(['SUBJECT', options.subject]);
                if (options.since) searchCriteria.push(['SINCE', 'Feb 5, 2025']);
                if (options.from) searchCriteria.push(['FROM', options.from]);
                if (options.to) searchCriteria.push(['TO', options.to]);

                this.imap.search(searchCriteria, (err, results) => {
                    if (err) reject(err);
                    if (!results || results.length === 0) {
                        resolve([]);
                        return;
                    }

                    const emails: any[] = [];
                    let completed = 0;

                    const fetch = this.imap.fetch(results, {
                        bodies: '',
                        struct: true
                    });

                    fetch.on('message', (msg) => {
                        msg.on('body', async (stream: Readable) => {
                            try {
                                const parsed = await simpleParser(stream);
                                emails.push(parsed);
                                completed++;
                                
                                // 当所有邮件都处理完成时才解析 Promise
                                if (completed === results.length) {
                                    resolve(emails);
                                }
                            } catch (error) {
                                reject(error);
                            }
                        });
                    });

                    fetch.once('error', reject);
                    
                    // end 事件只用于错误处理
                    fetch.once('end', () => {
                        // if (completed=== results.length) {
                        //     resolve(emails);
                        // }
                    });
                });
            });
        });
    }

    async downloadAttachment(email: any): Promise<{ filename: string; content: Buffer }[]> {
        const attachments: { filename: string; content: Buffer }[] = [];
        
        if (email.attachments && email.attachments.length > 0) {
            for (const attachment of email.attachments) {
                attachments.push({
                    filename: attachment.filename,
                    content: attachment.content
                });
            }
        }

        return attachments;
    }

    disconnect(): void {
        this.imap.end();
    }
} 