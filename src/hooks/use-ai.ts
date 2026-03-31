"use client";

import { useMutation } from "@tanstack/react-query";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export function useCategorizeTransaction() {
  return useMutation({
    mutationFn: (transactions: Array<{ description: string; amount: number; date?: string; vendor?: string }>) =>
      fetchJson("/api/v1/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions }),
      }),
  });
}

export function useAIInsights() {
  return useMutation({
    mutationFn: (data: { reportType: string; reportData: Record<string, unknown> }) =>
      fetchJson<{ insights: string }>("/api/v1/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useAskAI() {
  return useMutation({
    mutationFn: (question: string) =>
      fetchJson<{ answer: string }>("/api/v1/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      }),
  });
}
