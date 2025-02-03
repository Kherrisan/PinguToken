import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import { notFound } from "next/navigation"
import { cn } from "@/lib/utils"

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
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold">交易详情</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">基本信息</h3>
                            <div className="space-y-2">
                                <div><span className="font-medium">交易时间：</span>{formatDate(transaction.date)}</div>
                                <div><span className="font-medium">交易对手：</span>{transaction.payee}</div>
                                <div><span className="font-medium">描述：</span>{transaction.narration}</div>
                                <div><span className="font-medium">标签：</span>
                                    {transaction.tags.map(tag => tag.name).join(", ") || "无"}
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">来源信息</h3>
                            <div className="space-y-2">
                                <div>
                                    <span className="font-medium">数据来源：</span>
                                    {transaction.rawRecords[0]?.source || "手动录入"}
                                </div>
                                {transaction.rawRecords[0] && (
                                    <>
                                        <div>
                                            <span className="font-medium">原始标识：</span>
                                            {transaction.rawRecords[0].identifier}
                                        </div>
                                        <div>
                                            <span className="font-medium">导入时间：</span>
                                            {formatDate(transaction.rawRecords[0].createdAt)}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 分录列表 */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">分录明细</h3>
                    <div className="rounded-md border">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-2 text-left">账户</th>
                                    <th className="p-2 text-left">账户类型</th>
                                    <th className="p-2 text-right">金额</th>
                                    <th className="p-2 text-left">币种</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transaction.postings.map((posting) => (
                                    <tr key={posting.id} className="border-t">
                                        <td className="p-2">{posting.account.name}</td>
                                        <td className="p-2">{posting.account.type}</td>
                                        <td className={cn(
                                            "p-2 text-right",
                                            Number(posting.amount) < 0 ? "text-red-500" : "text-green-500"
                                        )}>
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

                {/* 原始数据 */}
                {transaction.rawRecords[0]?.rawData && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">原始数据</h3>
                        <div className="rounded-md bg-muted p-4">
                            <pre className="text-sm whitespace-pre-wrap">
                                {JSON.stringify(transaction.rawRecords[0].rawData, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 