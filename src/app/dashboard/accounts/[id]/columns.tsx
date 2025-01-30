"use client"

import { ColumnDef } from "@tanstack/react-table"

export type Transaction = {
    id: string
    date: string
    payee: string
    narration: string
    amount: string
    balance: string
    otherAccount: string
}

export const columns: ColumnDef<Transaction>[] = [
    {
        accessorKey: "date",
        header: "日期",
    },
    {
        accessorKey: "payee",
        header: "交易对手",
    },
    {
        accessorKey: "narration",
        header: "描述",
    },
    {
        accessorKey: "otherAccount",
        header: "对方账户",
    },
    {
        accessorKey: "amount",
        header: "金额",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount"))
            const formatted = new Intl.NumberFormat('zh-CN', {
                style: 'currency',
                currency: 'CNY'
            }).format(amount)
            
            return <div className={amount < 0 ? "text-red-500" : "text-green-500"}>
                {formatted}
            </div>
        }
    },
    {
        accessorKey: "balance",
        header: "余额",
        cell: ({ row }) => {
            const balance = parseFloat(row.getValue("balance"))
            const formatted = new Intl.NumberFormat('zh-CN', {
                style: 'currency',
                currency: 'CNY'
            }).format(balance)
            
            return <div className={balance < 0 ? "text-red-500" : "text-green-500"}>
                {formatted}
            </div>
        }
    },
] 