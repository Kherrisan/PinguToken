import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface QueryParams {
    startDate?: string;
    endDate?: string;
    minAmount?: string;
    maxAmount?: string;
    narration?: string;
    counterparty?: string;
    payingAccountId?: string;
    receivingAccountId?: string;
    page?: string;
    pageSize?: string;
}

type WhereCondition = {
    postings?: {
        some: {
            accountId?: { in: string[] };
            amount?: { lt?: number; gt?: number; gte?: number; lte?: number };
        };
    };
};

// 获取账户及其所有子账户的ID
async function getAccountAndDescendantsIds(accountId: string): Promise<string[]> {
    const accounts = await prisma.account.findMany({
        where: {
            OR: [
                { id: accountId },
                { id: { startsWith: accountId } }
            ]
        },
        select: { id: true }
    });
    return accounts.map(account => account.id);
}

// GET /api/transactions
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const params: QueryParams = {
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
            minAmount: searchParams.get('minAmount') || undefined,
            maxAmount: searchParams.get('maxAmount') || undefined,
            narration: searchParams.get('narration') || undefined,
            counterparty: searchParams.get('counterparty') || undefined,
            payingAccountId: searchParams.get('payingAccountId') || undefined,
            receivingAccountId: searchParams.get('receivingAccountId') || undefined,
            page: searchParams.get('page') || '1',
            pageSize: searchParams.get('pageSize') || '10',
        };

        // 构建查询条件
        let whereClause: any = {};

        // 日期范围
        if (params.startDate || params.endDate) {
            whereClause.date = {};
            if (params.startDate) {
                whereClause.date.gte = new Date(params.startDate);
            }
            if (params.endDate) {
                whereClause.date.lte = new Date(params.endDate);
            }
        }

        // 描述关键词
        if (params.narration) {
            whereClause.narration = {
                contains: params.narration,
                mode: 'insensitive'
            };
        }

        // 交易对手关键词
        if (params.counterparty) {
            whereClause.payee = {
                contains: params.counterparty,
                mode: 'insensitive'
            };
        }

        // 账户相关查询条件
        let accountConditions: WhereCondition[] = [];

        // 付款账户
        if (params.payingAccountId) {
            const payingAccountIds = await getAccountAndDescendantsIds(params.payingAccountId);
            accountConditions.push({
                postings: {
                    some: {
                        accountId: { in: payingAccountIds },
                        amount: { lt: 0 }
                    }
                }
            });
        }

        // 收款账户
        if (params.receivingAccountId) {
            const receivingAccountIds = await getAccountAndDescendantsIds(params.receivingAccountId);
            accountConditions.push({
                postings: {
                    some: {
                        accountId: { in: receivingAccountIds },
                        amount: { gt: 0 }
                    }
                }
            });
        }

        // 金额范围
        let amountConditions: WhereCondition[] = [];
        if (params.minAmount || params.maxAmount) {
            const amountClause: { gte?: number; lte?: number } = {};
            if (params.minAmount) {
                amountClause.gte = parseFloat(params.minAmount);
            }
            if (params.maxAmount) {
                amountClause.lte = parseFloat(params.maxAmount);
            }
            amountConditions.push({
                postings: {
                    some: {
                        amount: amountClause
                    }
                }
            });
        }

        // 合并所有条件
        whereClause = {
            ...whereClause,
            AND: [...accountConditions, ...amountConditions].filter(Boolean)
        };

        // 添加分页
        const page = parseInt(params.page || '1');
        const pageSize = parseInt(params.pageSize || '10');
        const skip = (page - 1) * pageSize;

        // 获取总数
        const total = await prisma.transaction.count({
            where: whereClause
        });

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
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
            skip,
            take: pageSize
        });

        return NextResponse.json({
            data: transactions,
            pagination: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        console.error('Failed to fetch transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        );
    }
}

// POST /api/transactions
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { date, counterparty, narration, postings } = body;

        // 验证输入
        if (!date || !Array.isArray(postings) || postings.length === 0) {
            return NextResponse.json(
                { error: 'Invalid input data' },
                { status: 400 }
            );
        }

        // 验证借贷平衡
        const sum = postings.reduce((acc, post) => acc + parseFloat(post.amount), 0);
        if (Math.abs(sum) > 0.001) { // 使用小数点后三位来检查是否为0
            return NextResponse.json(
                { error: 'Transaction is not balanced' },
                { status: 400 }
            );
        }

        // 创建交易
        const transaction = await prisma.transaction.create({
            data: {
                date: new Date(date),
                payee: counterparty || null,
                narration: narration || null,
                createdAt: new Date(date),
                postings: {
                    create: postings.map(posting => ({
                        amount: posting.amount,
                        account: {
                            connect: {
                                id: posting.accountId
                            }
                        },
                        currency: 'CNY'
                    }))
                }
            },
            include: {
                postings: {
                    include: {
                        account: true
                    }
                }
            }
        });

        return NextResponse.json(transaction);
    } catch (error) {
        console.error('Failed to create transaction:', error);
        return NextResponse.json(
            { error: 'Failed to create transaction' },
            { status: 500 }
        );
    }
} 