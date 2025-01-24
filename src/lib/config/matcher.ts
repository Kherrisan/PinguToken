import { prisma } from '@/lib/prisma';
import type { ImportRule } from '@prisma/client';

function isTimeInRange(time: string, pattern: string): boolean {
    // 解析时间范围，格式：HH:mm-HH:mm
    const [start, end] = pattern.split('-');
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    
    // 解析交易时间
    const [hour, minute] = time.split(':').map(Number);
    
    // 转换为分钟数进行比较
    const timeInMinutes = hour * 60 + minute;
    const startInMinutes = startHour * 60 + startMinute;
    const endInMinutes = endHour * 60 + endMinute;
    
    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
}

export function matchRule(rule: ImportRule, record: {
    type?: string;
    category?: string;
    peer?: string;
    description?: string;
    amount?: number;
    time?: string;  // 格式：HH:mm
}): boolean {
    // 检查规则是否启用
    if (!rule.enabled) return false;

    // 检查所有非空的正则表达式模式
    if (rule.typePattern && record.type) {
        const regex = new RegExp(rule.typePattern);
        if (!regex.test(record.type)) return false;
    }

    if (rule.categoryPattern && record.category) {
        const regex = new RegExp(rule.categoryPattern);
        if (!regex.test(record.category)) return false;
    }

    if (rule.peerPattern && record.peer) {
        const regex = new RegExp(rule.peerPattern);
        if (!regex.test(record.peer)) return false;
    }

    if (rule.descPattern && record.description) {
        const regex = new RegExp(rule.descPattern);
        if (!regex.test(record.description)) return false;
    }

    // 检查时间范围
    if (rule.timePattern && record.time) {
        if (!isTimeInRange(record.time, rule.timePattern)) return false;
    }

    // 检查金额范围
    if (record.amount !== undefined) {
        if (rule.amountMin && record.amount < Number(rule.amountMin)) return false;
        if (rule.amountMax && record.amount > Number(rule.amountMax)) return false;
    }

    return true;
}

export async function findMatchingRule(sourceName: string, record: {
    type?: string;
    category?: string;
    peer?: string;
    description?: string;
    amount?: number;
    time?: string;  // 格式：HH:mm
}): Promise<ImportRule | null> {
    // 按优先级获取所有启用的规则
    const rules = await prisma.importRule.findMany({
        where: {
            sourceId: sourceName,
            enabled: true
        },
        orderBy: {
            priority: 'asc'
        }
    });

    // 返回第一个匹配的规则
    for (const rule of rules) {
        if (matchRule(rule, record)) {
            return rule;
        }
    }

    return null;
} 