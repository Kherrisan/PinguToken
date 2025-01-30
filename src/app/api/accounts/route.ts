import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        // 获取所有账户及其交易明细
        const accounts = await prisma.account.findMany({
            include: {
                postings: true,
            },
            orderBy: {
                id: 'asc',
            },
        })

        // 计算每个账户的余额
        const accountsWithBalance = accounts.map(account => {
            const balance = account.postings.reduce(
                (sum, posting) => sum + Number(posting.amount),
                0
            )

            return {
                id: account.id,
                name: account.name,
                type: account.type,
                balance: balance.toFixed(2),
                currency: account.currency,
                path: account.id.split(':').join(' / '),
            }
        })

        return NextResponse.json(accountsWithBalance)
    } catch (error) {
        console.error('Failed to fetch accounts:', error)
        return NextResponse.json(
            { error: 'Failed to fetch accounts' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, type, parent, openBalance } = body

        if (!name || !type) {
            return NextResponse.json(
                { error: 'Name and type are required' },
                { status: 400 }
            )
        }

        // 验证账户类型
        const validTypes = ['ASSETS', 'LIABILITIES', 'INCOME', 'EXPENSES', 'EQUITY']
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: 'Invalid account type' },
                { status: 400 }
            )
        }

        // 如果指定了父账户，验证其存在性和类型匹配
        if (parent) {
            const parentAccount = await prisma.account.findUnique({
                where: { id: parent }
            })

            if (!parentAccount) {
                return NextResponse.json(
                    { error: 'Parent account not found' },
                    { status: 400 }
                )
            }

            if (parentAccount.type !== type) {
                return NextResponse.json(
                    { error: 'Parent account type does not match' },
                    { status: 400 }
                )
            }
        }

        // 构建账户 ID（完整路径）
        let accountId: string
        if (parent) {
            accountId = `${parent}:${name}`
        } else {
            // 根账户以类型作为前缀
            const typePrefix = {
                'ASSETS': 'Assets',
                'LIABILITIES': 'Liabilities',
                'INCOME': 'Income',
                'EXPENSES': 'Expenses',
                'EQUITY': 'Equity'
            }[type]
            accountId = `${typePrefix}:${name}`
        }

        // 检查账户 ID 是否已存在
        const existingAccount = await prisma.account.findUnique({
            where: { id: accountId }
        })

        if (existingAccount) {
            return NextResponse.json(
                { error: 'Account with this path already exists' },
                { status: 400 }
            )
        }

        // 创建新账户
        const account = await prisma.account.create({
            data: {
                id: accountId,
                name,
                type,
                parentId: parent || null,
                currency: 'CNY', // 默认使用人民币
            }
        })

        const date = new Date()
        // 如果有初始余额，创建一个初始化交易
        await prisma.transaction.create({
            data: {
                date,
                createdAt: date,
                payee: '初始化',
                narration: '账户初始化',
                postings: {
                    create: [
                        {
                            account: {
                                connect: {
                                    id: account.id
                                }
                            },
                            amount: openBalance || 0,
                            currency: 'CNY'
                        },
                        {
                            account: {
                                connect: {
                                    id: 'Equity:OpenBalance'
                                }
                            },
                            amount: -(openBalance || 0),
                            currency: 'CNY'
                        }
                    ]
                }
            }
        })

        return NextResponse.json(account)
    } catch (error) {
        console.error('Failed to create account:', error)
        return NextResponse.json(
            { error: 'Failed to create account' },
            { status: 500 }
        )
    }
} 