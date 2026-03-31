"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useBills,
  usePostBill,
  usePayBill,
  useVoidBill,
} from "@/hooks/use-bills";
import { useAccounts } from "@/hooks/use-accounts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Eye,
  Send,
  Ban,
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

interface Bill {
  id: string;
  billNumber: number;
  vendorId: string;
  date: string;
  dueDate: string;
  status: "UNPAID" | "PARTIAL" | "PAID" | "VOIDED";
  total: string | number;
  amountDue: string | number;
  vendor?: {
    id: string;
    name: string;
  };
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  UNPAID: {
    label: "Unpaid",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  PARTIAL: {
    label: "Partial",
    className:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  },
  PAID: {
    label: "Paid",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  VOIDED: {
    label: "Voided",
    className:
      "bg-red-100 text-red-700 border-red-200 line-through dark:bg-red-900/30 dark:text-red-400",
  },
};

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

/* ---------- component ---------- */

export default function BillsPage() {
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Action dialogs
  const [postTarget, setPostTarget] = useState<Bill | null>(null);
  const [voidTarget, setVoidTarget] = useState<Bill | null>(null);
  const [payTarget, setPayTarget] = useState<Bill | null>(null);

  // Pay dialog form state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payReference, setPayReference] = useState("");
  const [payAccountId, setPayAccountId] = useState("");

  const { data, isLoading, error } = useBills({
    page,
    limit,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    search: search || undefined,
  });

  const postMutation = usePostBill();
  const voidMutation = useVoidBill();
  const payMutation = usePayBill();

  // Bank accounts for pay dialog
  const { data: accountsRaw } = useAccounts({ type: "BANK", active: "true" });
  const bankAccounts = (accountsRaw ?? []) as Account[];

  const bills = (data?.data ?? []) as Bill[];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const handlePost = async () => {
    if (!postTarget) return;
    try {
      await postMutation.mutateAsync(postTarget.id);
      toast.success(
        `Bill #${postTarget.billNumber} has been posted.`
      );
      setPostTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to post bill."
      );
    }
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    try {
      await voidMutation.mutateAsync(voidTarget.id);
      toast.success(
        `Bill #${voidTarget.billNumber} has been voided.`
      );
      setVoidTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to void bill."
      );
    }
  };

  const openPayDialog = (bill: Bill) => {
    setPayTarget(bill);
    setPayAmount(String(Number(bill.amountDue).toFixed(2)));
    setPayMethod("");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayReference("");
    setPayAccountId("");
  };

