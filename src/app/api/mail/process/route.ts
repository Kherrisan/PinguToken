import { NextResponse } from "next/server";
import { unlink, writeFile, readdir, mkdir } from "fs/promises";
import path from "path";
import AdmZip from 'adm-zip';
import fs from 'fs/promises';

interface ProcessRequest {
    downloadLink: string;
    provider: string;
    password?: string;
    emailDate: string;
}

const TEMP_DIR = path.join(process.cwd(), 'tmp');
const UNZIP_DIR = path.join(TEMP_DIR, 'unzipped');

// 确保临时目录存在
async function ensureDirs() {
    try {
        await fs.access(TEMP_DIR);
    } catch {
        await mkdir(TEMP_DIR, { recursive: true });
    }
    try {
        await fs.access(UNZIP_DIR);
    } catch {
        await mkdir(UNZIP_DIR, { recursive: true });
    }
}

// 下载文件
async function downloadFile(url: string, filename: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const filePath = path.join(TEMP_DIR, filename);
    await writeFile(filePath, Buffer.from(buffer));
    
    return filePath;
}

// 生成文件名
function generateFileName(provider: string, emailDate: string): string {
    const date = new Date(emailDate);
    const timestamp = date.getTime();
    return `${provider}_${timestamp}.zip`;
}

// 检查文件是否存在
async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// 处理解压后的文件
async function processUnzippedFile(provider: string): Promise<any> {
    const files = await readdir(UNZIP_DIR);
    if (files.length === 0) {
        throw new Error('No file found in zip archive');
    }

    // 获取完整的 API URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    if (provider == 'wechatpay') {
        const folder = files.find(file => file.includes('微信支付账单'));
        if (!folder) {
            throw new Error('微信支付账单文件夹未找到');
        }

        const folderPath = path.join(UNZIP_DIR, folder);
        const folderFiles = await readdir(folderPath);
        const csvFile = folderFiles.find(file => file.endsWith('.csv'));

        if (!csvFile) {
            throw new Error('CSV文件未找到');
        }

        const filePath = path.join(folderPath, csvFile);
        const content = await fs.readFile(filePath);

        const formData = new FormData();
        formData.append('file', new Blob([content]), csvFile);

        const response = await fetch(`${baseUrl}/api/import/${provider}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Failed to import file: ${csvFile}`);
        }

        return response.json();
    }
    
    // 只处理第一个文件
    const file = files[0];
    const filePath = path.join(UNZIP_DIR, file);
    const content = await fs.readFile(filePath);
    
    const formData = new FormData();
    formData.append('file', new Blob([content]), file);
    
    const response = await fetch(`${baseUrl}/api/import/${provider}`, {
        method: 'POST',
        body: formData,
    });
    
    if (!response.ok) {
        throw new Error(`Failed to import file: ${file}`);
    }
    
    return response.json();
}

// 递归删除解压的文件和文件夹
async function removeDir(dirPath: string) {
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            await removeDir(fullPath);
        } else {
            try {
                await unlink(fullPath);
            } catch (error) {
                console.error(`Failed to delete file: ${fullPath}`, error);
            }
        }
    }
    
    try {
        await fs.rmdir(dirPath);
    } catch (error) {
        console.error(`Failed to delete directory: ${dirPath}`, error);
    }
}

// 清理临时文件
async function cleanup(zipPath: string) {
    try {
        // 清理解压目录
        await removeDir(UNZIP_DIR);
        
        // 重新创建解压目录
        await mkdir(UNZIP_DIR, { recursive: true });
        
        // 删除zip文件
        // try {
        //     await unlink(zipPath);
        // } catch (error) {
        //     console.error(`Failed to delete zip file: ${zipPath}`, error);
        // }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

export async function POST(request: Request) {
    try {
        const body: ProcessRequest = await request.json();
        const { downloadLink, provider, password, emailDate } = body;
        
        if (!downloadLink || !emailDate) {
            return NextResponse.json({
                success: false,
                error: 'Download link and email date are required'
            }, { status: 400 });
        }

        // 确保目录存在
        await ensureDirs();
        
        // 生成文件名并检查是否存在
        const filename = generateFileName(provider, emailDate);
        const zipPath = path.join(TEMP_DIR, filename);
        
        // 如果文件不存在，则下载
        if (!await checkFileExists(zipPath)) {
            await downloadFile(downloadLink, filename);
        }
        
        // 解压文件
        const zip = new AdmZip(zipPath);
        if (password) {
            zip.getEntries().forEach((entry) => {
                (entry as any).encryptionMethod = 0x0001;  // 标准加密方法
                (entry as any).header.flags |= 0x0001;     // 设置加密标志
            });
        }
        
        try {
            zip.extractAllTo(UNZIP_DIR, true, undefined, password);
        } catch (error) {
            console.error('Failed to extract zip:', error);
            return NextResponse.json({
                success: false,
                error: 'Invalid password or corrupted zip file'
            }, { status: 400 });
        }
        
        // 处理解压后的文件
        const importResult = await processUnzippedFile(provider);
        
        // 清理临时文件
        await cleanup(zipPath);
        
        // 直接返回导入接口的响应
        return NextResponse.json({
            success: true,
            data: importResult
        });
        
    } catch (error) {
        console.error('Failed to process bill:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process bill' },
            { status: 500 }
        );
    }
} 