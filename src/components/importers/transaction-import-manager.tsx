'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, Trash2 } from "lucide-react"
import { UnmatchedTransactions } from "./unmatched-transactions"
import { MatchResult } from '@/lib/importers/matcher'
import { formatDate } from '@/lib/utils'

export interface ImportResult {
  id: string
  source: string // 'email' | 'upload'
  provider?: string // 'wechat' | 'alipay'
  filename?: string
  emailSubject?: string
  matched: number
  unmatched: MatchResult[]
  processedAt: Date
}

interface TransactionImportManagerProps {
  children: (props: {
    addImportResult: (result: Omit<ImportResult, 'id' | 'processedAt'>) => void
    clearAllResults: () => void
  }) => React.ReactNode
}

export function TransactionImportManager({ children }: TransactionImportManagerProps) {
  const [importResults, setImportResults] = useState<ImportResult[]>([])

  const addImportResult = (result: Omit<ImportResult, 'id' | 'processedAt'>) => {
    const newResult: ImportResult = {
      ...result,
      id: Date.now().toString(),
      processedAt: new Date()
    }
    setImportResults(prev => [...prev, newResult])
  }

  const removeImportResult = (id: string) => {
    setImportResults(prev => prev.filter(result => result.id !== id))
  }

  const clearAllResults = () => {
    setImportResults([])
  }

  const totalMatched = importResults.reduce((sum, result) => sum + result.matched, 0)
  const totalUnmatched = importResults.flatMap(result => result.unmatched)

  const getSourceName = (source: string, provider?: string) => {
    if (source === 'email') {
      return provider === 'wechat' ? '邮件-微信支付' : provider === 'alipay' ? '邮件-支付宝' : '邮件'
    }
    return provider === 'wechat' ? '文件-微信支付' : provider === 'alipay' ? '文件-支付宝' : '文件上传'
  }

  const getSourceColor = (source: string, provider?: string) => {
    if (provider === 'wechat') return 'bg-green-100 text-green-800'
    if (provider === 'alipay') return 'bg-blue-100 text-blue-800'
    return source === 'email' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* 渲染子组件，传递添加结果的函数 */}
      {children({ addImportResult, clearAllResults })}

      {/* 统一显示导入结果 */}
      {importResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>导入结果</CardTitle>
                <CardDescription>
                  共导入 {importResults.length} 个来源，匹配 {totalMatched} 条交易，{totalUnmatched.length} 条待处理
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllResults}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清空结果
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 总体统计 */}
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>总计</AlertTitle>
                <AlertDescription>
                  成功匹配 {totalMatched} 条交易，{totalUnmatched.length} 条待处理
                </AlertDescription>
              </Alert>

              {/* 各个导入来源的详细结果 */}
              <div className="space-y-3">
                {importResults.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getSourceColor(result.source, result.provider)}>
                          {getSourceName(result.source, result.provider)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDate(result.processedAt)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImportResult(result.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="text-sm">
                      <p className="font-medium">
                        {result.emailSubject || result.filename || '未知来源'}
                      </p>
                      <p className="text-gray-600">
                        匹配: {result.matched} 条，待处理: {result.unmatched.length} 条
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 统一显示所有未匹配的交易 */}
              {totalUnmatched.length > 0 && (
                <UnmatchedTransactions
                  transactions={totalUnmatched}
                  onRuleCreated={(ruleId) => {
                    // 重新匹配所有交易的逻辑
                    console.log('Rule created:', ruleId)
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 