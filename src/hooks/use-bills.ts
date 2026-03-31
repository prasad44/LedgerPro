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

export function useBills(filters?: {
  page?: number; limit?: number; status?: string; vendorId?: string; search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.status) params.set("status", filters.status);
  if (filters?.vendorId) params.set("vendorId", filters.vendorId);
  if (filters?.search) params.set("search", filters.search);

  return useQuery({
    queryKey: ["bills", filters],
    queryFn: () => fetchJson<PaginatedResponse<unknown>>(`/api/v1/bills?${params}`),
  });
}

export function useBill(id: string) {
  return useQuery({
    queryKey: ["bills", id],
    queryFn: () => fetchJson(`/api/v1/bills/${id}`),
    enabled: !!id,
  });
}

export function useCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetchJson("/api/v1/bills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bills"] }); qc.invalidateQueries({ queryKey: ["vendors"] }); },
  });
}

export function usePostBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/v1/bills/${id}/post`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bills"] }); qc.invalidateQueries({ queryKey: ["accounts"] }); qc.invalidateQueries({ queryKey: ["vendors"] }); },
  });
}

export function usePayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, data }: { billId: string; data: Record<string, unknown> }) =>
      fetchJson(`/api/v1/bills/${billId}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bills"] }); qc.invalidateQueries({ queryKey: ["accounts"] }); qc.invalidateQueries({ queryKey: ["vendors"] }); },
  });
}

export function useVoidBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/v1/bills/${id}/void`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bills"] }); qc.invalidateQueries({ queryKey: ["accounts"] }); qc.invalidateQueries({ queryKey: ["vendors"] }); },
  });
}
