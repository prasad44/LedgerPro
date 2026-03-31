"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Users,
  Building2,
  FileText,
  Receipt,
  CreditCard,
  Landmark,
  BarChart3,
  Package,
  Calculator,
  Settings,
  ClipboardList,
  DollarSign,
  ArrowRightLeft,
  TrendingUp,
  ShoppingCart,
  BookOpen,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navigation = [
  {
    label: "",
    items: [{ name: "Home", href: "/dashboard", icon: Home }],
  },
  {
    label: "Customers",
    items: [
      { name: "Customer Center", href: "/customers", icon: Users },
      { name: "Invoices", href: "/invoices", icon: FileText },
      { name: "Estimates", href: "/estimates", icon: ClipboardList },
      { name: "Receive Payments", href: "/payments", icon: DollarSign },
      { name: "Credit Memos", href: "/credit-memos", icon: Receipt },
    ],
  },
  {
    label: "Vendors",
    items: [
      { name: "Vendor Center", href: "/vendors", icon: Building2 },
      { name: "Bills", href: "/bills", icon: CreditCard },
      { name: "Expenses", href: "/expenses", icon: Receipt },
      {
        name: "Purchase Orders",
        href: "/purchase-orders",
        icon: ShoppingCart,
      },
    ],
  },
  {
    label: "Banking",
    items: [
      { name: "Banking", href: "/banking", icon: Landmark },
      { name: "Deposits", href: "/deposits", icon: ArrowRightLeft },
      { name: "Reconcile", href: "/reconciliation", icon: BookOpen },
    ],
  },
  {
    label: "Company",
    items: [
      { name: "Chart of Accounts", href: "/accounts", icon: Calculator },
      { name: "Journal Entries", href: "/journal", icon: FileText },
      { name: "Items & Services", href: "/items", icon: Package },
    ],
  },
  {
    label: "Reports",
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Budgets", href: "/budgets", icon: TrendingUp },
    ],
  },
  {
    label: "",
    items: [{ name: "Settings", href: "/settings", icon: Settings }],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-[#1e3a5f] bg-gradient-to-b from-[#3A6EA5] to-[#003366]">
      <SidebarContent className="py-2">
        {navigation.map((group, gi) => (
          <SidebarGroup key={gi}>
            {group.label && (
              <SidebarGroupLabel className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-wider px-3">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className={cn(
                        "text-white/80 hover:bg-white/10 hover:text-white transition-colors",
                        isActive && "bg-white/20 text-white font-semibold"
                      )}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-[13px]">{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
