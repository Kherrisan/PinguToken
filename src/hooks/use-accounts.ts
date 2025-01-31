import { Account } from '@/app/dashboard/accounts/columns'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useAccounts() {
    const { data: accounts, error, isLoading, mutate } = useSWR<Account[]>('/api/accounts', fetcher)

    // 构建账户完整路径
    const accountsWithFullPath = accounts?.map(account => {
        return {
            ...account,
            fullPath: account.path
        }
    })

    return { 
        accounts: accountsWithFullPath, 
        isLoading, 
        error,
        mutate 
    }
} 