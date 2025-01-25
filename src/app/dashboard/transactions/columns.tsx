"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useRouter } from "next/navigation"

export type Transaction = {
    id: string
    date: string
    payee: string
    narration: string
    amount: string
    tags: string
    accounts: string
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
        accessorKey: "tags",
        header: "标签",
    },
    {
        accessorKey: "accounts",
        header: "账户",
    },
] 