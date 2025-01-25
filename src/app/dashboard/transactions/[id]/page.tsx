import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import { notFound } from "next/navigation"

async function getTransaction(id: string) {
    const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
            postings: {
                include: {
                    account: true
                }
            },
            tags: true,
            rawRecords: true
        }
    })

    if (!transaction) {
        notFound()
    }

    return transaction
}

export default async function TransactionPage({
    params
}: {
    params: { id: string }
}) {
    const transaction = await getTransaction(params.id)

    return (
        <div className="container mx-auto py-10">
            <div className="rounded-lg border p-6 space-y-6">
                {/* 基本信息 */}
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">交易详情</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-muted-foreground">日期</label>
                            <div>{formatDate(transaction.date)}</div>
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">交易对手</label>
                            <div>{transaction.payee}</div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm text-muted-foreground">描述</label>
                            <div>{transaction.narration}</div>
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">标签</label>
                            <div>{transaction.tags.map(t => t.name).join(", ")}</div>
                        </div>
                    </div>
                </div>

                {/* 分录列表 */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">分录明细</h3>
                    <div className="rounded-md border">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-2 text-left">账户</th>
                                    <th className="p-2 text-right">金额</th>
                                    <th className="p-2 text-left">币种</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transaction.postings.map((posting) => (
                                    <tr key={posting.id} className="border-t">
                                        <td className="p-2">{posting.account.name}</td>
                                        <td className={`p-2 text-right ${Number(posting.amount) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {Number(posting.amount).toLocaleString('zh-CN', {
                                                style: 'decimal',
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </td>
                                        <td className="p-2">{posting.currency}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
} 