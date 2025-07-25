"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImportRecord } from "@/lib/types/transaction"
import { Checkbox } from "@/components/ui/checkbox"
import { ComboboxAccount } from "./combobox-account"
import { Separator } from "@/components/ui/separator"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { InfoIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { MatchResult } from "@/lib/importers/matcher"

interface CreateRuleDialogProps {
    record: ImportRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRuleCreated: (ruleId: string, matched: boolean) => void;
}

interface MatchCondition {
    enabled: boolean;
    pattern?: string;
}

interface RuleFormData {
    name: string;
    description: string;
    targetAccount: string;
    methodAccount: string;
    type: MatchCondition;
    category: MatchCondition;
    peer: MatchCondition;
    desc: MatchCondition;
    time: MatchCondition & {
        start?: string;
        end?: string;
    };
    amount: MatchCondition & {
        min?: string;
        max?: string;
    };
    method: MatchCondition;
}

interface MatchFieldHelp {
    title: string;
    description: string;
    examples: string[];
    format?: string;
}

const matchFieldHelps: Record<string, MatchFieldHelp> = {
    type: {
        title: "交易类型",
        description: "交易的类型字段",
        examples: ["支出", "收入", "不计收支"],
        format: "完整匹配或正则表达式"
    },
    category: {
        title: "交易分类",
        description: "交易分类",
        examples: ["餐饮美食", "日用百货", "交通出行", "转账红包"],
        format: "完整匹配或正则表达式"
    },
    peer: {
        title: "交易对手",
        description: "交易的对方名称",
        examples: ["美团", "饿了么", "滴滴出行", "王小明"],
        format: "完整匹配或正则表达式，支持部分匹配"
    },
    desc: {
        title: "交易描述",
        description: "交易的具体描述信息",
        examples: ["美团订单", "滴滴快车", "转账备注：房租"],
        format: "完整匹配或正则表达式，支持部分匹配"
    },
    time: {
        title: "时间范围",
        description: "交易发生的时间范围",
        examples: ["00:00-08:00", "12:00-13:30", "18:00-23:59"],
        format: "24小时制，格式：HH:mm-HH:mm"
    },
    amount: {
        title: "金额范围",
        description: "交易的金额范围",
        examples: ["0-100", "100-1000", ">1000"],
        format: "数字，支持小数点后两位"
    },
    status: {
        title: "交易状态",
        description: "交易的状态信息",
        examples: ["交易成功", "支付成功", "已退款", "已关闭"],
        format: "完整匹配或正则表达式"
    },
    method: {
        title: "支付方式",
        description: "交易的支付方式",
        examples: ["余额宝", "花呗", "储蓄卡", "信用卡"],
        format: "完整匹配或正则表达式"
    }
}

function MatchFieldLabel({ field, children }: { field: string; children: React.ReactNode }) {
    const help = matchFieldHelps[field];
    if (!help) return <>{children}</>;

    return (
        <div className="flex items-center gap-2">
            {children}
            <HoverCard>
                <HoverCardTrigger asChild>
                    <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">{help.title}</h4>
                        <p className="text-sm text-muted-foreground">
                            {help.description}
                        </p>
                        {help.format && (
                            <div className="text-sm">
                                <span className="font-medium">格式：</span>
                                {help.format}
                            </div>
                        )}
                        <div className="text-sm">
                            <span className="font-medium">示例：</span>
                            <div className="mt-1 space-y-1">
                                {help.examples.map((example, i) => (
                                    <code key={i} className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                                        {example}
                                    </code>
                                ))}
                            </div>
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>
        </div>
    );
}

export function CreateRuleDialog({
    record,
    open,
    onOpenChange,
    onRuleCreated,
}: CreateRuleDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<RuleFormData>({
        name: '',
        description: '',
        targetAccount: '',
        methodAccount: '',
        type: { enabled: false },
        category: { enabled: false },
        peer: { enabled: false },
        desc: { enabled: false },
        time: { enabled: false },
        amount: { enabled: false },
        method: {
            enabled: false,
            pattern: ''
        }
    });

    useEffect(() => {
        if (record) {
            setFormData({
                name: '',
                description: '',
                targetAccount: '',
                methodAccount: '',
                type: { enabled: false },
                category: { enabled: false },
                peer: { enabled: false },
                desc: { enabled: false },
                time: { enabled: false },
                amount: { enabled: false },
                method: {
                    enabled: false,
                    pattern: record.paymentMethod
                }
            });
        }
    }, [record]);

    const handleSubmit = async () => {
        if (!record) return;
        setIsSaving(true);

        try {
            console.log('formData', formData);
            // 创建规则
            const ruleResponse = await fetch('/api/import/rules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceId: record.provider, // 使用传入的sourceId
                    name: formData.name,
                    description: formData.description,
                    targetAccount: formData.targetAccount,
                    methodAccount: formData.methodAccount,
                    typePattern: formData.type.enabled ? formData.type.pattern : undefined,
                    categoryPattern: formData.category.enabled ? formData.category.pattern : undefined,
                    peerPattern: formData.peer.enabled ? formData.peer.pattern : undefined,
                    descPattern: formData.desc.enabled ? formData.desc.pattern : undefined,
                    timePattern: formData.time.enabled ? `${formData.time.start}-${formData.time.end}` : undefined,
                    amountMin: formData.amount.enabled ? parseFloat(formData.amount.min || '0') : undefined,
                    amountMax: formData.amount.enabled ? parseFloat(formData.amount.max || '0') : undefined,
                    methodPattern: formData.method.enabled ? formData.method.pattern : undefined,
                }),
            });

            if (!ruleResponse.ok) {
                throw new Error('Failed to create rule');
            }

            const rule = await ruleResponse.json();

            // 使用新规则尝试匹配当前交易
            const tryMatchResponse = await fetch('/api/import/try-match', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: record.provider, // 使用传入的sourceId
                    records: [record]
                }),
            });

            if (!tryMatchResponse.ok) {
                throw new Error('Failed to match transaction');
            }

            const [matchResult]: MatchResult[] = await tryMatchResponse.json();
            const matched: boolean = !!matchResult.targetAccount && !!matchResult.methodAccount;

            // 通知父组件规则已创建，并传递匹配结果
            onRuleCreated(rule.id, matched);
            onOpenChange(false);

            toast({
                title: "规则创建成功",
                description: matched
                    ? "规则已创建并可以匹配当前交易"
                    : "规则已创建，但未能匹配当前交易",
            });
        } catch (error) {
            toast({
                title: "创建失败",
                description: "无法创建规则，请重试",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const updateMatchCondition = (field: keyof RuleFormData, updates: Partial<MatchCondition>) => {
        setFormData(prev => ({
            ...prev,
            [field]: {
                ...(prev[field] as MatchCondition),
                ...updates
            }
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>创建匹配规则</DialogTitle>
                    <DialogDescription>
                        为未匹配的交易创建新的规则，后续相似的交易将自动匹配
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* 基本信息 */}
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">规则名称</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="给规则起个名字"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>账户设置</Label>
                            <div className="grid gap-4">
                                <div>
                                    <Label htmlFor="targetAccount" className="text-sm text-muted-foreground mb-2">
                                        目标账户
                                    </Label>
                                    <ComboboxAccount
                                        value={formData.targetAccount}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, targetAccount: value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="methodAccount" className="text-sm text-muted-foreground mb-2">
                                        支付方式
                                    </Label>
                                    <ComboboxAccount
                                        value={formData.methodAccount}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, methodAccount: value }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* 匹配条件 */}
                    <div className="space-y-4">
                        <Label>匹配条件</Label>

                        {/* 交易类型 */}
                        <div className="grid gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="matchType"
                                    checked={formData.type.enabled}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            formData.type.pattern = record?.type;
                                        }
                                        updateMatchCondition('type', { enabled: !!checked })
                                    }}
                                />
                                <MatchFieldLabel field="type">
                                    <Label htmlFor="matchType">匹配交易类型</Label>
                                </MatchFieldLabel>
                            </div>
                            {formData.type.enabled && (
                                <Input
                                    value={formData.type.pattern}
                                    onChange={(e) => updateMatchCondition('type', { pattern: e.target.value })}
                                    placeholder={record?.type}
                                />
                            )}
                        </div>

                        {/* 交易分类 */}
                        <div className="grid gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="matchCategory"
                                    checked={formData.category.enabled}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            formData.category.pattern = record?.category;
                                        }
                                        updateMatchCondition('category', { enabled: !!checked })
                                    }}
                                />
                                <MatchFieldLabel field="category">
                                    <Label htmlFor="matchCategory">匹配交易分类</Label>
                                </MatchFieldLabel>
                            </div>
                            {formData.category.enabled && (
                                <Input
                                    value={formData.category.pattern}
                                    onChange={(e) => updateMatchCondition('category', { pattern: e.target.value })}
                                    placeholder={record?.category}
                                />
                            )}
                        </div>

                        {/* 交易对手 */}
                        <div className="grid gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="matchPeer"
                                    checked={formData.peer.enabled}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            formData.peer.pattern = record?.counterparty;
                                        }
                                        updateMatchCondition('peer', { enabled: !!checked })
                                    }}
                                />
                                <MatchFieldLabel field="peer">
                                    <Label htmlFor="matchPeer">匹配交易对手</Label>
                                </MatchFieldLabel>
                            </div>
                            {formData.peer.enabled && (
                                <Input
                                    value={formData.peer.pattern}
                                    onChange={(e) => updateMatchCondition('peer', { pattern: e.target.value })}
                                    placeholder={record?.counterparty}
                                />
                            )}
                        </div>

                        {/* 交易描述 */}
                        <div className="grid gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="matchDesc"
                                    checked={formData.desc.enabled}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            formData.desc.pattern = record?.description;
                                        }
                                        updateMatchCondition('desc', { enabled: !!checked })
                                    }}
                                />
                                <MatchFieldLabel field="description">
                                    <Label htmlFor="matchDesc">匹配交易描述</Label>
                                </MatchFieldLabel>
                            </div>
                            {formData.desc.enabled && (
                                <Input
                                    value={formData.desc.pattern}
                                    onChange={(e) => updateMatchCondition('desc', { pattern: e.target.value })}
                                    placeholder={record?.description}
                                />
                            )}
                        </div>

                        {/* 时间范围 */}
                        <div className="grid gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="matchTime"
                                    checked={formData.time.enabled}
                                    onCheckedChange={(checked) =>
                                        updateMatchCondition('time', { enabled: !!checked })
                                    }
                                />
                                <MatchFieldLabel field="time">
                                    <Label htmlFor="matchTime">匹配时间范围</Label>
                                </MatchFieldLabel>
                            </div>
                            {formData.time.enabled && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-sm text-muted-foreground">
                                            开始时间
                                        </Label>
                                        <Input
                                            type="time"
                                            value={formData.time.start}
                                            onChange={(e) =>
                                                setFormData(prev => ({
                                                    ...prev,
                                                    time: {
                                                        ...prev.time,
                                                        start: e.target.value
                                                    }
                                                }))
                                            }
                                            placeholder="00:00"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-sm text-muted-foreground">
                                            结束时间
                                        </Label>
                                        <Input
                                            type="time"
                                            value={formData.time.end}
                                            onChange={(e) =>
                                                setFormData(prev => ({
                                                    ...prev,
                                                    time: {
                                                        ...prev.time,
                                                        end: e.target.value
                                                    }
                                                }))
                                            }
                                            placeholder="23:59"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 金额范围 */}
                        <div className="grid gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="matchAmount"
                                    checked={formData.amount.enabled}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            formData.amount.min = record?.amount;
                                        }
                                        updateMatchCondition('amount', { enabled: !!checked })
                                    }}
                                />
                                <MatchFieldLabel field="amount">
                                    <Label htmlFor="matchAmount">匹配金额范围</Label>
                                </MatchFieldLabel>
                            </div>
                            {formData.amount.enabled && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-sm text-muted-foreground">
                                            最小金额
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.amount.min}
                                            onChange={(e) =>
                                                setFormData(prev => ({
                                                    ...prev,
                                                    amount: {
                                                        ...prev.amount,
                                                        min: e.target.value
                                                    }
                                                }))
                                            }
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-sm text-muted-foreground">
                                            最大金额
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.amount.max}
                                            onChange={(e) =>
                                                setFormData(prev => ({
                                                    ...prev,
                                                    amount: {
                                                        ...prev.amount,
                                                        max: e.target.value
                                                    }
                                                }))
                                            }
                                            placeholder="999999.99"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 支付方式 */}
                        <div className="grid gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="matchMethod"
                                    checked={formData.method.enabled}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            formData.method.pattern = record?.paymentMethod;
                                        }
                                        updateMatchCondition('method', { enabled: !!checked })
                                    }}
                                />
                                <MatchFieldLabel field="method">
                                    <Label htmlFor="matchMethod">匹配支付方式</Label>
                                </MatchFieldLabel>
                            </div>
                            {formData.method.enabled && (
                                <Input
                                    value={formData.method.pattern}
                                    onChange={(e) =>
                                        updateMatchCondition('method', { pattern: e.target.value })
                                    }
                                    placeholder="输入支付方式匹配模式"
                                />
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? "保存中..." : "保存规则"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
} 