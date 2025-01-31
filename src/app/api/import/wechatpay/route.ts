import { NextResponse } from 'next/server'
import { ErrorResponse, ImportResponse } from '../alipay/route';
import { unlink, writeFile } from 'fs/promises';
import { parseWeChatCSV } from '@/lib/importers/wechatpay';
import { matchTransactions } from '@/lib/importers/matcher';
import { createTransaction, processRawRecord } from '@/lib/importers/alipay';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' } as ErrorResponse,
                { status: 400 }
            );
        }

        // 保存文件
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempPath = 'tmp/wechatpay.csv';
        await writeFile(tempPath, buffer);

        // 导入记录
        const records = await parseWeChatCSV(tempPath);
        const { matched, unmatched } = await matchTransactions(records, 'wechatpay');

        // 处理匹配的记录
        for (const match of matched) {
            const { record, targetAccount, methodAccount } = match;
            const processedRecord = await processRawRecord(record);
            
            if (processedRecord) {
                const { rawTransaction, amount, date } = processedRecord;
                // 创建结构化交易记录
                await createTransaction({
                    record,
                    targetAccount,
                    methodAccount,
                    rawTransaction,
                    amount,
                    date
                });
            }
        }

        // 删除临时文件
        await unlink(tempPath);

        return NextResponse.json({
            matched: matched.length,
            unmatched: unmatched
        } as ImportResponse);
    } catch (error) {
        console.error('Error processing file:', error);
        return NextResponse.json(
            { error: 'Failed to process file' },
            { status: 500 }
        );
    }
} 