import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { matchTransactions } from '@/lib/importers/matcher'

export async function POST(request: Request) {
    try {
        const { source, transactions } = await request.json()

        // 批量匹配规则
        const { matched, unmatched } = await matchTransactions(transactions, source)
        
        // 过滤出成功匹配的交易
        const matchedTransactions = matched.filter(
            m => m.targetAccount && m.methodAccount
        );

        if (matchedTransactions.length === 0) {
            return NextResponse.json({ 
                matched: false,
                message: 'No transactions matched'
            });
        }

        // 批量创建交易记录
        await Promise.all(matchedTransactions.map(async (matchResult) => {
            const transaction = matchResult.record;
            
            // 创建原始交易记录
            const rawTransaction = await prisma.rawTransaction.create({
                data: {
                    source,
                    identifier: transaction.transactionNo.trim(),
                    rawData: transaction as any,
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
                    }
                }
            });
        }));

        return NextResponse.json({ 
            matched: true,
            count: matchedTransactions.length
        });
    } catch (error) {
        console.error('Failed to match transactions:', error);
        return NextResponse.json(
            { error: 'Failed to match transactions' },
            { status: 500 }
        );
    }
} 