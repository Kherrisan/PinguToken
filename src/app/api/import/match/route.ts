import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { matchTransactions } from '@/lib/importers/matcher'

export async function POST(request: Request) {
    try {
        const { source, transaction } = await request.json()

        // 尝试匹配规则
        const { matched, unmatched } = await matchTransactions([transaction], source)
        
        if (unmatched.length > 0 || !matched[0].targetAccount || !matched[0].methodAccount) {
            return NextResponse.json({ matched: false })
        }

        const matchResult = matched[0]

        // 创建原始交易记录
        const rawTransaction = await prisma.rawTransaction.create({
            data: {
                source,
                identifier: transaction.transactionNo.trim(),
                rawData: transaction,
                createdAt: new Date(transaction.transactionTime)
            }
        })

        // 创建结构化交易记录
        const amount = parseFloat(transaction.amount)
        const date = new Date(transaction.transactionTime)

        await prisma.transaction.create({
            data: {
                date,
                payee: transaction.counterparty,
                narration: transaction.description,
                createdAt: date,
                rawRecords: {
                    connect: {
                        id: rawTransaction.id
                    }
                },
                postings: {
                    create: [
                        {
                            account: {
                                connect: {
                                    id: matchResult.methodAccount
                                }
                            },
                            createdAt: date,
                            amount: -amount,
                            currency: 'CNY'
                        },
                        {
                            account: {
                                connect: {
                                    id: matchResult.targetAccount
                                }
                            },
                            createdAt: date,
                            amount: amount,
                            currency: 'CNY'
                        }
                    ]
                },
                tags: {
                    connectOrCreate: {
                        where: { name: transaction.category },
                        create: { name: transaction.category }
                    }
                }
            }
        })

        return NextResponse.json({ matched: true })
    } catch (error) {
        console.error('Failed to match transaction:', error)
        return NextResponse.json(
            { error: 'Failed to match transaction' },
            { status: 500 }
        )
    }
} 