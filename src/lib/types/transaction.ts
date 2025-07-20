export interface ImportRecord {
    transactionTime: string;      // 交易时间
    category: string;             // 交易分类
    counterparty: string;         // 交易对方
    counterpartyAccount: string;  // 对方账号
    description: string;          // 商品说明
    type: string;                 // 收/支
    amount: string;              // 金额
    paymentMethod: string;       // 收/付款方式
    transactionNo: string;       // 交易订单号
    merchantOrderNo: string;     // 商家订单号
    remarks: string;             // 备注
    provider?: string;           // 导入来源 (wechatpay, alipay, etc.)
    rawTxId: string;            // 原始交易ID
} 