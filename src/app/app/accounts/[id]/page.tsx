"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, Transaction } from "./columns"
import { formatDate } from "@/lib/utils"

interface AccountData {
    account: {
        id: string
        name: string
        type: string
        currency: string
        balance: string
    }
    transactions: Transaction[]
}

export default function AccountPage({
    params
}: {
    params: { id: string }
}) {
    const [data, setData] = useState<AccountData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetch(`/api/accounts/${params.id}`)
            .then(res => res.json())
            .then(data => {
                // 格式化日期
                data.transactions = data.transactions.map(tx => ({
                    ...tx,
                    date: formatDate(new Date(tx.date))
                }))
                setData(data)
                setIsLoading(false)
            })
            .catch(error => {
                console.error('Failed to fetch account:', error)
                setIsLoading(false)
            })
    }, [params.id])

    if (isLoading) return <div>加载中...</div>
    if (!data) return <div>账户不存在</div>

    const { account, transactions } = data

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col gap-6">
                {/* 账户信息 */}
                <div>
                    <h1 className="text-2xl font-semibold">{account.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        {account.id}
                    </p>
                </div>

                {/* 账户余额 */}
                <div className="rounded-lg border p-4">
                    <div className="text-sm font-medium text-muted-foreground">当前余额</div>
                    <div className={`text-2xl font-bold ${
                        Number(account.balance) < 0 ? "text-red-500" : "text-green-500"
                    }`}>
                        {new Intl.NumberFormat('zh-CN', {
                            style: 'currency',
                            currency: account.currency
                        }).format(Number(account.balance))}
                    </div>
                </div>

                {/* 交易明细 */}
                <div>
                    <h2 className="text-lg font-semibold mb-4">交易明细</h2>
                    <DataTable columns={columns} data={transactions} />
                </div>
            </div>
        </div>
    )
} 