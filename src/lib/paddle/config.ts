import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

export const PADDLE_PRICES: Record<SubscriptionTier, string> = {
  STARTER: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER || "",
  STANDARD: process.env.NEXT_PUBLIC_PADDLE_PRICE_STANDARD || "",
  PREMIUM: process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM || "",
  ENTERPRISE: process.env.NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE || "",
};

export const PRICE_TO_TIER: Record<string, SubscriptionTier> = Object.fromEntries(
  Object.entries(PADDLE_PRICES)
    .filter(([, priceId]) => priceId)
    .map(([tier, priceId]) => [priceId, tier as SubscriptionTier])
);

export function getTierFromPriceId(priceId: string): SubscriptionTier {
  return PRICE_TO_TIER[priceId] || "STARTER";
}

export function getPaddleApiUrl(): string {
  return process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

export const TIER_DISPLAY: Record<SubscriptionTier, { name: string; price: number; description: string }> = {
  STARTER: { name: "Starter", price: 19, description: "For freelancers and sole proprietors" },
  STANDARD: { name: "Standard", price: 39, description: "For small businesses with basic AP/AR needs" },
  PREMIUM: { name: "Premium", price: 69, description: "For growing businesses with inventory and multi-currency" },
  ENTERPRISE: { name: "Enterprise", price: 149, description: "For established businesses needing full control" },
};
