"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
} from "lucide-react";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n)
  );

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

type CreditMemo = {
  id: string;
  creditNumber: string;
  date: string;
  status: string;
  totalAmount: number | string;
  amountUsed: number | string;
  amountRemaining: number | string;
  memo: string | null;
  customer: { id: string; name: string };
};

type PaginatedResponse = {
  data: CreditMemo[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const STATUS_STYLES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  APPLIED: { label: "Applied", variant: "default" },
  PARTIAL: { label: "Partial", variant: "outline" },
  VOIDED: { label: "Voided", variant: "destructive" },
};

export default function CreditMemosPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["credit-memos", { page }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      return fetch(`/api/v1/credit-memos?${params}`).then((r) => r.json());
    },
  });

  const { data: customers = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const res = await fetch("/api/v1/customers?active=true");
      const json = await res.json();
      return Array.isArray(json) ? json : json.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/v1/credit-memos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-memos"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setShowCreate(false);
      toast.success("Credit memo created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const memos = data?.data || [];
  const pagination = data?.pagination;

  const filtered = search
    ? memos.filter(
        (m) =>
          m.creditNumber.toLowerCase().includes(search.toLowerCase()) ||
          m.customer.name.toLowerCase().includes(search.toLowerCase())
      )
    : memos;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-green-600" />
          <h1 className="text-xl font-bold text-gray-800">Credit Memos</h1>
        </div>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Credit Memo
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search credit memos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-green-50/60">
              <TableHead className="font-semibold text-xs">Credit #</TableHead>
              <TableHead className="font-semibold text-xs">Customer</TableHead>
              <TableHead className="font-semibold text-xs">Date</TableHead>
              <TableHead className="font-semibold text-xs">Status</TableHead>
              <TableHead className="font-semibold text-xs text-right">Total</TableHead>
              <TableHead className="font-semibold text-xs text-right">Used</TableHead>
              <TableHead className="font-semibold text-xs text-right">Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  No credit memos found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((cm, i) => {
                const style = STATUS_STYLES[cm.status] || STATUS_STYLES.DRAFT;
                return (
                  <TableRow
                    key={cm.id}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {cm.creditNumber}
                    </TableCell>
                    <TableCell className="text-sm">{cm.customer.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {fmtDate(cm.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={style.variant} className="text-[10px]">
                        {style.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {fmt(cm.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums text-gray-500">
                      {fmt(cm.amountUsed)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums font-medium">
                      {fmt(cm.amountRemaining)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">{page} / {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateCreditMemoDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        customers={customers}
        onSubmit={(d) => createMutation.mutate(d)}
        loading={createMutation.isPending}
      />
    </div>
  );
}

// ── Create Credit Memo Dialog ──────────────────────────────

function CreateCreditMemoDialog({
  open,
  onOpenChange,
  customers,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Array<{ id: string; name: string }>;
  onSubmit: (data: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);

  const addLine = () => setLines((l) => [...l, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => {
    if (lines.length <= 1) return;
    setLines((l) => l.filter((_, idx) => idx !== i));
  };
  const updateLine = (i: number, field: string, value: string | number) =>
    setLines((l) => l.map((line, idx) => (idx === i ? { ...line, [field]: value } : line)));

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const handleSubmit = () => {
    if (!customerId) return toast.error("Select a customer");
    if (lines.every((l) => l.quantity * l.unitPrice === 0))
      return toast.error("Add at least one line with an amount");

    onSubmit({
      customerId,
      date,
      memo: memo || undefined,
      lines: lines
        .filter((l) => l.quantity * l.unitPrice > 0)
        .map((l) => ({
          description: l.description || undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Credit Memo</DialogTitle>
          <DialogDescription>
            Issue a credit to reduce a customer&apos;s balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Customer <span className="text-red-500">*</span></Label>
              <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? "")}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
            </div>
          </div>

          {/* Line items */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs font-semibold text-gray-600 uppercase">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs w-20 text-right">Qty</TableHead>
                    <TableHead className="text-xs w-28 text-right">Rate</TableHead>
                    <TableHead className="text-xs w-28 text-right">Amount</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell className="p-1">
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(i, "description", e.target.value)}
                          placeholder="Description"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number" min={0}
                          value={line.quantity}
                          onChange={(e) => updateLine(i, "quantity", Number(e.target.value))}
                          className="h-8 text-sm text-right"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number" min={0} step={0.01}
                          value={line.unitPrice}
                          onChange={(e) => updateLine(i, "unitPrice", Number(e.target.value))}
                          className="h-8 text-sm text-right"
                        />
                      </TableCell>
                      <TableCell className="p-1 text-right font-mono text-sm tabular-nums">
                        {fmt(line.quantity * line.unitPrice)}
                      </TableCell>
                      <TableCell className="p-1">
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => removeLine(i)}
                          disabled={lines.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between p-2 border-t">
                <Button variant="ghost" size="sm" className="text-green-600" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                </Button>
                <div className="font-semibold text-sm">
                  Total: <span className="font-mono tabular-nums">{fmt(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-1.5">
            <Label>Memo</Label>
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Reason for credit..." rows={2} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
          <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Create Credit Memo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
