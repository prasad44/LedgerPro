"use client";

import Link from "next/link";
import {
  BarChart3, FileText, Scale, List, Users, Building2,
  ArrowRight, TrendingUp, TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const reportCategories = [
  {
    title: "Company & Financial",
    color: "blue",
    reports: [
      { name: "Profit & Loss", desc: "Income and expenses for a date range", href: "/reports/profit-loss", icon: TrendingUp },
      { name: "Balance Sheet", desc: "Assets, liabilities, and equity as of a date", href: "/reports/balance-sheet", icon: Scale },
      { name: "Trial Balance", desc: "All account balances — debits and credits", href: "/reports/trial-balance", icon: List },
    ],
  },
  {
    title: "Customers & Receivables",
    color: "green",
    reports: [
      { name: "A/R Aging Summary", desc: "Outstanding customer invoices by age", href: "/reports/ar-aging", icon: Users },
    ],
  },
  {
    title: "Vendors & Payables",
    color: "orange",
    reports: [
      { name: "A/P Aging Summary", desc: "Outstanding vendor bills by age", href: "/reports/ap-aging", icon: Building2 },
    ],
  },
];

const colorMap: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
};

export default function ReportsPage() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Report Center
        </h1>
        <p className="text-sm text-gray-500 mt-1">Select a report to view your financial data.</p>
      </div>

      <div className="space-y-8">
        {reportCategories.map((cat) => (
          <div key={cat.title}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {cat.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.reports.map((r) => (
                <Link key={r.href} href={r.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colorMap[cat.color]} shrink-0`}>
                        <r.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 group-hover:text-blue-600 transition-colors">
                          {r.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
