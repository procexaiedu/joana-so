'use client'

import {
    Home,
    Users,
    Calendar,
    Package,
    DollarSign,
    Activity,
    Settings,
    ClipboardList,
    UserCircle,
    Building2,
    Bot,
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
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Navigation items organized by module
const navigationItems = [
    {
        group: "Principal",
        items: [
            { title: "Dashboard", url: "/", icon: Home },
        ],
    },
    {
        group: "CRM",
        items: [
            { title: "Leads", url: "/leads", icon: UserCircle },
            { title: "Oportunidades", url: "/oportunidades", icon: DollarSign },
            { title: "Pacientes", url: "/pacientes", icon: Users },
            { title: "Profissionais", url: "/profissionais", icon: UserCircle },
        ],
    },
    {
        group: "Operações",
        items: [
            { title: "Agenda", url: "/agenda", icon: Calendar },
            { title: "Aplicações", url: "/aplicacoes", icon: Activity },
            { title: "Planos", url: "/planos", icon: ClipboardList },
        ],
    },
    {
        group: "Gestão",
        items: [
            { title: "Produtos", url: "/produtos", icon: Package },
            { title: "Financeiro", url: "/financeiro", icon: DollarSign },
        ],
    },
    {
        group: "Sistema",
        items: [
            { title: "IA Assistant", url: "/ai", icon: Bot },
            { title: "Configurações", url: "/configuracoes", icon: Settings },
        ],
    },
]

export function AppSidebar() {
    const pathname = usePathname()

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border">
                <div className="flex items-center gap-2 px-2 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
                        Joana
                    </span>
                </div>
            </SidebarHeader>

            <SidebarContent>
                {navigationItems.map((section) => (
                    <SidebarGroup key={section.group}>
                        <SidebarGroupLabel>{section.group}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {section.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === item.url}
                                            tooltip={item.title}
                                        >
                                            <Link href={item.url}>
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Perfil">
                            <Link href="/perfil" className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                    <Users className="h-3 w-3" />
                                </div>
                                <span className="group-data-[collapsible=icon]:hidden">
                                    Dr. Luis
                                </span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
