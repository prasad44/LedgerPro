"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, CreditCard, Users, Building2, Bell, Shield, Key, Webhook, ArrowRight } from "lucide-react";

const settingsLinks = [
  { name: "Company Information", desc: "Update your company name, address, and logo", href: "/settings/company", icon: Building2 },
  { name: "Billing & Subscription", desc: "Manage your plan, view usage, upgrade", href: "/settings/billing", icon: CreditCard },
  { name: "Users & Roles", desc: "Invite team members and manage permissions", href: "/settings/users", icon: Users },
  { name: "Notifications", desc: "Configure email and in-app notifications", href: "/settings/notifications", icon: Bell },
  { name: "Security", desc: "Password, two-factor authentication, sessions", href: "/settings/security", icon: Shield },
  { name: "API Keys", desc: "Generate and manage API keys for integrations", href: "/settings/api-keys", icon: Key },
  { name: "Webhooks", desc: "Configure endpoints for real-time event notifications", href: "/settings/webhooks", icon: Webhook },
];

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5" /> Settings
      </h1>

      <div className="space-y-3">
        {settingsLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="bg-gray-100 p-2.5 rounded-lg group-hover:bg-blue-50 transition-colors">
                  <item.icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
