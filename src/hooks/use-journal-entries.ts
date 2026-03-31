"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useJournalEntries(filters?: {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.status) params.set("status", filters.status);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.search) params.set("search", filters.search);

  return useQuery({
    queryKey: ["journal-entries", filters],
    queryFn: () =>
      fetchJson<PaginatedResponse<unknown>>(`/api/v1/journal-entries?${params}`),
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: ["journal-entries", id],
    queryFn: () => fetchJson(`/api/v1/journal-entries/${id}`),
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetchJson("/api/v1/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-entries"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useVoidJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/v1/journal-entries/${id}/void`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-entries"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
