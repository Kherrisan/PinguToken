'use client';

import { useState } from 'react';

export function AlipayUploader() {
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<string>('');

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setMessage('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/import/alipay', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '上传失败');
            }

            setMessage('导入成功！');
        } catch (error) {
            setMessage(`错误：${error instanceof Error ? error.message : '上传失败'}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-4">
            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                    上传支付宝账单 (CSV格式)
                </label>
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleUpload}
                    disabled={isUploading}
                    className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                />
            </div>
            {isUploading && (
                <div className="text-blue-600">正在导入...</div>
            )}
            {message && (
                <div className={`text-sm ${message.includes('错误') ? 'text-red-600' : 'text-green-600'}`}>
                    {message}
                </div>
            )}
        </div>
    );
} 