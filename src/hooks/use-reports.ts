"use client";

import { useQuery } from "@tanstack/react-query";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export function useProfitLoss(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["reports", "profit-loss", startDate, endDate],
    queryFn: () => fetchJson(`/api/v1/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`),
    enabled: !!startDate && !!endDate,
  });
}

export function useBalanceSheet(asOfDate?: string) {
  return useQuery({
    queryKey: ["reports", "balance-sheet", asOfDate],
    queryFn: () => fetchJson(`/api/v1/reports/balance-sheet?asOfDate=${asOfDate}`),
    enabled: !!asOfDate,
  });
}

export function useTrialBalance(asOfDate?: string) {
  return useQuery({
    queryKey: ["reports", "trial-balance", asOfDate],
    queryFn: () => fetchJson(`/api/v1/reports/trial-balance?asOfDate=${asOfDate}`),
    enabled: !!asOfDate,
  });
}

export function useArAging(asOfDate?: string) {
  return useQuery({
    queryKey: ["reports", "ar-aging", asOfDate],
    queryFn: () => fetchJson(`/api/v1/reports/ar-aging?asOfDate=${asOfDate}`),
    enabled: !!asOfDate,
  });
}

export function useApAging(asOfDate?: string) {
  return useQuery({
    queryKey: ["reports", "ap-aging", asOfDate],
    queryFn: () => fetchJson(`/api/v1/reports/ap-aging?asOfDate=${asOfDate}`),
    enabled: !!asOfDate,
  });
}
