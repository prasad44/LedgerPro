"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export function useAccounts(filters?: { type?: string; active?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.active) params.set("active", filters.active);
  if (filters?.search) params.set("search", filters.search);

  return useQuery({
    queryKey: ["accounts", filters],
    queryFn: () => fetchJson<unknown[]>(`/api/v1/accounts?${params}`),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ["accounts", id],
    queryFn: () => fetchJson(`/api/v1/accounts/${id}`),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetchJson("/api/v1/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fetchJson(`/api/v1/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/v1/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}
