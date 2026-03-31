"use client";

import { useSession } from "next-auth/react";
import { checkFeature } from "@/lib/subscriptions/gate";
import type { SubscriptionTier, TierLimits } from "@/lib/subscriptions/tiers";
import { TIER_DISPLAY } from "@/lib/paddle/config";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface FeatureGateProps {
  feature: keyof TierLimits["features"];
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { data: session } = useSession();
  const tier = (session?.user?.subscriptionTier || "STARTER") as SubscriptionTier;

  const result = checkFeature(tier, feature);

  if (result.allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredTier = !result.allowed ? result.requiredTier : "STANDARD";
  const tierInfo = TIER_DISPLAY[requiredTier];

  return (
    <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-gray-200 p-3 rounded-full mb-4">
          <Lock className="h-6 w-6 text-gray-500" />
        </div>
        <h3 className="font-semibold text-gray-700 mb-1">
          {tierInfo.name} Plan Required
        </h3>
        <p className="text-sm text-gray-500 mb-4 max-w-sm">
          {result.allowed ? "" : result.reason}
        </p>
        <Link href="/settings/billing">
          <Button size="sm" className="gap-1">
            Upgrade to {tierInfo.name}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/** Hide navigation items that the current tier can't access */
export function useCanAccessFeature(feature: keyof TierLimits["features"]): boolean {
  const { data: session } = useSession();
  const tier = (session?.user?.subscriptionTier || "STARTER") as SubscriptionTier;
  const result = checkFeature(tier, feature);
  return result.allowed;
}
