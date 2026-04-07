"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Building2,
  ChevronDown,
  LogOut,
  Settings,
  Users,
  Plus,
  BookOpen,
} from "lucide-react";

export function Topbar() {
  const { data: session } = useSession();

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <header className="flex h-12 items-center justify-between border-b border-[#003366] bg-gradient-to-r from-[#0054A6] via-[#0066CC] to-[#3A8FD6] px-3 shadow-sm">
      {/* Left: sidebar toggle + branding */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-white hover:bg-white/10 rounded" />
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-white" />
          <span className="text-sm font-bold text-white tracking-wide">
            LedgerPro
          </span>
        </div>
        {session?.user?.organizationSlug && (
          <span className="text-xs text-blue-200 ml-2 hidden sm:inline">
            {session.user.organizationSlug}
          </span>
        )}
      </div>

      {/* Center: Quick action buttons */}
      <div className="hidden md:flex items-center gap-1">
        {[
          { label: "New Invoice", href: "/invoices/new" },
          { label: "New Expense", href: "/expenses/new" },
          { label: "New Bill", href: "/bills/new" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="inline-flex items-center text-xs text-white/90 hover:bg-white/10 hover:text-white h-7 px-2 rounded gap-1 transition-colors"
          >
            <Plus className="h-3 w-3" />
            {action.label}
          </Link>
        ))}
      </div>

      {/* Right: user menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 text-white hover:bg-white/10 h-8 px-2 rounded outline-none">
          <Avatar className="h-6 w-6">
            <AvatarImage src={session?.user?.image || undefined} />
            <AvatarFallback className="bg-blue-800 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs hidden sm:inline">
            {session?.user?.name}
          </span>
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>
            <Link href="/select-org" className="flex items-center w-full">
              <Building2 className="mr-2 h-4 w-4" />
              Switch Company
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/settings/users" className="flex items-center w-full">
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/settings" className="flex items-center w-full">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
