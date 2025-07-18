# 邮件账单集成测试

## 测试环境准备

### 1. 环境变量配置
```bash
# 在 .env.local 文件中配置
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

## 测试步骤

### 1. 界面测试
1. 访问 `http://localhost:3000/dashboard/importer`
2. 观察页面是否自动显示"正在检查邮箱..."
3. 检查是否显示今日账单邮件列表
4. 尝试点击"下载解析"按钮
5. 输入解压密码（如果需要）
6. 观察是否成功解析CSV数据

### 2. API测试
```bash
# 测试搜索API
curl -X GET "http://localhost:3000/api/email/search"

# 测试指定来源搜索
curl -X GET "http://localhost:3000/api/email/search?billSource=wechat"

# 测试下载API
curl -X POST "http://localhost:3000/api/email/download" \
  -H "Content-Type: application/json" \
  -d '{"uid": "邮件UID", "zipPassword": "解压密码"}'
```

### 3. 功能验证

#### 预期行为：
- ✅ 页面加载时自动检查邮件
- ✅ 显示微信/支付宝账单邮件
- ✅ 支持手动刷新检查
- ✅ 显示邮件详细信息（时间、主题、附件等）
- ✅ 支持密码保护的ZIP文件解压
- ✅ 成功解析CSV数据
- ✅ 显示解析结果统计

#### 错误处理：
- ❌ 环境变量未配置时显示错误信息
- ❌ 邮箱连接失败时显示错误提示
- ❌ 解压密码错误时显示相应提示
- ❌ 网络错误时显示重试选项

## 测试数据准备

### 模拟测试邮件
为了测试功能，可以：
1. 发送包含zip附件的测试邮件到配置的邮箱
2. 邮件主题包含"账单"或"微信支付"等关键词
3. 从支付宝或微信官方邮箱转发真实账单邮件

### 测试用例
1. **无邮件情况**: 检查空状态显示
2. **有邮件情况**: 检查邮件列表显示
3. **多个邮件**: 检查分类和排序
4. **密码保护**: 测试ZIP文件解压
5. **网络异常**: 测试错误处理
6. **刷新功能**: 测试手动刷新

## 问题排查

### 常见问题
1. **连接失败**
   - 检查环境变量配置
   - 确认IMAP服务已开启
   - 验证应用密码是否正确

2. **无邮件显示**
   - 检查邮件时间是否为今日
   - 确认邮件主题包含关键词
   - 验证邮件来源匹配规则

3. **解压失败**
   - 确认压缩包密码正确
   - 检查附件是否完整
   - 验证ZIP文件格式

### 调试方法
1. 查看浏览器控制台输出
2. 检查网络请求状态
3. 查看服务器日志
4. 验证环境变量加载

## 性能考虑
- 邮件检查可能需要几秒钟时间
- 大附件下载可能较慢
- 建议设置合理的超时时间
- 考虑添加加载状态提示 