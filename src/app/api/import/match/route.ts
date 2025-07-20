import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { matchTransactions } from '@/lib/importers/matcher'

export async function POST(request: Request) {
    try {
        const { records } = await request.json()

        // 批量匹配规则
        const matchResult = await matchTransactions(records)
        
        // 过滤出成功匹配的交易
        const matchedTransactions = matchResult.filter(
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
            const record = matchResult.record;

            // 创建结构化交易记录
            const amount = parseFloat(record.amount);
            const date = new Date(record.transactionTime);

            await prisma.transaction.create({
                data: {
                    date,
                    payee: record.counterparty,
                    narration: record.description,
                    createdAt: date,
                    rawRecords: {
                        connect: {
                            id: record.rawTxId
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