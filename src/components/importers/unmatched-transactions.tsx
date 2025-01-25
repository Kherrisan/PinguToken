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

interface UnmatchedTransactionsProps {
    transactions: MatchResult[];
    onRuleCreated: (ruleId: string) => void;
}

interface ManualMatchDialogProps {
    transaction: ImportRecord;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (targetAccount: string, methodAccount: string) => void;
    suggestedTargetAccount?: string;
    suggestedMethodAccount?: string;
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
                                    <div><span className="font-medium">交易对手：</span>{transaction.counterparty}</div>
                                    <div><span className="font-medium">描述：</span>{transaction.description}</div>
                                    <div><span className="font-medium">金额：</span>{transaction.amount}</div>
                                    <div><span className="font-medium">分类：</span>{transaction.category}</div>
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
                        onClick={() => onConfirm(targetAccount, methodAccount)}
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
    const [transactions, setTransactions] = useState(initialTransactions);
    const [matchingStates, setMatchingStates] = useState<Record<string, boolean>>({});
    const [suggestions, setSuggestions] = useState<Record<string, { targetAccount?: string; methodAccount?: string }>>({});
    const { toast } = useToast()

    const tryMatchTransaction = async (transaction: ImportRecord) => {
        toast({
            title: "正在匹配交易",
            description: "请稍候...",
        })

        setMatchingStates(prev => ({
            ...prev,
            [transaction.transactionNo]: true
        }));

        try {
            const response = await fetch('/api/import/match', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'alipay',
                    transaction
                }),
            });

            const result = await response.json();

            if (result.matched) {
                setTransactions(prev =>
                    prev.filter(unmatchedResult => unmatchedResult.record.transactionNo !== transaction.transactionNo)
                );
                toast({
                    title: "匹配成功",
                    description: `已成功匹配交易：${transaction.counterparty} - ${transaction.description}`,
                    variant: "default",
                })
            } else if (result.suggestions) {
                // 保存建议的账户
                setSuggestions(prev => ({
                    ...prev,
                    [transaction.transactionNo]: result.suggestions
                }));
                toast({
                    title: "未找到完全匹配",
                    description: "已找到可能的账户匹配，请手动确认",
                    variant: "default",
                })
            } else {
                toast({
                    title: "未找到匹配规则",
                    description: "请为该交易创建新的匹配规则",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error('Error matching transaction:', error);
            toast({
                title: "匹配失败",
                description: "请稍后重试或联系管理员",
                variant: "destructive",
            })
        } finally {
            setMatchingStates(prev => ({
                ...prev,
                [transaction.transactionNo]: false
            }));
        }
    };

    const handleManualMatch = async (targetAccount: string, methodAccount: string) => {
        if (!manualMatchTransaction) return;

        try {
            const response = await fetch('/api/import/manual-match', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'alipay',
                    transaction: manualMatchTransaction,
                    targetAccount,
                    methodAccount
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to match transaction');
            }

            setTransactions(prev =>
                prev.filter(tx => tx.record.transactionNo !== manualMatchTransaction.transactionNo)
            );

            toast({
                title: "匹配成功",
                description: "交易已成功匹配到指定账户",
            });
        } catch (error) {
            toast({
                title: "匹配失败",
                description: "无法完成手动匹配，请重试",
                variant: "destructive",
            });
        } finally {
            setManualMatchTransaction(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">未匹配交易</h3>
                <p className="text-sm text-muted-foreground">
                    共 {transactions.length} 条交易需要设置规则
                </p>
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
                            <TableHead className="w-[220px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx) => (
                            <TableRow key={tx.record.transactionNo}>
                                <TableCell>{tx.record.transactionTime}</TableCell>
                                <TableCell>{tx.record.type}</TableCell>
                                <TableCell>{tx.record.category}</TableCell>
                                <TableCell>{tx.record.counterparty}</TableCell>
                                <TableCell>{tx.record.description}</TableCell>
                                <TableCell>{tx.record.amount}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => tryMatchTransaction(tx.record)}
                                            disabled={matchingStates[tx.record.transactionNo]}
                                        >
                                            {matchingStates[tx.record.transactionNo] ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    匹配中
                                                </>
                                            ) : (
                                                <>
                                                    <Wand2 className="mr-2 h-4 w-4" />
                                                    尝试匹配
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setManualMatchTransaction(tx)}
                                        >
                                            <Pencil className="mr-2 h-4 w-4" />
                                            手动匹配
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedTransaction(tx.record)}
                                        >
                                            设置规则
                                        </Button>
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
                onRuleCreated={(ruleId) => {
                    setSelectedTransaction(null);
                    onRuleCreated(ruleId);
                }}
            />

            {manualMatchTransaction && (
                <ManualMatchDialog
                    transaction={manualMatchTransaction.record}
                    open={!!manualMatchTransaction}
                    onOpenChange={(open) => !open && setManualMatchTransaction(null)}
                    onConfirm={handleManualMatch}
                    suggestedTargetAccount={
                        manualMatchTransaction.targetAccount
                    }
                    suggestedMethodAccount={
                        manualMatchTransaction.methodAccount
                    }
                />
            )}
        </div>
    )
} 