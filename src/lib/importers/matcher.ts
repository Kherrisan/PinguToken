import { prisma } from '@/lib/prisma';
import { ImportRecord } from '@/lib/types/transaction';
import { ImportRule } from '@prisma/client';

interface MatchingData {
    type: string;
    category: string;
    peer: string;
    description: string;
    amount: number;
    time: string;
    status: string;
    method: string;
}

export interface MatchResult {
    record: ImportRecord;
    targetAccount?: string;
    methodAccount?: string;
    matchedRules: ImportRule[];
}

// 匹配交易记录
export async function matchTransactions(
    records: ImportRecord[], 
    source: string
): Promise<{ matched: MatchResult[]; unmatched: MatchResult[] }> {
    const matched: MatchResult[] = [];
    const unmatched: MatchResult[] = [];

    // 获取所有启用的规则，按优先级排序
    const rules = await prisma.importRule.findMany({
        where: {
            sourceId: source,
            enabled: true
        },
        orderBy: {
            priority: 'desc'
        }
    });

    for (const record of records) {
        const matchResult = await matchSingleTransaction(record, rules);
        
        if (matchResult.targetAccount && matchResult.methodAccount) {
            matched.push(matchResult);
        } else {
            unmatched.push(matchResult);
        }
    }

    return { matched, unmatched };
}

// 匹配单条交易记录
async function matchSingleTransaction(
    record: ImportRecord,
    rules: ImportRule[]
): Promise<MatchResult> {
    const matchingData: MatchingData = {
        type: record.type,
        category: record.category,
        peer: record.counterparty,
        description: record.description,
        amount: parseFloat(record.amount),
        time: record.transactionTime.split(' ')[1],
        status: record.status,
        method: record.paymentMethod
    };

    const result: MatchResult = {
        record,
        matchedRules: []
    };

    // 遍历所有规则
    for (const rule of rules) {
        // 如果规则匹配
        if (matchesRule(rule, matchingData)) {
            // 如果规则指定了目标账户且尚未确定目标账户
            if (rule.targetAccount && !result.targetAccount) {
                result.targetAccount = rule.targetAccount;
                result.matchedRules.push(rule);
            }
            
            // 如果规则指定了支付方式账户且尚未确定支付方式账户
            if (rule.methodAccount && !result.methodAccount) {
                result.methodAccount = rule.methodAccount;
                result.matchedRules.push(rule);
            }

            // 如果两个账户都已确定，可以提前结束
            if (result.targetAccount && result.methodAccount) {
                break;
            }
        }
    }

    return result;
}

// 检查是否匹配规则
function matchesRule(rule: ImportRule, data: MatchingData): boolean {
    // 检查类型
    if (rule.typePattern && !matchesPattern(data.type, rule.typePattern)) {
        return false;
    }

    // 检查分类
    if (rule.categoryPattern && !matchesPattern(data.category, rule.categoryPattern)) {
        return false;
    }

    // 检查交易对手
    if (rule.peerPattern && !matchesPattern(data.peer, rule.peerPattern)) {
        return false;
    }

    // 检查描述
    if (rule.descPattern && !matchesPattern(data.description, rule.descPattern)) {
        return false;
    }

    // 检查时间范围
    if (rule.timePattern && !isTimeInRange(data.time, rule.timePattern)) {
        return false;
    }

    // 检查金额范围
    if (!isAmountInRange(data.amount, rule.amountMin, rule.amountMax)) {
        return false;
    }

    // 检查状态
    if (rule.statusPattern && !matchesPattern(data.status, rule.statusPattern)) {
        return false;
    }

    // 检查支付方式
    if (rule.methodPattern && !matchesPattern(data.method, rule.methodPattern)) {
        return false;
    }

    return true;
}

// 检查时间是否在范围内
function isTimeInRange(
    time: string, 
    range: string
): boolean {
    const [start, end] = range.split('-');
    if (!start || !end) return false;

    // 转换为分钟数进行比较
    const timeMinutes = getMinutes(time);
    const startMinutes = getMinutes(start);
    const endMinutes = getMinutes(end);

    // 处理跨日的情况
    if (startMinutes <= endMinutes) {
        return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    } else {
        return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }
}

// 将时间转换为分钟数
function getMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// 检查金额是否在范围内
function isAmountInRange(
    amount: number, 
    min: number | null, 
    max: number | null
): boolean {
    if (min !== null && amount < min) {
        return false;
    }
    if (max !== null && amount > max) {
        return false;
    }
    return true;
}

// 检查字符串是否匹配模式
function matchesPattern(
    value: string, 
    pattern: string | null
): boolean {
    if (!pattern) return true;
    try {
        const regex = new RegExp(pattern);
        return regex.test(value);
    } catch (error) {
        console.error('Invalid regex pattern:', pattern);
        return false;
    }
} 