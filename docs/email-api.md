# 邮件账单处理 API 文档

本文档介绍了用于自动处理邮箱中微信/支付宝账单邮件的 API 接口。

## 功能概述

系统提供两个主要 API：

1. **邮件搜索 API** (`/api/email/search`) - 检查邮箱中是否存在账单邮件
2. **邮件下载 API** (`/api/email/download`) - 下载邮件附件并解析 CSV 数据

## 环境变量配置

在使用 API 之前，需要配置邮件相关的环境变量：

```bash
EMAIL_HOST=imap.qq.com           # 邮件服务器地址
EMAIL_PORT=993                   # 邮件服务器端口
EMAIL_SECURE=true                # 是否使用SSL/TLS
EMAIL_USERNAME=your@email.com    # 邮箱用户名
EMAIL_PASSWORD=your-app-password # 邮箱密码或应用专用密码
```

请参考根目录的 `email-env.example` 文件获取完整的配置示例。

## 支持的邮件服务商

- QQ邮箱 (qq.com)
- Gmail (gmail.com)
- 163邮箱 (163.com)
- 126邮箱 (126.com)
- Outlook (outlook.com, hotmail.com, live.com)

## 支持的账单类型

- **微信支付** - 自动识别微信支付相关邮件
- **支付宝** - 自动识别支付宝相关邮件

## API 接口详情

### 1. 邮件搜索 API

**接口地址**: `GET /api/email/search`

**功能**: 检查邮箱中是否存在微信/支付宝的账单邮件，返回今日邮件列表

#### 请求参数

通过查询参数传递：
- `billSource` (可选): 指定账单来源，可选值为 `wechatpay` 或 `alipay`

#### 使用示例

```bash
# 搜索所有账单邮件
curl -X GET "http://localhost:3000/api/email/search"

# 只搜索微信账单邮件
curl -X GET "http://localhost:3000/api/email/search?billSource=wechatpay"

# 只搜索支付宝账单邮件
curl -X GET "http://localhost:3000/api/email/search?billSource=alipay"
```

注意：
- 搜索范围固定为今日（00:00:00 - 23:59:59）
- 邮箱配置从环境变量中读取，无需在请求中传递

#### 响应格式

```json
{
  "success": true,
  "message": "找到 2 封今日账单邮件",
  "data": [
    {
      "uid": "12345",
      "subject": "微信支付账单通知",
      "from": "wechatpay@tencent.com",
      "date": "2023-12-01T10:30:00.000Z",
      "provider": "wechatpay",            // 账单提供商: wechatpay 或 alipay
      "attachments": [
        {
          "filename": "bill.zip",
          "size": 1024,
          "contentType": "application/zip"
        }
      ]
    },
    {
      "uid": "12346",
      "subject": "支付宝账单通知",
      "from": "bill@alipay.com",
      "date": "2023-12-01T11:00:00.000Z",
      "provider": "alipay",
      "attachments": [
        {
          "filename": "alipay_bill.csv",
          "size": 2048,
          "contentType": "text/csv"
        }
      ]
    }
  ]
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "搜索失败: 邮件连接超时"
}
```

### 2. 邮件下载 API

**接口地址**: `POST /api/email/download`

**功能**: 下载指定邮件的附件并解析其中的 CSV 账单数据

#### 请求参数

通过 JSON 请求体传递：

```json
{
  "uid": "12345",                    // 邮件UID (从搜索API获取)
  "zipPassword": "password123",      // 可选：如果是加密压缩包，提供解压密码
  "provider": "wechatpay"            // 账单提供商: wechatpay 或 alipay
}
```

#### 使用示例

```bash
# 下载并解析微信支付账单
curl -X POST "http://localhost:3000/api/email/download" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "12345",
    "zipPassword": "123456",
    "provider": "wechatpay"
  }'

# 下载并解析支付宝账单
curl -X POST "http://localhost:3000/api/email/download" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "12346",
    "provider": "alipay"
  }'
```

#### 响应格式

**成功响应**:
```json
{
  "matched": 15,
  "unmatched": [
    {
      "record": {
        "transactionTime": "2023-12-01 10:30:00",
        "category": "餐饮美食",
        "counterparty": "某餐厅",
        "description": "扫码付",
        "type": "支出",
        "amount": "25.80",
        "paymentMethod": "招商银行储蓄卡",
        "status": "交易成功",
        "transactionNo": "202312011030001"
      },
      "reason": "未找到匹配的规则"
    }
  ]
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "解压缩文件失败: 密码错误"
}
```

## 工作流程说明

### 典型使用流程

1. **检查邮件**: 调用搜索 API 获取今日账单邮件列表
2. **选择邮件**: 从返回的邮件列表中选择要处理的邮件
3. **下载解析**: 调用下载 API 处理选中的邮件附件
4. **查看结果**: 根据返回的匹配和未匹配数据进行后续处理

### 数据处理流程

1. **邮件识别**: 自动识别微信支付或支付宝的账单邮件
2. **附件下载**: 下载邮件中的 ZIP 压缩包或 CSV 文件
3. **文件解压**: 如果是加密压缩包，使用提供的密码解压
4. **CSV 解析**: 解析 CSV 文件中的交易记录
5. **规则匹配**: 使用预定义规则自动匹配交易到账户
6. **结果返回**: 返回匹配成功和需要手动处理的交易

## 错误处理

### 常见错误类型

- **连接错误**: 邮件服务器连接失败
- **认证错误**: 邮箱用户名或密码错误
- **文件错误**: 附件下载或解析失败
- **密码错误**: 压缩包密码不正确
- **格式错误**: CSV 文件格式不符合预期

### 错误码说明

- `400`: 请求参数错误
- `500`: 服务器内部错误（通常是邮件连接或文件处理问题）

## 安全注意事项

1. **环境变量**: 确保邮箱密码等敏感信息通过环境变量配置，不要硬编码
2. **应用密码**: 建议使用邮箱的应用专用密码而非登录密码
3. **文件清理**: 系统会自动清理临时下载的文件
4. **数据保护**: 所有邮件内容和附件仅在内存中处理，不会永久存储

## 限制说明

- 搜索范围固定为当日邮件
- 仅支持微信支付和支付宝的标准账单格式
- 压缩包密码需要用户提供，系统不会尝试破解
- 单次处理的 CSV 文件大小建议不超过 10MB 