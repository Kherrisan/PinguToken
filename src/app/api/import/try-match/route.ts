import { NextResponse } from 'next/server'
import { matchTransactions } from '@/lib/importers/matcher'

export async function POST(request: Request) {
    try {
        const { source, transactions } = await request.json()

        // 批量尝试匹配规则
        const { matched, unmatched } = await matchTransactions(transactions, source)
        
        // 返回每个交易的匹配结果
        const results = transactions.map(transaction => {
            const matchResult = matched.find(m => 
                m.record.transactionNo === transaction.transactionNo
            );
            
            if (!matchResult?.targetAccount || !matchResult?.methodAccount) {
                return {
                    transactionNo: transaction.transactionNo,
                    matched: false,
                    targetAccount: matchResult?.targetAccount,
                    methodAccount: matchResult?.methodAccount
                };
            }

            return {
                transactionNo: transaction.transactionNo,
                matched: true,
                targetAccount: matchResult.targetAccount,
                methodAccount: matchResult.methodAccount
            };
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error('Failed to match transactions:', error)
        return NextResponse.json(
            { error: 'Failed to match transactions' },
            { status: 500 }
        )
    }
} 