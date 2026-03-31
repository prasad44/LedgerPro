"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useBankAccounts, useCreateBankAccount } from "@/hooks/use-banking";
import { useAccounts } from "@/hooks/use-accounts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Landmark,
  Plus,
  ArrowRightLeft,
  PiggyBank,
  ClipboardCheck,
  CreditCard,
  Building2,
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

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface BankAccount {
  id: string;
  bankName: string | null;
  accountLast4: string | null;
  balance: number | string;
  lastReconciledDate: string | null;
  account?: { id: string; code: string; name: string };
  accountId?: string;
}

/* ---------- component ---------- */

export default function BankingPage() {
  const router = useRouter();
  const createBankAccount = useCreateBankAccount();

  // ---- Bank accounts list ----
  const { data: bankAccountsRaw, isLoading } = useBankAccounts();
  const bankAccounts = (bankAccountsRaw ?? []) as BankAccount[];

  // ---- Chart of accounts (BANK type) for the add dialog ----
  const { data: accountsRaw } = useAccounts({ type: "BANK", active: "true" });
  const chartBankAccounts = (accountsRaw ?? []) as Account[];

  // ---- Dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formAccountId, setFormAccountId] = useState("");
  const [formBankName, setFormBankName] = useState("");
  const [formLast4, setFormLast4] = useState("");

  // Filter out chart accounts already linked to a bank account
  const linkedAccountIds = useMemo(() => {
    return new Set(
      bankAccounts.map((ba) => ba.accountId ?? ba.account?.id).filter(Boolean)
    );
  }, [bankAccounts]);

  const availableChartAccounts = useMemo(() => {
    return chartBankAccounts.filter((a) => !linkedAccountIds.has(a.id));
  }, [chartBankAccounts, linkedAccountIds]);

  // ---- Reset dialog form ----
  const resetForm = () => {
    setFormAccountId("");
    setFormBankName("");
    setFormLast4("");
  };

  // ---- Submit new bank account ----
  const handleSubmit = async () => {
    if (!formAccountId) {
      toast.error("Please select a chart of accounts entry.");
      return;
    }
    if (!formBankName.trim()) {
      toast.error("Please enter a bank name.");
      return;
    }
    if (!formLast4.trim() || formLast4.trim().length !== 4) {
      toast.error("Please enter the last 4 digits of the account number.");
      return;
    }

    try {
      await createBankAccount.mutateAsync({
        accountId: formAccountId,
        bankName: formBankName.trim(),
        accountLast4: formLast4.trim(),
      });
      toast.success("Bank account added successfully.");
      resetForm();
      setDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add bank account."
      );
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Banking</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage your bank accounts, deposits, transfers, and reconciliation
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700" />
            }
          >
            <Plus className="size-4" />
            Add Bank Account
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Bank Account</DialogTitle>
              <DialogDescription>
                Link a chart of accounts entry to a bank for tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Chart Account Select */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  Chart Account (BANK type) <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formAccountId}
                  onValueChange={(v) => setFormAccountId(v ?? "")}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select account...">
                      {formAccountId
                        ? (() => {
                            const acct = chartBankAccounts.find(
                              (a) => a.id === formAccountId
                            );
                            return acct
                              ? `${acct.code} - ${acct.name}`
                              : undefined;
                          })()
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableChartAccounts.map((acct) => (
                      <SelectItem key={acct.id} value={acct.id}>
                        <span className="font-mono text-xs text-gray-500">
                          {acct.code}
                        </span>
                        <span className="ml-1.5">{acct.name}</span>
                      </SelectItem>
                    ))}
                    {availableChartAccounts.length === 0 && (
                      <div className="py-4 text-center text-xs text-gray-400">
                        No available BANK accounts
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Bank Name */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  Bank Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Chase, Bank of America..."
                  value={formBankName}
                  onChange={(e) => setFormBankName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Last 4 Digits */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  Last 4 Digits <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="1234"
                  maxLength={4}
                  value={formLast4}
                  onChange={(e) =>
                    setFormLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="h-9 font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createBankAccount.isPending}
                className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
              >
                <Plus className="size-4" />
                {createBankAccount.isPending ? "Adding..." : "Add Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Actions Row */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
          onClick={() => router.push("/deposits")}
        >
          <PiggyBank className="size-4" />
          Make Deposit
        </Button>
        <Button
          variant="outline"
          className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
          onClick={() => router.push("/banking/transfer")}
        >
          <ArrowRightLeft className="size-4" />
          Transfer Funds
        </Button>
        <Button
          variant="outline"
          className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
          onClick={() => router.push("/reconciliation")}
        >
          <ClipboardCheck className="size-4" />
          Reconcile
        </Button>
      </div>

      {/* Bank Accounts Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading bank accounts...
        </div>
      ) : bankAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Landmark className="mb-3 size-10 opacity-40" />
          <p className="text-sm font-medium">No bank accounts yet</p>
          <p className="mt-1 text-xs">
            Add a bank account to start tracking your finances.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bankAccounts.map((ba) => (
            <Card
              key={ba.id}
              className="border-purple-100 transition-shadow hover:shadow-md"
            >
              <CardHeader className="border-b border-purple-50 bg-purple-50/40 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-purple-800">
                  <Building2 className="size-4 text-purple-500" />
                  {ba.bankName ?? "Bank Account"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Account number */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Account</span>
                    <span className="font-mono text-sm text-gray-700">
                      <CreditCard className="mr-1.5 inline size-3.5 text-purple-400" />
                      ****{ba.accountLast4 ?? "----"}
                    </span>
                  </div>

                  {/* Chart account */}
                  {ba.account && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Ledger</span>
                      <span className="text-xs text-gray-600">
                        {ba.account.code} - {ba.account.name}
                      </span>
                    </div>
                  )}

                  {/* Balance */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Balance</span>
                    <span className="font-mono text-base font-bold text-purple-700">
                      {fmt(ba.balance)}
                    </span>
                  </div>

                  {/* Last reconciled */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Last Reconciled</span>
                    <span className="text-xs text-gray-600">
                      {ba.lastReconciledDate
                        ? fmtDate(ba.lastReconciledDate)
                        : "Never"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
