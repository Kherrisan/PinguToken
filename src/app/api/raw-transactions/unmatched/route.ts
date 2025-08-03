import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { MatchResult, matchTransactions } from '@/lib/importers/matcher';
import { ImportRecord } from '@/lib/types/transaction';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const source = searchParams.get('source');
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');

        // 构建查询条件
        const whereClause: any = {
            transactionId: null // 确保没有关联的交易记录
        };

        // 如果指定了来源，添加来源过滤
        if (source) {
            whereClause.source = source;
        }

        // 获取总数
        const total = await prisma.rawTransaction.count({
            where: whereClause
        });

        // 获取未匹配的原始交易记录
        const rawTransactions = await prisma.rawTransaction.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc'
            },
            skip: (page - 1) * pageSize,
            take: pageSize
        });

        const records: ImportRecord[] = rawTransactions.map(tx => {
            const rawTxData = tx.rawData as any;
            return {
                transactionTime: rawTxData.transactionTime,
                category: rawTxData.category,
                counterparty: rawTxData.counterparty,
                counterpartyAccount: rawTxData.counterpartyAccount || '',
                description: rawTxData.description,
                type: rawTxData.type,
                amount: rawTxData.amount,
                paymentMethod: rawTxData.paymentMethod,
                transactionNo: rawTxData.transactionNo,
                merchantOrderNo: rawTxData.merchantOrderNo,
                remarks: rawTxData.remarks,
                provider: rawTxData.provider,
                rawTxId: tx.id
            };
        });

        const alipayRecords: ImportRecord[] = records.filter(r => r.provider === 'alipay');
        console.log('alipayRecords', alipayRecords);
        const wechatpayRecords: ImportRecord[] = records.filter(r => r.provider === 'wechatpay');
        console.log('wechatpayRecords', wechatpayRecords);

        const alipayMatchResults = await matchTransactions(alipayRecords)
        console.log('alipayMatchResults', alipayMatchResults);
        const wechatpayMatchResult = await matchTransactions(wechatpayRecords)
        console.log('wechatpayMatchResult', wechatpayMatchResult);
        const matchResults = [...alipayMatchResults, ...wechatpayMatchResult]

        return NextResponse.json({
            data: matchResults,
            pagination: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        console.error('Failed to fetch unmatched raw transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch unmatched raw transactions' },
            { status: 500 }
        );
    }
} 