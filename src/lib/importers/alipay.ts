import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { prisma } from '@/lib/prisma';
import iconv from 'iconv-lite';
import { findMatchingRule } from '@/lib/config/matcher';
import { ImportRecord } from '@/lib/types/transaction';

// 解析CSV文件
export async function importAlipayCSV(filePath: string) {
    // 先读取文件找到表头位置
    const fileContent = readFileSync(filePath);
    const decodedContent = iconv.decode(fileContent, 'utf8');
    const lines = decodedContent.split('\n');

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
    const contentBuffer = Buffer.from(validContent, 'utf8');
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(contentBuffer);

    // 处理数据
    for await (const record of bufferStream.pipe(parser)) {
        try {
            if (!record.transactionTime || !record.transactionNo) {
                continue; // 跳过空行或无效行
            }

            await processAlipayRecord(record);
        } catch (error) {
            console.error(`Error processing record: ${record.transactionNo}`, error);
            console.error('Record data:', record);
        }
    }
}

// 处理单条记录
async function processAlipayRecord(record: ImportRecord) {
    // 获取支付宝导入源配置
    const importSource = await prisma.importSource.findUnique({
        where: { name: 'alipay' },
        include: { defaultConfig: true }
    });

    if (!importSource || !importSource.defaultConfig) {
        throw new Error('Alipay import configuration not found');
    }

    // 检查是否已导入
    const existingRawTx = await prisma.rawTransaction.findUnique({
        where: {
            source_identifier: {
                source: 'alipay',
                identifier: record.transactionNo.trim()
            }
        },
        include: {
            transaction: {
                include: {
                    postings: {
                        include: {
                            account: true
                        }
                    }
                }
            }
        }
    });

    // 如果存在记录且关联了交易
    if (existingRawTx?.transaction) {
        // 检查是否有 FIXME 账户
        const hasFixme = existingRawTx.transaction.postings.some(
            posting => posting.account.id.includes('FIXME')
        );

        // 如果有 FIXME 账户，删除相关记录
        if (hasFixme) {
            await prisma.$transaction([
                // 删除 postings
                prisma.posting.deleteMany({
                    where: {
                        transactionId: existingRawTx.transaction.id
                    }
                }),
                // 删除 transaction
                prisma.transaction.delete({
                    where: {
                        id: existingRawTx.transaction.id
                    }
                }),
                // 删除 rawTransaction
                prisma.rawTransaction.delete({
                    where: {
                        id: existingRawTx.id
                    }
                })
            ]);
        } else {
            // 如果没有 FIXME 账户，跳过处理
            return;
        }
    }

    // 清理和转换数据
    const amount = parseFloat(record.amount.replace(',', ''));
    const date = new Date(record.transactionTime);

    // 提取时间部分 HH:mm
    const timeMatch = record.transactionTime.match(/\d{2}:\d{2}/);
    const time = timeMatch ? timeMatch[0] : undefined;

    // 获取或创建原始记录
    const rawTransaction = existingRawTx || await prisma.rawTransaction.create({
        data: {
            source: 'alipay',
            identifier: record.transactionNo.trim(),
            rawData: record,
            createdAt: date
        }
    });

    // 只处理成功的交易
    if (record.status !== '退款成功' && record.status !== '交易关闭') {
        // 查找匹配的规则
        const matchedRule = await findMatchingRule('alipay', {
            type: record.type,
            category: record.category,
            peer: record.counterparty,
            description: record.description,
            amount: amount,
            time: time
        });

        // 确定账户
        const methodAccount = matchedRule?.methodAccount || importSource.defaultConfig.defaultMinusAccount;
        const targetAccount = matchedRule?.targetAccount || importSource.defaultConfig.defaultPlusAccount;

        // 创建结构化交易记录
        const transaction = await prisma.transaction.create({
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
                                    id: await getOrCreateAccount(methodAccount)
                                }
                            },
                            createdAt: date,
                            amount: record.type === '支出' ? -amount : amount,
                            currency: importSource.defaultConfig.defaultCurrency
                        },
                        {
                            account: {
                                connect: {
                                    id: await getOrCreateAccount(targetAccount)
                                }
                            },
                            createdAt: date,
                            amount: record.type === '支出' ? amount : -amount,
                            currency: importSource.defaultConfig.defaultCurrency
                        }
                    ]
                },
                tags: {
                    connectOrCreate: {
                        where: { name: record.category },
                        create: { name: record.category }
                    }
                }
            }
        });
    }
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