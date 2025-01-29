import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { source, transactions } = await request.json()

        // 批量创建交易记录
        await Promise.all(transactions.map(async ({ transaction, targetAccount, methodAccount }) => {
            // 创建原始交易记录
            const rawTransaction = await prisma.rawTransaction.create({
                data: {
                    source,
                    identifier: transaction.transactionNo.trim(),
                    rawData: transaction,
                    createdAt: new Date(transaction.transactionTime)
                }
            });

            // 创建结构化交易记录
            const amount = parseFloat(transaction.amount);
            const date = new Date(transaction.transactionTime);

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
                                        id: methodAccount
                                    }
                                },
                                createdAt: date,
                                amount: -amount,
                                currency: 'CNY'
                            },
                            {
                                account: {
                                    connect: {
                                        id: targetAccount
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
            });
        }));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to manually match transactions:', error);
        return NextResponse.json(
            { error: 'Failed to match transactions' },
            { status: 500 }
        );
    }
} 