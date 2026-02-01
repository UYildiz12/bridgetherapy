"use client"

import * as React from "react"
import {
    Calendar,
    Home,
    MessageSquare,
    Settings,
    Users,
    Video,
    LogOut,
    User,
    Plus
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

// This is sample data. In a real app, fetch from API/Context
const data = {
    user: {
        name: "Dr. Sarah",
        email: "sarah@exhale.com",
        avatar: "/avatars/sarah.jpg",
    },
    navMain: [
        {
            title: "Overview",
            url: "/dashboard",
            icon: Home,
            isActive: true,
        },
        {
            title: "Patients",
            url: "/dashboard/patients",
            icon: Users,
        },
        {
            title: "Sessions",
            url: "/dashboard/sessions",
            icon: Video,
        },
        {
            title: "Calendar",
            url: "/dashboard/calendar",
            icon: Calendar,
        },
        {
            title: "Messages",
            url: "/dashboard/messages",
            icon: MessageSquare,
            badge: "3",
        },
    ],
    navSecondary: [
        {
            title: "Settings",
            url: "/dashboard/settings",
            icon: Settings,
        },
    ],
}

export function DashboardSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-2">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <span className="text-lg font-bold">E</span>
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold text-foreground">Exhale</span>
                        <span className="truncate text-xs text-muted-foreground">Therapist Portal</span>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <div className="px-3 py-2">
                        <Button className="w-full justify-start gap-2 shadow-sm" size="sm">
                            <Plus className="size-4" />
                            <span>New Patient</span>
                        </Button>
                    </div>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {data.navMain.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title} isActive={item.isActive}>
                                        <a href={item.url}>
                                            <item.icon className="text-muted-foreground/70" />
                                            <span>{item.title}</span>
                                            {item.badge && (
                                                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarSeparator />
                <SidebarGroup>
                    <SidebarGroupLabel>System</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {data.navSecondary.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title}>
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={data.user.avatar} alt={data.user.name} />
                                <AvatarFallback className="rounded-lg">DS</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{data.user.name}</span>
                                <span className="truncate text-xs text-muted-foreground">{data.user.email}</span>
                            </div>
                            <LogOut className="ml-auto size-4 text-muted-foreground" />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
