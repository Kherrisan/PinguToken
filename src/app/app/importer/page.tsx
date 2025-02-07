"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImportSourceSelector } from "@/components/importers/source-selector"
import { PasswordDialog } from "@/components/importers/password-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

interface EmailResult {
    id: string;
    subject: string;
    date: Date;
    hasAttachment: boolean;
    attachmentName?: string;
}

export default function ImporterPage() {
    const [isChecking, setIsChecking] = useState(false);
    const [newEmails, setNewEmails] = useState<EmailResult[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<EmailResult | null>(null);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    async function checkEmails() {
        if (isChecking) return;
        
        try {
            setIsChecking(true);
            const response = await fetch('/api/mail/check');
            const data = await response.json();
            
            if (data.success) {
                setNewEmails(data.data);
                if (data.data.length > 0) {
                    toast({
                        title: "发现新账单",
                        description: `发现 ${data.data.length} 封新账单邮件`,
                    });
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Failed to check emails:', error);
            toast({
                title: "检查失败",
                description: "无法检查邮件，请稍后重试",
                variant: "destructive",
            });
        } finally {
            setIsChecking(false);
        }
    }

    useEffect(() => {
        checkEmails();
    }, []);

    const handleEmailSelect = (email: EmailResult) => {
        setSelectedEmail(email);
        setIsPasswordDialogOpen(true);
    };

    const handlePasswordConfirm = async (password: string) => {
        if (!selectedEmail) return;

        // TODO: 调用API处理解压缩和导入
        toast({
            title: "处理中",
            description: "正在处理账单文件...",
        });
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-semibold">导入账单</h1>
                    <p className="text-sm text-muted-foreground">从不同来源导入交易数据</p>
                </div>

                {newEmails.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>新账单</CardTitle>
                            <CardDescription>
                                发现以下新账单邮件
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {newEmails.map((email) => (
                                    <div key={email.id} className="flex items-center justify-between p-2 border rounded">
                                        <div>
                                            <div className="font-medium">{email.subject}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {new Date(email.date).toLocaleString()}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleEmailSelect(email)}
                                            disabled={!email.hasAttachment}
                                        >
                                            处理账单
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>选择导入来源</CardTitle>
                                <CardDescription>
                                    选择要导入的账单来源，并上传相应的账单文件
                                </CardDescription>
                            </div>
                            {isChecking && (
                                <div className="text-sm text-muted-foreground">
                                    正在检查新账单...
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ImportSourceSelector />
                    </CardContent>
                </Card>
            </div>

            <PasswordDialog
                open={isPasswordDialogOpen}
                onOpenChange={setIsPasswordDialogOpen}
                emailId={selectedEmail?.id || ''}
                fileName={selectedEmail?.attachmentName || ''}
                onConfirm={handlePasswordConfirm}
            />
        </div>
    );
} 