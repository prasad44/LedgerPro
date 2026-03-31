import { TIER_LIMITS, type SubscriptionTier, type TierLimits } from "./tiers";

export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: string; requiredTier: SubscriptionTier };

const TIER_ORDER: SubscriptionTier[] = [
  "STARTER",
  "STANDARD",
  "PREMIUM",
  "ENTERPRISE",
];

function findMinimumTier(
  check: (limits: TierLimits) => boolean
): SubscriptionTier {
  return (
    TIER_ORDER.find((t) => check(TIER_LIMITS[t])) || "ENTERPRISE"
  );
}

export function checkFeature(
  tier: SubscriptionTier,
  feature: keyof TierLimits["features"]
): GateResult {
  const limits = TIER_LIMITS[tier];
  const value = limits.features[feature];

  if (value === false) {
    const requiredTier = findMinimumTier(
      (l) => l.features[feature] !== false
    );
    return {
      allowed: false,
      reason: `This feature requires the ${requiredTier} plan or higher.`,
      requiredTier,
    };
  }

  return { allowed: true };
}

export function checkTransactionLimit(
  tier: SubscriptionTier,
  currentCount: number
): GateResult {
  const limits = TIER_LIMITS[tier];
  if (limits.maxTransactionsPerMonth === -1) return { allowed: true };

  if (currentCount >= limits.maxTransactionsPerMonth) {
    const currentIdx = TIER_ORDER.indexOf(tier);
    const requiredTier = TIER_ORDER[currentIdx + 1] || "ENTERPRISE";
    return {
      allowed: false,
      reason: `You've reached the ${limits.maxTransactionsPerMonth} transaction limit for your ${tier} plan. Upgrade to continue.`,
      requiredTier,
    };
  }

  return { allowed: true };
}

export function checkUserLimit(
  tier: SubscriptionTier,
  currentUserCount: number
): GateResult {
  const limits = TIER_LIMITS[tier];
  if (currentUserCount >= limits.maxUsers) {
    const currentIdx = TIER_ORDER.indexOf(tier);
    const requiredTier = TIER_ORDER[currentIdx + 1] || "ENTERPRISE";
    return {
      allowed: false,
      reason: `Your ${tier} plan supports up to ${limits.maxUsers} users. Upgrade to add more.`,
      requiredTier,
    };
  }

  return { allowed: true };
}
