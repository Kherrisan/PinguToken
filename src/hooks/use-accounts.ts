import { useEffect, useState } from "react"

interface Account {
    id: string
    name: string
    type: string
    parentId: string | null
}

export function useAccounts() {
    const [accounts, setAccounts] = useState<Account[] | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        async function fetchAccounts() {
            try {
                const response = await fetch('/api/accounts')
                if (!response.ok) {
                    throw new Error('Failed to fetch accounts')
                }
                const data = await response.json()
                setAccounts(data)
            } catch (e) {
                setError(e instanceof Error ? e : new Error('Unknown error'))
            } finally {
                setIsLoading(false)
            }
        }

        fetchAccounts()
    }, [])

    // 构建账户完整路径
    const accountsWithFullPath = accounts?.map(account => {
        const getFullPath = (acc: Account): string => {
            if (!acc.parentId) return acc.name
            const parent = accounts.find(a => a.id === acc.parentId)
            return parent ? `${getFullPath(parent)}:${acc.name}` : acc.name
        }

        return {
            ...account,
            fullPath: getFullPath(account)
        }
    })

    return { accounts: accountsWithFullPath, isLoading, error }
} 