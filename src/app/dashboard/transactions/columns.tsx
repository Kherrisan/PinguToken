"use client"

import { $Enums } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"

export type Transaction = {
    id: string
    date: string
    payee: string
    narration: string
    amount: string
    accounts: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        currency: string;
        type: $Enums.AccountType;
        parentId: string | null;
    }[]
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
            }).format(Math.abs(amount))
            
            // 根据第一个账户是否以 Expenses 开头来判断是否为支出
            const accounts = row.original.accounts
            const isExpense = accounts[0].type === 'ASSETS'
            
            return <div className={isExpense ? "text-red-500" : "text-green-500"}>
                {isExpense ? `-${formatted}` : formatted}
            </div>
        }
    },
    {
        accessorKey: "accounts",
        header: "账户",
        cell: ({ row }) => {
            const accounts = row.original.accounts
            return accounts.map(acc => acc.name).join(" / ")
        }
    },
] 