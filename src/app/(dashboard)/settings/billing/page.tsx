"use client";

import { useSession } from "next-auth/react";
import { usePaddle } from "@/components/paddle-provider";
import { TIER_DISPLAY, PADDLE_PRICES } from "@/lib/paddle/config";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, ArrowUpRight, CreditCard, Calendar, Shield } from "lucide-react";

const fmt = (n: number) => `$${n}/mo`;

const TIER_ORDER: SubscriptionTier[] = ["STARTER", "STANDARD", "PREMIUM", "ENTERPRISE"];

export default function BillingPage() {
  const { data: session } = useSession();
  const { openCheckout, isLoaded } = usePaddle();
  const currentTier = (session?.user?.subscriptionTier || "STARTER") as SubscriptionTier;
  const currentIdx = TIER_ORDER.indexOf(currentTier);

  const handleUpgrade = (tier: SubscriptionTier) => {
    const priceId = PADDLE_PRICES[tier];
    if (!priceId || !session?.user?.email) return;
    openCheckout(priceId, session.user.email, {
      organizationId: session.user.organizationId,
    });
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Billing & Subscription</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your plan, view usage, and update billing.</p>

      {/* Current Plan */}
      <Card className="mb-6 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" /> Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {TIER_DISPLAY[currentTier].name}
            </p>
            <p className="text-sm text-gray-500">{TIER_DISPLAY[currentTier].description}</p>
            <p className="text-lg font-semibold mt-1">{fmt(TIER_DISPLAY[currentTier].price)}</p>
          </div>
          <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1">Active</Badge>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Usage This Month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <UsageBar
            label="Transactions"
            current={0}
            max={TIER_LIMITS[currentTier].maxTransactionsPerMonth}
          />
          <UsageBar
            label="Users"
            current={1}
            max={TIER_LIMITS[currentTier].maxUsers}
          />
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Plan Comparison */}
      <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIER_ORDER.map((tier, idx) => {
          const info = TIER_DISPLAY[tier];
          const limits = TIER_LIMITS[tier];
          const isCurrent = tier === currentTier;
          const isUpgrade = idx > currentIdx;

          return (
            <Card
              key={tier}
              className={`relative ${isCurrent ? "border-blue-500 border-2" : ""}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-xs">Current</Badge>
                </div>
              )}
              <CardContent className="pt-6 pb-4 px-4">
                <h3 className="font-bold text-base">{info.name}</h3>
                <p className="text-2xl font-bold mt-1">
                  ${info.price}<span className="text-sm font-normal text-gray-500">/mo</span>
                </p>
                <p className="text-xs text-gray-500 mt-1 mb-4">{info.description}</p>

                <ul className="space-y-1.5 text-xs mb-4">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-green-500" />
                    {limits.maxUsers} user{limits.maxUsers > 1 ? "s" : ""}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-green-500" />
                    {limits.maxTransactionsPerMonth === -1 ? "Unlimited" : limits.maxTransactionsPerMonth.toLocaleString()} txns/mo
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-green-500" />
                    {limits.maxReports === -1 ? "200+" : limits.maxReports} reports
                  </li>
                  {limits.features.billsAndBillPayments && (
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-green-500" />Bills & AP
                    </li>
                  )}
                  {limits.features.inventoryTracking && (
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-green-500" />Inventory
                    </li>
                  )}
                  {limits.features.apiAccess && (
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-green-500" />API & Webhooks
                    </li>
                  )}
                  {limits.features.aiFeatures && (
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-green-500" />AI Features
                    </li>
                  )}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    size="sm"
                    className="w-full gap-1"
                    onClick={() => handleUpgrade(tier)}
                    disabled={!isLoaded}
                  >
                    Upgrade <ArrowUpRight className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Downgrade
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min(100, (current / max) * 100);
  const isNearLimit = !unlimited && pct >= 80;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className={`font-mono text-xs ${isNearLimit ? "text-red-600 font-semibold" : "text-gray-500"}`}>
          {current.toLocaleString()} / {unlimited ? "Unlimited" : max.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isNearLimit ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: unlimited ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}
