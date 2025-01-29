'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Upload } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { UnmatchedTransactions } from "./unmatched-transactions"
import { MatchResult } from '@/lib/importers/matcher';

export function AlipayUploader() {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [matchResults, setMatchResults] = useState<{
        matched: number;
        unmatched: MatchResult[];
    } | null>(null);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setProgress(0);
        setMessage(null);
        setMatchResults(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // 模拟上传进度
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await fetch('/api/import/alipay', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '导入失败');
            }

            setMatchResults(result);
            setMessage({
                type: 'success',
                text: `成功匹配 ${result.matched?.length || 0} 条交易，${result.unmatched.length} 条待处理`
            });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : '导入失败'
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="alipay-file">选择文件</Label>
                <div className="flex gap-2">
                    <Input
                        id="alipay-file"
                        type="file"
                        accept=".csv"
                        onChange={handleUpload}
                        disabled={isUploading}
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={isUploading}
                        onClick={() => document.getElementById('alipay-file')?.click()}
                    >
                        <Upload className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {isUploading && (
                <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-muted-foreground">
                        正在导入... {progress}%
                    </p>
                </div>
            )}

            {message && (
                <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
                    {message.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                        {message.type === 'success' ? '导入成功' : '导入失败'}
                    </AlertTitle>
                    <AlertDescription>
                        {message.text}
                    </AlertDescription>
                </Alert>
            )}

            {matchResults?.unmatched.length > 0 && (
                <UnmatchedTransactions
                    transactions={matchResults.unmatched}
                    onRuleCreated={(ruleId) => {
                        // 重新匹配交易
                    }}
                />
            )}
        </div>
    );
} 