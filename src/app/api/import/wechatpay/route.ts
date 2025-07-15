import { NextResponse } from 'next/server'
import { ErrorResponse, ImportResponse } from '../alipay/route';
import { processCsvFile } from '@/lib/importers/processor';

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

        // 使用通用处理函数
        const result = await processCsvFile({
            provider: 'wechatpay',
            file
        });

        return NextResponse.json(result as ImportResponse);
    } catch (error) {
        console.error('Error processing file:', error);
        return NextResponse.json(
            { error: 'Failed to process file' },
            { status: 500 }
        );
    }
} 