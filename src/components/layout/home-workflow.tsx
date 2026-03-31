"use client";

import Link from "next/link";
import {
  FileText,
  Receipt,
  DollarSign,
  CreditCard,
  Landmark,
  ClipboardList,
  ShoppingCart,
  ArrowRight,
  Users,
  Building2,
  BookOpen,
  ArrowRightLeft,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkflowItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
}

function WorkflowItem({ icon: Icon, label, href, color }: WorkflowItemProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div
        className={`p-2.5 rounded-lg ${color} group-hover:scale-105 transition-transform shadow-sm`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="text-[11px] font-medium text-gray-600 text-center leading-tight max-w-[72px]">
        {label}
      </span>
    </Link>
  );
}

function WorkflowArrow() {
  return <ArrowRight className="h-4 w-4 text-gray-300 mt-1 flex-shrink-0" />;
}

export function HomeWorkflow() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* VENDORS */}
      <Card className="border-orange-200 shadow-sm">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-xs font-semibold text-orange-700 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            Vendors
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-start justify-center gap-1 flex-wrap">
            <WorkflowItem
              icon={ShoppingCart}
              label="Purchase Orders"
              href="/purchase-orders"
              color="bg-orange-500"
            />
            <WorkflowArrow />
            <WorkflowItem
              icon={CreditCard}
              label="Enter Bills"
              href="/bills/new"
              color="bg-orange-500"
            />
            <WorkflowArrow />
            <WorkflowItem
              icon={DollarSign}
              label="Pay Bills"
              href="/bills"
              color="bg-orange-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* CUSTOMERS */}
      <Card className="border-green-200 shadow-sm">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-xs font-semibold text-green-700 uppercase tracking-wider flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Customers
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-start justify-center gap-1 flex-wrap">
            <WorkflowItem
              icon={ClipboardList}
              label="Estimates"
              href="/estimates"
              color="bg-green-500"
            />
            <WorkflowArrow />
            <WorkflowItem
              icon={FileText}
              label="Invoices"
              href="/invoices"
              color="bg-green-500"
            />
            <WorkflowArrow />
            <WorkflowItem
              icon={DollarSign}
              label="Receive Payments"
              href="/payments"
              color="bg-green-500"
            />
            <WorkflowArrow />
            <WorkflowItem
              icon={Landmark}
              label="Deposits"
              href="/deposits"
              color="bg-green-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* COMPANY */}
      <Card className="border-blue-200 shadow-sm">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            Company
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-start justify-center gap-4 flex-wrap">
            <WorkflowItem
              icon={BookOpen}
              label="Chart of Accounts"
              href="/accounts"
              color="bg-blue-500"
            />
            <WorkflowItem
              icon={Receipt}
              label="Journal Entries"
              href="/journal"
              color="bg-blue-500"
            />
            <WorkflowItem
              icon={Package}
              label="Items & Services"
              href="/items"
              color="bg-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* BANKING */}
      <Card className="border-purple-200 shadow-sm">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-xs font-semibold text-purple-700 uppercase tracking-wider flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5" />
            Banking
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-start justify-center gap-4 flex-wrap">
            <WorkflowItem
              icon={Landmark}
              label="Record Deposits"
              href="/deposits"
              color="bg-purple-500"
            />
            <WorkflowItem
              icon={CreditCard}
              label="Write Checks"
              href="/expenses/new"
              color="bg-purple-500"
            />
            <WorkflowItem
              icon={ArrowRightLeft}
              label="Transfer Funds"
              href="/banking/transfer"
              color="bg-purple-500"
            />
            <WorkflowItem
              icon={BookOpen}
              label="Reconcile"
              href="/reconciliation"
              color="bg-purple-500"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
