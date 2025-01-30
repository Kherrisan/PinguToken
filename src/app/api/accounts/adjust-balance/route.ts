import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { accountId, amount } = await request.json()

        if (!accountId || typeof amount !== 'number') {
            return NextResponse.json(
                { error: 'Invalid input' },
                { status: 400 }
            )
        }

        const date = new Date()

        // 创建一个调整交易
        await prisma.transaction.create({
            data: {
                date,
                createdAt: date,
                payee: '余额调整',
                narration: '手动调整账户余额',
                postings: {
                    create: [
                        {
                            account: {
                                connect: {
                                    id: accountId
                                }
                            },
                            amount,
                            currency: 'CNY',
                            createdAt: date
                        },
                        {
                            account: {
                                connect: {
                                    id: 'Equity:UFO'
                                }
                            },
                            amount: -amount,
                            currency: 'CNY',
                            createdAt: date
                        }
                    ]
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to adjust balance:', error)
        return NextResponse.json(
            { error: 'Failed to adjust balance' },
            { status: 500 }
        )
    }
} 