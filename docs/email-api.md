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
- `billSource` (可选): 指定账单来源，可选值为 `wechat` 或 `alipay`

#### 使用示例

```bash
# 搜索所有账单邮件
curl -X GET "http://localhost:3000/api/email/search"

# 只搜索微信账单邮件
curl -X GET "http://localhost:3000/api/email/search?billSource=wechat"

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
  "message": "找到 3 封今日账单邮件",
  "data": [
    {
      "uid": "12345",                  // 邮件唯一标识
      "subject": "微信支付账单",        // 邮件主题
      "from": "service@pay.weixin.qq.com", // 发件人
      "date": "2024-01-15T10:30:00Z",  // 邮件时间
      "provider": "wechat",            // 账单提供商: wechat 或 alipay
      "attachments": [
        {
          "filename": "bill.zip",      // 附件文件名
          "size": 1024,               // 文件大小(字节)
          "contentType": "application/zip" // 文件类型
        }
      ]
    }
  ]
}
```



### 2. 邮件下载 API

**接口地址**: `POST /api/email/download`

**功能**: 下载指定邮件的附件，解压并解析其中的 CSV 数据

#### 请求参数

```json
{
  "uid": "12345",                      // 必需 - 邮件UID (从搜索API获取)
  "zipPassword": "bill_password"       // 可选 - 压缩包解压密码
}
```

注意：邮箱配置从环境变量中读取，无需在请求中传递。

#### 响应格式

```json
{
  "success": true,
  "message": "成功解析 156 条账单记录",
  "data": {
    "filename": "bill.zip",            // 原始附件文件名
    "extractedFiles": [                // 解压后的文件列表
      "bill_202401.csv"
    ],
    "csvData": [                       // CSV 数据数组
      {
        "交易时间": "2024-01-15 10:30:00",
        "交易类型": "商户消费",
        "交易对方": "某商户",
        "商品": "商品名称",
        "收/支": "支出",
        "金额": "¥25.00",
        "支付方式": "零钱",
        "交易状态": "支付成功"
      }
    ]
  }
}
```

#### 使用示例

```bash
curl -X POST http://localhost:3000/api/email/download \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "12345",
    "zipPassword": "your_zip_password"
  }'
```

## 错误处理

所有 API 在发生错误时会返回统一的错误格式：

```json
{
  "success": false,
  "message": "错误描述信息"
}
```

### 常见错误码

- `400` - 请求参数错误
- `404` - 邮件或附件不存在
- `500` - 服务器内部错误

### 常见错误情况

1. **邮箱连接失败**
   - 检查邮箱地址和密码是否正确
   - 确认已开启 IMAP 服务
   - 使用应用密码而非登录密码

2. **不支持的邮件服务商**
   - 目前仅支持主流邮件服务商
   - 可联系开发者添加支持

3. **解压缩失败**
   - 检查压缩包密码是否正确
   - 确认附件完整性

4. **CSV 解析失败**
   - 检查文件格式是否正确
   - 确认编码格式支持

## 使用注意事项

### 1. 邮箱密码设置

大多数邮箱服务商要求使用应用密码而非登录密码：

- **QQ邮箱**: 设置 -> 账户 -> 开启IMAP -> 生成授权码
- **Gmail**: 安全 -> 应用密码 -> 生成密码
- **163/126**: 设置 -> 客户端授权密码 -> 开启并设置密码
- **Outlook**: 账户安全 -> 应用密码 -> 创建密码

### 2. 压缩包密码

- 微信账单压缩包密码通常是身份证后6位
- 支付宝账单压缩包密码通常是支付密码
- 如果不确定密码，可以先不传 `zipPassword` 参数尝试

### 3. 性能优化

- 建议设置合理的时间范围来限制搜索结果
- 避免频繁调用 API，建议缓存结果

### 4. 数据安全

- 邮箱配置通过环境变量管理，更加安全
- 密码不会在请求中传递，避免了网络泄露风险
- 建议在生产环境中使用 HTTPS
- 下载的数据包含敏感信息，请妥善处理
- 建议定期更新应用密码

