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
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { useEmailBills } from '@/hooks/use-email-bills'
import { useToast } from '@/hooks/use-toast'
import { BillEmail } from '@/types/email'
import { formatDate } from '@/lib/utils'
import { ImportResult } from './transaction-import-manager'

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

  // 获取提供商的中文名称
  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'wechat':
        return '微信支付'
      case 'alipay':
        return '支付宝'
      default:
        return provider
    }
  }

  // 获取提供商的颜色
  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'wechat':
        return 'bg-green-100 text-green-800'
      case 'alipay':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>正在检查邮箱...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-4">
            {/* 状态信息 */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">
                  找到 {billEmails.length} 封今日账单邮件
                </span>
              </div>
              {lastChecked && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  最后检查: {formatDate(lastChecked)}
                </div>
              )}
            </div>

            {/* 邮件列表 */}
            {billEmails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">今日暂无账单邮件</p>
                <p className="text-sm text-gray-400">
                  系统会自动检查微信支付和支付宝的账单邮件
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {billEmails.map((email) => (
                  <div key={email.uid} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getProviderColor(email.provider)}>
                            {getProviderName(email.provider)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDate(email.date)}
                          </span>
                        </div>
                        <h4 className="font-medium">{email.subject}</h4>
                        <p className="text-sm text-gray-600">{email.from}</p>
                        
                        {/* 附件信息 */}
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="w-4 h-4" />
                          <span>{email.attachments.length} 个附件</span>
                          {email.attachments.map((att, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {att.filename}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleDownload(email)}
                          disabled={downloadingUid === email.uid}
                        >
                          {downloadingUid === email.uid ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              处理中
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              下载解析
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* 密码输入 */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`password-${email.uid}`} className="text-sm">
                        解压密码:
                      </Label>
                      <Input
                        id={`password-${email.uid}`}
                        type="password"
                        placeholder="如果是加密压缩包，请输入密码"
                        value={zipPassword}
                        onChange={(e) => setZipPassword(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 