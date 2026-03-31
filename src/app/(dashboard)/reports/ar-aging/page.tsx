"use client";

import { useState } from "react";
import { useArAging } from "@/hooks/use-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Printer, ArrowLeft, Users } from "lucide-react";
import Link from "next/link";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));

export default function ArAgingPage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [runDate, setRunDate] = useState(asOfDate);
  const { data, isLoading, error } = useArAging(runDate) as { data: any; isLoading: boolean; error: any };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-5 w-5" /> A/R Aging Summary
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
            <CardTitle className="text-base">A/R Aging Summary</CardTitle>
            <p className="text-xs text-gray-500">As of {runDate}</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right w-24">Current</TableHead>
                  <TableHead className="text-right w-24">1-30</TableHead>
                  <TableHead className="text-right w-24">31-60</TableHead>
                  <TableHead className="text-right w-24 text-yellow-700">61-90</TableHead>
                  <TableHead className="text-right w-24 text-red-700">90+</TableHead>
                  <TableHead className="text-right w-28 font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entities.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">No outstanding receivables</TableCell></TableRow>
                )}
                {data.entities.map((e: any, i: number) => (
                  <TableRow key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                    <TableCell className="text-sm font-medium">{e.name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm">{e.current > 0 ? fmt(e.current) : "-"}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm">{e.days1to30 > 0 ? fmt(e.days1to30) : "-"}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm">{e.days31to60 > 0 ? fmt(e.days31to60) : "-"}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm text-yellow-700">{e.days61to90 > 0 ? fmt(e.days61to90) : "-"}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm text-red-700">{e.over90 > 0 ? fmt(e.over90) : "-"}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm font-bold">{fmt(e.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {data.entities.length > 0 && (
                <TableFooter>
                  <TableRow className="font-bold bg-gray-100">
                    <TableCell>TOTALS</TableCell>
                    {data.totals.map((t: any, i: number) => (
                      <TableCell key={i} className="text-right font-mono tabular-nums">{fmt(t.amount)}</TableCell>
                    ))}
                    <TableCell className="text-right font-mono tabular-nums">{fmt(data.grandTotal)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
