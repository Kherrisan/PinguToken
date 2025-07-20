# 未匹配交易记录功能实现

## 功能概述

本功能实现了将未匹配的交易记录插入到 `rawtransaction` 表中，并在导入页面显示未匹配的交易列表。现在使用现有的 `UnmatchedTransactions` 组件来显示未匹配的记录。

## 实现的功能

### 1. 数据库模型更新

- 在 `RawTransaction` 模型中添加了 `status` 字段
- 默认值为 `'unmatched'`
- 添加了状态索引以提高查询性能

### 2. 处理器更新

- 修改了 `processCsvFile` 函数，添加了 `processUnmatchedRecords` 函数
- 未匹配的记录会被插入到 `rawtransaction` 表中，状态为 `'unmatched'`
- 避免重复插入相同的记录

### 3. API 端点

- 创建了 `/api/raw-transactions/unmatched` 端点
- 支持分页查询
- 支持按来源过滤
- 返回 `MatchResult[]` 格式的数据，与现有组件兼容

### 4. 前端组件

- 修改了 `UnmatchedRawTransactions` 组件，使用现有的 `UnmatchedTransactions` 组件
- 修改了 `UnmatchedTransactions` 组件，支持从数据库获取的数据
- 修改了 `CreateRuleDialog` 组件，支持不同的数据源
- 支持分页显示、按来源过滤、规则创建、手动匹配等功能

### 5. 导入页面更新

- 添加了标签页切换功能
- "数据导入" 标签页：原有的导入功能
- "未匹配记录" 标签页：显示未匹配的原始交易记录

## 使用说明

### 1. 数据库迁移

首先需要运行数据库迁移来添加 `status` 字段：

```bash
npx prisma db push
```

### 2. 启用状态字段

在数据库迁移完成后，需要取消注释 `processor.ts` 中的 `status` 字段：

```typescript
// 在 processUnmatchedRecords 函数中
await prisma.rawTransaction.create({
    data: {
        source: provider,
        identifier: record.transactionNo.trim(),
        rawData: record as any,
        status: 'unmatched', // 取消注释这行
        createdAt: new Date(record.transactionTime)
    }
});
```

### 3. 使用功能

1. 访问导入页面 (`/dashboard/importer`)
2. 切换到 "未匹配记录" 标签页
3. 查看所有未匹配的原始交易记录
4. 可以按来源（支付宝/微信支付）查看特定来源的记录
5. 可以为未匹配的记录创建规则或手动匹配

## API 接口

### GET /api/raw-transactions/unmatched

获取未匹配的原始交易记录，返回 `MatchResult[]` 格式

**查询参数：**
- `source` (可选): 过滤特定来源的记录
- `page` (可选): 页码，默认为 1
- `pageSize` (可选): 每页记录数，默认为 20

**响应格式：**
```json
{
  "data": [
    {
      "record": {
        "transactionTime": "2024-01-01 12:00:00",
        "category": "string",
        "counterparty": "string",
        "counterpartyAccount": "string",
        "description": "string",
        "type": "收入|支出",
        "amount": "100.00",
        "paymentMethod": "string",
        "status": "string",
        "transactionNo": "string",
        "merchantOrderNo": "string",
        "remarks": "string"
      },
      "targetAccount": undefined,
      "methodAccount": undefined,
      "matchedRules": []
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

## 组件更新

### UnmatchedTransactions 组件

- 添加了 `source` 和 `isFromDatabase` 参数
- 支持从数据库获取的数据
- 保持了原有的所有功能（规则创建、手动匹配、批量匹配等）

### CreateRuleDialog 组件

- 添加了 `sourceId` 参数
- 支持为不同数据源创建规则

### UnmatchedRawTransactions 组件

- 简化为数据获取和状态管理
- 使用现有的 `UnmatchedTransactions` 组件显示数据

## 后续改进

1. **手动匹配功能**: 为未匹配的记录添加手动匹配功能 ✅
2. **批量操作**: 支持批量处理未匹配的记录 ✅
3. **规则设置**: 在未匹配记录页面直接设置匹配规则 ✅
4. **导出功能**: 支持导出未匹配的记录
5. **搜索过滤**: 添加更多搜索和过滤选项

## 注意事项

1. 确保在运行代码前完成数据库迁移
2. 未匹配的记录会占用存储空间，建议定期清理
3. 大量未匹配记录可能影响页面性能，建议实现虚拟滚动
4. 考虑添加记录状态变更的审计日志
5. 现在使用现有的 `UnmatchedTransactions` 组件，保持了功能的一致性 