"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ImportRecord } from "@/lib/types/transaction"
import { CreateRuleDialog } from "./create-rule-dialog"
import { Loader2, Pencil, Wand2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ComboboxAccount } from "./combobox-account"
import { Label } from "@/components/ui/label"
import { MatchResult } from "@/lib/importers/matcher"
import { cn } from "@/lib/utils"

interface UnmatchedTransactionsProps {
    transactions: MatchResult[];
    onRuleCreated: (ruleId: string) => void;
}

interface ManualMatchDialogProps {
    transaction: ImportRecord;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (transaction: ImportRecord, targetAccount: string, methodAccount: string) => void;
    suggestedTargetAccount?: string;
    suggestedMethodAccount?: string;
}

interface TransactionWithStatus extends MatchResult {
    canBeMatched?: boolean;  // 标记可以被新规则匹配的交易
}

function ManualMatchDialog({
    transaction,
    open,
    onOpenChange,
    onConfirm,
    suggestedTargetAccount,
    suggestedMethodAccount
}: ManualMatchDialogProps) {
    const [targetAccount, setTargetAccount] = useState(suggestedTargetAccount || '')
    const [methodAccount, setMethodAccount] = useState(suggestedMethodAccount || '')

    if (!transaction) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>手动匹配交易</DialogTitle>
                    <DialogDescription>
                        为该交易选择目标账户和支付方式账户
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <div className="grid gap-1">
                            <Label>交易信息</Label>
                            <div className="rounded-md bg-muted p-3">
                                <div className="text-sm">
                                    <div><span className="font-medium">交易时间：</span>{transaction.transactionTime}</div>
                                    <div><span className="font-medium">交易类型：</span>{transaction.type}</div>
                                    <div><span className="font-medium">交易对手：</span>{transaction.counterparty}</div>
                                    <div><span className="font-medium">对方账号：</span>{transaction.counterpartyAccount}</div>
                                    <div><span className="font-medium">描述：</span>{transaction.description}</div>
                                    <div><span className="font-medium">金额：</span>{transaction.amount}</div>
                                    <div><span className="font-medium">分类：</span>{transaction.category}</div>
                                    <div><span className="font-medium">支付方式：</span>{transaction.paymentMethod}</div>
                                    <div><span className="font-medium">交易状态：</span>{transaction.status}</div>
                                    <div><span className="font-medium">交易订单号：</span>{transaction.transactionNo}</div>
                                    <div><span className="font-medium">商家订单号：</span>{transaction.merchantOrderNo}</div>
                                    <div><span className="font-medium">备注：</span>{transaction.remarks}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>目标账户</Label>
                        {suggestedTargetAccount && (
                            <div className="text-sm text-muted-foreground mb-2">
                                {suggestedTargetAccount}
                            </div>
                        )}
                        <ComboboxAccount
                            value={targetAccount}
                            onValueChange={setTargetAccount}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>支付方式账户</Label>
                        {suggestedMethodAccount && (
                            <div className="text-sm text-muted-foreground mb-2">
                                {suggestedMethodAccount}
                            </div>
                        )}
                        <ComboboxAccount
                            value={methodAccount}
                            onValueChange={setMethodAccount}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button
                        onClick={() => onConfirm(transaction, targetAccount, methodAccount)}
                        disabled={!targetAccount || !methodAccount}
                    >
                        确认匹配
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function UnmatchedTransactions({ transactions: initialTransactions, onRuleCreated }: UnmatchedTransactionsProps) {
    const [selectedTransaction, setSelectedTransaction] = useState<ImportRecord | null>(null);
    const [manualMatchTransaction, setManualMatchTransaction] = useState<MatchResult | null>(null);
    const [transactions, setTransactions] = useState<TransactionWithStatus[]>(initialTransactions);
    const [isBatchMatching, setIsBatchMatching] = useState(false);
    const { toast } = useToast();

    // 批量尝试匹配并保存
    const handleBatchTryMatch = async () => {
        setIsBatchMatching(true);
        try {
            // 找出所有可以匹配的交易
            const matchableTransactions = transactions.filter(tx => tx.canBeMatched);
            
            if (matchableTransactions.length === 0) {
                toast({
                    title: "批量匹配",
                    description: "没有找到可以匹配的交易",
                });
                return;
            }

            // 批量保存匹配成功的交易
            await fetch('/api/import/match', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'alipay',
                    transactions: matchableTransactions.map(tx => tx.record)
                }),
            });

            // 从列表中移除已匹配的交易
            setTransactions(prev => 
                prev.filter(tx => !tx.canBeMatched)
            );

            toast({
                title: "批量匹配完成",
                description: `成功匹配并导入 ${matchableTransactions.length} 笔交易`,
            });
        } catch (error) {
            toast({
                title: "批量匹配失败",
                description: "请稍后重试",
                variant: "destructive",
            });
        } finally {
            setIsBatchMatching(false);
        }
    };

    // 处理规则创建后的重新匹配
    const handleRuleCreated = async (ruleId: string, currentTransactionMatched: boolean) => {
        const currentTransaction = selectedTransaction;
        setSelectedTransaction(null);

        if (!currentTransaction) return;

        try {
            // 重新匹配剩余的未匹配交易
            const remainingTransactions = transactions.filter(tx => 
                tx.record.transactionNo !== currentTransaction.transactionNo
            );

            // 一次性发送所有交易进行匹配检查
            const tryMatchResponse = await fetch('/api/import/try-match', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'alipay',
                    transactions: remainingTransactions.map(tx => tx.record)
                }),
            });

            const matchResults = await tryMatchResponse.json();

            // 更新交易列表，标记可匹配的交易
            setTransactions(prev => {
                return prev
                    .filter(tx => tx.record.transactionNo !== currentTransaction.transactionNo)
                    .map(tx => {
                        const matchResult = matchResults.find(
                            r => r.transactionNo === tx.record.transactionNo
                        );
                        if (matchResult?.matched) {
                            return {
                                ...tx,
                                canBeMatched: true,
                                targetAccount: matchResult.targetAccount,
                                methodAccount: matchResult.methodAccount
                            };
                        }
                        return tx;
                    });
            });

            const matchableCount = matchResults.filter(r => r.matched).length;
            if (matchableCount > 0) {
                toast({
                    title: "规则创建成功",
                    description: `发现 ${matchableCount} 笔可匹配的交易，点击"匹配全部未导入交易"按钮进行导入`,
                });
            }

            onRuleCreated(ruleId);
        } catch (error) {
            toast({
                title: "匹配检查失败",
                description: "检查可匹配交易时出错",
                variant: "destructive",
            });
        }
    };

    const handleManualMatch = async (transaction: ImportRecord, targetAccount: string, methodAccount: string) => {
        try {
            const response = await fetch('/api/import/manual-match', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'alipay',
                    transactions: [{
                        transaction,
                        targetAccount,
                        methodAccount
                    }]
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to match transaction');
            }

            // 从列表中移除已匹配的交易
            setTransactions(prev => 
                prev.filter(tx => tx.record.transactionNo !== transaction.transactionNo)
            );

            toast({
                title: "匹配成功",
                description: "交易已成功匹配并保存",
            });

            // 关闭手动匹配对话框
            setManualMatchTransaction(null);
        } catch (error) {
            toast({
                title: "匹配失败",
                description: "无法保存匹配结果，请重试",
                variant: "destructive",
            });
            throw error; // 向上传播错误
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">未匹配交易</h3>
                    <p className="text-sm text-muted-foreground">
                        共 {transactions.length} 条交易需要设置规则
                        {transactions.filter(tx => tx.canBeMatched).length > 0 && (
                            <span className="ml-2 text-green-600">
                                （其中 {transactions.filter(tx => tx.canBeMatched).length} 条可以匹配）
                            </span>
                        )}
                    </p>
                </div>
                <Button
                    onClick={handleBatchTryMatch}
                    disabled={isBatchMatching || !transactions.some(tx => tx.canBeMatched)}
                >
                    {isBatchMatching ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            匹配中
                        </>
                    ) : (
                        <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            匹配全部未导入交易
                        </>
                    )}
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>时间</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead>分类</TableHead>
                            <TableHead>交易对手</TableHead>
                            <TableHead>描述</TableHead>
                            <TableHead>金额</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx) => (
                            <TableRow 
                                key={tx.record.transactionNo}
                                className={cn(
                                    tx.canBeMatched && "bg-green-50"
                                )}
                            >
                                <TableCell>{tx.record.transactionTime}</TableCell>
                                <TableCell>{tx.record.type}</TableCell>
                                <TableCell>{tx.record.category}</TableCell>
                                <TableCell>{tx.record.counterparty}</TableCell>
                                <TableCell>{tx.record.description}</TableCell>
                                <TableCell>{tx.record.amount}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                        {!tx.canBeMatched && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedTransaction(tx.record)}
                                                >
                                                    设置规则
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setManualMatchTransaction(tx)}
                                                >
                                                    手动匹配
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <CreateRuleDialog
                transaction={selectedTransaction}
                open={!!selectedTransaction}
                onOpenChange={(open) => !open && setSelectedTransaction(null)}
                onRuleCreated={handleRuleCreated}
            />

            {manualMatchTransaction && (
                <ManualMatchDialog
                    transaction={manualMatchTransaction.record}
                    open={!!manualMatchTransaction}
                    onOpenChange={(open) => !open && setManualMatchTransaction(null)}
                    onConfirm={handleManualMatch}
                    suggestedTargetAccount={manualMatchTransaction.targetAccount}
                    suggestedMethodAccount={manualMatchTransaction.methodAccount}
                />
            )}
        </div>
    );
} 