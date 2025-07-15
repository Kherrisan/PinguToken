import { NextResponse } from 'next/server';
import { MatchResult } from '@/lib/importers/matcher';
import { processCsvFile } from '@/lib/importers/processor';

export interface ImportResponse {
    matched: number;
    unmatched: MatchResult[];
}

export interface ErrorResponse {
    error: string;
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

        // 使用通用处理函数
        const result = await processCsvFile({
            provider: 'alipay',
            file
        });

        return NextResponse.json(result as ImportResponse);
    } catch (error) {
        console.error('Error processing file:', error);
        return NextResponse.json(
            { error: 'Failed to process file' } as ErrorResponse,
            { status: 500 }
        );
    }
} 