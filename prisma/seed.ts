import { prisma } from '../src/lib/prisma';

async function main() {
    // 创建支付宝导入源
    const alipay = await prisma.importSource.upsert({
        where: { name: 'alipay' },
        update: {},
        create: {
            name: 'alipay',
            defaultConfig: {
                create: {
                    defaultMinusAccount: 'Assets:Flow:Bank:BOC',
                    defaultPlusAccount: 'Expenses:FIXME',
                    defaultCurrency: 'CNY'
                }
            }
        }
    });

    // 创建支付宝规则
    const alipayRules = [
        {
            priority: 1,
            name: '支出默认规则',
            description: '支出交易使用中国银行账户',
            typePattern: '^支出$',
            methodAccount: 'Assets:Flow:Bank:BOC',
            targetAccount: 'Expenses:FIXME'
        },
        {
            priority: 2,
            name: 'luckin咖啡',
            description: '瑞幸咖啡消费',
            peerPattern: 'luckincoffee',
            targetAccount: 'Expenses:Life:Food:Coffee'
        },
        {
            priority: 3,
            name: 'App Store订阅',
            description: 'Apple服务订阅',
            categoryPattern: '',
            peerPattern: 'App Store & Apple Music',
            targetAccount: 'Expenses:Life:Subscription'
        },
        {
            priority: 4,
            name: 'iCloud订阅',
            description: 'iCloud服务订阅',
            categoryPattern: '',
            peerPattern: 'iCloud',
            targetAccount: 'Expenses:Life:Subscription'
        },
        {
            priority: 5,
            name: '服饰消费',
            description: '服饰类消费',
            categoryPattern: '',
            targetAccount: 'Expenses:Life:Shopping:Clothes'
        },
        {
            priority: 6,
            name: '共享单车',
            description: '哈啰出行',
            peerPattern: '哈啰出行',
            targetAccount: 'Expenses:Life:Travel:SharingBike'
        }
    ];

    // 创建微信支付导入源
    const wechat = await prisma.importSource.upsert({
        where: { name: 'wechat' },
        update: {},
        create: {
            name: 'wechat',
            defaultConfig: {
                create: {
                    defaultMinusAccount: 'Assets:FIXME',
                    defaultPlusAccount: 'Expenses:FIXME',
                    defaultCurrency: 'CNY'
                }
            }
        }
    });

    // 创建微信支付规则
    const wechatRules = [
        {
            priority: 1,
            name: '零钱收入',
            description: '一般为收入，存入零钱',
            methodAccount: 'Assets:Flow:EBank:WxPay',
            targetAccount: 'Income:FIXME'
        },
        {
            priority: 2,
            name: '转账收入',
            description: '转账收入',
            typePattern: '转账',
            targetAccount: 'Income:Wechat:Transfer'
        },
        {
            priority: 3,
            name: '红包收入',
            description: '微信红包收入',
            typePattern: '微信红包',
            targetAccount: 'Income:Wechat:RedPacket'
        },
        {
            priority: 4,
            name: '零钱支出',
            description: '使用零钱支付',
            typePattern: '^支出$',
            methodAccount: 'Assets:Flow:EBank:WxPay',
            targetAccount: 'Expenses:FIXME'
        },
        {
            priority: 5,
            name: '东大一卡通',
            description: '东南大学消费',
            peerPattern: '东南大学',
            descPattern: '东南大学-消费',
            targetAccount: 'Assets:Flow:SEU'
        },
        {
            priority: 6,
            name: '电费支出',
            description: '久安充电消费',
            peerPattern: '久安充电',
            targetAccount: 'Expenses:Life:House:Electricity'
        },
        {
            priority: 7,
            name: '共享单车',
            description: '7MA出行',
            peerPattern: '7MA 出行',
            targetAccount: 'Expenses:Life:Travel:SharingBike'
        },
        {
            priority: 8,
            name: '午餐',
            description: '美团平台商户午餐',
            peerPattern: '美团平台商户',
            descPattern: '商户消费',
            timePattern: '10:30-13:00',
            targetAccount: 'Expenses:Life:Food:Lunch'
        },
        {
            priority: 9,
            name: '晚餐',
            description: '美团平台商户晚餐',
            peerPattern: '美团平台商户',
            descPattern: '商户消费',
            timePattern: '16:30-18:30',
            targetAccount: 'Expenses:Life:Food:Dinner'
        },
        {
            priority: 10,
            name: '零食',
            description: '24H智能售货',
            peerPattern: '24H智能售货',
            targetAccount: 'Expenses:Life:Food:Snack'
        },
        {
            priority: 11,
            name: '超市购物',
            description: '中超超市',
            peerPattern: '中超超市',
            targetAccount: 'Expenses:Life:Shopping'
        },
        {
            priority: 12,
            name: '饮料',
            description: '霸王茶姬',
            peerPattern: '霸王茶姬',
            targetAccount: 'Expenses:Life:Food:Drink'
        },
        {
            priority: 13,
            name: '服装',
            description: 'UNIQLO',
            peerPattern: 'UNIQLO',
            targetAccount: 'Expenses:Life:Shopping:Clothes'
        },
        {
            priority: 14,
            name: '洗衣',
            description: '漫品茶生',
            peerPattern: '漫品茶生',
            targetAccount: 'Expenses:Life:House:Laundry'
        }
    ];

    // 批量创建支付宝规则
    for (const rule of alipayRules) {
        await prisma.importRule.upsert({
            where: {
                sourceId_priority: {
                    sourceId: alipay.name,
                    priority: rule.priority
                }
            },
            update: rule,
            create: {
                ...rule,
                sourceId: alipay.name,
                enabled: true
            }
        });
    }

    // 批量创建微信支付规则
    for (const rule of wechatRules) {
        await prisma.importRule.upsert({
            where: {
                sourceId_priority: {
                    sourceId: wechat.name,
                    priority: rule.priority
                }
            },
            update: rule,
            create: {
                ...rule,
                sourceId: wechat.name,
                enabled: true
            }
        });
    }

    console.log('Database has been seeded');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 