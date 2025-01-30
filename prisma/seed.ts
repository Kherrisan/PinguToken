import { PrismaClient, AccountType } from '@prisma/client'

const prisma = new PrismaClient()

interface AccountSeed {
    id: string;
    type: AccountType;
    children?: AccountSeed[];
}

const accountSeeds: AccountSeed[] = [
    {
        id: 'Assets',
        type: 'ASSETS',
        children: [
            {
                id: 'Assets:Fund',
                type: 'ASSETS',
                children: [
                    {
                        id: 'Assets:Fund:ETF', type: 'ASSETS'
                    },
                ]
            },
            {
                id: 'Assets:Exchange',
                type: 'ASSETS',
                children: [
                    { id: 'Assets:Exchange:Okex', type: 'ASSETS' },
                ]
            },
            {
                id: 'Assets:Brokerage',
                type: 'ASSETS',
                children: [
                    {
                        id: 'Assets:Brokerage:CICITSecurities',
                        type: 'ASSETS',
                    }
                ]
            },
            {
                id: 'Assets:Investment',
                type: 'ASSETS',
                children: [
                    { id: 'Assets:Investment:YuEBao', type: 'ASSETS' },
                ]
            },
            {
                id: 'Assets:Liquid',
                type: 'ASSETS',
                children: [
                    {
                        id: 'Assets:Liquid:SEU',
                        type: 'ASSETS',
                        children: [
                            { id: 'Assets:Liquid:SEU:CampusCard', type: 'ASSETS' },
                            { id: 'Assets:Liquid:SEU:CampusNetwork', type: 'ASSETS' },
                        ]
                    },
                    {
                        id: 'Assets:Liquid:Bank',
                        type: 'ASSETS',
                        children: [
                            { id: 'Assets:Liquid:Bank:BOC', type: 'ASSETS' },
                        ]
                    },
                    {
                        id: 'Assets:Liquid:EPayment',
                        type: 'ASSETS',
                        children: [
                            { id: 'Assets:Liquid:EPayment:Alipay', type: 'ASSETS' },
                            { id: 'Assets:Liquid:EPayment:WeChatPay', type: 'ASSETS' },
                        ]
                    },
                    { id: 'Assets:Liquid:TransportationCard', type: 'ASSETS' },
                    { id: 'Assets:Liquid:Cash', type: 'ASSETS' },
                ]
            },
            {
                id: 'Assets:Receivables',
                type: 'ASSETS',
                children: [
                    {
                        id: 'Assets:Receivables:Personal',
                        type: 'ASSETS',
                        children: [
                            { id: 'Assets:Receivables:Personal:TaoJun', type: 'ASSETS' },
                            { id: 'Assets:Receivables:Personal:XuYifan', type: 'ASSETS' },
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'Liabilities',
        type: 'LIABILITIES',
        children: [
            {
                id: 'Liabilities:ConsumerDebt',
                type: 'LIABILITIES',
                children: [
                    {
                        id: 'Liabilities:ConsumerDebt:JD',
                        type: 'LIABILITIES',
                        children: [
                            { id: 'Liabilities:ConsumerDebt:JD:WhiteBar', type: 'LIABILITIES' },
                        ]
                    },
                    { id: 'Liabilities:ConsumerDebt:Huabei', type: 'LIABILITIES' },
                    { id: 'Liabilities:ConsumerDebt:CreditCard', type: 'LIABILITIES' },
                ]
            }
        ]
    },
    {
        id: 'Expenses',
        type: 'EXPENSES',
        children: [
            {
                id: 'Expenses:Life',
                type: 'EXPENSES',
                children: [
                    {
                        id: 'Expenses:Life:Food',
                        type: 'EXPENSES',
                        children: [
                            {
                                id: 'Expenses:Life:Food:Meal',
                                type: 'EXPENSES',
                                children: [
                                    { id: 'Expenses:Life:Food:Meal:Breakfast', type: 'EXPENSES' },
                                    { id: 'Expenses:Life:Food:Meal:Lunch', type: 'EXPENSES' },
                                    { id: 'Expenses:Life:Food:Meal:Dinner', type: 'EXPENSES' },
                                    { id: 'Expenses:Life:Food:Meal:GroupDining', type: 'EXPENSES' },
                                ]
                            },
                            { id: 'Expenses:Life:Food:Coffee', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Food:Drink', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Food:Fruit', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Food:Snacks', type: 'EXPENSES' },
                        ]
                    },
                    {
                        id: 'Expenses:Life:Services',
                        type: 'EXPENSES',
                        children: [
                            { id: 'Expenses:Life:Services:Haircut', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Services:Stationery', type: 'EXPENSES' },
                        ]
                    },
                    {
                        id: 'Expenses:Life:Transportation',
                        type: 'EXPENSES',
                        children: [
                            { id: 'Expenses:Life:Transportation:BusSubway', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Transportation:Taxi', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Transportation:Train', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Transportation:Airplane', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Transportation:BikeSharing', type: 'EXPENSES' },
                        ]
                    },
                    {
                        id: 'Expenses:Life:Shopping',
                        type: 'EXPENSES',
                        children: [
                            {
                                id: 'Expenses:Life:Shopping:Clothing',
                                type: 'EXPENSES',
                                children: [
                                    { id: 'Expenses:Life:Shopping:Clothing:Apparel', type: 'EXPENSES' },
                                    { id: 'Expenses:Life:Shopping:Clothing:Shoes', type: 'EXPENSES' },
                                    { id: 'Expenses:Life:Shopping:Clothing:Socks', type: 'EXPENSES' },
                                ]
                            },
                            { id: 'Expenses:Life:Shopping:DailySupplies', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Shopping:EntertainmentCreative', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Shopping:Electronics', type: 'EXPENSES' },
                        ]
                    },
                    {
                        id: 'Expenses:Life:Housing',
                        type: 'EXPENSES',
                        children: [
                            { id: 'Expenses:Life:Housing:Rent', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Housing:Dormitory', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Housing:Hotel', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Housing:Water', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Housing:HotWater', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Housing:Gas', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Housing:Electricity', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Housing:Internet', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Housing:Laundry', type: 'EXPENSES' },
                        ]
                    },
                    {
                        id: 'Expenses:Life:Subscriptions',
                        type: 'EXPENSES',
                        children: [
                            { id: 'Expenses:Life:Subscriptions:App', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Subscriptions:Membership', type: 'EXPENSES' },
                        ]
                    },
                    {
                        id: 'Expenses:Life:Miscellaneous',
                        type: 'EXPENSES',
                        children: [
                            { id: 'Expenses:Life:Miscellaneous:RedPacketTransfers', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Miscellaneous:TransactionFees', type: 'EXPENSES' },
                        ]
                    },
                    {
                        id: 'Expenses:Life:Hobbies',
                        type: 'EXPENSES',
                        children: [
                            { id: 'Expenses:Life:Hobbies:Books', type: 'EXPENSES' },
                            { id: 'Expenses:Life:Hobbies:Photography', type: 'EXPENSES' },
                            {
                                id: 'Expenses:Life:Hobbies:Travel',
                                type: 'EXPENSES',
                                children: [
                                    { id: 'Expenses:Life:Hobbies:Travel:Tickets', type: 'EXPENSES' },
                                    { id: 'Expenses:Life:Hobbies:Travel:Souvenirs', type: 'EXPENSES' },
                                ]
                            },
                        ]
                    },
                ]
            },
            {
                id: 'Expenses:Entertainment',
                type: 'EXPENSES',
                children: [
                    { id: 'Expenses:Entertainment:Games', type: 'EXPENSES' },
                ]
            },
            {
                id: 'Expenses:Work',
                type: 'EXPENSES',
                children: [
                    {
                        id: 'Expenses:Work:Tax',
                        type: 'EXPENSES',
                        children: [
                            { id: 'Expenses:Work:Tax:IncomeTax', type: 'EXPENSES' },
                        ]
                    },
                    {
                        id: 'Expenses:Work:Insurance',
                        type: 'EXPENSES',
                        children: [
                            { id: 'Expenses:Work:Insurance:SocialInsurance', type: 'EXPENSES' },
                        ]
                    },
                    {
                        id: 'Expenses:Work:Deductions',
                        type: 'EXPENSES',
                        children: [
                            { id: 'Expenses:Work:Deductions:AttendancePenalty', type: 'EXPENSES' },
                        ]
                    },
                ]
            },
            { id: 'Expenses:FIXME', type: 'EXPENSES' },
        ]
    },
    {
        id: 'Income',
        type: 'INCOME',
        children: [
            {
                id: 'Income:Investment',
                type: 'INCOME',
                children: [
                    { id: 'Income:Investment:YuEBao', type: 'INCOME' },
                ]
            },
            {
                id: 'Income:Work',
                type: 'INCOME',
                children: [
                    { id: 'Income:Work:Bonus', type: 'INCOME' },
                ]
            },
            {
                id: 'Income:Government',
                type: 'INCOME',
                children: [
                    { id: 'Income:Government:TaxRefund', type: 'INCOME' },
                ]
            },
            {
                id: 'Income:Sales',
                type: 'INCOME',
                children: [
                    { id: 'Income:Sales:Goods', type: 'INCOME' },
                ]
            },
            {
                id: 'Income:Education',
                type: 'INCOME',
                children: [
                    {
                        id: 'Income:Education:Allowance',
                        type: 'INCOME',
                        children: [
                            { id: 'Income:Education:Allowance:University', type: 'INCOME' },
                            { id: 'Income:Education:Allowance:ResearchGroup', type: 'INCOME' },
                        ]
                    },
                    { id: 'Income:Education:Scholarship', type: 'INCOME' },
                ]
            },
            {
                id: 'Income:Miscellaneous',
                type: 'INCOME',
                children: [
                    { id: 'Income:Miscellaneous:WeChatRedPacket', type: 'INCOME' },
                    { id: 'Income:Miscellaneous:LivingExpenses', type: 'INCOME' },
                    { id: 'Income:Miscellaneous:Discounts', type: 'INCOME' },
                ]
            },
        ]
    },
    {
        id: 'Equity',
        type: 'EQUITY',
        children: [
            {
                id: 'Equity:OpenBalance',
                type: 'EQUITY',
            },
            {
                id: 'Equity:RoundingErrors',
                type: 'EQUITY',
            },
            {
                id: 'Equity:UFO',
                type: 'EQUITY',
            }
        ]
    }
];

async function createAccount(account: AccountSeed, parentId: string | null = null) {
    const { id, type, children } = account;
    const name = id.split(':').pop()!;

    await prisma.account.create({
        data: {
            id,
            name,
            type,
            parentId,
            currency: 'CNY'
        }
    });

    if (children) {
        for (const child of children) {
            await createAccount(child, id);
        }
    }
}

async function main() {
    // 创建导入源
    await prisma.importSource.create({
        data: {
            id: 'alipay',
            name: '支付宝'
        }
    });
    await prisma.importSource.create({
        data: {
            id: 'wechatpay',
            name: '微信支付'
        }
    });

    // 创建账户
    for (const account of accountSeeds) {
        await createAccount(account);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 