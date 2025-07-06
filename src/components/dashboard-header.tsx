"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

// 定义路由映射和对应的链接
const routeConfig: Record<string, { paths: string[], links: string[] }> = {
    '/dashboard': {
        paths: ['首页'],
        links: ['/dashboard']
    },
    '/dashboard/overview': {
        paths: ['概览', '资产概览'],
        links: ['/dashboard/overview']
    },
    '/dashboard/transactions': {
        paths: ['交易', '数据表'],
        links: ['/dashboard', '/dashboard/transactions']
    },
    '/dashboard/importer': {
        paths: ['交易', '导入'],
        links: ['/dashboard', '/dashboard/importer']
    },
    '/dashboard/accounts': {
        paths: ['账户', '账户列表'],
        links: ['/dashboard', '/dashboard/accounts']
    },
    '/dashboard/settings': {
        paths: ['设置'],
        links: ['/dashboard/settings']
    }
}

export function DashboardHeader() {
    const pathname = usePathname()
    
    // 处理交易详情页的特殊情况
    let paths = ['未知页面']
    let links: string[] = []
    
    if (pathname.startsWith('/dashboard/transactions/')) {
        paths = ['交易', '数据表', '交易详情']
        links = ['/dashboard', '/dashboard/transactions', pathname]
    } else {
        const config = routeConfig[pathname]
        if (config) {
            paths = config.paths
            links = config.links
        }
    }

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        {paths.map((path, index) => (
                            <React.Fragment key={path}>
                                {index > 0 && <BreadcrumbSeparator />}
                                {index === paths.length - 1 ? (
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>{path}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                ) : (
                                    <BreadcrumbItem>
                                        <BreadcrumbLink asChild>
                                            <Link href={links[index]}>{path}</Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                )}
                            </React.Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        </header>
    )
} 