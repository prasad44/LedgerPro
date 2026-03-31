"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateInvoice, usePostInvoice } from "@/hooks/use-invoices";
import { ACCOUNT_TYPE_LABELS } from "@/lib/accounting/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, X, ArrowLeft, Save, Send } from "lucide-react";

/* ---------- helpers ---------- */

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(n));

/* ---------- types ---------- */

interface Customer {
  id: string;
  name: string;
  email?: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface LineItem {
  key: string;
  item: string;
  accountId: string;
  description: string;
  qty: string;
  rate: string;
  tax: string;
}

function emptyLine(): LineItem {
  return {
    key: crypto.randomUUID(),
    item: "",
    accountId: "",
    description: "",
    qty: "1",
    rate: "",
    tax: "0",
  };
}

/* ---------- component ---------- */

export default function NewInvoicePage() {
  const router = useRouter();
  const createMutation = useCreateInvoice();
  const postMutation = usePostInvoice();

  // ---- Header fields ----
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState("");
  const [terms, setTerms] = useState("");

  // ---- Line items (start with one empty line) ----
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  // ---- Footer fields ----
  const [discount, setDiscount] = useState("0");
  const [memo, setMemo] = useState("");
  const [footer, setFooter] = useState("");

  // ---- Data: Customers ----
  const [customerSearch, setCustomerSearch] = useState("");
  const { data: customersRaw } = useQuery({
    queryKey: ["customers"],
    queryFn: () =>
      fetch("/api/v1/customers").then((r) => r.json()) as Promise<{
        customers: Customer[];
        total: number;
      }>,
  });
  const customers = (customersRaw?.customers ?? []) as Customer[];

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  // ---- Data: Accounts ----
  const [accountSearch, setAccountSearch] = useState("");
  const { data: accountsRaw } = useAccounts({ active: "true" });
  const accounts = (accountsRaw ?? []) as Account[];

  const accountGroups = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    for (const acct of accounts) {
      const label =
        ACCOUNT_TYPE_LABELS[acct.type as keyof typeof ACCOUNT_TYPE_LABELS] ??
        acct.type;
      if (!groups[label]) groups[label] = [];
      groups[label].push(acct);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [accounts]);

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

  // ---- Line item helpers ----
  const updateLine = (key: string, field: keyof LineItem, value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (key: string) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((l) => l.key !== key);
    });
  };

  const lineAmount = (l: LineItem) => (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0);
  const lineTax = (l: LineItem) => parseFloat(l.tax) || 0;

  // ---- Totals ----
  const subtotal = lines.reduce((sum, l) => sum + lineAmount(l), 0);
  const taxTotal = lines.reduce((sum, l) => sum + lineTax(l), 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = subtotal + taxTotal - discountAmt;

  // ---- Validation ----
  const [errors, setErrors] = useState<string[]>([]);

  const validate = (): boolean => {
    const errs: string[] = [];

    if (!customerId) errs.push("Customer is required.");
    if (!invoiceDate) errs.push("Invoice date is required.");
    if (!dueDate) errs.push("Due date is required.");

    const filledLines = lines.filter(
      (l) => l.accountId || parseFloat(l.rate) > 0
    );

    if (filledLines.length < 1) {
      errs.push("At least 1 line item is required.");
    }

    for (let i = 0; i < filledLines.length; i++) {
      const l = filledLines[i];
      if (!l.accountId) {
        errs.push(`Line ${i + 1}: Account is required.`);
      }
      if ((parseFloat(l.qty) || 0) <= 0) {
        errs.push(`Line ${i + 1}: Quantity must be greater than 0.`);
      }
      if ((parseFloat(l.rate) || 0) <= 0) {
        errs.push(`Line ${i + 1}: Rate must be greater than 0.`);
      }
    }

    setErrors(errs);
    return errs.length === 0;
  };

  // ---- Submit ----
  const handleSave = async (andPost: boolean) => {
    if (!validate()) return;

    const filledLines = lines.filter(
      (l) => l.accountId && (parseFloat(l.rate) || 0) > 0
    );

    const payload = {
      customerId,
      date: new Date(invoiceDate + "T00:00:00").toISOString(),
      dueDate: new Date(dueDate + "T00:00:00").toISOString(),
      terms: terms || undefined,
      memo: memo || undefined,
      footer: footer || undefined,
      discount: discountAmt || 0,
      lines: filledLines.map((l) => ({
        item: l.item || undefined,
        accountId: l.accountId,
        description: l.description || undefined,
        quantity: parseFloat(l.qty) || 1,
        rate: parseFloat(l.rate) || 0,
        tax: parseFloat(l.tax) || 0,
        amount: lineAmount(l),
      })),
    };

    try {
      const created = (await createMutation.mutateAsync(payload)) as {
        id: string;
        invoiceNumber: number;
      };

      if (andPost) {
        try {
          await postMutation.mutateAsync(created.id);
          toast.success(
            `Invoice #${created.invoiceNumber} created and posted.`
          );
        } catch (err) {
          toast.warning(
            `Invoice created as draft. Failed to post: ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
        }
      } else {
        toast.success(
          `Invoice #${created.invoiceNumber} saved as draft.`
        );
      }

      router.push("/invoices");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create invoice."
      );
    }
  };

  const getAccountDisplay = (accountId: string) => {
    const acct = accounts.find((a) => a.id === accountId);
    return acct ? `${acct.code} - ${acct.name}` : "";
  };

  const getCustomerDisplay = (id: string) => {
    const c = customers.find((cu) => cu.id === id);
    return c ? c.name : "";
  };

  const isSaving = createMutation.isPending || postMutation.isPending;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/invoices")}
          title="Back to Invoices"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">New Invoice</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Create a customer invoice
          </p>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="mb-1 text-sm font-medium text-red-700">
            Please fix the following errors:
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-red-600">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Header Card */}
      <Card className="mb-4">
        <CardHeader className="border-b">
          <CardTitle className="text-sm text-gray-700">
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Customer Select */}
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-gray-500">
                Customer <span className="text-red-500">*</span>
              </label>
              <Select
                value={customerId}
                onValueChange={(val) => setCustomerId(val as string)}
              >
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue placeholder="Select customer...">
                    {customerId ? getCustomerDisplay(customerId) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {/* Search inside dropdown */}
                  <div className="sticky top-0 border-b bg-popover p-1.5">
                    <Input
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-7 text-xs"
                    />
                  </div>
                  {filteredCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="py-4 text-center text-xs text-gray-400">
                      No customers found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Invoice Date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-8 font-mono text-sm"
              />
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Due Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 font-mono text-sm"
              />
            </div>

            {/* Terms */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Terms
              </label>
              <Input
                placeholder="Net 30, Due on receipt..."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Card */}
      <Card className="mb-4">
        <CardHeader className="border-b">
          <CardTitle className="text-sm text-gray-700">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-50/60">
                  <TableHead className="w-10 text-center text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    #
                  </TableHead>
                  <TableHead className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    Item
                  </TableHead>
                  <TableHead className="min-w-[220px] text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    Account <span className="text-red-400">*</span>
                  </TableHead>
                  <TableHead className="min-w-[160px] text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    Description
                  </TableHead>
                  <TableHead className="w-20 text-right text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    Qty
                  </TableHead>
                  <TableHead className="w-28 text-right text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    Rate
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    Tax
                  </TableHead>
                  <TableHead className="w-28 text-right text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    Amount
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={line.key} className="hover:bg-blue-50/30">
                    <TableCell className="text-center font-mono text-xs text-gray-400">
                      {idx + 1}
                    </TableCell>

                    {/* Item (optional) */}
                    <TableCell>
                      <Input
                        placeholder="Item..."
                        value={line.item}
                        onChange={(e) =>
                          updateLine(line.key, "item", e.target.value)
                        }
                        className="h-8 text-sm"
                      />
                    </TableCell>

                    {/* Account (required) */}
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

                    {/* Qty */}
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="1"
                        value={line.qty}
                        onChange={(e) =>
                          updateLine(line.key, "qty", e.target.value)
                        }
                        className="h-8 text-right font-mono text-sm"
                      />
                    </TableCell>

                    {/* Rate */}
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.rate}
                        onChange={(e) =>
                          updateLine(line.key, "rate", e.target.value)
                        }
                        className="h-8 text-right font-mono text-sm"
                      />
                    </TableCell>

                    {/* Tax */}
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.tax}
                        onChange={(e) =>
                          updateLine(line.key, "tax", e.target.value)
                        }
                        className="h-8 text-right font-mono text-sm"
                      />
                    </TableCell>

                    {/* Amount (auto-calculated) */}
                    <TableCell className="text-right font-mono text-sm font-medium text-gray-700">
                      {fmt(lineAmount(line))}
                    </TableCell>

                    {/* Remove */}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length <= 1}
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
                  <TableCell colSpan={7}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addLine}
                      className="gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="size-3.5" />
                      Add Line
                    </Button>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-gray-800">
                    {fmt(subtotal)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Totals + Notes */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Memo & Footer */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm text-gray-700">
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Memo (internal)
              </label>
              <Textarea
                placeholder="Internal notes..."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Footer (appears on invoice)
              </label>
              <Textarea
                placeholder="Thank you for your business!"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm text-gray-700">
              Totals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-mono text-gray-700">{fmt(subtotal)}</span>
              </div>

              {/* Tax Total */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="font-mono text-gray-700">{fmt(taxTotal)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <div className="w-28">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="h-7 text-right font-mono text-sm"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200" />

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">Total</span>
                <span className="font-mono text-lg font-bold text-blue-700">
                  {fmt(total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/invoices")}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className="gap-1.5"
        >
          <Save className="size-4" />
          {createMutation.isPending && !postMutation.isPending
            ? "Saving..."
            : "Save as Draft"}
        </Button>
        <Button
          onClick={() => handleSave(true)}
          disabled={isSaving}
          className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
        >
          <Send className="size-4" />
          {postMutation.isPending ? "Posting..." : "Save & Send"}
        </Button>
      </div>
    </div>
  );
}
