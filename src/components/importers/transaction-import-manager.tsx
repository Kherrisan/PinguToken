'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { UnmatchedTransactions } from "./unmatched-transactions"
import { MatchResult } from '@/lib/importers/matcher'
import { AlertCircle } from 'lucide-react'

export interface ImportResult {
  id: string
  source: string // 'email' | 'upload'
  provider?: string // 'wechatpay' | 'alipay'
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
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<MatchResult[]>([])
  const [loadingUnmatched, setLoadingUnmatched] = useState(false)
  const [unmatchedError, setUnmatchedError] = useState<string | null>(null)

  // 获取未匹配交易
  const fetchUnmatched = async () => {
    setLoadingUnmatched(true)
    setUnmatchedError(null)
    try {
      const response = await fetch('/api/raw-transactions/unmatched')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '获取数据失败')
      }
      setUnmatchedTransactions(data.data || [])
    } catch (error) {
      setUnmatchedError(error instanceof Error ? error.message : '获取数据失败')
    } finally {
      setLoadingUnmatched(false)
    }
  }

  useEffect(() => {
    fetchUnmatched()
  }, [])

  const addImportResult = (result: Omit<ImportResult, 'id' | 'processedAt'>) => {
    const newResult: ImportResult = {
      ...result,
      id: Date.now().toString(),
      processedAt: new Date()
    }
    fetchUnmatched()
  }

  const clearAllResults = () => {
  }

  // 移除已匹配的交易
  const removeUnmatchedTransaction = (transactionNo: string) => {
    setUnmatchedTransactions(prev => prev.filter(tx => tx.record.transactionNo !== transactionNo))
  }

  // 批量匹配
  const handleBatchMatch = async (matchableTransactions: MatchResult[]) => {
    try {
      await fetch('/api/import/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: matchableTransactions.map(tx => tx.record) })
      })
      setUnmatchedTransactions(prev => prev.filter(tx => !matchableTransactions.some(m => m.record.transactionNo === tx.record.transactionNo)))
    } catch (error) {
      // 错误处理可在UnmatchedTransactions中toast
    }
  }

  // 手动匹配
  const handleManualMatch = async (record: any, targetAccount: string, methodAccount: string, rawTxId: string) => {
    try {
      await fetch('/api/import/manual-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [{ record: { ...record, rawTxId }, targetAccount, methodAccount }] })
      })
      setUnmatchedTransactions(prev => prev.filter(tx => tx.record.transactionNo !== record.transactionNo))
    } catch (error) {
      // 错误处理可在UnmatchedTransactions中toast
    }
  }

  const handleRuleCreated = (ruleId: string) => {
    fetchUnmatched()
  }

  return (
    <div className="space-y-6">
      {children({ addImportResult, clearAllResults })}
      <Card>
        <CardHeader>
          <CardTitle>未匹配的交易记录</CardTitle>
          <CardDescription>
            从数据库中获取的所有未匹配交易记录，共 {unmatchedTransactions.length} 条
          </CardDescription>
        </CardHeader>
        <CardContent className="">
          {unmatchedError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{unmatchedError}</AlertDescription>
            </Alert>
          ) : loadingUnmatched ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : unmatchedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无未匹配的交易记录
            </div>
          ) : (
            <UnmatchedTransactions
              transactions={unmatchedTransactions}
              onRuleCreated={handleRuleCreated}
              onRefresh={fetchUnmatched}
              onRemove={removeUnmatchedTransaction}
              onBatchMatch={handleBatchMatch}
              onManualMatch={handleManualMatch}
              isFromDatabase={true}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
} 