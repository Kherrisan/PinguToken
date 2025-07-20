"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, Wand2 } from "lucide-react"
import { CreateRuleDialog } from "./create-rule-dialog"
import { ComboboxAccount } from "./combobox-account"
import { MatchResult } from "@/lib/importers/matcher"
import { ImportRecord } from "@/lib/types/transaction"
import { cn } from "@/lib/utils"
import { getProviderColor } from "@/lib/utils/provider"

interface UnmatchedTransactionsProps {
    transactions: MatchResult[];
    onRuleCreated: (ruleId: string) => void;
    source?: string; // 添加source参数来控制API调用
    isFromDatabase?: boolean; // 标记是否来自数据库
    onRefresh?: () => void; // 添加刷新函数
    onRemove?: (transactionNo: string) => void;
    onBatchMatch?: (matchableTransactions: MatchResult[]) => void;
    onManualMatch?: (record: ImportRecord, targetAccount: string, methodAccount: string, rawTxId: string) => void;
}

interface ManualMatchDialogProps {
    transaction: ImportRecord;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (transaction: ImportRecord, targetAccount: string, methodAccount: string) => void;
    suggestedTargetAccount?: string;
    suggestedMethodAccount?: string;
    rawTxId?: string;
}

interface TransactionWithStatus extends MatchResult {
    canBeMatched?: boolean;  // 标记可以被新规则匹配的交易
}

function isMatchable(tx: MatchResult) {
    return !!(tx.methodAccount && tx.targetAccount);
}

function ManualMatchDialog({
    transaction,
    open,
    onOpenChange,
    onConfirm,
    suggestedTargetAccount,
    suggestedMethodAccount,
    rawTxId
}: ManualMatchDialogProps) {
    const [targetAccount, setTargetAccount] = useState(suggestedTargetAccount || '')
    const [methodAccount, setMethodAccount] = useState(suggestedMethodAccount || '')

    if (!transaction || !rawTxId) return null;

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

export function UnmatchedTransactions({
    transactions,
    onRuleCreated,
    isFromDatabase = false,
    onRefresh,
    onRemove,
    onBatchMatch,
    onManualMatch
}: UnmatchedTransactionsProps) {
    const [selectedTransaction, setSelectedTransaction] = useState<ImportRecord | null>(null);
    const [manualMatchTransaction, setManualMatchTransaction] = useState<MatchResult | null>(null);
    const [isBatchMatching, setIsBatchMatching] = useState(false);
    const { toast } = useToast();

    // 批量尝试匹配并保存
    const handleBatchTryMatch = async () => {
        setIsBatchMatching(true);
        try {
            const matchableTransactions = transactions.filter(isMatchable);
            if (matchableTransactions.length === 0) {
                toast({ title: "批量匹配", description: "没有找到可以匹配的交易" });
                return;
            }
            if (onBatchMatch) await onBatchMatch(matchableTransactions);
            toast({ title: "批量匹配完成", description: `成功匹配并导入 ${matchableTransactions.length} 笔交易` });
        } catch (error) {
            toast({ title: "批量匹配失败", description: "请稍后重试", variant: "destructive" });
        } finally {
            setIsBatchMatching(false);
        }
    };

    // 处理规则创建后的重新匹配
    const handleRuleCreated = async (ruleId: string, currentTransactionMatched: boolean) => {
        setSelectedTransaction(null);
        onRuleCreated(ruleId);
    };

    // 手动匹配
    const handleManualMatch = async (record: ImportRecord, targetAccount: string, methodAccount: string) => {
        try {
            if (onManualMatch && manualMatchTransaction) {
                await onManualMatch(record, targetAccount, methodAccount, manualMatchTransaction.record.rawTxId);
            }
            toast({ title: "匹配成功", description: "交易已成功匹配并保存" });
            setManualMatchTransaction(null);
        } catch (error) {
            toast({ title: "匹配失败", description: "无法保存匹配结果，请重试", variant: "destructive" });
            throw error;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <Button
                        onClick={handleBatchTryMatch}
                        disabled={isBatchMatching || !transactions.some(isMatchable)}
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
                    {onRefresh && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2`} />
                            刷新
                        </Button>
                    )}
                </div>
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
                            <TableHead>来源</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx) => (
                            <TableRow
                                key={tx.record.transactionNo}
                                className={cn(
                                    isMatchable(tx) && "bg-green-50"
                                )}
                            >
                                <TableCell>{tx.record.transactionTime}</TableCell>
                                <TableCell>{tx.record.type}</TableCell>
                                <TableCell>{tx.record.category}</TableCell>
                                <TableCell>{tx.record.counterparty}</TableCell>
                                <TableCell>{tx.record.description}</TableCell>
                                <TableCell>{tx.record.amount}</TableCell>
                                <TableCell>
                                    <Badge className={getProviderColor(tx.record.provider || '')}>
                                        {tx.record.provider === 'wechatpay' ? '微信支付' :
                                            tx.record.provider === 'alipay' ? '支付宝' :
                                                tx.record.provider || '未知'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                        {!isMatchable(tx) && (
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
                                                {onRemove && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onRemove(tx.record.transactionNo)}
                                                        title="移除"
                                                    >
                                                        ×
                                                    </Button>
                                                )}
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
                record={selectedTransaction}
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
                    rawTxId={manualMatchTransaction.record.rawTxId}
                />
            )}
        </div>
    );
} 