"use client";

import { useState } from "react";
import { useBalanceSheet } from "@/hooks/use-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Printer, ArrowLeft, Scale } from "lucide-react";
import Link from "next/link";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [runDate, setRunDate] = useState(asOfDate);
  const { data, isLoading, error } = useBalanceSheet(runDate) as { data: any; isLoading: boolean; error: any };

  const renderSection = (section: any) => (
    <div className="mb-3">
      <div className="flex justify-between font-semibold text-sm bg-gray-50 px-3 py-1.5 border-b">
        <span>{section.title}</span>
      </div>
      {section.accounts.map((a: any, i: number) => (
        <div key={i} className="flex justify-between text-sm px-6 py-1 hover:bg-gray-50">
          <span className="text-gray-700">
            {a.code && <span className="text-gray-400 font-mono text-xs mr-2">{a.code}</span>}
            {a.name}
          </span>
          <span className="font-mono tabular-nums">{fmt(a.netBalance)}</span>
        </div>
      ))}
      <div className="flex justify-between font-semibold text-sm px-3 py-1.5 border-t">
        <span className="pl-3">Total {section.title}</span>
        <span className="font-mono tabular-nums">{fmt(section.total)}</span>
      </div>
    </div>
  );

  const isBalanced = data && Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 0.01;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Scale className="h-5 w-5" /> Balance Sheet
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 flex items-end gap-4">
          <div className="grid gap-1">
            <Label className="text-xs">As of</Label>
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="h-8 w-40" />
          </div>
          <Button size="sm" onClick={() => setRunDate(asOfDate)}>Run Report</Button>
        </CardContent>
      </Card>

      {isLoading && <p className="text-sm text-gray-500">Loading report...</p>}
      {error && <p className="text-sm text-red-500">Error: {error.message}</p>}

      {data && (
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-base">Balance Sheet</CardTitle>
            <p className="text-xs text-gray-500">As of {runDate}</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="bg-blue-50 px-3 py-2 font-bold text-sm border-b">ASSETS</div>
            {renderSection(data.currentAssets)}
            {renderSection(data.longTermAssets)}
            <div className="flex justify-between font-bold text-sm bg-blue-50 px-3 py-2 border-y">
              <span>TOTAL ASSETS</span>
              <span className="font-mono tabular-nums">{fmt(data.totalAssets)}</span>
            </div>

            <div className="bg-red-50 px-3 py-2 font-bold text-sm border-b mt-4">LIABILITIES</div>
            {renderSection(data.currentLiabilities)}
            {renderSection(data.longTermLiabilities)}
            <div className="flex justify-between font-bold text-sm bg-red-50 px-3 py-2 border-y">
              <span>TOTAL LIABILITIES</span>
              <span className="font-mono tabular-nums">{fmt(data.totalLiabilities)}</span>
            </div>

            <div className="bg-green-50 px-3 py-2 font-bold text-sm border-b mt-4">EQUITY</div>
            {renderSection(data.equity)}
            <div className="flex justify-between text-sm px-6 py-1">
              <span className="text-gray-700 italic">Net Income (Current Year)</span>
              <span className="font-mono tabular-nums">{fmt(data.netIncome)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm bg-green-50 px-3 py-2 border-y">
              <span>TOTAL EQUITY</span>
              <span className="font-mono tabular-nums">{fmt(data.totalEquity)}</span>
            </div>

            <Separator className="my-2" />

            <div className="flex justify-between font-bold text-base px-3 py-3 border-t">
              <span>TOTAL LIABILITIES & EQUITY</span>
              <span className="font-mono tabular-nums">{fmt(data.totalLiabilitiesAndEquity)}</span>
            </div>

            <div className="flex justify-center py-3">
              <Badge variant={isBalanced ? "default" : "destructive"} className={isBalanced ? "bg-green-600" : ""}>
                {isBalanced ? "BALANCED" : "UNBALANCED"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
