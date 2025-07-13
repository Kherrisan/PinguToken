"use client"

import { useState, useEffect } from 'react'
import { BillEmail, EmailSearchResponse, EmailDownloadResponse } from '@/types/email'

interface EmailBillsState {
  billEmails: BillEmail[]
  isLoading: boolean
  error: string | null
  lastChecked: Date | null
}

export function useEmailBills() {
  const [state, setState] = useState<EmailBillsState>({
    billEmails: [],
    isLoading: false,
    error: null,
    lastChecked: null
  })

  // 检查账单邮件
  const checkBillEmails = async (billSource?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const url = billSource 
        ? `/api/email/search?billSource=${billSource}`
        : '/api/email/search';
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result: EmailSearchResponse = await response.json()

      if (result.success) {
        setState(prev => ({
          ...prev,
          billEmails: result.data || [],
          isLoading: false,
          lastChecked: new Date()
        }))
      } else {
        setState(prev => ({
          ...prev,
          error: result.message,
          isLoading: false
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '检查邮件失败',
        isLoading: false
      }))
    }
  }

  // 下载并解析账单
  const downloadBillData = async (uid: string, zipPassword?: string) => {
    try {
      const response = await fetch('/api/email/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, zipPassword })
      })

      const result: EmailDownloadResponse = await response.json()

      if (result.success) {
        return result.data
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('下载账单失败')
    }
  }

  // 页面加载时自动检查
  useEffect(() => {
    checkBillEmails()
  }, [])

  return {
    ...state,
    checkBillEmails,
    downloadBillData,
    refetch: () => checkBillEmails()
  }
} 