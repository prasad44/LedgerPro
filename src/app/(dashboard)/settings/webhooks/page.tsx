"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ALL_WEBHOOK_EVENTS } from "@/lib/webhooks/events";
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
  Webhook,
  Plus,
  Trash2,
  Copy,
  AlertTriangle,
  Check,
} from "lucide-react";

/* ---------- types ---------- */

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

interface CreateWebhookResponse {
  endpoint: WebhookEndpoint;
  secret: string;
}

/* ---------- helpers ---------- */

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

function groupEventsByEntity(events: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const event of events) {
    const entity = event.split(".")[0];
    const label = entity
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    if (!groups[label]) groups[label] = [];
    groups[label].push(event);
  }
  return groups;
}

const EVENT_GROUPS = groupEventsByEntity(ALL_WEBHOOK_EVENTS);

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/* ---------- page ---------- */

export default function WebhooksPage() {
  return (
    <FeatureGate feature="webhooks">
      <WebhooksContent />
    </FeatureGate>
  );
}

function WebhooksContent() {
  const queryClient = useQueryClient();

  /* -- data -- */
  const { data, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () =>
      fetchJson<{ endpoints: WebhookEndpoint[]; availableEvents: string[] }>(
        "/api/v1/settings/webhooks"
      ),
  });
  const endpoints = data?.endpoints ?? [];

  /* -- dialog state -- */
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpoint | null>(
    null
  );
  const [signingSecret, setSigningSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* -- form state -- */
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  /* -- mutations -- */
  const createMutation = useMutation({
    mutationFn: (payload: { url: string; events: string[] }) =>
      fetchJson<CreateWebhookResponse>("/api/v1/settings/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setSigningSecret(data.secret);
      toast.success("Webhook endpoint created");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to create endpoint"
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/v1/settings/webhooks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook endpoint deleted");
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to delete endpoint"
      ),
  });

  /* -- event toggle -- */
  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  }

  function toggleGroupAll(groupEvents: string[]) {
    const allSelected = groupEvents.every((e) =>
      selectedEvents.includes(e)
    );
    if (allSelected) {
      setSelectedEvents((prev) =>
        prev.filter((e) => !groupEvents.includes(e))
      );
    } else {
      setSelectedEvents((prev) => [
        ...new Set([...prev, ...groupEvents]),
      ]);
    }
  }

  /* -- submit -- */
  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !isValidUrl(url.trim())) {
      toast.error("Please enter a valid URL (http:// or https://)");
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error("Select at least one event");
      return;
    }
    createMutation.mutate({ url: url.trim(), events: selectedEvents });
  }

  /* -- dialog reset -- */
  function openCreateDialog() {
    setUrl("");
    setSelectedEvents([]);
    setSigningSecret(null);
    setCopied(false);
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setSigningSecret(null);
    setCopied(false);
  }

  /* -- copy secret -- */
  async function copySecret() {
    if (!signingSecret) return;
    await navigator.clipboard.writeText(signingSecret);
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
          <Webhook className="h-5 w-5" /> Webhooks
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure webhook endpoints to receive real-time event notifications.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end mb-4">
        <Button onClick={openCreateDialog}>
          <Plus className="size-4 mr-1" />
          Add Endpoint
        </Button>
      </div>

      {/* Data table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead className="w-[120px]">Created</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-32 text-center text-muted-foreground"
                >
                  Loading webhook endpoints...
                </TableCell>
              </TableRow>
            ) : endpoints.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-32 text-center text-muted-foreground"
                >
                  No webhook endpoints yet. Click &quot;Add Endpoint&quot; to
                  get started.
                </TableCell>
              </TableRow>
            ) : (
              endpoints.map((endpoint, idx) => (
                <TableRow
                  key={endpoint.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-muted/30"}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-[300px] truncate">
                    {endpoint.url}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {endpoint.events.slice(0, 3).map((event) => (
                        <Badge
                          key={event}
                          variant="secondary"
                          className="text-[11px]"
                        >
                          {event}
                        </Badge>
                      ))}
                      {endpoint.events.length > 3 && (
                        <Badge variant="outline" className="text-[11px]">
                          +{endpoint.events.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(endpoint.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleteTarget(endpoint)}
                      title="Delete"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!isLoading && endpoints.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            {endpoints.length} endpoint{endpoints.length !== 1 && "s"}
          </div>
        )}
      </div>

      {/* Create Endpoint Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => !open && closeCreateDialog()}
      >
        <DialogContent className="sm:max-w-lg">
          {signingSecret ? (
            <>
              <DialogHeader>
                <DialogTitle>Endpoint Created</DialogTitle>
                <DialogDescription>
                  Copy your signing secret now. You will not be able to see it
                  again.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
                <div className="flex items-start gap-2 text-amber-800 text-sm">
                  <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                  <span>
                    This signing secret will only be displayed once. Use it to
                    verify webhook payloads in your application.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-white px-3 py-2 font-mono text-xs border border-amber-200">
                    {signingSecret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copySecret}
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
                <DialogTitle>Add Webhook Endpoint</DialogTitle>
                <DialogDescription>
                  Register a URL to receive real-time event notifications via
                  HTTP POST.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreate} className="grid gap-4 py-2">
                {/* URL */}
                <div className="grid gap-1.5">
                  <Label htmlFor="webhook-url">
                    Endpoint URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/webhooks"
                    required
                  />
                </div>

                {/* Events */}
                <div className="grid gap-1.5">
                  <Label>
                    Events <span className="text-destructive">*</span>
                  </Label>
                  <div className="rounded-lg border p-3 max-h-64 overflow-y-auto space-y-4">
                    {Object.entries(EVENT_GROUPS).map(
                      ([group, events], groupIdx) => (
                        <div key={group}>
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                              checked={events.every((e) =>
                                selectedEvents.includes(e)
                              )}
                              onCheckedChange={() => toggleGroupAll(events)}
                            />
                            <span className="text-sm font-semibold">
                              {group}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6">
                            {events.map((event) => (
                              <label
                                key={event}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedEvents.includes(event)}
                                  onCheckedChange={() => toggleEvent(event)}
                                />
                                <span className="text-sm text-gray-700">
                                  {event}
                                </span>
                              </label>
                            ))}
                          </div>
                          {groupIdx <
                            Object.keys(EVENT_GROUPS).length - 1 && (
                            <Separator className="mt-3" />
                          )}
                        </div>
                      )
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedEvents.length} event
                    {selectedEvents.length !== 1 && "s"} selected
                  </p>
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
                      ? "Creating..."
                      : "Create Endpoint"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the endpoint for{" "}
              <span className="font-mono text-xs text-foreground">
                {deleteTarget?.url}
              </span>
              ? Events will no longer be delivered to this URL. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Endpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
