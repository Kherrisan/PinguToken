import { prisma } from "@/lib/prisma"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"
import { columns } from "./columns"

async function getTransactions() {
    const transactions = await prisma.transaction.findMany({
        include: {
            postings: {
                include: {
                    account: true
                }
            },
            tags: true
        },
        orderBy: {
            date: 'desc'
        },
        take: 100
    })

    return transactions.map(tx => ({
        id: tx.id,
        date: formatDate(tx.date),
        payee: tx.payee,
        narration: tx.narration,
        amount: [...tx.postings].filter(p => p.amount > 0).reduce((sum, p) => sum + Number(p.amount), 0).toString(),
        accounts: [...tx.postings].sort((a, b) => a.amount - b.amount).map(p => p.account),
        tags: tx.tags.map(t => t.name).join(", "),
    }))
}

export default async function TransactionsPage() {
    const transactions = await getTransactions()

    return (
        <div className="container mx-auto py-10">
            <DataTable columns={columns} data={transactions} enableRowClick={true} />
        </div>
    )
} 