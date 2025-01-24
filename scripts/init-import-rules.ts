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
            categoryPattern: '^文化休闲$',
            peerPattern: 'App Store & Apple Music',
            targetAccount: 'Expenses:Life:Subscription'
        },
        {
            priority: 4,
            name: 'iCloud订阅',
            description: 'iCloud服务订阅',
            categoryPattern: '^文化休闲$',
            peerPattern: 'iCloud',
            targetAccount: 'Expenses:Life:Subscription'
        },
        {
            priority: 5,
            name: '服饰消费',
            description: '服饰类消费',
            categoryPattern: '^服饰装扮$',
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

    // 批量创建规则
    for (const rule of alipayRules) {
        await prisma.importRule.upsert({
            where: {
                sourceId_name: {
                    sourceId: alipay.id,
                    name: rule.name
                }
            },
            update: rule,
            create: {
                ...rule,
                sourceId: alipay.id,
                enabled: true
            }
        });
    }

    console.log('Import rules initialized successfully');
}

main()
    .catch((e) => {
        console.error('Error initializing import rules:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 