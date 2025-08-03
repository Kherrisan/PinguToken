import { writeFile, unlink } from 'fs/promises';
import iconv from 'iconv-lite';
import { parseAlipayCSV, processRawRecord, createTransaction } from './alipay';
import { parseWeChatCSV } from './wechatpay';
import { matchTransactions, MatchResult } from './matcher';
import { prisma } from '@/lib/prisma';

export interface ProcessorResult {
    matched: number;
    unmatched: MatchResult[];
}

export type Provider = 'alipay' | 'wechatpay';

interface ProcessorConfig {
    provider: Provider;
    csvFilePath: string;
}

/**
 * 通用的CSV文件处理函数
 * 支持支付宝和微信支付的CSV文件导入
 */
export async function processCsvFile({
    provider,
    csvFilePath,
}: ProcessorConfig): Promise<ProcessorResult> {
    // 解析CSV文件
    const records = await parseCsvByProvider(csvFilePath, provider);
    console.log(`records: ${records.length}`)

    // 匹配交易记录
    const matchResults = await matchTransactions(records);
    const matched = matchResults.filter(r => r.targetAccount && r.methodAccount);
    const unmatched = matchResults.filter(r => !r.targetAccount || !r.methodAccount);
    console.log(`matched: ${matched.length}`)
    console.log(`unmatched: ${unmatched.length}`)

    // 处理匹配的记录
    await processMatchedRecords(matched, provider);

    // 处理未匹配的记录，插入到rawtransaction表中
    await processUnmatchedRecords(unmatched, provider);

    return {
        matched: matched.length,
        unmatched: unmatched
    };
}

/**
 * 根据提供商解析CSV文件
 */
async function parseCsvByProvider(filePath: string, provider: Provider) {
    switch (provider) {
        case 'alipay':
            return await parseAlipayCSV(filePath);
        case 'wechatpay':
            return await parseWeChatCSV(filePath);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

/**
 * 处理匹配的交易记录
 */
async function processMatchedRecords(matched: any[], provider: Provider) {
    for (const match of matched) {
        const { record, targetAccount, methodAccount } = match;
        console.log(`processing record: ${record}`)
        console.log(`targetAccount: ${targetAccount}`)
        console.log(`methodAccount: ${methodAccount}`)

        const processedRecord = await processRawRecord(record, provider);

        if (processedRecord) {
            const { rawTransaction, amount, date } = processedRecord;
            // 创建结构化交易记录
            await createTransaction({
                record,
                targetAccount: targetAccount!,
                methodAccount: methodAccount!,
                rawTransaction,
                amount,
                date
            });
        }
    }
}

/**
 * 处理未匹配的记录，插入到rawtransaction表中
 */
async function processUnmatchedRecords(unmatches: MatchResult[], provider: Provider) {
    for (const unmatch of unmatches) {
        const { record } = unmatch;
        console.log(`processing unmatched record: ${record.transactionNo}`)

        // 检查是否已存在
        const existingRawTx = await prisma.rawTransaction.findUnique({
            where: {
                source_identifier: {
                    source: provider,
                    identifier: record.transactionNo.trim()
                }
            }
        });

        if (!existingRawTx) {
            // 创建未匹配的原始交易记录
            const rawTransaction = await prisma.rawTransaction.create({
                data: {
                    source: provider,
                    identifier: record.transactionNo.trim(),
                    rawData: record as any,
                    createdAt: new Date(record.transactionTime)
                }
            });
            unmatch.record.rawTxId = rawTransaction.id;
        }
    }
}

/**
 * 处理文件Buffer（用于email导入场景）
 */
export async function processCsvBuffer({
    provider,
    buffer,
    filename,
    tempPathPrefix = 'tmp'
}: {
    provider: Provider;
    buffer: Buffer;
    filename: string;
    tempPathPrefix?: string;
}): Promise<ProcessorResult> {
    // 创建临时文件
    const tempFilePath = `${tempPathPrefix}/${filename}`;
    await writeFile(tempFilePath, buffer);

    try {
        const result = await processCsvFile({
            provider,
            csvFilePath: tempFilePath
        });
        return result;
    } finally {
        // 清理临时文件
        try {
            await unlink(tempFilePath);
        } catch (error) {
            console.error('Failed to delete temp file:', error);
        }
    }
} 