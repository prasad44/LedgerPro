"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDeposits, useCreateDeposit, useBankAccounts } from "@/hooks/use-banking";
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
  PiggyBank,
  DollarSign,
  CalendarDays,
  Landmark,
  MessageSquare,
  Hash,
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

interface BankAccount {
  id: string;
  bankName: string | null;
  accountLast4: string | null;
  balance: number | string;
  account?: { id: string; code: string; name: string };
  accountId?: string;
}

interface DepositRecord {
  id: string;
  depositNumber: string | number;
  date: string;
  amount: number | string;
  memo: string | null;
  bankAccount?: { id: string; bankName: string | null; account?: { name: string } } | null;
}

/* ---------- component ---------- */

export default function DepositsPage() {
  const router = useRouter();
  const createDeposit = useCreateDeposit();

  // ---- Deposits list ----
  const { data: depositsData, isLoading: depositsLoading } = useDeposits({
    limit: 20,
  });
  const deposits = (depositsData?.data ?? []) as DepositRecord[];

  // ---- Bank accounts ----
  const { data: bankAccountsRaw } = useBankAccounts();
  const bankAccounts = (bankAccountsRaw ?? []) as BankAccount[];

  // ---- Form state ----
  const [bankAccountId, setBankAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  // ---- Display helper ----
  const getBankAccountDisplay = (id: string) => {
    const ba = bankAccounts.find((b) => b.id === id);
    if (!ba) return "";
    const acctName = ba.account?.name ?? "";
    return `${ba.bankName ?? "Bank"} (****${ba.accountLast4 ?? "----"})${acctName ? ` - ${acctName}` : ""}`;
  };

  // ---- Reset form ----
  const resetForm = () => {
    setBankAccountId("");
    setDate(new Date().toISOString().slice(0, 10));
    setAmount("");
    setMemo("");
  };

  // ---- Submit ----
  const handleSubmit = async () => {
    if (!bankAccountId) {
      toast.error("Please select a bank account.");
      return;
    }
    if (!date) {
      toast.error("Please enter a deposit date.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid deposit amount.");
      return;
    }

    try {
      await createDeposit.mutateAsync({
        bankAccountId,
        date: new Date(date + "T00:00:00").toISOString(),
        amount: parseFloat(amount),
        memo: memo || undefined,
      });
      toast.success("Deposit recorded successfully.");
      resetForm();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record deposit."
      );
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Deposits</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Record and track bank deposits
        </p>
      </div>

      {/* ========== Recent Deposits Table ========== */}
      <Card className="mb-6">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
            <PiggyBank className="size-4 text-purple-500" />
            Recent Deposits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {depositsLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Loading deposits...
            </div>
          ) : deposits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <PiggyBank className="mb-2 size-8 opacity-40" />
              <p className="text-sm">No deposits recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-purple-50/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                      Deposit #
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                      Bank Account
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
                  {deposits.map((dep) => (
                    <TableRow
                      key={dep.id}
                      className="hover:bg-purple-50/40"
                    >
                      <TableCell className="font-mono text-xs font-medium text-purple-700">
                        {dep.depositNumber}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {fmtDate(dep.date)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {dep.bankAccount
                          ? `${dep.bankAccount.bankName ?? "Bank"} ${dep.bankAccount.account?.name ? `- ${dep.bankAccount.account.name}` : ""}`
                          : "\u2014"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-green-700">
                        {fmt(dep.amount)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-gray-500">
                        {dep.memo ?? "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== Make Deposit Form ========== */}
      <Card>
        <CardHeader className="border-b bg-purple-50/50">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-purple-800">
            <DollarSign className="size-4" />
            Make Deposit
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="space-y-5">
            {/* Bank Account Select */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-gray-500">
                <Landmark className="size-3.5" />
                Bank Account <span className="text-red-500">*</span>
              </Label>
              <Select
                value={bankAccountId}
                onValueChange={(v) => setBankAccountId(v ?? "")}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select bank account...">
                    {bankAccountId
                      ? getBankAccountDisplay(bankAccountId)
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((ba) => (
                    <SelectItem key={ba.id} value={ba.id}>
                      <span className="font-medium">
                        {ba.bankName ?? "Bank"}
                      </span>
                      <span className="ml-1.5 font-mono text-xs text-gray-400">
                        ****{ba.accountLast4 ?? "----"}
                      </span>
                      {ba.account && (
                        <span className="ml-1.5 text-xs text-gray-400">
                          - {ba.account.name}
                        </span>
                      )}
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

            {/* Date & Amount Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>

            {/* Memo */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-gray-500">
                <MessageSquare className="size-3.5" />
                Memo
              </Label>
              <Textarea
                placeholder="Deposit notes..."
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
                disabled={createDeposit.isPending}
                className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
              >
                <PiggyBank className="size-4" />
                {createDeposit.isPending ? "Processing..." : "Make Deposit"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
