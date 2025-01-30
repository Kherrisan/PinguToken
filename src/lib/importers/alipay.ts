import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { prisma } from '@/lib/prisma';
import iconv from 'iconv-lite';
import { ImportRecord } from '@/lib/types/transaction';
import { RawTransaction, Transaction } from '@prisma/client';

interface ProcessedRecord {
    record: ImportRecord;
    rawTransaction: RawTransaction;
    amount: number;
    date: Date;
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

// 处理单条记录
async function processRawRecord(record: ImportRecord): Promise<ProcessedRecord | null> {
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
            rawData: JSON.stringify(record),
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

// 根据账户路径获取或创建账户
async function getOrCreateAccount(accountPath: string): Promise<string> {
    const parts = accountPath.split(':');
    let parentId: string | null = null;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
        const name = parts[i];
        currentPath = currentPath ? `${currentPath}:${name}` : name;
        const type = i === 0 ? getAccountType(parts[0]) : undefined;

        try {
            // 先尝试查找已存在的账户
            let currentAccount = await prisma.account.findUnique({
                where: { id: currentPath }
            });

            // 如果账户不存在，则创建新账户
            if (!currentAccount) {
                currentAccount = await prisma.account.create({
                    data: {
                        id: currentPath,
                        name,
                        type: type ?? 'EXPENSES',
                        currency: 'CNY',
                        parentId
                    }
                });
            }

            parentId = currentPath;
        } catch (error) {
            console.error(`Error creating account ${accountPath} at part ${name}:`, error);
            throw error;
        }
    }

    return currentPath;  // 返回完整的账户路径作为 ID
}

// 根据账户路径第一段判断账户类型
function getAccountType(firstPart: string): 'ASSETS' | 'LIABILITIES' | 'INCOME' | 'EXPENSES' | 'EQUITY' {
    const typeMap: Record<string, 'ASSETS' | 'LIABILITIES' | 'INCOME' | 'EXPENSES' | 'EQUITY'> = {
        'Assets': 'ASSETS',
        'Liabilities': 'LIABILITIES',
        'Income': 'INCOME',
        'Expenses': 'EXPENSES',
        'Equity': 'EQUITY'
    };
    return typeMap[firstPart] || 'EXPENSES';
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
