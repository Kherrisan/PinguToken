import { writeFile, unlink } from 'fs/promises';
import iconv from 'iconv-lite';
import { parseAlipayCSV, processRawRecord, createTransaction } from './alipay';
import { parseWeChatCSV } from './wechatpay';
import { matchTransactions, MatchResult } from './matcher';

export interface ProcessorResult {
    matched: number;
    unmatched: MatchResult[];
}

export type Provider = 'alipay' | 'wechatpay';

interface ProcessorConfig {
    provider: Provider;
    file: File;
    tempPathPrefix?: string;
}

/**
 * 通用的CSV文件处理函数
 * 支持支付宝和微信支付的CSV文件导入
 */
export async function processCsvFile({
    provider,
    file,
    tempPathPrefix = 'tmp'
}: ProcessorConfig): Promise<ProcessorResult> {
    const tempPath = `${tempPathPrefix}/${provider}.csv`;
    
    try {
        // 保存文件并处理编码
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        if (provider === 'alipay') {
            // 支付宝文件使用GBK编码，需要转换为UTF-8
            const decodedContent = iconv.decode(buffer, 'gbk');
            const utf8Buffer = Buffer.from(decodedContent, 'utf8');
            await writeFile(tempPath, utf8Buffer);
        } else {
            // 微信支付文件直接使用UTF-8编码
            await writeFile(tempPath, buffer);
        }

        console.log('tempPath', tempPath);

        // 解析CSV文件
        const records = await parseCsvByProvider(tempPath, provider);
        
        // 匹配交易记录
        const { matched, unmatched } = await matchTransactions(records, provider);

        // 处理匹配的记录
        await processMatchedRecords(matched);

        return {
            matched: matched.length,
            unmatched: unmatched
        };
    } finally {
        // 清理临时文件
        try {
            await unlink(tempPath);
        } catch (error) {
            console.warn(`Failed to clean up temp file ${tempPath}:`, error);
        }
    }
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
async function processMatchedRecords(matched: any[]) {
    for (const match of matched) {
        const { record, targetAccount, methodAccount } = match;
        const processedRecord = await processRawRecord(record);
        
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
    // 创建一个模拟的File对象
    const file = new File([buffer], filename, { type: 'text/csv' });
    
    return await processCsvFile({
        provider,
        file,
        tempPathPrefix
    });
} 