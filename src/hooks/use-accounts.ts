import useSWR from 'swr'

interface Account {
    id: string
    name: string
    type: string
    parentId: string | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useAccounts() {
    const { data: accounts, error, isLoading, mutate } = useSWR<Account[]>('/api/accounts', fetcher)

    // 构建账户完整路径
    const accountsWithFullPath = accounts?.map(account => {
        const getFullPath = (acc: Account): string => {
            if (!acc.parentId) return acc.name
            const parent = accounts.find(a => a.id === acc.parentId)
            return parent ? `${getFullPath(parent)}:${acc.name}` : acc.name
        }

        return {
            ...account,
            fullPath: account.id
        }
    })

    return { 
        accounts: accountsWithFullPath, 
        isLoading, 
        error,
        mutate 
    }
} 