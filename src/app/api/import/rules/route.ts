import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            sourceId,
            name,
            description,
            targetAccount,
            methodAccount,
            typePattern,
            categoryPattern,
            peerPattern,
            descPattern,
            timePattern,
            amountMin,
            amountMax,
            statusPattern,
            methodPattern,
        } = body

        // 验证必填字段
        if (!sourceId || !name || (!targetAccount && !methodAccount)) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // 验证导入源是否存在
        const importSource = await prisma.importSource.findUnique({
            where: { id: sourceId }
        })

        if (!importSource) {
            return NextResponse.json(
                { error: 'Import source not found' },
                { status: 400 }
            )
        }

        // 验证账户是否存在
        if (targetAccount) {
            const account = await prisma.account.findUnique({
                where: { id: targetAccount }
            })
            if (!account) {
                return NextResponse.json(
                    { error: 'Target account not found' },
                    { status: 400 }
                )
            }
        }

        if (methodAccount) {
            const account = await prisma.account.findUnique({
                where: { id: methodAccount }
            })
            if (!account) {
                return NextResponse.json(
                    { error: 'Method account not found' },
                    { status: 400 }
                )
            }
        }

        // 验证时间范围格式
        if (timePattern && !timePattern.match(/^\d{2}:\d{2}-\d{2}:\d{2}$/)) {
            return NextResponse.json(
                { error: 'Invalid time pattern format' },
                { status: 400 }
            )
        }

        // 验证金额范围
        if (amountMin && isNaN(Number(amountMin))) {
            return NextResponse.json(
                { error: 'Invalid minimum amount' },
                { status: 400 }
            )
        }

        if (amountMax && isNaN(Number(amountMax))) {
            return NextResponse.json(
                { error: 'Invalid maximum amount' },
                { status: 400 }
            )
        }

        // 验证正则表达式
        const patterns = [
            { name: 'type', pattern: typePattern },
            { name: 'category', pattern: categoryPattern },
            { name: 'peer', pattern: peerPattern },
            { name: 'description', pattern: descPattern },
            { name: 'status', pattern: statusPattern },
            { name: 'method', pattern: methodPattern }
        ]

        for (const { name, pattern } of patterns) {
            if (pattern) {
                try {
                    new RegExp(pattern)
                } catch (e) {
                    return NextResponse.json(
                        { error: `Invalid ${name} pattern` },
                        { status: 400 }
                    )
                }
            }
        }

        // 创建规则
        const rule = await prisma.importRule.create({
            data: {
                sourceId: importSource.id,
                name,
                description,
                targetAccount,
                methodAccount,
                typePattern,
                categoryPattern,
                peerPattern,
                descPattern,
                timePattern,
                amountMin: amountMin ? Number(amountMin) : null,
                amountMax: amountMax ? Number(amountMax) : null,
                statusPattern,
                methodPattern,
                priority: 0,
                enabled: true
            }
        })

        return NextResponse.json(rule)
    } catch (error) {
        console.error('Failed to create rule:', error)
        return NextResponse.json(
            { error: 'Failed to create rule' },
            { status: 500 }
        )
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const sourceId = searchParams.get('sourceId')

        if (!sourceId) {
            return NextResponse.json(
                { error: 'Source ID is required' },
                { status: 400 }
            )
        }

        const rules = await prisma.importRule.findMany({
            where: {
                sourceId,
                enabled: true
            },
            orderBy: {
                priority: 'desc'
            }
        })

        return NextResponse.json(rules)
    } catch (error) {
        console.error('Failed to fetch rules:', error)
        return NextResponse.json(
            { error: 'Failed to fetch rules' },
            { status: 500 }
        )
    }
} 