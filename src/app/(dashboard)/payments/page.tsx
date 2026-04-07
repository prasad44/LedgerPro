"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usePayments, useCreatePayment } from "@/hooks/use-payments";
import { useAccounts } from "@/hooks/use-accounts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DollarSign,
  CreditCard,
  FileText,
  Hash,
  CalendarDays,
  Landmark,
  MessageSquare,
  User,
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

interface Customer {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  balance: number | string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: string;
  totalAmount: number | string;
  amountDue: number | string;
  customer?: { id: string; name: string };
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface PaymentRecord {
  id: string;
  paymentNumber: string;
  date: string;
  amount: number | string;
  method: string | null;
  reference: string | null;
  invoice?: { id: string; invoiceNumber: string };
  customer?: { id: string; name: string };
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

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
};

/* ---------- component ---------- */

export default function PaymentsPage() {
  const router = useRouter();
  const createPayment = useCreatePayment();

  // ── Recent payments ──
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments({
    limit: 20,
  });
  const payments = (paymentsData?.data ?? []) as PaymentRecord[];

  // ── Customers ──
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/v1/customers?active=true");
      const json = await res.json();
      return Array.isArray(json) ? json : json.data ?? [];
    },
  });

  // ── Bank accounts ──
  const { data: accountsRaw } = useAccounts({ type: "BANK", active: "true" });
  const bankAccounts = (accountsRaw ?? []) as Account[];

  // ── Form state ──
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [depositAccountId, setDepositAccountId] = useState("");
  const [memo, setMemo] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // ── Open invoices for selected customer ──
  const { data: invoiceData, isLoading: invoicesLoading } = useQuery<{
    data: Invoice[];
  }>({
    queryKey: ["invoices", { customerId: selectedCustomerId, status: "SENT" }],
    queryFn: () =>
      fetch(
        `/api/v1/invoices?customerId=${selectedCustomerId}`
      ).then((r) => r.json()),
    enabled: !!selectedCustomerId,
  });

  const openInvoices = useMemo(() => {
    if (!invoiceData?.data) return [];
    return invoiceData.data.filter((inv) =>
      ["SENT", "PARTIAL", "OVERDUE"].includes(inv.status)
    );
  }, [invoiceData]);

  // ── Filtered customers for search ──
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // ── Handle customer change ──
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedInvoiceId("");
    setAmount("");
  };

  // ── Handle invoice selection ──
  const handleInvoiceToggle = (invoice: Invoice) => {
    if (selectedInvoiceId === invoice.id) {
      setSelectedInvoiceId("");
      setAmount("");
    } else {
      setSelectedInvoiceId(invoice.id);
      setAmount(String(Number(invoice.amountDue).toFixed(2)));
    }
  };

  // ── Reset form ──
  const resetForm = () => {
    setSelectedCustomerId("");
    setSelectedInvoiceId("");
    setAmount("");
    setMethod("");
    setReference("");
    setDate(new Date().toISOString().slice(0, 10));
    setDepositAccountId("");
    setMemo("");
    setCustomerSearch("");
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer.");
      return;
    }
    if (!selectedInvoiceId) {
      toast.error("Please select an invoice.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }
    if (!method) {
      toast.error("Please select a payment method.");
      return;
    }
    if (!date) {
      toast.error("Please enter a payment date.");
      return;
    }
    if (!depositAccountId) {
      toast.error("Please select a deposit account.");
      return;
    }

    try {
      await createPayment.mutateAsync({
        invoiceId: selectedInvoiceId,
        customerId: selectedCustomerId,
        amount: parseFloat(amount),
        method,
        reference: reference || undefined,
        date: new Date(date + "T00:00:00").toISOString(),
        depositAccountId,
        memo: memo || undefined,
      });
      toast.success("Payment received successfully.");
      resetForm();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to receive payment."
      );
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Receive Payment</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Record payments received from customers
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* ══════════ LEFT: Recent Payments List ══════════ */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
                <FileText className="size-4" />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                  Loading payments...
                </div>
              ) : payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <DollarSign className="mb-2 size-8 opacity-40" />
                  <p className="text-sm">No payments recorded yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Payment #
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Customer
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Date
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Amount
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Method
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Invoice #
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow
                          key={p.id}
                          className="cursor-pointer hover:bg-blue-50/40"
                        >
                          <TableCell className="font-mono text-xs font-medium text-blue-700">
                            {p.paymentNumber}
                          </TableCell>
                          <TableCell className="text-sm text-gray-700">
                            {p.customer?.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {fmtDate(p.date)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold text-green-700">
                            {fmt(p.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {p.method ?? "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-500">
                            {p.invoice?.invoiceNumber ?? "—"}
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

        {/* ══════════ RIGHT: Receive Payment Form ══════════ */}
        <div className="xl:col-span-3">
          <Card>
            <CardHeader className="border-b bg-green-50/50">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-green-800">
                <DollarSign className="size-4" />
                Receive Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="space-y-5">
                {/* ── Customer Select ── */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-gray-500">
                    <User className="size-3.5" />
                    Customer <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={(v) => v && handleCustomerChange(v)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select a customer...">
                        {selectedCustomerId
                          ? customers.find((c) => c.id === selectedCustomerId)
                              ?.name
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
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
                          <span>{c.name}</span>
                          {c.company && (
                            <span className="ml-1.5 text-xs text-gray-400">
                              ({c.company})
                            </span>
                          )}
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

                {/* ── Open Invoices ── */}
                {selectedCustomerId && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-gray-500">
                      <FileText className="size-3.5" />
                      Open Invoices <span className="text-red-500">*</span>
                    </Label>
                    {invoicesLoading ? (
                      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-gray-400">
                        Loading invoices...
                      </div>
                    ) : openInvoices.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-gray-400">
                        No open invoices for this customer
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/80">
                              <TableHead className="w-10" />
                              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Invoice #
                              </TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Date
                              </TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Status
                              </TableHead>
                              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Total
                              </TableHead>
                              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Amount Due
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {openInvoices.map((inv) => (
                              <TableRow
                                key={inv.id}
                                className={`cursor-pointer transition-colors ${
                                  selectedInvoiceId === inv.id
                                    ? "bg-green-50/70"
                                    : "hover:bg-gray-50/60"
                                }`}
                                onClick={() => handleInvoiceToggle(inv)}
                              >
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={selectedInvoiceId === inv.id}
                                    onCheckedChange={() =>
                                      handleInvoiceToggle(inv)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-xs font-medium text-blue-700">
                                  {inv.invoiceNumber}
                                </TableCell>
                                <TableCell className="text-xs text-gray-500">
                                  {fmtDate(inv.date)}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      STATUS_STYLES[inv.status] ??
                                      "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {inv.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-gray-600">
                                  {fmt(inv.totalAmount)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs font-semibold text-gray-800">
                                  {fmt(inv.amountDue)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Amount & Method Row ── */}
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
                      <CreditCard className="size-3.5" />
                      Payment Method <span className="text-red-500">*</span>
                    </Label>
                    <Select value={method} onValueChange={(v) => setMethod(v ?? "")}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Select method...">
                          {method || undefined}
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
                </div>

                {/* ── Reference & Date Row ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-gray-500">
                      <Hash className="size-3.5" />
                      Reference #
                    </Label>
                    <Input
                      placeholder="Check #, transaction ID..."
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="h-9 text-sm"
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

                {/* ── Deposit To Account ── */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-gray-500">
                    <Landmark className="size-3.5" />
                    Deposit To <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={depositAccountId}
                    onValueChange={(v) => setDepositAccountId(v ?? "")}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select bank account...">
                        {depositAccountId
                          ? (() => {
                              const acct = bankAccounts.find(
                                (a) => a.id === depositAccountId
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

                {/* ── Memo ── */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-gray-500">
                    <MessageSquare className="size-3.5" />
                    Memo
                  </Label>
                  <Textarea
                    placeholder="Payment notes..."
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    className="min-h-16 text-sm"
                  />
                </div>

                {/* ── Actions ── */}
                <div className="flex items-center justify-end gap-3 border-t pt-4">
                  <Button variant="outline" onClick={resetForm}>
                    Clear
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createPayment.isPending}
                    className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
                  >
                    <DollarSign className="size-4" />
                    {createPayment.isPending
                      ? "Processing..."
                      : "Receive Payment"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
