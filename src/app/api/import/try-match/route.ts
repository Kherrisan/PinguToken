import { NextResponse } from 'next/server'
import { matchTransactions } from '@/lib/importers/matcher'
import { ImportRecord } from '@/lib/types/transaction';

export async function POST(request: Request) {
    try {
        const { source, records }: { source: string, records: ImportRecord[] } = await request.json()

        // 批量尝试匹配规则
        const matchResults = await matchTransactions(records)
        
        // // 返回每个交易的匹配结果
        // const results = transactions.map((record: ImportRecord) => {
        //     const matchResult = matched.find(m => 
        //         m.record.transactionNo === record.transactionNo
        //     );
            
        //     if (!matchResult?.targetAccount || !matchResult?.methodAccount) {
        //         return {
        //             transactionNo: record.transactionNo,
        //             matched: false,
        //             targetAccount: matchResult?.targetAccount,
        //             methodAccount: matchResult?.methodAccount,
        //             rawTransactionId: record.rawTxId
        //         };
        //     }

        //     return {
        //         transactionNo: record.transactionNo,
        //         matched: true,
        //         targetAccount: matchResult.targetAccount,
        //         methodAccount: matchResult.methodAccount,
        //         rawTransactionId: matchResult.rawTransactionId
        //     };
        // });

        return NextResponse.json(matchResults);
    } catch (error) {
        console.error('Failed to match transactions:', error)
        return NextResponse.json(
            { error: 'Failed to match transactions' },
            { status: 500 }
        )
    }
} 