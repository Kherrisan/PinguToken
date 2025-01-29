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
import { ComboboxAccount } from "./combobox-account"
import { ImportRecord } from "@/lib/types/transaction"
import { toast } from "@/hooks/use-toast"

interface ManualMatchDialogProps {
    transaction: ImportRecord;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (transaction: ImportRecord, targetAccount: string, methodAccount: string) => void;
    suggestedTargetAccount?: string;
    suggestedMethodAccount?: string;
}

export function ManualMatchDialog({
    transaction,
    open,
    onOpenChange,
    onConfirm,
    suggestedTargetAccount,
    suggestedMethodAccount
}: ManualMatchDialogProps) {
    const [targetAccount, setTargetAccount] = useState(suggestedTargetAccount || "")
    const [methodAccount, setMethodAccount] = useState(suggestedMethodAccount || "")
    const [isSaving, setIsSaving] = useState(false)

    const handleSubmit = async () => {
        if (!targetAccount || !methodAccount) {
            toast({
                title: "请选择账户",
                description: "请选择目标账户和支付方式账户",
                variant: "destructive",
            })
            return
        }

        setIsSaving(true)
        try {
            onConfirm(transaction, targetAccount, methodAccount)
            onOpenChange(false)
        } catch (error) {
            toast({
                title: "匹配失败",
                description: "无法保存匹配结果，请重试",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>手动匹配交易</DialogTitle>
                    <DialogDescription>
                        为交易选择目标账户和支付方式账户
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">目标账户</label>
                        <ComboboxAccount
                            value={targetAccount}
                            onValueChange={setTargetAccount}
                        />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">支付方式账户</label>
                        <ComboboxAccount
                            value={methodAccount}
                            onValueChange={setMethodAccount}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? "保存中..." : "确认匹配"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
} 