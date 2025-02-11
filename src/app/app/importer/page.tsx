"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImportSourceSelector } from "@/components/importers/source-selector"
import { PasswordDialog } from "@/components/importers/password-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { UnmatchedTransactions } from "@/components/importers/unmatched-transactions"
import { MatchResult } from "@/lib/importers/matcher"

interface EmailResult {
    id: string;
    subject: string;
    date: Date;
    provider: string;
    downloadLink?: string;
}

const PROVIDERS = ['wechatpay', 'alipay'] as const;
type Provider = typeof PROVIDERS[number];

export default function ImporterPage() {
    const [isChecking, setIsChecking] = useState(false);
    const [newEmails, setNewEmails] = useState<EmailResult[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<EmailResult | null>(null);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [unmatchedTransactions, setUnmatchedTransactions] = useState<MatchResult[]>([]);

    async function checkEmails() {
        if (isChecking) return;
        
        try {
            setIsChecking(true);
            const results: EmailResult[] = [];

            // 检查所有提供商
            for (const provider of PROVIDERS) {
                const response = await fetch(`/api/mail/check/${provider}`);
                const data = await response.json();
                
                if (data.success && data.data.length > 0) {
                    results.push(...data.data);
                }
            }

            setNewEmails(results);
            if (results.length > 0) {
                toast({
                    title: "发现新账单",
                    description: `发现 ${results.length} 封新账单邮件`,
                });
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
        if (!selectedEmail?.downloadLink) return;

        try {
            const response = await fetch('/api/mail/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    downloadLink: selectedEmail.downloadLink,
                    provider: selectedEmail.provider,
                    password,
                    emailDate: selectedEmail.date
                }),
            });

            const result = await response.json();
            if (result.success) {
                setUnmatchedTransactions(result.data.unmatched);
                setIsPasswordDialogOpen(false);
                toast({
                    title: "导入成功",
                    description: `成功导入 ${result.data.matched} 条记录，${result.data.unmatched.length} 条待匹配`,
                });
                // 刷新邮件列表
                checkEmails();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: "导入失败",
                description: error instanceof Error ? error.message : "处理账单时出错",
                variant: "destructive",
            });
        }
    };

    const handleRuleCreated = (ruleId: string) => {
        // 可以在这里处理规则创建后的逻辑
        toast({
            title: "规则创建成功",
            description: "新规则已创建并应用",
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
                                            <div className="text-sm text-muted-foreground">
                                                来源: {email.provider}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleEmailSelect(email)}
                                            disabled={!email.downloadLink}
                                        >
                                            处理账单
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {unmatchedTransactions.length > 0 && (
                    <Card>
                        <CardContent className="pt-6">
                            <UnmatchedTransactions
                                transactions={unmatchedTransactions}
                                onRuleCreated={handleRuleCreated}
                                provider={selectedEmail?.provider || ''}
                            />
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
                fileName={selectedEmail?.subject || ''}
                onConfirm={handlePasswordConfirm}
            />
        </div>
    );
} 