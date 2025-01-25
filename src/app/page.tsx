import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Page() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8">
                <h1 className="text-4xl font-bold">记账助手</h1>
                <p className="text-xl">轻松管理您的个人财务</p>
                <Button asChild>
                    <Link href="/dashboard">开始使用</Link>
                </Button>
            </div>
        </main>
    )
}

