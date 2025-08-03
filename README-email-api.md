# 邮件账单处理 API

自动处理邮箱中的微信/支付宝账单邮件，支持邮件搜索和CSV数据解析。

## 功能特性

- 🔍 **自动检查**: 页面加载时自动检查今日账单邮件
- 📧 **智能识别**: 自动识别微信支付和支付宝账单邮件
- 📦 **压缩包支持**: 支持密码保护的ZIP文件解压
- 🔄 **实时更新**: 可手动刷新检查最新邮件
- 📊 **CSV解析**: 自动解析账单CSV数据
- 🎨 **友好界面**: 直观的邮件列表和操作界面

## 快速开始

### 1. 配置环境变量

复制环境变量示例文件：
```bash
cp email-env.example .env.local
```

编辑 `.env.local` 文件，配置你的邮箱信息：
```bash
EMAIL_HOST=imap.qq.com
EMAIL_PORT=993
EMAIL_SECURE=true
EMAIL_USERNAME=your@email.com
EMAIL_PASSWORD=your-app-password
```

### 2. 启动服务

```bash
yarn dev
```

### 3. 使用功能

#### 方式一：界面操作
1. 打开浏览器访问 `http://localhost:3000/dashboard/importer`
2. 页面会自动检查今日的账单邮件
3. 如果有邮件，可以直接点击"下载解析"按钮

#### 方式二：API调用

#### 搜索账单邮件
```bash
# 搜索今日所有账单邮件
curl -X GET "http://localhost:3000/api/email/search"

# 只搜索微信账单邮件
curl -X GET "http://localhost:3000/api/email/search?billSource=wechat"
```

#### 下载并解析账单
```bash
curl -X POST http://localhost:3000/api/email/download \
  -H "Content-Type: application/json" \
  -d '{"uid": "邮件UID", "zipPassword": "解压密码"}'
```

## 支持的邮箱

- QQ邮箱 (imap.qq.com:993)
- Gmail (imap.gmail.com:993)
- 163邮箱 (imap.163.com:993)
- 126邮箱 (imap.126.com:993)
- Outlook (imap-mail.outlook.com:993)

## 支持的账单类型

- 微信支付账单
- 支付宝账单

## 测试

运行测试脚本验证配置：
```bash
node test-email-api.js
```

## 详细文档

查看完整的API文档：[docs/email-api.md](docs/email-api.md)

## 安全说明

- 使用应用密码而非登录密码
- 邮箱配置通过环境变量管理
- 密码不会在请求中传递
- 建议在生产环境使用HTTPS

## 故障排除

1. **连接失败**: 检查环境变量配置和IMAP服务是否开启
2. **认证失败**: 确认使用的是应用密码而非登录密码
3. **解压失败**: 检查压缩包密码是否正确
4. **编码问题**: 系统会自动检测GBK/UTF-8编码 