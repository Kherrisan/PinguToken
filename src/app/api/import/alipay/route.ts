import { importAlipayCSV } from '@/lib/importers/alipay';
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import iconv from 'iconv-lite';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 创建临时目录（如果不存在）
        const tmpDir = join(process.cwd(), 'tmp');
        await mkdir(tmpDir, { recursive: true });

        // 获取文件内容并转换编码
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // GBK 转 UTF-8
        const utf8Content = iconv.decode(buffer, 'gbk');
        const utf8Buffer = Buffer.from(utf8Content, 'utf8');

        // 保存为 UTF-8 编码的文件
        const filePath = join(tmpDir, `alipay-${Date.now()}.csv`);
        await writeFile(filePath, utf8Buffer);

        // 导入数据
        await importAlipayCSV(filePath);

        return NextResponse.json({ message: 'Import completed' });
    } catch (error) {
        console.error('Import failed:', error);
        return NextResponse.json({ error: 'Import failed' }, { status: 500 });
    }
} 