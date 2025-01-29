import { createTransaction, parseAlipayCSV } from '@/lib/importers/alipay';
import { NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import iconv from 'iconv-lite';
import { MatchResult, matchTransactions } from '@/lib/importers/matcher';
import { ImportRecord } from '@/lib/types/transaction';
import { prisma } from '@/lib/prisma';

interface ImportResponse {
    matched: number;
    unmatched: MatchResult[];
}

interface ErrorResponse {
    error: string;
}

// 处理单条记录
async function processRawRecord(record: ImportRecord) {
    // 检查是否已导入
    const existingRawTx = await prisma.rawTransaction.findUnique({
        where: {
            source_identifier: {
                source: 'alipay',
                identifier: record.transactionNo.trim()
            }
        },
        include: {
            transaction: true
        }
    });

    // 如果已经有关联的交易记录，跳过处理
    if (existingRawTx?.transaction) {
        return null;
    }

    // 清理和转换数据
    const amount = parseFloat(record.amount.replace(',', ''));
    const date = new Date(record.transactionTime);

    // 获取或创建原始记录
    const rawTransaction = existingRawTx || await prisma.rawTransaction.create({
        data: {
            source: 'alipay',
            identifier: record.transactionNo.trim(),
            rawData: record as any,
            createdAt: date
        }
    });

    return {
        record,
        rawTransaction,
        amount,
        date
    };
}

export async function POST(request: Request): Promise<NextResponse<ImportResponse | ErrorResponse>> {
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
        // 将 GBK 编码的内容转换为 UTF-8
        const decodedContent = iconv.decode(buffer, 'gbk');
        const utf8Buffer = Buffer.from(decodedContent, 'utf8');
        const tempPath = 'tmp/alipay.csv';
        await writeFile(tempPath, utf8Buffer);

        // 导入记录
        const records = await parseAlipayCSV(tempPath);
        const { matched, unmatched } = await matchTransactions(records, 'alipay');

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
            { error: 'Failed to process file' } as ErrorResponse,
            { status: 500 }
        );
    }
} 