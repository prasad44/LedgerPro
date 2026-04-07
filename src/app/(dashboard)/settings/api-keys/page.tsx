"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AVAILABLE_SCOPES } from "@/lib/api/api-key-scopes";
import { FeatureGate } from "@/components/feature-gate";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  AlertTriangle,
  Check,
} from "lucide-react";

/* ---------- types ---------- */

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface CreateApiKeyResponse {
  key: string;
  apiKey: ApiKey;
}

/* ---------- helpers ---------- */

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

const SCOPE_GROUPS = groupScopes(AVAILABLE_SCOPES as unknown as string[]);

function groupScopes(scopes: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = { read: [], write: [] };
  for (const scope of scopes) {
    const [action] = scope.split(":");
    if (action === "read") groups.read.push(scope);
    else if (action === "write") groups.write.push(scope);
  }
  return groups;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatScopeLabel(scope: string): string {
  const [, resource] = scope.split(":");
  return resource
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---------- page ---------- */

export default function ApiKeysPage() {
  return (
    <FeatureGate feature="apiAccess">
      <ApiKeysContent />
    </FeatureGate>
  );
}

function ApiKeysContent() {
  const queryClient = useQueryClient();

  /* -- data -- */
  const { data, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () =>
      fetchJson<{ apiKeys: ApiKey[] }>("/api/v1/settings/api-keys"),
  });
  const apiKeys = data?.apiKeys ?? [];

  /* -- dialog state -- */
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* -- form state -- */
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");

  /* -- mutations -- */
  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      scopes: string[];
      expiresAt?: string;
    }) =>
      fetchJson<CreateApiKeyResponse>("/api/v1/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setGeneratedKey(data.key);
      toast.success("API key created successfully");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to create key"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/v1/settings/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked");
      setRevokeTarget(null);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to revoke key"),
  });

  /* -- scope toggle -- */
  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  function toggleGroupAll(group: string, scopes: string[]) {
    const allSelected = scopes.every((s) => selectedScopes.includes(s));
    if (allSelected) {
      setSelectedScopes((prev) => prev.filter((s) => !scopes.includes(s)));
    } else {
      setSelectedScopes((prev) => [...new Set([...prev, ...scopes])]);
    }
  }

  /* -- submit -- */
  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Key name is required");
      return;
    }
    if (selectedScopes.length === 0) {
      toast.error("Select at least one scope");
      return;
    }
    const payload: { name: string; scopes: string[]; expiresAt?: string } = {
      name: name.trim(),
      scopes: selectedScopes,
    };
    if (expiresAt) payload.expiresAt = expiresAt;
    createMutation.mutate(payload);
  }

  /* -- dialog reset -- */
  function openCreateDialog() {
    setName("");
    setSelectedScopes([]);
    setExpiresAt("");
    setGeneratedKey(null);
    setCopied(false);
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setGeneratedKey(null);
    setCopied(false);
  }

  /* -- copy key -- */
  async function copyKey() {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  /* -- render -- */
  return (
    <div className="p-6 max-w-5xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Key className="h-5 w-5" /> API Keys
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Create and manage API keys for programmatic access to your account.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end mb-4">
        <Button onClick={openCreateDialog}>
          <Plus className="size-4 mr-1" />
          Generate New Key
        </Button>
      </div>

      {/* Data table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead>Name</TableHead>
              <TableHead className="w-[160px]">Prefix</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead className="w-[120px]">Last Used</TableHead>
              <TableHead className="w-[120px]">Created</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  Loading API keys...
                </TableCell>
              </TableRow>
            ) : apiKeys.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  No API keys yet. Click &quot;Generate New Key&quot; to get
                  started.
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((key, idx) => (
                <TableRow
                  key={key.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-muted/30"}
                >
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {key.prefix}...
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.slice(0, 3).map((scope) => (
                        <Badge
                          key={scope}
                          variant="secondary"
                          className="text-[11px]"
                        >
                          {scope}
                        </Badge>
                      ))}
                      {key.scopes.length > 3 && (
                        <Badge variant="outline" className="text-[11px]">
                          +{key.scopes.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(key.lastUsedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(key.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setRevokeTarget(key)}
                      title="Revoke"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!isLoading && apiKeys.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            {apiKeys.length} API key{apiKeys.length !== 1 && "s"}
          </div>
        )}
      </div>

      {/* Create Key Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="sm:max-w-lg">
          {generatedKey ? (
            <>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>
                  Copy your API key now. You will not be able to see it again.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
                <div className="flex items-start gap-2 text-amber-800 text-sm">
                  <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                  <span>
                    This key will only be displayed once. Store it in a secure
                    location.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-white px-3 py-2 font-mono text-xs border border-amber-200">
                    {generatedKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyKey}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={closeCreateDialog}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Generate New API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key with specific permissions for your
                  integrations.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreate} className="grid gap-4 py-2">
                {/* Name */}
                <div className="grid gap-1.5">
                  <Label htmlFor="key-name">
                    Key Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="key-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Production Integration"
                    required
                  />
                </div>

                {/* Scopes */}
                <div className="grid gap-1.5">
                  <Label>
                    Scopes <span className="text-destructive">*</span>
                  </Label>
                  <div className="rounded-lg border p-3 max-h-60 overflow-y-auto space-y-4">
                    {Object.entries(SCOPE_GROUPS).map(
                      ([group, scopes]) => (
                        <div key={group}>
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                              checked={scopes.every((s) =>
                                selectedScopes.includes(s)
                              )}
                              onCheckedChange={() =>
                                toggleGroupAll(group, scopes)
                              }
                            />
                            <span className="text-sm font-semibold capitalize">
                              {group} Permissions
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6">
                            {scopes.map((scope) => (
                              <label
                                key={scope}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedScopes.includes(scope)}
                                  onCheckedChange={() => toggleScope(scope)}
                                />
                                <span className="text-sm text-gray-700">
                                  {formatScopeLabel(scope)}
                                </span>
                              </label>
                            ))}
                          </div>
                          {group === "read" && (
                            <Separator className="mt-3" />
                          )}
                        </div>
                      )
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedScopes.length} scope
                    {selectedScopes.length !== 1 && "s"} selected
                  </p>
                </div>

                {/* Expiry Date */}
                <div className="grid gap-1.5">
                  <Label htmlFor="key-expires">
                    Expiry Date{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="key-expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                {/* Footer */}
                <DialogFooter className="-mx-4 -mb-2 mt-2">
                  <DialogClose
                    render={<Button variant="outline" type="button" />}
                  >
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending
                      ? "Generating..."
                      : "Generate Key"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke{" "}
              <span className="font-semibold text-foreground">
                {revokeTarget?.name}
              </span>
              ? Any integrations using this key will immediately lose access.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? "Revoking..." : "Revoke Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
