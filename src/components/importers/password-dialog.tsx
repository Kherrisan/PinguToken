"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

interface PasswordDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    emailId: string
    fileName: string
    onConfirm: (password: string) => Promise<void>
}

export function PasswordDialog({
    open,
    onOpenChange,
    emailId,
    fileName,
    onConfirm,
}: PasswordDialogProps) {
    const [password, setPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!password) {
            toast({
                title: "请输入密码",
                variant: "destructive",
            })
            return
        }

        try {
            setIsSubmitting(true)
            await onConfirm(password)
            onOpenChange(false)
        } catch (error) {
            toast({
                title: "解密失败",
                description: "请检查密码是否正确",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>输入解压密码</DialogTitle>
                    <DialogDescription>
                        请输入文件 {fileName} 的解压密码
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input
                        type="password"
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        取消
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "处理中..." : "确认"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
} 