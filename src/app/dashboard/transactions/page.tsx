"use client"

import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"
import { columns } from "./columns"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog"
import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { DatePicker } from "@/components/ui/date-picker"
import { ComboboxAccount } from "@/components/importers/combobox-account"
import { Pagination } from "@/components/ui/pagination"

async function getTransactions(params: string) {
    try {
        const response = await fetch('/api/transactions?' + params, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }

        const transactions = await response.json();

        return transactions.map((tx: any) => ({
            id: tx.id,
            date: formatDate(tx.date),
            payee: tx.payee,
            narration: tx.narration,
            amount: [...tx.postings]
                .filter((p: any) => Number(p.amount) > 0)
                .reduce((sum: number, p: any) => sum + Number(p.amount), 0)
                .toString(),
            accounts: [...tx.postings]
                .sort((a: any, b: any) => Number(a.amount) - Number(b.amount))
                .map((p: any) => p.account),
            tags: tx.tags?.map((t: any) => t.name).join(", ") || "",
        }));
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

interface QueryParams {
    startDate?: string;
    endDate?: string;
    minAmount?: string;
    maxAmount?: string;
    narration?: string;
    counterparty?: string;
    payingAccountId?: string;
    receivingAccountId?: string;
    page?: number;
    pageSize?: number;
}

export default function TransactionsPage() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [queryParams, setQueryParams] = useState<QueryParams>({
        page: 1,
        pageSize: 10,
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
        endDate: new Date().toISOString(),
    });
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0
    });

    // 获取交易数据
    const fetchTransactions = async (params: QueryParams) => {
        try {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, value.toString());
            });

            const response = await fetch('/api/transactions?' + searchParams.toString());
            const { data, pagination: paginationData } = await response.json();
            
            setTransactions(data.map((tx: any) => ({
                id: tx.id,
                date: formatDate(tx.date),
                payee: tx.payee,
                narration: tx.narration,
                amount: [...tx.postings]
                    .filter((p: any) => Number(p.amount) > 0)
                    .reduce((sum: number, p: any) => sum + Number(p.amount), 0)
                    .toString(),
                accounts: [...tx.postings]
                    .sort((a: any, b: any) => Number(a.amount) - Number(b.amount))
                    .map((p: any) => p.account),
                tags: tx.tags?.map((t: any) => t.name).join(", ") || "",
            })));
            setPagination(paginationData);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast({
                title: "获取数据失败",
                description: "无法获取交易数据，请重试",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        fetchTransactions(queryParams);
    }, [queryParams]);

    const handleSearch = () => {
        fetchTransactions(queryParams);
    };

    const handleReset = () => {
        setQueryParams({
            page: 1,
            pageSize: 10,
            startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
            endDate: new Date().toISOString(),
        });
    };

    const handleCreateTransaction = async (data: any) => {
        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    date: data.dateTime,
                    payee: data.counterparty,
                    narration: data.narration,
                    postings: data.postings.map((detail: any) => ({
                        accountId: detail.accountId,
                        amount: detail.amount.toString(),
                    })),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create transaction');
            }

            // 刷新交易列表
            const updatedTransactions = await getTransactions(new URLSearchParams(queryParams as any).toString());
            setTransactions(updatedTransactions);

        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    };

    const handlePageChange = (page: number) => {
        setQueryParams(prev => ({ ...prev, page }));
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col gap-6">
                {/* 页面标题和操作 */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold">交易列表</h1>
                        <p className="text-sm text-muted-foreground">查看所有交易</p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        手动记录交易
                    </Button>
                </div>

                {/* 搜索和过滤 */}
                <div className="grid gap-4 p-4 bg-white rounded-lg shadow">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>日期范围</Label>
                            <div className="flex gap-2">
                                <DatePicker
                                    value={queryParams.startDate}
                                    onChange={(date) =>
                                        setQueryParams(prev => ({
                                            ...prev,
                                            startDate: date?.toISOString()
                                        }))
                                    }
                                    placeholder="开始日期"
                                />
                                <DatePicker
                                    value={queryParams.endDate}
                                    onChange={(date) =>
                                        setQueryParams(prev => ({
                                            ...prev,
                                            endDate: date?.toISOString()
                                        }))
                                    }
                                    placeholder="结束日期"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>金额范围</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="最小金额"
                                    value={queryParams.minAmount || ''}
                                    onChange={(e) =>
                                        setQueryParams(prev => ({
                                            ...prev,
                                            minAmount: e.target.value
                                        }))
                                    }
                                />
                                <Input
                                    type="number"
                                    placeholder="最大金额"
                                    value={queryParams.maxAmount || ''}
                                    onChange={(e) =>
                                        setQueryParams(prev => ({
                                            ...prev,
                                            maxAmount: e.target.value
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>描述关键词</Label>
                            <Input
                                placeholder="搜索交易描述"
                                value={queryParams.narration || ''}
                                onChange={(e) =>
                                    setQueryParams(prev => ({
                                        ...prev,
                                        narration: e.target.value
                                    }))
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>交易对手</Label>
                            <Input
                                placeholder="搜索交易对手"
                                value={queryParams.counterparty || ''}
                                onChange={(e) =>
                                    setQueryParams(prev => ({
                                        ...prev,
                                        counterparty: e.target.value
                                    }))
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>付款账户</Label>
                            <ComboboxAccount
                                value={queryParams.payingAccountId || ''}
                                onValueChange={(value) =>
                                    setQueryParams(prev => ({
                                        ...prev,
                                        payingAccountId: value
                                    }))
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>收款账户</Label>
                            <ComboboxAccount
                                value={queryParams.receivingAccountId || ''}
                                onValueChange={(value) =>
                                    setQueryParams(prev => ({
                                        ...prev,
                                        receivingAccountId: value
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={handleReset}
                        >
                            重置
                        </Button>
                        <Button
                            onClick={handleSearch}
                        >
                            搜索
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    <DataTable
                        columns={columns}
                        data={transactions}
                        enableRowClick={true}
                    />
                    <Pagination
                        pageSize={pagination.pageSize}
                        pageCount={pagination.totalPages}
                        page={pagination.page}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>

            <CreateTransactionDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSubmit={handleCreateTransaction}
            />
        </div>
    )
} 