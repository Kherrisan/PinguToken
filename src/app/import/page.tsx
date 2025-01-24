import { AlipayUploader } from '@/components/AlipayUploader';

export default function ImportPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">导入交易记录</h1>
            <AlipayUploader />
        </div>
    );
} 