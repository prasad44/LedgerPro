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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Plus,
  Package,
  Pencil,
  XCircle,
  Loader2,
} from "lucide-react";

const fmt = (n: number | string | null) =>
  n != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n))
    : "—";

type Item = {
  id: string;
  name: string;
  sku: string | null;
  type: string;
  description: string | null;
  salesPrice: number | string | null;
  purchasePrice: number | string | null;
  taxable: boolean;
  isActive: boolean;
  trackInventory: boolean;
  quantityOnHand: number | string;
  reorderPoint: number | string | null;
};

const TYPE_LABELS: Record<string, string> = {
  SERVICE: "Service",
  INVENTORY: "Inventory",
  NON_INVENTORY: "Non-Inventory",
  BUNDLE: "Bundle",
  GROUP: "Group",
};

export default function ItemsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["items", { type: typeFilter, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter && typeFilter !== "ALL") params.set("type", typeFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/v1/items?${params}`);
      const json = await res.json();
      return Array.isArray(json) ? json : json.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/v1/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setShowCreate(false);
      toast.success("Item created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/v1/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setEditItem(null);
      toast.success("Item updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/items/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      toast.success("Item deactivated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeItems = items.filter((i) => i.isActive);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">Items & Services</h1>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={typeFilter || "ALL"} onValueChange={(v) => setTypeFilter(v === "ALL" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="SERVICE">Service</SelectItem>
            <SelectItem value="INVENTORY">Inventory</SelectItem>
            <SelectItem value="NON_INVENTORY">Non-Inventory</SelectItem>
            <SelectItem value="BUNDLE">Bundle</SelectItem>
            <SelectItem value="GROUP">Group</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50/60">
              <TableHead className="font-semibold text-xs">Name</TableHead>
              <TableHead className="font-semibold text-xs">SKU</TableHead>
              <TableHead className="font-semibold text-xs">Type</TableHead>
              <TableHead className="font-semibold text-xs text-right">Sales Price</TableHead>
              <TableHead className="font-semibold text-xs text-right">Purchase Price</TableHead>
              <TableHead className="font-semibold text-xs text-right">Qty on Hand</TableHead>
              <TableHead className="font-semibold text-xs text-center">Taxable</TableHead>
              <TableHead className="font-semibold text-xs w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : activeItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                  No items found
                </TableCell>
              </TableRow>
            ) : (
              activeItems.map((item, i) => (
                <TableRow key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <TableCell>
                    <div className="text-sm font-medium">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-gray-400 truncate max-w-[200px]">{item.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-gray-600">{item.sku || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {TYPE_LABELS[item.type] || item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{fmt(item.salesPrice)}</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{fmt(item.purchasePrice)}</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {item.trackInventory ? Number(item.quantityOnHand) : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.taxable ? (
                      <Badge variant="secondary" className="text-[10px]">Tax</Badge>
                    ) : (
                      <span className="text-xs text-gray-400">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditItem(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                        onClick={() => deactivateMutation.mutate(item.id)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="px-3 py-2 border-t text-xs text-gray-500">
          {activeItems.length} item{activeItems.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Create Dialog */}
      <ItemDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={(d) => createMutation.mutate(d)}
        loading={createMutation.isPending}
        title="New Item"
      />

      {/* Edit Dialog */}
      {editItem && (
        <ItemDialog
          open={!!editItem}
          onOpenChange={(o) => { if (!o) setEditItem(null); }}
          onSubmit={(d) => updateMutation.mutate({ id: editItem.id, data: d })}
          loading={updateMutation.isPending}
          title="Edit Item"
          defaults={editItem}
        />
      )}
    </div>
  );
}

// ── Item Create/Edit Dialog ────────────────────────────────

function ItemDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
  title,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => void;
  loading: boolean;
  title: string;
  defaults?: Item;
}) {
  const [name, setName] = useState(defaults?.name || "");
  const [sku, setSku] = useState(defaults?.sku || "");
  const [type, setType] = useState(defaults?.type || "SERVICE");
  const [description, setDescription] = useState(defaults?.description || "");
  const [salesPrice, setSalesPrice] = useState(defaults?.salesPrice != null ? Number(defaults.salesPrice) : 0);
  const [purchasePrice, setPurchasePrice] = useState(defaults?.purchasePrice != null ? Number(defaults.purchasePrice) : 0);
  const [taxable, setTaxable] = useState(defaults?.taxable ?? true);
  const [trackInventory, setTrackInventory] = useState(defaults?.trackInventory ?? false);
  const [reorderPoint, setReorderPoint] = useState(defaults?.reorderPoint != null ? Number(defaults.reorderPoint) : 0);

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("Name is required");

    onSubmit({
      name: name.trim(),
      sku: sku.trim() || undefined,
      type,
      description: description.trim() || undefined,
      salesPrice: salesPrice || undefined,
      purchasePrice: purchasePrice || undefined,
      taxable,
      trackInventory,
      reorderPoint: trackInventory ? reorderPoint : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Products and services you sell or buy.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label>SKU</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU code" className="h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v ?? "SERVICE")}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SERVICE">Service</SelectItem>
                  <SelectItem value="INVENTORY">Inventory</SelectItem>
                  <SelectItem value="NON_INVENTORY">Non-Inventory</SelectItem>
                  <SelectItem value="BUNDLE">Bundle</SelectItem>
                  <SelectItem value="GROUP">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={taxable} onCheckedChange={(c) => setTaxable(!!c)} />
                Taxable
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={trackInventory} onCheckedChange={(c) => setTrackInventory(!!c)} />
                Track Inventory
              </label>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Item description" rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Sales Price</Label>
              <Input type="number" min={0} step={0.01} value={salesPrice} onChange={(e) => setSalesPrice(Number(e.target.value))} className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label>Purchase Price</Label>
              <Input type="number" min={0} step={0.01} value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value))} className="h-9" />
            </div>
            {trackInventory && (
              <div className="grid gap-1.5">
                <Label>Reorder Point</Label>
                <Input type="number" min={0} value={reorderPoint} onChange={(e) => setReorderPoint(Number(e.target.value))} className="h-9" />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            {defaults ? "Save Changes" : "Create Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
