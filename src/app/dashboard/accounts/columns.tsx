"use client"

import { ColumnDef } from "@tanstack/react-table"
import { AccountType } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

const accountTypeNames: Record<AccountType, string> = {
    ASSETS: '资产',
    LIABILITIES: '负债',
    INCOME: '收入',
    EXPENSES: '支出',
    EQUITY: '权益'
}

export type Account = {
    id: string
    name: string
    type: AccountType
    balance: string
    currency: string
    path: string
}

function AdjustBalanceDialog({ 
    account, 
    open, 
    onOpenChange,
    onSuccess
}: { 
    account: Account
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}) {
    const [amount, setAmount] = useState("0")
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (open) {
            setAmount(account.balance)
        } else {
            setAmount("0")
        }
        setIsSubmitting(false)
    }, [open, account.balance])

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true)
            const adjustment = parseFloat(amount) - parseFloat(account.balance)
            
            const response = await fetch('/api/accounts/adjust-balance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId: account.id,
                    amount: adjustment,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to adjust balance')
            }

            await onSuccess()

            toast({
                title: "余额调整成功",
                description: `${account.path} 的余额已更新`,
            })
            
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to adjust balance:', error)
            toast({
                title: "余额调整失败",
                description: "请重试",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>调整账户余额</DialogTitle>
                    <DialogDescription>
                        {account.path}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>当前余额</Label>
                        <div className="text-lg font-semibold">
                            {new Intl.NumberFormat('zh-CN', {
                                style: 'currency',
                                currency: account.currency
                            }).format(parseFloat(account.balance))}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="amount">新余额</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="输入新的余额"
                        />
                    </div>
                    {amount !== account.balance && (
                        <div className="text-sm text-muted-foreground">
                            调整金额：
                            <span className={parseFloat(amount) > parseFloat(account.balance) ? "text-green-500" : "text-red-500"}>
                                {new Intl.NumberFormat('zh-CN', {
                                    style: 'currency',
                                    currency: account.currency
                                }).format(parseFloat(amount) - parseFloat(account.balance))}
                            </span>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || amount === account.balance}
                    >
                        {isSubmitting ? "调整中..." : "确认调整"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export const columns: ColumnDef<Account>[] = [
    {
        accessorKey: "path",
        header: "账户",
    },
    {
        accessorKey: "type",
        header: "类型",
        cell: ({ row }) => {
            return accountTypeNames[row.getValue("type")]
        }
    },
    {
        accessorKey: "balance",
        header: "余额",
        cell: ({ row }) => {
            const balance = parseFloat(row.getValue("balance"))
            const formatted = new Intl.NumberFormat('zh-CN', {
                style: 'currency',
                currency: row.original.currency
            }).format(balance)
            
            return <div className={balance < 0 ? "text-red-500" : "text-green-500"}>
                {formatted}
            </div>
        }
    },
    {
        id: "actions",
        cell: ({ row, table }) => {
            const [open, setOpen] = useState(false)
            return (
                <>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setOpen(true)}
                    >
                        调整余额
                    </Button>
                    <AdjustBalanceDialog
                        account={row.original}
                        open={open}
                        onOpenChange={setOpen}
                        onSuccess={async () => {
                            const mutate = (table.options.meta as any)?.mutate
                            if (mutate) {
                                await mutate()
                            }
                        }}
                    />
                </>
            )
        }
    }
] 