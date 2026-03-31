"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTransfers, useCreateTransfer, useBankAccounts } from "@/hooks/use-banking";
import { useAccounts } from "@/hooks/use-accounts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRightLeft,
  DollarSign,
  CalendarDays,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

/* ---------- helpers ---------- */

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(n));

const fmtDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/* ---------- types ---------- */

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface TransferRecord {
  id: string;
  transferNumber: string | number;
  date: string;
  amount: number | string;
  memo: string | null;
  fromAccount?: { id: string; code: string; name: string } | null;
  toAccount?: { id: string; code: string; name: string } | null;
}

/* ---------- component ---------- */

export default function TransferPage() {
  const router = useRouter();
  const createTransfer = useCreateTransfer();

  // ---- Transfers list ----
  const { data: transfersData, isLoading: transfersLoading } = useTransfers({
    limit: 20,
  });
  const transfers = (transfersData?.data ?? []) as TransferRecord[];

  // ---- Bank-type accounts from chart of accounts ----
  const { data: accountsRaw } = useAccounts({ type: "BANK", active: "true" });
  const bankAccounts = (accountsRaw ?? []) as Account[];

  // ---- Form state ----
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");

  // Filter "to" accounts to exclude the selected "from" account
  const toAccountOptions = useMemo(() => {
    if (!fromAccountId) return bankAccounts;
    return bankAccounts.filter((a) => a.id !== fromAccountId);
  }, [bankAccounts, fromAccountId]);

  // Display helper
  const getAccountDisplay = (id: string) => {
    const acct = bankAccounts.find((a) => a.id === id);
    return acct ? `${acct.code} - ${acct.name}` : "";
  };

  // ---- Reset form ----
  const resetForm = () => {
    setFromAccountId("");
    setToAccountId("");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setMemo("");
  };

  // ---- Handle from-account change ----
  const handleFromChange = (value: string) => {
    setFromAccountId(value ?? "");
    // Clear to-account if it now conflicts
    if (toAccountId === value) {
      setToAccountId("");
    }
  };

  // ---- Submit ----
  const handleSubmit = async () => {
    if (!fromAccountId) {
      toast.error("Please select a source account.");
      return;
    }
    if (!toAccountId) {
      toast.error("Please select a destination account.");
      return;
    }
    if (fromAccountId === toAccountId) {
      toast.error("Source and destination accounts must be different.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid transfer amount greater than zero.");
      return;
    }
    if (!date) {
      toast.error("Please enter a transfer date.");
      return;
    }

    try {
      await createTransfer.mutateAsync({
        fromAccountId,
        toAccountId,
        amount: parseFloat(amount),
        date: new Date(date + "T00:00:00").toISOString(),
        memo: memo || undefined,
      });
      toast.success("Transfer completed successfully.");
      resetForm();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to process transfer."
      );
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Transfer Funds</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Move funds between your bank accounts
        </p>
      </div>

      {/* ========== Transfer Form ========== */}
      <Card className="mb-6">
        <CardHeader className="border-b bg-purple-50/50">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-purple-800">
            <ArrowRightLeft className="size-4" />
            New Transfer
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="space-y-5">
            {/* From / To Row */}
            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
              {/* From Account */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  From Account <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={fromAccountId}
                  onValueChange={(v) => v && handleFromChange(v)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select source account...">
                      {fromAccountId
                        ? getAccountDisplay(fromAccountId)
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((acct) => (
                      <SelectItem key={acct.id} value={acct.id}>
                        <span className="font-mono text-xs text-gray-500">
                          {acct.code}
                        </span>
                        <span className="ml-1.5">{acct.name}</span>
                      </SelectItem>
                    ))}
                    {bankAccounts.length === 0 && (
                      <div className="py-4 text-center text-xs text-gray-400">
                        No bank accounts found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Arrow Icon */}
              <div className="hidden items-center justify-center pb-1 sm:flex">
                <ArrowRight className="size-5 text-purple-400" />
              </div>

              {/* To Account */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  To Account <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={toAccountId}
                  onValueChange={(v) => setToAccountId(v ?? "")}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select destination account...">
                      {toAccountId
                        ? getAccountDisplay(toAccountId)
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {toAccountOptions.map((acct) => (
                      <SelectItem key={acct.id} value={acct.id}>
                        <span className="font-mono text-xs text-gray-500">
                          {acct.code}
                        </span>
                        <span className="ml-1.5">{acct.name}</span>
                      </SelectItem>
                    ))}
                    {toAccountOptions.length === 0 && (
                      <div className="py-4 text-center text-xs text-gray-400">
                        {fromAccountId
                          ? "No other bank accounts available"
                          : "No bank accounts found"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amount & Date Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  <DollarSign className="size-3.5" />
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 font-mono text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  <CalendarDays className="size-3.5" />
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 font-mono text-sm"
                />
              </div>
            </div>

            {/* Memo */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-gray-500">
                <MessageSquare className="size-3.5" />
                Memo
              </Label>
              <Textarea
                placeholder="Transfer notes..."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="min-h-16 text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <Button variant="outline" onClick={resetForm}>
                Clear
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createTransfer.isPending}
                className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
              >
                <ArrowRightLeft className="size-4" />
                {createTransfer.isPending ? "Processing..." : "Transfer"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== Recent Transfers Table ========== */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
            <ArrowRightLeft className="size-4 text-purple-500" />
            Recent Transfers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transfersLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Loading transfers...
            </div>
          ) : transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <ArrowRightLeft className="mb-2 size-8 opacity-40" />
              <p className="text-sm">No transfers recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-purple-50/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                      Transfer #
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                      From
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                      To
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                      Memo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((tr) => (
                    <TableRow key={tr.id} className="hover:bg-purple-50/40">
                      <TableCell className="font-mono text-xs font-medium text-purple-700">
                        {tr.transferNumber}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {fmtDate(tr.date)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {tr.fromAccount
                          ? `${tr.fromAccount.code} - ${tr.fromAccount.name}`
                          : "\u2014"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {tr.toAccount
                          ? `${tr.toAccount.code} - ${tr.toAccount.name}`
                          : "\u2014"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-purple-700">
                        {fmt(tr.amount)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-gray-500">
                        {tr.memo ?? "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
