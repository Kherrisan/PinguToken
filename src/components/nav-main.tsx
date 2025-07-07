"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  
  // 判断某个菜单项是否包含当前路径
  const isCurrentSection = (item: typeof items[0]) => {
    return item.items?.some(subItem => pathname === subItem.url) || false
  }

  // 为每个菜单项维护展开状态
  const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
    const initialStates: Record<string, boolean> = {}
    items.forEach(item => {
      initialStates[item.title] = item.isActive || isCurrentSection(item)
    })
    return initialStates
  })

  // 当路径变化时，确保包含当前页面的菜单保持展开
  useEffect(() => {
    setOpenStates(prev => {
      const newStates = { ...prev }
      items.forEach(item => {
        if (isCurrentSection(item)) {
          newStates[item.title] = true
        }
      })
      return newStates
    })
  }, [pathname])

  const handleOpenChange = (itemTitle: string, isOpen: boolean) => {
    setOpenStates(prev => ({
      ...prev,
      [itemTitle]: isOpen
    }))
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            open={openStates[item.title] || false}
            onOpenChange={(isOpen) => handleOpenChange(item.title, isOpen)}
            asChild
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <Link href={subItem.url}>
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
