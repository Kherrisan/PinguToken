import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const account = await prisma.account.findUnique({
            where: { id: params.id },
            include: {
                postings: {
                    include: {
                        transaction: {
                            include: {
                                postings: {
                                    include: {
                                        account: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        })

        if (!account) {
            return NextResponse.json(
                { error: 'Account not found' },
                { status: 404 }
            )
        }

        // 处理交易数据
        const transactions = account.postings.map(posting => {
            const otherPosting = posting.transaction.postings.find(
                p => p.accountId !== account.id
            )
            
            return {
                id: posting.transaction.id,
                date: posting.transaction.date,
                payee: posting.transaction.payee,
                narration: posting.transaction.narration,
                amount: posting.amount.toString(),
                balance: "0", // 后面会计算
                otherAccount: otherPosting?.account.name || "未知账户"
            }
        })

        // 计算每笔交易后的余额
        let balance = 0
        transactions.reverse() // 先按时间正序
        transactions.forEach(tx => {
            balance += Number(tx.amount)
            tx.balance = balance.toFixed(2)
        })
        transactions.reverse() // 恢复时间倒序

        return NextResponse.json({
            account: {
                id: account.id,
                name: account.name,
                type: account.type,
                currency: account.currency,
                balance: balance.toFixed(2)
            },
            transactions
        })
    } catch (error) {
        console.error('Failed to fetch account:', error)
        return NextResponse.json(
            { error: 'Failed to fetch account' },
            { status: 500 }
        )
    }
} 