## 集成示例

### JavaScript/TypeScript 示例

```typescript
// 搜索今日账单邮件
const searchTodayBillEmails = async (billSource?: string) => {
  const url = billSource 
    ? `/api/email/search?billSource=${billSource}`
    : '/api/email/search';
    
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  const result = await response.json();
  return result;
};

// 下载并解析账单
const downloadBillData = async (uid: string, zipPassword?: string) => {
  const response = await fetch('/api/email/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      zipPassword
    })
  });
  
  const result = await response.json();
  return result;
};

// 使用示例
const processBills = async () => {
  try {
    // 1. 搜索今日账单邮件
    const searchResult = await searchTodayBillEmails();
    
    if (searchResult.success && searchResult.data.length > 0) {
      console.log(`找到 ${searchResult.data.length} 封今日账单邮件`);
      
      // 2. 下载第一封邮件的数据
      const email = searchResult.data[0];
      const downloadResult = await downloadBillData(
        email.uid,
        'zip_password'
      );
      
      if (downloadResult.success) {
        console.log('CSV数据:', downloadResult.data.csvData);
        // 处理CSV数据...
      }
    }
  } catch (error) {
    console.error('处理失败:', error);
  }
};
```

## 技术实现

### 技术栈

- **后端**: Next.js API Routes
- **邮件处理**: node-imap, mailparser
- **文件处理**: jszip, csv-parse
- **编码转换**: iconv-lite

### 架构设计

```
Client Request
      ↓
API Route (Next.js)
      ↓
Email Connection (IMAP)
      ↓
Email Parser (mailparser)
      ↓
File Extractor (jszip)
      ↓
CSV Parser (csv-parse)
      ↓
Response to Client
```

### 扩展性

系统采用模块化设计，易于扩展：

- 添加新的邮件服务商支持
- 支持更多账单格式
- 添加数据验证和清理功能
- 集成数据库存储
- 添加批量处理功能

## 常见问题

### Q: 为什么连接邮箱失败？

A: 请检查以下几点：
1. 环境变量配置是否正确
2. 邮箱地址和密码是否正确
3. 是否开启了 IMAP 服务
4. 是否使用了应用密码（而非登录密码）
5. 网络连接是否正常

### Q: 如何配置环境变量？

A: 创建 `.env.local` 文件或设置系统环境变量：
```bash
EMAIL_HOST=imap.qq.com
EMAIL_PORT=993
EMAIL_SECURE=true
EMAIL_USERNAME=your@email.com
EMAIL_PASSWORD=your-app-password
```
请参考 `email-env.example` 文件获取详细配置说明。

### Q: 支持哪些账单格式？

A: 目前支持：
- 微信支付账单（CSV格式）
- 支付宝账单（CSV格式）
- 支持 GBK 和 UTF-8 编码

### Q: 如何处理加密的压缩包？

A: 在调用下载 API 时传入 `zipPassword` 参数，通常：
- 微信：身份证后6位
- 支付宝：支付密码前6位

### Q: API 调用频率限制？

A: 目前没有严格的频率限制，但建议：
- 避免短时间内大量调用
- 合理设置搜索时间范围
- 考虑缓存搜索结果

## 更新日志

### v1.2.0 (2024-01-15)
- 🔧 **重要更新**: 搜索API改为GET请求，支持billSource参数
- 🎯 新增billSource过滤功能：可指定搜索微信或支付宝账单
- 📱 新增邮件账单检查组件：导入页面自动检查邮件
- 🎨 优化UI：显示邮件列表和下载功能
- 📝 更新文档和示例代码

### v1.1.0 (2024-01-15)
- 🔧 **重要更新**: 邮件配置改为从环境变量加载
- 🔒 提高安全性：密码不再在请求中传递
- 📝 简化API调用：移除email和password参数
- 📖 更新文档和示例代码
- 🛡️ 增强配置验证和错误处理

### v1.0.0 (2024-01-15)
- 初始版本发布
- 支持微信/支付宝账单邮件搜索
- 支持附件下载和CSV解析
- 支持主流邮件服务商 