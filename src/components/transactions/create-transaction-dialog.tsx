"use client"

import { useState } from "react"
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
import { ComboboxAccount } from "../importers/combobox-account"
import { toast } from "@/hooks/use-toast"
import { PlusCircleIcon, XCircleIcon } from "lucide-react"

interface Posting {
    accountId: string;
    amount: number;
}

interface TransactionFormData {
    dateTime: string;
    counterparty?: string;
    narration?: string;
    postings: Posting[];
}

interface CreateTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: TransactionFormData) => Promise<void>;
}

// 添加一个辅助函数计算总和
const calculateSum = (details: Posting[]): number => {
    return details.reduce((sum, detail) => sum + (detail.amount || 0), 0);
};

export function CreateTransactionDialog({
    open,
    onOpenChange,
    onSubmit,
}: CreateTransactionDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [accountDetails, setAccountDetails] = useState<Posting[]>([]);
    const [formData, setFormData] = useState<TransactionFormData>({
        dateTime: new Date().toISOString().slice(0, 16),
        counterparty: '',
        narration: '',
        postings: [],
    });

    const handleSubmit = async () => {
        // 手动验证
        if (!formData.dateTime) {
            toast({
                title: "验证失败",
                description: "请选择交易时间",
                variant: "destructive",
            });
            return;
        }

        if (accountDetails.length === 0) {
            toast({
                title: "验证失败",
                description: "请至少添加一个账户变动明细",
                variant: "destructive",
            });
            return;
        }

        for (const detail of accountDetails) {
            if (!detail.accountId) {
                toast({
                    title: "验证失败",
                    description: "请选择账户",
                    variant: "destructive",
                });
                return;
            }
            // 检查金额是否已设置（允许为0或负数）
            if (detail.amount === undefined || detail.amount === null || isNaN(detail.amount)) {
                toast({
                    title: "验证失败",
                    description: "请输入有效金额",
                    variant: "destructive",
                });
                return;
            }
        }

        try {
            setIsSaving(true);
            await onSubmit({
                ...formData,
                postings: accountDetails,
            });
            setAccountDetails([]);
            setFormData({
                dateTime: new Date().toISOString().slice(0, 16),
                counterparty: '',
                narration: '',
                postings: [],
            });
            onOpenChange(false);
            toast({
                title: "交易创建成功",
                description: "新交易已成功创建",
            });
        } catch (error) {
            toast({
                title: "创建失败",
                description: "无法创建交易，请重试",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const addAccountDetail = () => {
        let defaultAmount = 0;
        
        if (accountDetails.length === 1) {
            // 如果已有一条明细，新明细的默认金额为第一条明细金额的负数
            defaultAmount = -accountDetails[0].amount;
        } else if (accountDetails.length >= 2) {
            // 如果已有两条或更多明细，新明细的默认金额使总和为0
            const currentSum = accountDetails.reduce((sum, detail) => sum + detail.amount, 0);
            defaultAmount = -currentSum;
        }

        setAccountDetails([
            ...accountDetails, 
            { 
                accountId: '', 
                amount: defaultAmount 
            }
        ]);
    };

    const removeAccountDetail = (index: number) => {
        const newDetails = [...accountDetails];
        newDetails.splice(index, 1);
        setAccountDetails(newDetails);
    };

    const checkBalance = () => {
        const sum = calculateSum(accountDetails);
        const formattedSum = Math.abs(sum).toFixed(2);
        
        return formattedSum === '0.00';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>创建新交易</DialogTitle>
                    <DialogDescription>
                        手动创建一笔新的交易记录
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>交易时间</Label>
                            <Input
                                type="datetime-local"
                                value={formData.dateTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, dateTime: e.target.value }))}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>交易对手</Label>
                            <Input
                                placeholder="请输入交易对手（可选）"
                                value={formData.counterparty}
                                onChange={(e) => setFormData(prev => ({ ...prev, counterparty: e.target.value }))}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>交易描述</Label>
                            <Input
                                placeholder="请输入交易描述（可选）"
                                value={formData.narration}
                                onChange={(e) => setFormData(prev => ({ ...prev, narration: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>账户变动明细</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addAccountDetail}
                                className="flex items-center gap-1"
                            >
                                <PlusCircleIcon className="w-4 h-4" />
                                添加明细条目
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {accountDetails.map((detail, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-1">
                                        <ComboboxAccount
                                            value={detail.accountId}
                                            onValueChange={(value) => {
                                                const newDetails = [...accountDetails];
                                                newDetails[index].accountId = value;
                                                setAccountDetails(newDetails);
                                            }}
                                        />
                                    </div>

                                    <div className="w-32">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="金额"
                                            value={detail.amount || ''}
                                            onChange={(e) => {
                                                const newDetails = [...accountDetails];
                                                const value = e.target.value;
                                                // 允许输入负号和小数点
                                                newDetails[index].amount = value === '' ? 0 : parseFloat(value);
                                                setAccountDetails(newDetails);
                                            }}
                                            className="w-full"
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeAccountDetail(index)}
                                    >
                                        <XCircleIcon className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        取消
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSaving || !checkBalance()}
                    >
                        {isSaving ? "创建中..." : "创建"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
