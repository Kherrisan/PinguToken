// 获取提供商的颜色
export function getProviderColor(provider: string) {
    switch (provider) {
        case 'wechatpay':
            return 'bg-green-100 text-green-800'
        case 'alipay':
            return 'bg-blue-100 text-blue-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

// 获取提供商的中文名称
export function getProviderName(provider: string) {
    switch (provider) {
        case 'wechatpay':
            return '微信支付'
        case 'alipay':
            return '支付宝'
        default:
            return provider
    }
} 