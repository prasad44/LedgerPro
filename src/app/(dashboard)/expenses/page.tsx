"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useExpenses, useCreateExpense } from "@/hooks/use-expenses";
import { useAccounts } from "@/hooks/use-accounts";
import { ACCOUNT_TYPE_LABELS } from "@/lib/accounting/types";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Receipt,
  CreditCard,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

/* ---------- helpers ---------- */

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(n));

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

/* ---------- types ---------- */

interface Vendor {
  id: string;
  name: string;
  company?: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface ExpenseRecord {
  id: string;
  expenseNumber: string | number;
  vendorId: string | null;
  vendor?: { id: string; name: string } | null;
  date: string;
  method: string | null;
  total: string | number;
  reference: string | null;
  bankAccount?: { id: string; code: string; name: string } | null;
  lines?: { accountId: string; account?: { code: string; name: string }; description: string; amount: string | number }[];
}

interface LineItem {
  key: string;
  accountId: string;
  description: string;
  amount: string;
}

function emptyLine(): LineItem {
  return {
    key: crypto.randomUUID(),
    accountId: "",
    description: "",
    amount: "",
  };
}

const PAYMENT_METHODS = [
  "Cash",
  "Check",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "ACH",
  "Wire",
  "Other",
];

/* expense-eligible account types */
const EXPENSE_ACCOUNT_TYPES = [
  "EXPENSE",
  "COST_OF_GOODS_SOLD",
  "OTHER_EXPENSE",
];

/* ---------- component ---------- */

export default function ExpensesPage() {
  const router = useRouter();
  const createExpense = useCreateExpense();

  // ---- Expense list ----
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: expensesData, isLoading: expensesLoading, error: expensesError } = useExpenses({
    page,
    limit,
  });
  const expenses = (expensesData?.data ?? []) as ExpenseRecord[];
  const pagination = expensesData?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  // ---- Vendors ----
  const [vendorSearch, setVendorSearch] = useState("");
  const { data: vendorsRaw } = useQuery({
    queryKey: ["vendors"],
    queryFn: () =>
      fetch("/api/v1/vendors?active=true").then((r) => r.json()) as Promise<{
        vendors: Vendor[];
        total: number;
      }>,
  });
  const vendors = (vendorsRaw?.vendors ?? []) as Vendor[];

