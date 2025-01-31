import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { prisma } from '@/lib/prisma';
import { ImportRecord } from '@/lib/types/transaction';
import { RawTransaction, Transaction } from '@prisma/client';

// 处理单条记录
export async function processRawRecord(record: ImportRecord) {
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
    const amount = parseFloat(record.amount.replace(/[,¥]/g, ''));
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

// 解析CSV文件
export async function parseAlipayCSV(filePath: string): Promise<ImportRecord[]> {
    // 先读取文件找到表头位置
    const fileContent = readFileSync(filePath);
    const lines = fileContent.toString().split('\n');

    // 找到表头行
    let headerLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('支付宝（中国）网络技术有限公司')) {
            headerLineIndex = i;
            break;
        }
    }

    if (headerLineIndex === -1) {
        throw new Error('Invalid file format: header not found');
    }

    // 从表头行之后的数据开始解析
    const validContent = lines.slice(headerLineIndex + 2).join('\n');
    const parser = parse({
        skip_empty_lines: true,
        columns: [
            'transactionTime',
            'category',
            'counterparty',
            'counterpartyAccount',
            'description',
            'type',
            'amount',
            'paymentMethod',
            'status',
            'transactionNo',
            'merchantOrderNo',
            'remarks',
            "others"
        ]
    });

    // 将有效内容转换为 Buffer 并创建流
    const contentBuffer = Buffer.from(validContent);
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(contentBuffer);

    const records: ImportRecord[] = [];

    // 处理数据
    for await (const record of bufferStream.pipe(parser)) {
        if (!record.transactionTime || !record.transactionNo) {
            continue; // 跳过空行或无效行
        }
        records.push(record);
    }

    return records;
}

interface CreateTransactionParams {
    record: ImportRecord;
    methodAccount: string;
    targetAccount: string;
    rawTransaction: RawTransaction;
    amount: number;
    date: Date;
}

// 创建结构化交易记录
export async function createTransaction(params: CreateTransactionParams): Promise<Transaction> {
    const { record, targetAccount, methodAccount, rawTransaction, amount, date } = params;

    return await prisma.transaction.create({
        data: {
            date,
            payee: record.counterparty,
            narration: record.description,
            createdAt: date,
            rawRecords: {
                connect: {
                    id: rawTransaction.id
                }
            },
            postings: {
                create: [
                    {
                        account: {
                            connect: {
                                id: record.type === '支出'
                                    ? methodAccount
                                    : targetAccount
                            }
                        },
                        createdAt: date,
                        amount: record.type === '支出' ? -amount : amount,
                        currency: 'CNY'
                    },
                    {
                        account: {
                            connect: {
                                id: record.type === '支出'
                                    ? targetAccount
                                    : methodAccount
                            }
                        },
                        createdAt: date,
                        amount: record.type === '支出' ? amount : -amount,
                        currency: 'CNY'
                    }
                ]
            },
        }
    });
}
