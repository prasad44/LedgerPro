"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useInvoices,
  usePostInvoice,
  useVoidInvoice,
} from "@/hooks/use-invoices";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

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

interface Invoice {
  id: string;
  invoiceNumber: number;
  customerId: string;
  date: string;
  dueDate: string;
  status: "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" | "VOIDED";
  total: string | number;
  amountDue: string | number;
  customer?: {
    id: string;
    name: string;
  };
}

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
  },
  SENT: {
    label: "Sent",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  },
  PARTIAL: {
    label: "Partial",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  PAID: {
    label: "Paid",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  OVERDUE: {
    label: "Overdue",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  },
  VOIDED: {
    label: "Voided",
    className:
      "bg-red-100 text-red-700 border-red-200 line-through dark:bg-red-900/30 dark:text-red-400",
  },
};

export default function InvoicesPage() {
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Action dialogs
  const [postTarget, setPostTarget] = useState<Invoice | null>(null);
  const [voidTarget, setVoidTarget] = useState<Invoice | null>(null);

  const { data, isLoading, error } = useInvoices({
    page,
    limit,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    search: search || undefined,
  });

  const postMutation = usePostInvoice();
  const voidMutation = useVoidInvoice();

  const invoices = (data?.data ?? []) as Invoice[];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const handlePost = async () => {
    if (!postTarget) return;
    try {
      await postMutation.mutateAsync(postTarget.id);
      toast.success(
        `Invoice #${postTarget.invoiceNumber} has been posted.`
      );
      setPostTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to post invoice."
      );
    }
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    try {
      await voidMutation.mutateAsync(voidTarget.id);
      toast.success(
        `Invoice #${voidTarget.invoiceNumber} has been voided.`
      );
      setVoidTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to void invoice."
      );
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Invoices</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Create and manage customer invoices
          </p>
        </div>
        <Button
          onClick={() => router.push("/invoices/new")}
          className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="size-4" />
          New Invoice
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
              placeholder="Invoice #, customer..."
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
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
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
            <TableRow className="bg-blue-50/60">
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Invoice #
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Customer
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Date
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Due Date
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Status
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Total
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Amount Due
              </TableHead>
              <TableHead className="w-24 text-center text-xs font-semibold uppercase tracking-wide text-blue-900/70">
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
                  Loading invoices...
                </TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-red-500"
                >
                  Failed to load invoices.{" "}
                  {error instanceof Error ? error.message : ""}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && invoices.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-gray-400"
                >
                  No invoices found.
                </TableCell>
              </TableRow>
            )}
            {invoices.map((inv) => {
              const badge = STATUS_BADGE[inv.status] ?? STATUS_BADGE.DRAFT;
              const isVoided = inv.status === "VOIDED";
              return (
                <TableRow
                  key={inv.id}
                  className={`hover:bg-blue-50/40 ${isVoided ? "opacity-60" : ""}`}
                >
                  <TableCell
                    className={`font-mono text-sm font-medium text-gray-700 ${isVoided ? "line-through" : ""}`}
                  >
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {inv.customer?.name ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {fmtDate(inv.date)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {fmtDate(inv.dueDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={badge.className}>
                      {badge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-700">
                    {fmt(inv.total)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-sm font-medium ${
                      Number(inv.amountDue) > 0
                        ? "text-blue-700"
                        : "text-gray-700"
                    }`}
                  >
                    {fmt(inv.amountDue)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="View invoice"
                        onClick={() =>
                          router.push(`/invoices/${inv.id}`)
                        }
                      >
                        <Eye className="size-3.5 text-gray-500" />
                      </Button>
                      {inv.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Post invoice"
                          onClick={() => setPostTarget(inv)}
                        >
                          <Send className="size-3.5 text-blue-500" />
                        </Button>
                      )}
                      {inv.status !== "VOIDED" &&
                        inv.status !== "PAID" && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title="Void invoice"
                            onClick={() => setVoidTarget(inv)}
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
            {pagination.total} invoices
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
            <DialogTitle>Post Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to post Invoice #
              {postTarget?.invoiceNumber}? This will send the invoice and
              create the associated journal entries.
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
              className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Send className="size-3.5" />
              {postMutation.isPending ? "Posting..." : "Post Invoice"}
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
            <DialogTitle>Void Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to void Invoice #
              {voidTarget?.invoiceNumber}? This will reverse the journal
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
              {voidMutation.isPending ? "Voiding..." : "Void Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