  const filteredVendors = useMemo(() => {
    if (!vendorSearch.trim()) return vendors;
    const q = vendorSearch.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.company?.toLowerCase().includes(q)
    );
  }, [vendors, vendorSearch]);

  // ---- Accounts ----
  const [accountSearch, setAccountSearch] = useState("");
  const { data: allAccountsRaw } = useAccounts({ active: "true" });
  const allAccounts = (allAccountsRaw ?? []) as Account[];

  // Bank accounts for "paid from" select
  const bankAccounts = useMemo(() => {
    return allAccounts.filter((a) => a.type === "BANK");
  }, [allAccounts]);

  // Expense accounts for line items
  const expenseAccounts = useMemo(() => {
    return allAccounts.filter((a) => EXPENSE_ACCOUNT_TYPES.includes(a.type));
  }, [allAccounts]);

  const accountGroups = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    for (const acct of expenseAccounts) {
      const label =
        ACCOUNT_TYPE_LABELS[acct.type as keyof typeof ACCOUNT_TYPE_LABELS] ??
        acct.type;
      if (!groups[label]) groups[label] = [];
      groups[label].push(acct);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [expenseAccounts]);

  const filteredAccountGroups = useMemo(() => {
    if (!accountSearch.trim()) return accountGroups;
    const q = accountSearch.toLowerCase();
    return accountGroups
      .map(
        ([label, accts]) =>
          [
            label,
            accts.filter(
              (a) =>
                a.code.toLowerCase().includes(q) ||
                a.name.toLowerCase().includes(q)
            ),
          ] as [string, Account[]]
      )
      .filter(([, accts]) => accts.length > 0);
  }, [accountGroups, accountSearch]);

  // ---- Form state ----
  const [formVendorId, setFormVendorId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formMethod, setFormMethod] = useState("");
  const [formBankAccountId, setFormBankAccountId] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const [formLines, setFormLines] = useState<LineItem[]>([emptyLine()]);

  // ---- Line item helpers ----
  const updateLine = (key: string, field: keyof LineItem, value: string) => {
    setFormLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
    );
  };

  const addLine = () => setFormLines((prev) => [...prev, emptyLine()]);

  const removeLine = (key: string) => {
    setFormLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((l) => l.key !== key);
    });
  };

  const runningTotal = formLines.reduce(
    (sum, l) => sum + (parseFloat(l.amount) || 0),
    0
  );

  // ---- Display helpers ----
  const getAccountDisplay = (accountId: string) => {
    const acct = allAccounts.find((a) => a.id === accountId);
    return acct ? `${acct.code} - ${acct.name}` : "";
  };

  const getVendorDisplay = (id: string) => {
    const v = vendors.find((vn) => vn.id === id);
    return v ? v.name : "";
  };

  // ---- Reset form ----
  const resetForm = () => {
    setFormVendorId("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormMethod("");
    setFormBankAccountId("");
    setFormReference("");
    setFormMemo("");
    setFormLines([emptyLine()]);
    setVendorSearch("");
    setAccountSearch("");
  };

  // ---- Submit ----
  const handleSubmit = async () => {
    // Validate
    if (!formDate) {
      toast.error("Please enter an expense date.");
      return;
    }
    if (!formMethod) {
      toast.error("Please select a payment method.");
      return;
    }
    if (!formBankAccountId) {
      toast.error("Please select a bank account.");
      return;
    }

    const filledLines = formLines.filter(
      (l) => l.accountId && (parseFloat(l.amount) || 0) > 0
    );

    if (filledLines.length < 1) {
      toast.error("At least 1 line item with an account and amount is required.");
      return;
    }

    for (let i = 0; i < filledLines.length; i++) {
      if (!filledLines[i].accountId) {
        toast.error(`Line ${i + 1}: Account is required.`);
        return;
      }
    }

    try {
      await createExpense.mutateAsync({
        vendorId: formVendorId || undefined,
        date: new Date(formDate + "T00:00:00").toISOString(),
        method: formMethod,
        bankAccountId: formBankAccountId,
        reference: formReference || undefined,
        memo: formMemo || undefined,
        lines: filledLines.map((l) => ({
          accountId: l.accountId,
          description: l.description || undefined,
          amount: parseFloat(l.amount) || 0,
        })),
      });
      toast.success("Expense recorded successfully.");
      resetForm();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record expense."
      );
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Expenses</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Track and record business expenses
        </p>
      </div>

      {/* ========== Recent Expenses Table ========== */}
      <Card className="mb-6">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
            <Receipt className="size-4" />
            Recent Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {expensesLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Loading expenses...
            </div>
          ) : expensesError ? (
            <div className="flex items-center justify-center py-12 text-sm text-red-500">
              Failed to load expenses.{" "}
              {expensesError instanceof Error ? expensesError.message : ""}
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Receipt className="mb-2 size-8 opacity-40" />
              <p className="text-sm">No expenses recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-orange-50/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                      Expense #
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                      Vendor
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                      Method
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                      Total
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                      Account(s)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow
                      key={exp.id}
                      className="hover:bg-orange-50/40"
                    >
                      <TableCell className="font-mono text-sm font-medium text-gray-700">
                        {exp.expenseNumber}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {exp.vendor?.name ?? "\u2014"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {fmtDate(exp.date)}
                      </TableCell>
                      <TableCell>
                        {exp.method ? (
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {exp.method}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">\u2014</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-orange-700">
                        {fmt(exp.total)}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {exp.lines && exp.lines.length > 0
                          ? exp.lines
                              .map(
                                (ln) =>
                                  ln.account
                                    ? `${ln.account.code} ${ln.account.name}`
                                    : "N/A"
                              )
                              .join(", ")
                          : "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="mb-6 -mt-3 flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {(page - 1) * limit + 1}&ndash;
            {Math.min(page * limit, pagination.total)} of{" "}
            {pagination.total} expenses
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              title="First page"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title="Previous page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-2 font-mono text-xs">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              title="Next page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              title="Last page"
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ========== Record Expense Form ========== */}
      <Card>
        <CardHeader className="border-b bg-orange-50/50">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-orange-800">
            <DollarSign className="size-4" />
            Record Expense
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="space-y-5">
            {/* Row 1: Vendor, Date, Method */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Vendor Select (optional) */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  Vendor (optional)
                </Label>
                <Select
                  value={formVendorId}
                  onValueChange={(v) => setFormVendorId(v ?? "")}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select vendor...">
                      {formVendorId ? getVendorDisplay(formVendorId) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <div className="sticky top-0 border-b bg-popover p-1.5">
                      <Input
                        placeholder="Search vendors..."
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="h-7 text-xs"
                      />
                    </div>
                    {filteredVendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                        {v.company && (
                          <span className="ml-1.5 text-xs text-gray-400">
                            ({v.company})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                    {filteredVendors.length === 0 && (
                      <div className="py-4 text-center text-xs text-gray-400">
                        No vendors found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-9 font-mono text-sm"
                />
              </div>

              {/* Payment Method */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  Payment Method <span className="text-red-500">*</span>
                </Label>
                <Select value={formMethod} onValueChange={(v) => setFormMethod(v ?? "")}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select method...">
                      {formMethod || undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reference */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  Reference #
                </Label>
                <Input
                  placeholder="Check #, receipt..."
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Row 2: Bank Account */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  <CreditCard className="inline size-3.5 mr-1" />
                  Bank Account <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formBankAccountId}
                  onValueChange={(v) => setFormBankAccountId(v ?? "")}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select bank account...">
                      {formBankAccountId
                        ? (() => {
                            const acct = bankAccounts.find(
                              (a) => a.id === formBankAccountId
                            );
                            return acct
                              ? `${acct.code} - ${acct.name}`
                              : undefined;
                          })()
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
            </div>

            {/* Line Items */}
            <div>
              <Label className="mb-2 block text-xs font-medium text-gray-500">
                Expense Lines
              </Label>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-orange-50/60">
                      <TableHead className="w-10 text-center text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                        #
                      </TableHead>
                      <TableHead className="min-w-[220px] text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                        Account <span className="text-red-400">*</span>
                      </TableHead>
                      <TableHead className="min-w-[160px] text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                        Description
                      </TableHead>
                      <TableHead className="w-32 text-right text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                        Amount <span className="text-red-400">*</span>
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formLines.map((line, idx) => (
                      <TableRow key={line.key} className="hover:bg-orange-50/30">
                        <TableCell className="text-center font-mono text-xs text-gray-400">
                          {idx + 1}
                        </TableCell>

                        {/* Account */}
                        <TableCell>
                          <Select
                            value={line.accountId}
                            onValueChange={(val) =>
                              updateLine(line.key, "accountId", val as string)
                            }
                          >
                            <SelectTrigger className="h-8 w-full text-sm">
                              <SelectValue placeholder="Select account...">
                                {line.accountId
                                  ? getAccountDisplay(line.accountId)
                                  : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              <div className="sticky top-0 border-b bg-popover p-1.5">
                                <Input
                                  placeholder="Search accounts..."
                                  value={accountSearch}
                                  onChange={(e) =>
                                    setAccountSearch(e.target.value)
                                  }
                                  onKeyDown={(e) => e.stopPropagation()}
                                  className="h-7 text-xs"
                                />
                              </div>
                              {filteredAccountGroups.map(([label, accts]) => (
                                <SelectGroup key={label}>
                                  <SelectLabel>{label}</SelectLabel>
                                  {accts.map((acct) => (
                                    <SelectItem key={acct.id} value={acct.id}>
                                      <span className="font-mono text-xs text-gray-500">
                                        {acct.code}
                                      </span>
                                      <span className="ml-1.5">{acct.name}</span>
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                              {filteredAccountGroups.length === 0 && (
                                <div className="py-4 text-center text-xs text-gray-400">
                                  No accounts found
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Description */}
                        <TableCell>
                          <Input
                            placeholder="Description..."
                            value={line.description}
                            onChange={(e) =>
                              updateLine(line.key, "description", e.target.value)
                            }
                            className="h-8 text-sm"
                          />
                        </TableCell>

                        {/* Amount */}
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={line.amount}
                            onChange={(e) =>
                              updateLine(line.key, "amount", e.target.value)
                            }
                            className="h-8 text-right font-mono text-sm"
                          />
                        </TableCell>

                        {/* Remove */}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeLine(line.key)}
                            disabled={formLines.length <= 1}
                            title="Remove line"
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={addLine}
                          className="gap-1 text-orange-600 hover:text-orange-700"
                        >
                          <Plus className="size-3.5" />
                          Add Line
                        </Button>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-orange-800">
                        {fmt(runningTotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>

            {/* Memo */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-gray-500">
                Memo
              </Label>
              <Textarea
                placeholder="Notes about this expense..."
                value={formMemo}
                onChange={(e) => setFormMemo(e.target.value)}
                className="min-h-16 text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-500">
                Total:{" "}
                <span className="font-mono font-bold text-orange-800">
                  {fmt(runningTotal)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={resetForm}>
                  Clear
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createExpense.isPending}
                  className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
                >
                  <DollarSign className="size-4" />
                  {createExpense.isPending
                    ? "Saving..."
                    : "Record Expense"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
