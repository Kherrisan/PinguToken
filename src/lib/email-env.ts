import { EmailConfig } from '@/types/email'

export interface EmailEnvConfig {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
}

export function getEmailConfigFromEnv(): EmailConfig {
  const host = process.env.EMAIL_HOST
  const port = process.env.EMAIL_PORT
  const secure = process.env.EMAIL_SECURE
  const username = process.env.EMAIL_USERNAME
  const password = process.env.EMAIL_PASSWORD

  if (!host || !port || !username || !password) {
    throw new Error('邮件配置不完整，请检查环境变量: EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD')
  }

  return {
    host,
    port: parseInt(port, 10),
    secure: secure === 'true',
    username,
    password,
  }
}

export function validateEmailEnv(): boolean {
  try {
    getEmailConfigFromEnv()
    return true
  } catch {
    return false
  }
}

// 获取支持的环境变量列表
export function getRequiredEnvVars(): string[] {
  return [
    'EMAIL_HOST',
    'EMAIL_PORT', 
    'EMAIL_SECURE',
    'EMAIL_USERNAME',
    'EMAIL_PASSWORD'
  ]
}

// 检查环境变量并返回缺失的变量
export function getMissingEnvVars(): string[] {
  const required = getRequiredEnvVars()
  const missing: string[] = []

  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  return missing
} 