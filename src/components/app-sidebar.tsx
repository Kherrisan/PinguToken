"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Wallet,
  FileInput,
  BarChart3,
  Settings,
  GalleryVerticalEnd,
  Building2,
  Tags,
  FileText,
  LineChart,
  PieChart,
  SaveAll,
} from "lucide-react"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/nav-main"

const navItems = [
  {
    title: "资产概览",
    url: "/app/overview",
    group: "Home",
    icon: LayoutDashboard,
  },
  {
    title: "交易记录",
    url: "/app/transactions",
    group: "Home",
    icon: Wallet,
  },
  {
    title: "账户管理",
    url: "/app/accounts",
    group: "Home",
    icon: Building2,
  },
  {
    title: "标签管理",
    url: "/app/tags",
    group: "Home",
    icon: Tags,
  },
  {
    title: "导入账单",
    url: "/app/importer",
    group: "Home",
    icon: FileInput,
  },
  {
    title: "导入规则",
    url: "/app/import-rules",
    group: "Home",
    icon: FileText,
  },
  {
    title: "收支趋势",
    url: "/app/analytics/trends",
    group: "Analytics",
    icon: LineChart,
  },
  {
    title: "账户余额",
    url: "/app/analytics/balances",
    group: "Analytics",
    icon: BarChart3,
  },
  {
    title: "分类统计",
    url: "/app/analytics/categories",
    group: "Analytics",
    icon: PieChart,
  },
  {
    title: "基本设置",
    url: "/app/settings",
    group: "Extra",
    icon: Settings,
  },
  {
    title: "数据备份",
    url: "/app/settings/backup",
    group: "Extra",
    icon: SaveAll,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/app">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">记账系统</span>
                  <span className="">v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
