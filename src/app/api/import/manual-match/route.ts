import { prisma } from '@/lib/prisma'
import { ImportRecord } from '@/lib/types/transaction';
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { source, records } = await request.json()

        // 批量创建交易记录
        await Promise.all(records.map(async ({ record, targetAccount, methodAccount }: { record: ImportRecord, targetAccount: string, methodAccount: string }) => {
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