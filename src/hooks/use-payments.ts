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

export function usePayments(filters?: {
  page?: number;
  limit?: number;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.customerId) params.set("customerId", filters.customerId);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);

  return useQuery({
    queryKey: ["payments", filters],
    queryFn: () => fetchJson<PaginatedResponse<unknown>>(`/api/v1/payments?${params}`),
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetchJson("/api/v1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