  const handlePay = async () => {
    if (!payTarget) return;
    if (!payAmount || Number(payAmount) <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }
    if (!payMethod) {
      toast.error("Please select a payment method.");
      return;
    }
    if (!payDate) {
      toast.error("Please enter a payment date.");
      return;
    }
    if (!payAccountId) {
      toast.error("Please select a bank account.");
      return;
    }

    try {
      await payMutation.mutateAsync({
        billId: payTarget.id,
        data: {
          amount: parseFloat(payAmount),
          method: payMethod,
          date: new Date(payDate + "T00:00:00").toISOString(),
          reference: payReference || undefined,
          bankAccountId: payAccountId,
        },
      });
      toast.success(
        `Payment of ${fmt(payAmount)} recorded for Bill #${payTarget.billNumber}.`
      );
      setPayTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record payment."
      );
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Bills</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage vendor bills and accounts payable
          </p>
        </div>
        <Button
          onClick={() => router.push("/bills/new")}
          className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
        >
          <Plus className="size-4" />
          Enter Bill
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
        {/* Search */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Bill #, vendor..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 w-56 pl-7 text-sm"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            Status
          </label>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val as string);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="VOIDED">Voided</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {(search || statusFilter !== "ALL") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
              setPage(1);
            }}
            className="text-xs text-gray-500"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-orange-50/60">
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                Bill #
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                Vendor
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                Date
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                Due Date
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                Status
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                Total
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                Amount Due
              </TableHead>
              <TableHead className="w-28 text-center text-xs font-semibold uppercase tracking-wide text-orange-900/70">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-gray-400"
                >
                  Loading bills...
                </TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-red-500"
                >
                  Failed to load bills.{" "}
                  {error instanceof Error ? error.message : ""}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && bills.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-gray-400"
                >
                  No bills found.
                </TableCell>
              </TableRow>
            )}
            {bills.map((bill) => {
              const badge = STATUS_BADGE[bill.status] ?? STATUS_BADGE.UNPAID;
              const isVoided = bill.status === "VOIDED";
              return (
                <TableRow
                  key={bill.id}
                  className={`hover:bg-orange-50/40 ${isVoided ? "opacity-60" : ""}`}
                >
                  <TableCell
                    className={`font-mono text-sm font-medium text-gray-700 ${isVoided ? "line-through" : ""}`}
                  >
                    {bill.billNumber}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {bill.vendor?.name ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {fmtDate(bill.date)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {fmtDate(bill.dueDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={badge.className}>
                      {badge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-700">
                    {fmt(bill.total)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-sm font-medium ${
                      Number(bill.amountDue) > 0
                        ? "text-orange-700"
                        : "text-gray-700"
                    }`}
                  >
                    {fmt(bill.amountDue)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="View bill"
                        onClick={() =>
                          router.push(`/bills/${bill.id}`)
                        }
                      >
                        <Eye className="size-3.5 text-gray-500" />
                      </Button>
                      {bill.status === "UNPAID" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Post bill"
                          onClick={() => setPostTarget(bill)}
                        >
                          <Send className="size-3.5 text-orange-500" />
                        </Button>
                      )}
                      {(bill.status === "UNPAID" || bill.status === "PARTIAL") && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Pay bill"
                          onClick={() => openPayDialog(bill)}
                        >
                          <DollarSign className="size-3.5 text-green-500" />
                        </Button>
                      )}
                      {bill.status !== "VOIDED" &&
                        bill.status !== "PAID" && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title="Void bill"
                            onClick={() => setVoidTarget(bill)}
                          >
                            <Ban className="size-3.5 text-red-500" />
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {(page - 1) * limit + 1}&ndash;
            {Math.min(page * limit, pagination.total)} of{" "}
            {pagination.total} bills
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

      {/* Post Confirmation Dialog */}
      <Dialog
        open={!!postTarget}
        onOpenChange={(open) => {
          if (!open) setPostTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Bill</DialogTitle>
            <DialogDescription>
              Are you sure you want to post Bill #
              {postTarget?.billNumber}? This will create the associated
              journal entries for accounts payable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" />}
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handlePost}
              disabled={postMutation.isPending}
              className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
            >
              <Send className="size-3.5" />
              {postMutation.isPending ? "Posting..." : "Post Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Bill Dialog */}
      <Dialog
        open={!!payTarget}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Bill</DialogTitle>
            <DialogDescription>
              Record a payment for Bill #{payTarget?.billNumber} from{" "}
              {payTarget?.vendor?.name ?? "vendor"}.
              Amount due: {payTarget ? fmt(payTarget.amountDue) : "$0.00"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Amount */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-gray-500">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="h-9 font-mono text-sm"
              />
            </div>

            {/* Method */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-gray-500">
                Payment Method <span className="text-red-500">*</span>
              </Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v ?? "")}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select method...">
                    {payMethod || undefined}
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

            {/* Date */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-gray-500">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="h-9 font-mono text-sm"
              />
            </div>

            {/* Bank Account */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-gray-500">
                Bank Account <span className="text-red-500">*</span>
              </Label>
              <Select
                value={payAccountId}
                onValueChange={(v) => setPayAccountId(v ?? "")}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select bank account...">
                    {payAccountId
                      ? (() => {
                          const acct = bankAccounts.find(
                            (a) => a.id === payAccountId
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

            {/* Reference */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-gray-500">
                Reference #
              </Label>
              <Input
                placeholder="Check #, transaction ID..."
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" />}
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handlePay}
              disabled={payMutation.isPending}
              className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
            >
              <DollarSign className="size-3.5" />
              {payMutation.isPending ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Confirmation Dialog */}
      <Dialog
        open={!!voidTarget}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Bill</DialogTitle>
            <DialogDescription>
              Are you sure you want to void Bill #
              {voidTarget?.billNumber}? This will reverse the journal
              entries and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" />}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={voidMutation.isPending}
            >
              {voidMutation.isPending ? "Voiding..." : "Void Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
