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
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
} from "lucide-react";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

type PurchaseOrder = {
  id: string;
  poNumber: string;
  date: string;
  expectedDate: string | null;
  status: string;
  totalAmount: number | string;
  memo: string | null;
  vendor: { id: string; name: string };
};

type PaginatedResponse = {
  data: PurchaseOrder[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const STATUS_STYLES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent", variant: "default" },
  PARTIAL: { label: "Partial", variant: "outline" },
  RECEIVED: { label: "Received", variant: "default" },
  CLOSED: { label: "Closed", variant: "secondary" },
  VOIDED: { label: "Voided", variant: "destructive" },
};

export default function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["purchase-orders", { page, status: statusFilter }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
      return fetch(`/api/v1/purchase-orders?${params}`).then((r) => r.json());
    },
  });

  const { data: vendors = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["vendors-list"],
    queryFn: async () => {
      const res = await fetch("/api/v1/vendors?active=true");
      const json = await res.json();
      return Array.isArray(json) ? json : json.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/v1/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      setShowCreate(false);
      toast.success("Purchase order created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orders = data?.data || [];
  const pagination = data?.pagination;

  const filtered = search
    ? orders.filter(
        (o) =>
          o.poNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.vendor.name.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-orange-600" />
          <h1 className="text-xl font-bold text-gray-800">Purchase Orders</h1>
        </div>
        <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Purchase Order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search POs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="VOIDED">Voided</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-orange-50/60">
              <TableHead className="font-semibold text-xs">PO #</TableHead>
              <TableHead className="font-semibold text-xs">Vendor</TableHead>
              <TableHead className="font-semibold text-xs">Date</TableHead>
              <TableHead className="font-semibold text-xs">Expected</TableHead>
              <TableHead className="font-semibold text-xs">Status</TableHead>
              <TableHead className="font-semibold text-xs text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  No purchase orders found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((po, i) => {
                const style = STATUS_STYLES[po.status] || STATUS_STYLES.DRAFT;
                return (
                  <TableRow key={po.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <TableCell className="font-mono text-sm font-medium">{po.poNumber}</TableCell>
                    <TableCell className="text-sm">{po.vendor.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{fmtDate(po.date)}</TableCell>
                    <TableCell className="text-sm text-gray-600">{po.expectedDate ? fmtDate(po.expectedDate) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={style.variant} className="text-[10px]">{style.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{fmt(po.totalAmount)}</TableCell>
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
            Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
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
      <CreatePODialog
        open={showCreate}
        onOpenChange={setShowCreate}
        vendors={vendors}
        onSubmit={(d) => createMutation.mutate(d)}
        loading={createMutation.isPending}
      />
    </div>
  );
}

// ── Create PO Dialog ───────────────────────────────────────

function CreatePODialog({
  open,
  onOpenChange,
  vendors,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Array<{ id: string; name: string }>;
  onSubmit: (data: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState("");
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
    if (!vendorId) return toast.error("Select a vendor");
    if (lines.every((l) => l.quantity * l.unitPrice === 0))
      return toast.error("Add at least one line with an amount");

    onSubmit({
      vendorId,
      date,
      expectedDate: expectedDate || undefined,
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
          <DialogTitle>New Purchase Order</DialogTitle>
          <DialogDescription>Create an order to send to a vendor.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Vendor <span className="text-red-500">*</span></Label>
              <Select value={vendorId} onValueChange={(v) => setVendorId(v ?? "")}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label>Expected Date</Label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="h-9" />
            </div>
          </div>

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
                        <Input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} placeholder="Item description" className="h-8 text-sm" />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" min={0} value={line.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value))} className="h-8 text-sm text-right" />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" min={0} step={0.01} value={line.unitPrice} onChange={(e) => updateLine(i, "unitPrice", Number(e.target.value))} className="h-8 text-sm text-right" />
                      </TableCell>
                      <TableCell className="p-1 text-right font-mono text-sm tabular-nums">{fmt(line.quantity * line.unitPrice)}</TableCell>
                      <TableCell className="p-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => removeLine(i)} disabled={lines.length <= 1}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between p-2 border-t">
                <Button variant="ghost" size="sm" className="text-orange-600" onClick={addLine}>
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
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Notes..." rows={2} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
          <Button onClick={handleSubmit} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Create Purchase Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
