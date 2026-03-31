"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useBankAccounts,
  useStartReconciliation,
  useFinishReconciliation,
} from "@/hooks/use-banking";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  ClipboardCheck,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Landmark,
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

interface JournalEntryLine {
  id: string;
  date: string;
  description: string;
  debit: number | string;
  credit: number | string;
  journalEntry?: {
    id: string;
    date: string;
    memo: string | null;
  };
}

/* ---------- component ---------- */

export default function ReconciliationPage() {
  const router = useRouter();
  const startReconciliation = useStartReconciliation();
  const finishReconciliation = useFinishReconciliation();

  // ---- Bank accounts ----
  const { data: bankAccountsRaw } = useBankAccounts();
  const bankAccounts = (bankAccountsRaw ?? []) as BankAccount[];

  // ---- Step 1: Setup state ----
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [statementDate, setStatementDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [statementBalance, setStatementBalance] = useState("");

  // ---- Step 2: Reconciliation state ----
  const [reconciliationStarted, setReconciliationStarted] = useState(false);
  const [reconciliationId, setReconciliationId] = useState<string | null>(null);
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

  // ---- Fetch journal entry lines for the selected bank account ----
  const selectedBankAccount = useMemo(
    () => bankAccounts.find((ba) => ba.id === selectedBankAccountId),
    [bankAccounts, selectedBankAccountId]
  );

  const accountId = selectedBankAccount?.accountId ?? selectedBankAccount?.account?.id ?? "";

  const { data: journalLinesRaw, isLoading: linesLoading } = useQuery<
    JournalEntryLine[]
  >({
    queryKey: ["reconciliation-lines", accountId],
    queryFn: () =>
      fetch(
        `/api/v1/banking/reconciliation/lines?accountId=${accountId}`
      ).then((r) => r.json()),
    enabled: reconciliationStarted && !!accountId,
  });

  const journalLines = (journalLinesRaw ?? []) as JournalEntryLine[];

  // ---- Toggle cleared ----
  const toggleCleared = useCallback((lineId: string) => {
    setClearedIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  }, []);

  // ---- Running totals ----
  const statementBalanceNum = parseFloat(statementBalance) || 0;

  const clearedBalance = useMemo(() => {
    let total = 0;
    for (const line of journalLines) {
      if (clearedIds.has(line.id)) {
        total += Number(line.debit) - Number(line.credit);
      }
    }
    return total;
  }, [journalLines, clearedIds]);

  const difference = statementBalanceNum - clearedBalance;
  const isBalanced = Math.abs(difference) < 0.005;

  // ---- Display helper ----
  const getBankAccountDisplay = (id: string) => {
    const ba = bankAccounts.find((b) => b.id === id);
    if (!ba) return "";
    const acctName = ba.account?.name ?? "";
    return `${ba.bankName ?? "Bank"} (****${ba.accountLast4 ?? "----"})${acctName ? ` - ${acctName}` : ""}`;
  };

  // ---- Begin Reconciliation ----
  const handleBeginReconciliation = async () => {
    if (!selectedBankAccountId) {
      toast.error("Please select a bank account.");
      return;
    }
    if (!statementDate) {
      toast.error("Please enter the statement date.");
      return;
    }
    if (!statementBalance || statementBalanceNum === 0) {
      toast.error("Please enter the statement ending balance.");
      return;
    }

    try {
      const result = (await startReconciliation.mutateAsync({
        bankAccountId: selectedBankAccountId,
        statementDate: new Date(statementDate + "T00:00:00").toISOString(),
        statementBalance: statementBalanceNum,
      })) as { id?: string };

      setReconciliationId(result?.id ?? null);
      setReconciliationStarted(true);
      setClearedIds(new Set());
      toast.success("Reconciliation started. Check off cleared transactions.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start reconciliation."
      );
    }
  };

  // ---- Finish Reconciliation ----
  const handleFinish = async () => {
    if (!isBalanced) {
      toast.error("The difference must be $0.00 to finish reconciliation.");
      return;
    }

    try {
      await finishReconciliation.mutateAsync({
        reconciliationId,
        bankAccountId: selectedBankAccountId,
        statementDate: new Date(statementDate + "T00:00:00").toISOString(),
        statementBalance: statementBalanceNum,
        clearedLineIds: Array.from(clearedIds),
      });
      toast.success("Reconciliation completed successfully.");
      setReconciliationStarted(false);
      setReconciliationId(null);
      setClearedIds(new Set());
      setSelectedBankAccountId("");
      setStatementDate(new Date().toISOString().slice(0, 10));
      setStatementBalance("");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to complete reconciliation."
      );
    }
  };

  // ---- Cancel and go back to Step 1 ----
  const handleCancel = () => {
    setReconciliationStarted(false);
    setReconciliationId(null);
    setClearedIds(new Set());
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">
          Bank Reconciliation
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Match your books to your bank statement
        </p>
      </div>

      {!reconciliationStarted ? (
        /* ========== STEP 1: Setup ========== */
        <Card>
          <CardHeader className="border-b bg-purple-50/50">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-purple-800">
              <ClipboardCheck className="size-4" />
              Step 1: Begin Reconciliation
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
                  value={selectedBankAccountId}
                  onValueChange={(v) => setSelectedBankAccountId(v ?? "")}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select bank account...">
                      {selectedBankAccountId
                        ? getBankAccountDisplay(selectedBankAccountId)
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

              {/* Statement Date & Ending Balance */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-gray-500">
                    <CalendarDays className="size-3.5" />
                    Statement Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                    className="h-9 font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-gray-500">
                    <DollarSign className="size-3.5" />
                    Statement Ending Balance{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={statementBalance}
                    onChange={(e) => setStatementBalance(e.target.value)}
                    className="h-9 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Begin Button */}
              <div className="flex items-center justify-end border-t pt-4">
                <Button
                  onClick={handleBeginReconciliation}
                  disabled={startReconciliation.isPending}
                  className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
                >
                  <ClipboardCheck className="size-4" />
                  {startReconciliation.isPending
                    ? "Starting..."
                    : "Begin Reconciliation"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ========== STEP 2: Reconcile Transactions ========== */
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          {/* Transaction Table */}
          <div className="xl:col-span-3">
            <Card>
              <CardHeader className="border-b bg-purple-50/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-purple-800">
                    <ClipboardCheck className="size-4" />
                    Step 2: Clear Transactions
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium">
                      {getBankAccountDisplay(selectedBankAccountId)}
                    </span>
                    <span>|</span>
                    <span>Statement: {fmtDate(statementDate)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {linesLoading ? (
                  <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                    Loading transactions...
                  </div>
                ) : journalLines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <ClipboardCheck className="mb-2 size-8 opacity-40" />
                    <p className="text-sm">
                      No uncleared transactions found for this account
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-purple-50/60">
                          <TableHead className="w-14 text-center text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                            Cleared
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                            Date
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                            Description
                          </TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                            Debit
                          </TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-purple-900/70">
                            Credit
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {journalLines.map((line) => {
                          const isCleared = clearedIds.has(line.id);
                          return (
                            <TableRow
                              key={line.id}
                              className={`cursor-pointer transition-colors ${
                                isCleared
                                  ? "bg-purple-50/60"
                                  : "hover:bg-gray-50/60"
                              }`}
                              onClick={() => toggleCleared(line.id)}
                            >
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={isCleared}
                                  onCheckedChange={() =>
                                    toggleCleared(line.id)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {fmtDate(
                                  line.journalEntry?.date ?? line.date
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-700">
                                {line.description ||
                                  line.journalEntry?.memo ||
                                  "\u2014"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-gray-700">
                                {Number(line.debit) > 0
                                  ? fmt(line.debit)
                                  : "\u2014"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-gray-700">
                                {Number(line.credit) > 0
                                  ? fmt(line.credit)
                                  : "\u2014"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Running Totals Sidebar */}
          <div className="xl:col-span-1">
            <Card className="sticky top-6 border-purple-100">
              <CardHeader className="border-b border-purple-100 bg-purple-50/40 pb-3">
                <CardTitle className="text-sm font-semibold text-purple-800">
                  Reconciliation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {/* Statement Balance */}
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Statement Balance
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold text-gray-800">
                      {fmt(statementBalanceNum)}
                    </p>
                  </div>

                  {/* Cleared Balance */}
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Cleared Balance
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold text-purple-700">
                      {fmt(clearedBalance)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {clearedIds.size} of {journalLines.length} items cleared
                    </p>
                  </div>

                  {/* Difference */}
                  <div
                    className={`rounded-lg border p-3 ${
                      isBalanced
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isBalanced ? (
                        <CheckCircle2 className="size-4 text-green-600" />
                      ) : (
                        <AlertCircle className="size-4 text-red-500" />
                      )}
                      <p
                        className={`text-xs font-medium ${
                          isBalanced ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        Difference
                      </p>
                    </div>
                    <p
                      className={`mt-1 font-mono text-xl font-bold ${
                        isBalanced ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {fmt(difference)}
                    </p>
                    {isBalanced && (
                      <p className="mt-1 text-xs text-green-600">
                        Balanced! Ready to finish.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 border-t pt-4">
                    <Button
                      onClick={handleFinish}
                      disabled={
                        !isBalanced || finishReconciliation.isPending
                      }
                      className="w-full gap-1.5 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-4" />
                      {finishReconciliation.isPending
                        ? "Finishing..."
                        : "Finish Reconciliation"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
