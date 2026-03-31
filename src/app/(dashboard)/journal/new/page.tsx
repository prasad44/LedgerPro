"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateJournalEntry } from "@/hooks/use-journal-entries";
import { ACCOUNT_TYPE_LABELS } from "@/lib/accounting/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, X, ArrowLeft, Save } from "lucide-react";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(n));

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface LineItem {
  key: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

function emptyLine(): LineItem {
  return {
    key: crypto.randomUUID(),
    accountId: "",
    description: "",
    debit: "",
    credit: "",
  };
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const createMutation = useCreateJournalEntry();

  // Header fields
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [memo, setMemo] = useState("");
  const [reference, setReference] = useState("");

  // Line items -- start with two empty lines
  const [lines, setLines] = useState<LineItem[]>([
    emptyLine(),
    emptyLine(),
  ]);

  // Accounts data
  const { data: accountsRaw } = useAccounts({ active: "true" });
  const accounts = (accountsRaw ?? []) as Account[];

  // Group accounts by type for the select dropdown
  const accountGroups = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    for (const acct of accounts) {
      const label =
        ACCOUNT_TYPE_LABELS[acct.type as keyof typeof ACCOUNT_TYPE_LABELS] ??
        acct.type;
      if (!groups[label]) groups[label] = [];
      groups[label].push(acct);
    }
    // Sort groups alphabetically
    const sorted = Object.entries(groups).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return sorted;
  }, [accounts]);

  // Account search filter
  const [accountSearch, setAccountSearch] = useState("");

  const filteredAccountGroups = useMemo(() => {
    if (!accountSearch.trim()) return accountGroups;
    const q = accountSearch.toLowerCase();
    return accountGroups
      .map(([label, accts]) => [
        label,
        accts.filter(
          (a) =>
            a.code.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q)
        ),
      ] as [string, Account[]])
      .filter(([, accts]) => accts.length > 0);
  }, [accountGroups, accountSearch]);

  // Calculations
  const totalDebits = lines.reduce(
    (sum, l) => sum + (parseFloat(l.debit) || 0),
    0
  );
  const totalCredits = lines.reduce(
    (sum, l) => sum + (parseFloat(l.credit) || 0),
    0
  );
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.005;

  // Line item handlers
  const updateLine = (
    key: string,
    field: keyof LineItem,
    value: string
  ) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        // If entering a debit, clear credit and vice versa
        if (field === "debit" && value) {
          return { ...l, debit: value, credit: "" };
        }
        if (field === "credit" && value) {
          return { ...l, credit: value, debit: "" };
        }
        return { ...l, [field]: value };
      })
    );
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
  };

  const removeLine = (key: string) => {
    setLines((prev) => {
      if (prev.length <= 2) return prev; // keep minimum 2 lines
      return prev.filter((l) => l.key !== key);
    });
  };

  // Validation
  const [errors, setErrors] = useState<string[]>([]);

  const validate = (): boolean => {
    const errs: string[] = [];

    if (!date) errs.push("Date is required.");

    const filledLines = lines.filter(
      (l) =>
        l.accountId ||
        parseFloat(l.debit) > 0 ||
        parseFloat(l.credit) > 0
    );

    if (filledLines.length < 2) {
      errs.push("At least 2 line items are required.");
    }

    for (let i = 0; i < filledLines.length; i++) {
      const l = filledLines[i];
      if (!l.accountId) {
        errs.push(`Line ${i + 1}: Account is required.`);
      }
      const d = parseFloat(l.debit) || 0;
      const c = parseFloat(l.credit) || 0;
      if (d > 0 && c > 0) {
        errs.push(
          `Line ${i + 1}: A line cannot have both debit and credit.`
        );
      }
      if (d === 0 && c === 0) {
        errs.push(
          `Line ${i + 1}: Either debit or credit must be entered.`
        );
      }
    }

    if (!isBalanced) {
      errs.push(
        `Total debits (${fmt(totalDebits)}) must equal total credits (${fmt(totalCredits)}).`
      );
    }

    setErrors(errs);
    return errs.length === 0;
  };

  // Submit
  const handleSubmit = async () => {
    if (!validate()) return;

    const filledLines = lines.filter(
      (l) =>
        l.accountId &&
        (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0)
    );

    try {
      await createMutation.mutateAsync({
        date: new Date(date + "T00:00:00").toISOString(),
        memo: memo || undefined,
        reference: reference || undefined,
        lines: filledLines.map((l) => ({
          accountId: l.accountId,
          description: l.description || undefined,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
      });
      toast.success("Journal entry posted successfully.");
      router.push("/journal");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to create journal entry."
      );
    }
  };

  const getAccountDisplay = (accountId: string) => {
    const acct = accounts.find((a) => a.id === accountId);
    return acct ? `${acct.code} - ${acct.name}` : "";
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/journal")}
          title="Back to Journal Entries"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            New Journal Entry
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Create a general journal entry
          </p>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="mb-1 text-sm font-medium text-red-700">
            Please fix the following errors:
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-red-600">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Header Fields */}
      <Card className="mb-4">
        <CardHeader className="border-b">
          <CardTitle className="text-sm text-gray-700">
            Entry Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 font-mono text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Memo
              </label>
              <Input
                placeholder="Entry description..."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Reference
              </label>
              <Input
                placeholder="Ref #, check #, etc."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm text-gray-700">
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-50/60">
                  <TableHead className="w-10 text-center text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    #
                  </TableHead>
                  <TableHead className="min-w-[260px] text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    Account
                  </TableHead>
                  <TableHead className="min-w-[180px] text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    Description
                  </TableHead>
                  <TableHead className="w-36 text-right text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    Debit
                  </TableHead>
                  <TableHead className="w-36 text-right text-xs font-semibold uppercase tracking-wide text-blue-900/70">
                    Credit
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow
                    key={line.key}
                    className="hover:bg-blue-50/30"
                  >
                    <TableCell className="text-center font-mono text-xs text-gray-400">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={line.accountId}
                        onValueChange={(val) =>
                          updateLine(line.key, "accountId", val as string)
                        }
                      >
                        <SelectTrigger className="h-8 w-full text-sm">
                          <SelectValue placeholder="Select account...">
                            {line.accountId
                              ? getAccountDisplay(line.accountId)
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          className="max-h-72"
                        >
                          {/* Search input inside dropdown */}
                          <div className="sticky top-0 border-b bg-popover p-1.5">
                            <Input
                              placeholder="Search accounts..."
                              value={accountSearch}
                              onChange={(e) =>
                                setAccountSearch(e.target.value)
                              }
                              onKeyDown={(e) => e.stopPropagation()}
                              className="h-7 text-xs"
                            />
                          </div>
                          {filteredAccountGroups.map(
                            ([label, accts]) => (
                              <SelectGroup key={label}>
                                <SelectLabel>{label}</SelectLabel>
                                {accts.map((acct) => (
                                  <SelectItem
                                    key={acct.id}
                                    value={acct.id}
                                  >
                                    <span className="font-mono text-xs text-gray-500">
                                      {acct.code}
                                    </span>
                                    <span className="ml-1.5">
                                      {acct.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )
                          )}
                          {filteredAccountGroups.length === 0 && (
                            <div className="py-4 text-center text-xs text-gray-400">
                              No accounts found
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Line description..."
                        value={line.description}
                        onChange={(e) =>
                          updateLine(
                            line.key,
                            "description",
                            e.target.value
                          )
                        }
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.debit}
                        onChange={(e) =>
                          updateLine(line.key, "debit", e.target.value)
                        }
                        className="h-8 text-right font-mono text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.credit}
                        onChange={(e) =>
                          updateLine(
                            line.key,
                            "credit",
                            e.target.value
                          )
                        }
                        className="h-8 text-right font-mono text-sm"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length <= 2}
                        title="Remove line"
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addLine}
                      className="gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="size-3.5" />
                      Add Line
                    </Button>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-gray-800">
                    {fmt(totalDebits)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-gray-800">
                    {fmt(totalCredits)}
                  </TableCell>
                  <TableCell />
                </TableRow>
                {!isBalanced && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-right text-xs font-medium text-red-600"
                    >
                      Difference (out of balance):
                    </TableCell>
                    <TableCell
                      colSpan={2}
                      className="text-right font-mono text-sm font-bold text-red-600"
                    >
                      {fmt(difference)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/journal")}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
        >
          <Save className="size-4" />
          {createMutation.isPending ? "Posting..." : "Post Entry"}
        </Button>
      </div>
    </div>
  );
}
