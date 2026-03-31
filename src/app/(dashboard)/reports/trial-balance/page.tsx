"use client";

import { useState } from "react";
import { useTrialBalance } from "@/hooks/use-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Printer, ArrowLeft, List } from "lucide-react";
import Link from "next/link";
import { ACCOUNT_TYPE_LABELS } from "@/lib/accounting/types";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [runDate, setRunDate] = useState(asOfDate);
  const { data, isLoading, error } = useTrialBalance(runDate) as { data: any; isLoading: boolean; error: any };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <List className="h-5 w-5" /> Trial Balance
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
            <CardTitle className="text-base">Trial Balance</CardTitle>
            <p className="text-xs text-gray-500">As of {runDate}</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="w-24 text-xs">Type</TableHead>
                  <TableHead className="text-right w-32">Debit</TableHead>
                  <TableHead className="text-right w-32">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.accounts.map((a: any, i: number) => (
                  <TableRow key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                    <TableCell className="font-mono text-xs text-gray-500">{a.code}</TableCell>
                    <TableCell className="text-sm">{a.name}</TableCell>
                    <TableCell className="text-xs text-gray-500">{ACCOUNT_TYPE_LABELS[a.type as keyof typeof ACCOUNT_TYPE_LABELS] || a.type}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm">
                      {a.debitTotal > 0 ? fmt(a.debitTotal) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm">
                      {a.creditTotal > 0 ? fmt(a.creditTotal) : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold bg-gray-100">
                  <TableCell colSpan={3}>TOTALS</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fmt(data.totalDebits)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fmt(data.totalCredits)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>

            <div className="flex justify-center py-3">
              <Badge variant={data.isBalanced ? "default" : "destructive"} className={data.isBalanced ? "bg-green-600" : ""}>
                {data.isBalanced ? "BALANCED" : "UNBALANCED"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
