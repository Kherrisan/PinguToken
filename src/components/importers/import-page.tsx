'use client'

import { TransactionImportManager } from './transaction-import-manager'
import { EmailBillChecker } from './email-bill-checker'
import { RawTransactionFileUploader } from './raw-transaction-uploader'

export function ImportPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">交易数据导入</h1>
        <p className="text-gray-600">从邮件或文件导入交易数据到系统中</p>
      </div>

      <TransactionImportManager>
        {({ addImportResult, clearAllResults }) => (
          <div className="space-y-8">
            {/* 邮件导入 */}
            <EmailBillChecker onImportResult={addImportResult} />
            
            {/* 微信支付文件导入 */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">微信支付账单导入</h3>
                <p className="text-sm text-gray-600">上传微信支付的CSV账单文件</p>
              </div>
              <RawTransactionFileUploader 
                source="wechatpay" 
                onImportResult={addImportResult}
              />
            </div>
            
            {/* 支付宝文件导入 */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">支付宝账单导入</h3>
                <p className="text-sm text-gray-600">上传支付宝的CSV账单文件</p>
              </div>
              <RawTransactionFileUploader 
                source="alipay" 
                onImportResult={addImportResult}
              />
            </div>
          </div>
        )}
      </TransactionImportManager>
    </div>
  )
} 