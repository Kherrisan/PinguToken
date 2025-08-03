import { ImportRecord } from "../types/transaction"
import { readFileSync } from "fs"
import { parse } from "csv-parse"

export async function parseWeChatCSV(filePath: string): Promise<ImportRecord[]> {
    // 移除 CSV 文件头部的描述行
    // 先读取文件找到表头位置
    const fileContent = readFileSync(filePath);
    const lines = fileContent.toString().split('\n');

    // 找到表头行
    let headerLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('微信支付账单明细列表')) {
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
            'description',
            'type',
            'amount',
            'paymentMethod',
            'status',
            'transactionNo',
            'merchantOrderNo',
            'remarks',
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
        record.amount = record.amount.replace(/[¥,]/g, '')
        record.provider = 'wechatpay' // 设置来源为微信支付
        records.push(record);
    }

    return records;
} 