"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Mail, 
  RefreshCw, 
  Download, 
  Calendar, 
  FileText, 
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useEmailBills } from '@/hooks/use-email-bills'
import { useToast } from '@/hooks/use-toast'
import { BillEmail } from '@/types/email'
import { formatDate } from '@/lib/utils'
import { ImportResult } from './transaction-import-manager'
import { getProviderColor, getProviderName } from '@/lib/utils/provider'

interface EmailBillCheckerProps {
  onImportResult: (result: Omit<ImportResult, 'id' | 'processedAt'>) => void
}

export function EmailBillChecker({ onImportResult }: EmailBillCheckerProps) {
  const { billEmails, isLoading, error, lastChecked, refetch, downloadBillData } = useEmailBills()
  const { toast } = useToast()
  const [downloadingUid, setDownloadingUid] = useState<string | null>(null)
  const [zipPassword, setZipPassword] = useState('')

  // 处理下载账单
  const handleDownload = async (email: BillEmail) => {
    setDownloadingUid(email.uid)
    
    try {
      // 直接调用API而不是通过hook
      const response = await fetch('/api/email/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: email.uid,
          zipPassword,
          provider: email.provider
        })
      })
      
      // 处理响应数据，类似raw-transaction-uploader的方式
      if (response.ok) {
        const result = await response.json()
        
        // 通知父组件添加导入结果
        onImportResult({
          source: 'email',
          provider: email.provider,
          emailSubject: email.subject,
          matched: result.matched || 0,
          unmatched: result.unmatched || []
        })
        
        toast({
          title: "导入成功",
          description: `成功匹配 ${result.matched || 0} 条交易`,
        })
      } else {
        const errorResult = await response.json()
        throw new Error(errorResult.error || '导入失败')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下载失败'
      toast({
        title: "下载失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setDownloadingUid(null)
    }
  }



  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              邮件账单检查
            </CardTitle>
            <CardDescription>
              自动检查邮箱中的今日账单邮件
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? '检查中...' : '刷新'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 密码输入 */}
        <div className="mb-4">
          <Label htmlFor="zip-password">压缩包密码（如有）</Label>
          <Input
            id="zip-password"
            placeholder="请输入压缩包密码"
            value={zipPassword}
            onChange={(e) => setZipPassword(e.target.value)}
          />
        </div>

        {/* 检查状态 */}
        <div className="mb-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在检查邮件...
            </div>
          )}
          
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          {lastChecked && !isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              上次检查: {formatDate(lastChecked)}
            </div>
          )}
        </div>

        {/* 邮件列表 */}
        <div className="space-y-3">
          {billEmails.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>未找到今日账单邮件</p>
            </div>
          )}

          {billEmails.map((email) => (
            <div
              key={email.uid}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getProviderColor(email.provider)}>
                      {getProviderName(email.provider)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(email.date)}
                    </span>
                  </div>
                  <p className="font-medium">{email.subject}</p>
                  <p className="text-sm text-muted-foreground">{email.from}</p>
                </div>
                <Button
                  onClick={() => handleDownload(email)}
                  disabled={downloadingUid === email.uid}
                  size="sm"
                >
                  {downloadingUid === email.uid ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      处理中
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      导入
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 