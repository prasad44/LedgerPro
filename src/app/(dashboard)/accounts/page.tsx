"use client";

import { useState, useMemo } from "react";
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
} from "@/hooks/use-accounts";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_GROUPS,
} from "@/lib/accounting/types";
import type { AccountType } from "@prisma/client";
import { toast } from "sonner";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, XCircle } from "lucide-react";

/* ---------- helpers ---------- */

const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));

interface Account {
  id: string;
  name: string;
  code: string | null;
  type: AccountType;
  detailType: string | null;
  description: string | null;
  balance: number | string;
  isActive: boolean;
  parentId: string | null;
}

type FormData = {
  name: string;
  code: string;
  type: AccountType | "";
  detailType: string;
  description: string;
  parentId: string;
};

const emptyForm: FormData = {
  name: "",
  code: "",
  type: "",
  detailType: "",
  description: "",
  parentId: "",
};

/* ---------- page ---------- */

export default function AccountsPage() {
  /* -- filters -- */
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  /* -- dialog state -- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  /* -- data -- */
  const { data: rawAccounts = [], isLoading } = useAccounts();
  const accounts = rawAccounts as Account[];

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();

  /* -- filtered list -- */
  const filtered = useMemo(() => {
    let list = accounts;

    if (typeFilter && typeFilter !== "ALL") {
      list = list.filter((a) => a.type === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.code && a.code.toLowerCase().includes(q))
      );
    }

    return list;
  }, [accounts, typeFilter, search]);

  /* -- dialog helpers -- */
  function openCreate() {
    setEditingAccount(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setForm({
      name: account.name,
      code: account.code ?? "",
      type: account.type,
      detailType: account.detailType ?? "",
      description: account.description ?? "",
      parentId: account.parentId ?? "",
    });
    setDialogOpen(true);
  }

  function handleDeactivate(account: Account) {
    updateMutation.mutate(
      { id: account.id, data: { isActive: false } },
      {
        onSuccess: () => toast.success(`"${account.name}" deactivated`),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to deactivate"),
      }
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Account name is required");
      return;
    }
    if (!form.type) {
      toast.error("Account type is required");
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
    };
    if (form.code.trim()) payload.code = form.code.trim();
    if (form.detailType.trim()) payload.detailType = form.detailType.trim();
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.parentId) payload.parentId = form.parentId;

    if (editingAccount) {
      updateMutation.mutate(
        { id: editingAccount.id, data: payload },
        {
          onSuccess: () => {
            toast.success(`"${form.name}" updated`);
            setDialogOpen(false);
          },
          onError: (err) =>
            toast.error(
              err instanceof Error ? err.message : "Failed to update account"
            ),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(`"${form.name}" created`);
          setDialogOpen(false);
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to create account"
          ),
      });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  /* -- render -- */
  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Chart of Accounts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your accounts used across all transactions and reports.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectSeparator />
            {Object.entries(ACCOUNT_TYPE_GROUPS).map(
              ([groupLabel, types]) => (
                <SelectGroup key={groupLabel}>
                  <SelectLabel>{groupLabel}</SelectLabel>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            )}
          </SelectContent>
        </Select>

        {/* New Account button */}
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" />
          New Account
        </Button>
      </div>

      {/* Data table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Detail Type</TableHead>
              <TableHead className="text-right w-[140px]">Balance</TableHead>
              <TableHead className="w-[90px] text-center">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Loading accounts...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {accounts.length === 0
                    ? "No accounts yet. Click \"New Account\" to get started."
                    : "No accounts match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((account, idx) => {
                const bal = Number(account.balance);
                return (
                  <TableRow
                    key={account.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-muted/30"}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {account.code ?? "--"}
                    </TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.detailType ?? "--"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono tabular-nums ${
                        bal < 0 ? "text-red-600" : ""
                      }`}
                    >
                      {formatCurrency(bal)}
                    </TableCell>
                    <TableCell className="text-center">
                      {account.isActive ? (
                        <Badge variant="secondary" className="text-[11px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(account)}
                          title="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {account.isActive && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeactivate(account)}
                            title="Deactivate"
                          >
                            <XCircle className="size-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {!isLoading && filtered.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            Showing {filtered.length} of {accounts.length} account
            {accounts.length !== 1 && "s"}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Account" : "New Account"}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? "Update the account details below."
                : "Fill in the details to create a new account."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 py-2">
            {/* Name */}
            <div className="grid gap-1.5">
              <Label htmlFor="account-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="account-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Cash on Hand"
                required
              />
            </div>

            {/* Code + Type row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="account-code">Code</Label>
                <Input
                  id="account-code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value }))
                  }
                  placeholder="e.g. 1000"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.type || undefined}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, type: val as AccountType }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_GROUPS).map(
                      ([groupLabel, types]) => (
                        <SelectGroup key={groupLabel}>
                          <SelectLabel>{groupLabel}</SelectLabel>
                          {types.map((t) => (
                            <SelectItem key={t} value={t}>
                              {ACCOUNT_TYPE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Detail Type */}
            <div className="grid gap-1.5">
              <Label htmlFor="account-detail-type">Detail Type</Label>
              <Input
                id="account-detail-type"
                value={form.detailType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, detailType: e.target.value }))
                }
                placeholder="e.g. Checking"
              />
            </div>

            {/* Description */}
            <div className="grid gap-1.5">
              <Label htmlFor="account-description">Description</Label>
              <Input
                id="account-description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional description"
              />
            </div>

            {/* Parent Account */}
            <div className="grid gap-1.5">
              <Label>Parent Account</Label>
              <Select
                value={form.parentId || undefined}
                onValueChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    parentId: val === "NONE" || val === null ? "" : val,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None (top-level)</SelectItem>
                  <SelectSeparator />
                  {accounts
                    .filter(
                      (a) =>
                        a.isActive &&
                        a.id !== editingAccount?.id
                    )
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code ? `${a.code} - ` : ""}
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Footer */}
            <DialogFooter className="-mx-4 -mb-2 mt-2">
              <DialogClose
                render={<Button variant="outline" type="button" />}
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : editingAccount
                    ? "Save Changes"
                    : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
