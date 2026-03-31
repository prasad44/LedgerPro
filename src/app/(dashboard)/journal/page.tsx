"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useJournalEntries,
  useVoidJournalEntry,
} from "@/hooks/use-journal-entries";
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Eye,
  Ban,
  ChevronLeft,
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

interface JournalLine {
  id: string;
  accountId: string;
  description: string | null;
  debit: string | number;
  credit: string | number;
  account: {
    code: string;
    name: string;
  };
}

interface JournalEntry {
  id: string;
  entryNumber: number;
  date: string;
  memo: string | null;
  reference: string | null;
  status: "POSTED" | "DRAFT" | "VOIDED";
  lines: JournalLine[];
}

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  POSTED: {
    label: "Posted",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  DRAFT: {
    label: "Draft",
    className:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
  },
  VOIDED: {
    label: "Voided",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  },
};

export default function JournalEntriesPage() {
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Void dialog
  const [voidTarget, setVoidTarget] = useState<JournalEntry | null>(null);

  const { data, isLoading, error } = useJournalEntries({
    page,
    limit,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: search || undefined,
  });

  const voidMutation = useVoidJournalEntry();

  const entries = (data?.data ?? []) as JournalEntry[];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    try {
      await voidMutation.mutateAsync(voidTarget.id);
      toast.success(
        `Entry #${voidTarget.entryNumber} has been voided.`
      );
      setVoidTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to void entry."
      );
    }
  };

  const totalDebits = (lines: JournalLine[]) =>
    lines.reduce((sum, l) => sum + Number(l.debit), 0);
  const totalCredits = (lines: JournalLine[]) =>
    lines.reduce((sum, l) => sum + Number(l.credit), 0);

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            Journal Entries
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            View and manage general journal entries
          </p>
        </div>
        <Button
          onClick={() => router.push("/journal/new")}
          className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="size-4" />
          New Entry
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
              placeholder="Memo, reference..."
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
              <SelectItem value="POSTED">Posted</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="VOIDED">Voided</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            From
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="h-8 w-40 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            To
          </label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="h-8 w-40 text-sm"
          />
        </div>

        {/* Clear Filters */}
        {(search || statusFilter !== "ALL" || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
              setStartDate("");
              setEndDate("");
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
              <TableHead className="w-8 px-2" />
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Entry #
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Date
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Memo
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Status
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Total Debits
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Total Credits
              </TableHead>
              <TableHead className="w-20 text-center text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-gray-400">
                  Loading journal entries...
                </TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-red-500">
                  Failed to load entries.{" "}
                  {error instanceof Error ? error.message : ""}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-gray-400">
                  No journal entries found.
                </TableCell>
              </TableRow>
            )}
            {entries.map((entry) => {
              const isExpanded = expandedRows.has(entry.id);
              const badge = STATUS_BADGE[entry.status] ?? STATUS_BADGE.DRAFT;
              return (
                <span key={entry.id} className="contents">
                  {/* Main Row */}
                  <TableRow
                    className="cursor-pointer hover:bg-blue-50/40"
                    onClick={() => toggleRow(entry.id)}
                  >
                    <TableCell className="w-8 px-2 text-gray-400">
                      {isExpanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-gray-700">
                      {entry.entryNumber}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {fmtDate(entry.date)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-gray-600">
                      {entry.memo || "\u2014"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={badge.className}
                      >
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-gray-700">
                      {fmt(totalDebits(entry.lines))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-gray-700">
                      {fmt(totalCredits(entry.lines))}
                    </TableCell>
                    <TableCell
                      className="text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="View detail"
                          onClick={() =>
                            router.push(`/journal/${entry.id}`)
                          }
                        >
                          <Eye className="size-3.5 text-gray-500" />
                        </Button>
                        {entry.status === "POSTED" && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title="Void entry"
                            onClick={() => setVoidTarget(entry)}
                          >
                            <Ban className="size-3.5 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Sub-table */}
                  {isExpanded && entry.lines.length > 0 && (
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      <TableCell colSpan={8} className="p-0">
                        <div className="border-y border-gray-100 px-10 py-2">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                <th className="py-1 pr-4 text-left">
                                  Account Code
                                </th>
                                <th className="py-1 pr-4 text-left">
                                  Account Name
                                </th>
                                <th className="py-1 pr-4 text-left">
                                  Description
                                </th>
                                <th className="py-1 pr-4 text-right">
                                  Debit
                                </th>
                                <th className="py-1 text-right">
                                  Credit
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {entry.lines.map((line) => (
                                <tr
                                  key={line.id}
                                  className="border-t border-gray-100"
                                >
                                  <td className="py-1 pr-4 font-mono text-gray-600">
                                    {line.account.code}
                                  </td>
                                  <td className="py-1 pr-4 text-gray-700">
                                    {line.account.name}
                                  </td>
                                  <td className="py-1 pr-4 text-gray-500">
                                    {line.description || "\u2014"}
                                  </td>
                                  <td className="py-1 pr-4 text-right font-mono text-gray-700">
                                    {Number(line.debit) !== 0
                                      ? fmt(line.debit)
                                      : ""}
                                  </td>
                                  <td className="py-1 text-right font-mono text-gray-700">
                                    {Number(line.credit) !== 0
                                      ? fmt(line.credit)
                                      : ""}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </span>
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
            {pagination.total} entries
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

      {/* Void Confirmation Dialog */}
      <Dialog
        open={!!voidTarget}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Journal Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to void Entry #
              {voidTarget?.entryNumber}? This will create a reversing
              entry and cannot be undone.
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
              {voidMutation.isPending ? "Voiding..." : "Void Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
