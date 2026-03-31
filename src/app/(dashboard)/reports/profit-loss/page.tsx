"use client";

import { useState } from "react";
import { useProfitLoss } from "@/hooks/use-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, ArrowLeft, TrendingUp } from "lucide-react";
import Link from "next/link";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));

interface ReportSection {
  title: string;
  accounts: Array<{ code: string | null; name: string; netBalance: number }>;
  total: number;
}

export default function ProfitLossPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState(`${now.getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);
  const [runDates, setRunDates] = useState({ start: startDate, end: endDate });

  const { data, isLoading, error } = useProfitLoss(runDates.start, runDates.end) as {
    data: any; isLoading: boolean; error: any;
  };

  const renderSection = (section: ReportSection, indent = false) => (
    <div className="mb-4">
      <div className="flex justify-between font-semibold text-sm bg-gray-50 px-3 py-1.5 border-b">
        <span>{section.title}</span>
      </div>
      {section.accounts.map((a: any, i: number) => (
        <div key={i} className={`flex justify-between text-sm px-3 py-1 hover:bg-gray-50 ${indent ? "pl-8" : "pl-6"}`}>
          <span className="text-gray-700">
            {a.code && <span className="text-gray-400 font-mono text-xs mr-2">{a.code}</span>}
            {a.name}
          </span>
          <span className={`font-mono tabular-nums ${a.netBalance < 0 ? "text-red-600" : ""}`}>
            {fmt(a.netBalance)}
          </span>
        </div>
      ))}
      <div className="flex justify-between font-semibold text-sm px-3 py-1.5 border-t">
        <span className="pl-3">Total {section.title}</span>
        <span className="font-mono tabular-nums">{fmt(section.total)}</span>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Profit & Loss
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 flex items-end gap-4">
          <div className="grid gap-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-40" />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-40" />
          </div>
          <Button size="sm" onClick={() => setRunDates({ start: startDate, end: endDate })}>
            Run Report
          </Button>
        </CardContent>
      </Card>

      {isLoading && <p className="text-sm text-gray-500">Loading report...</p>}
      {error && <p className="text-sm text-red-500">Error: {error.message}</p>}

      {data && (
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-base">Profit & Loss</CardTitle>
            <p className="text-xs text-gray-500">{runDates.start} through {runDates.end}</p>
          </CardHeader>
          <CardContent className="p-0">
            {renderSection(data.revenue)}
            {renderSection(data.costOfGoodsSold)}

            <div className="flex justify-between font-bold text-sm bg-blue-50 px-3 py-2 border-y">
              <span>Gross Profit</span>
              <span className="font-mono tabular-nums">{fmt(data.grossProfit)}</span>
            </div>

            {renderSection(data.expenses)}
            {renderSection(data.otherIncome)}
            {renderSection(data.otherExpense)}

            <div className="flex justify-between text-sm px-3 py-1.5">
              <span className="font-semibold">Net Other Income</span>
              <span className="font-mono tabular-nums">{fmt(data.netOtherIncome)}</span>
            </div>

            <Separator />

            <div className="flex justify-between font-bold text-base bg-green-50 px-3 py-3 border-t">
              <span>Net Income</span>
              <span className={`font-mono tabular-nums ${data.netIncome < 0 ? "text-red-600" : "text-green-700"}`}>
                {fmt(data.netIncome)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
