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
import {
  Plus,
  TrendingUp,
  Loader2,
} from "lucide-react";

type Budget = {
  id: string;
  name: string;
  fiscalYear: number;
  type: string;
  isActive: boolean;
  createdAt: string;
  _count: { lines: number };
};

const TYPE_LABELS: Record<string, string> = {
  PROFIT_AND_LOSS: "Profit & Loss",
  BALANCE_SHEET: "Balance Sheet",
};

export default function BudgetsPage() {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const [showCreate, setShowCreate] = useState(false);

  const { data: budgets = [], isLoading } = useQuery<Budget[]>({
    queryKey: ["budgets", { year: yearFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (yearFilter && yearFilter !== "ALL") params.set("fiscalYear", yearFilter);
      const res = await fetch(`/api/v1/budgets?${params}`);
      const json = await res.json();
      return Array.isArray(json) ? json : json.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/v1/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      setShowCreate(false);
      toast.success("Budget created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">Budgets & Forecasts</h1>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Budget
        </Button>
      </div>

      {/* Year filter */}
      <div className="flex items-center gap-3">
        <Select value={yearFilter} onValueChange={(v) => setYearFilter(v ?? String(currentYear))}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Years</SelectItem>
            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50/60">
              <TableHead className="font-semibold text-xs">Budget Name</TableHead>
              <TableHead className="font-semibold text-xs">Fiscal Year</TableHead>
              <TableHead className="font-semibold text-xs">Type</TableHead>
              <TableHead className="font-semibold text-xs text-right">Line Items</TableHead>
              <TableHead className="font-semibold text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : budgets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No budgets found</p>
                  <p className="text-xs mt-1">Create a budget to plan your financial targets.</p>
                </TableCell>
              </TableRow>
            ) : (
              budgets.map((b, i) => (
                <TableRow key={b.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <TableCell className="text-sm font-medium">{b.name}</TableCell>
                  <TableCell className="text-sm font-mono">{b.fiscalYear}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {TYPE_LABELS[b.type] || b.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono tabular-nums">
                    {b._count.lines}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.isActive ? "default" : "secondary"} className="text-[10px]">
                      {b.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {budgets.length > 0 && (
          <div className="px-3 py-2 border-t text-xs text-gray-500">
            {budgets.length} budget{budgets.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Budget</DialogTitle>
            <DialogDescription>
              Create a budget to set financial targets for accounts by month.
            </DialogDescription>
          </DialogHeader>
          <CreateBudgetForm
            onSubmit={(d) => createMutation.mutate(d)}
            loading={createMutation.isPending}
            currentYear={currentYear}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateBudgetForm({
  onSubmit,
  loading,
  currentYear,
}: {
  onSubmit: (data: Record<string, unknown>) => void;
  loading: boolean;
  currentYear: number;
}) {
  const [name, setName] = useState("");
  const [fiscalYear, setFiscalYear] = useState(String(currentYear));
  const [type, setType] = useState("PROFIT_AND_LOSS");

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("Budget name is required");
    onSubmit({
      name: name.trim(),
      fiscalYear: parseInt(fiscalYear),
      type,
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-1.5">
          <Label>Budget Name <span className="text-red-500">*</span></Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 2026 Annual Budget"
            className="h-9"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Fiscal Year</Label>
            <Select value={fiscalYear} onValueChange={(v) => setFiscalYear(v ?? String(currentYear))}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear + 1, currentYear, currentYear - 1].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v ?? "PROFIT_AND_LOSS")}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROFIT_AND_LOSS">Profit & Loss</SelectItem>
                <SelectItem value="BALANCE_SHEET">Balance Sheet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter className="gap-2 mt-4">
        <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          Create Budget
        </Button>
      </DialogFooter>
    </>
  );
}
