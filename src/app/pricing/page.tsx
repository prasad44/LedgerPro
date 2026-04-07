"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePaddle } from "@/components/paddle-provider";
import { TIER_DISPLAY, PADDLE_PRICES } from "@/lib/paddle/config";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, BookOpen, ArrowRight } from "lucide-react";

const TIER_ORDER: SubscriptionTier[] = ["STARTER", "STANDARD", "PREMIUM", "ENTERPRISE"];

const FEATURE_LIST: { key: keyof typeof TIER_LIMITS.STARTER.features; label: string }[] = [
  { key: "basicInvoicing", label: "Invoicing" },
  { key: "estimatesAndCreditMemos", label: "Estimates & Credit Memos" },
  { key: "billsAndBillPayments", label: "Bills & Accounts Payable" },
  { key: "bankReconciliation", label: "Bank Reconciliation" },
  { key: "purchaseOrders", label: "Purchase Orders" },
  { key: "inventoryTracking", label: "Inventory Tracking" },
  { key: "multiCurrency", label: "Multi-Currency" },
  { key: "classLocationTracking", label: "Class & Location Tracking" },
  { key: "budgetsAndForecasts", label: "Budgets & Forecasts" },
  { key: "advancedReporting", label: "Advanced Reporting" },
  { key: "customUserRoles", label: "Custom User Roles" },
  { key: "apiAccess", label: "API Access" },
  { key: "webhooks", label: "Webhooks" },
  { key: "aiFeatures", label: "AI-Powered Features" },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const { openCheckout, isLoaded } = usePaddle();
  const currentTier = (session?.user?.subscriptionTier || null) as SubscriptionTier | null;

  const handleChoosePlan = (tier: SubscriptionTier) => {
    if (!session) {
      window.location.href = "/register";
      return;
    }
    const priceId = PADDLE_PRICES[tier];
    if (!priceId || !session.user?.email) return;
    openCheckout(priceId, session.user.email, {
      organizationId: session.user.organizationId,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0054A6] via-[#003366] to-gray-900">
      {/* Header */}
      <div className="text-center pt-16 pb-12 px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8">
          <BookOpen className="h-6 w-6" />
          <span className="font-bold text-lg">LedgerPro</span>
        </Link>
        <h1 className="text-4xl font-bold text-white mt-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-blue-200 mt-3 max-w-xl mx-auto">
          Professional accounting software for businesses of every size.
          Start with a 14-day free trial.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIER_ORDER.map((tier) => {
            const info = TIER_DISPLAY[tier];
            const limits = TIER_LIMITS[tier];
            const isCurrent = tier === currentTier;
            const isPopular = tier === "STANDARD";

            return (
              <Card
                key={tier}
                className={`relative overflow-hidden ${
                  isPopular
                    ? "border-2 border-blue-400 shadow-lg shadow-blue-500/20"
                    : "border-gray-200"
                }`}
              >
                {isPopular && (
                  <div className="bg-blue-500 text-white text-center text-xs font-semibold py-1">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="bg-green-500 text-white text-center text-xs font-semibold py-1">
                    Current Plan
                  </div>
                )}
                <CardContent className="pt-6 pb-6 px-5">
                  <h3 className="font-bold text-lg">{info.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                  <div className="mt-4 mb-6">
                    <span className="text-4xl font-bold">${info.price}</span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>

                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>
                        <strong>{limits.maxUsers}</strong> user{limits.maxUsers > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>
                        <strong>
                          {limits.maxTransactionsPerMonth === -1
                            ? "Unlimited"
                            : limits.maxTransactionsPerMonth.toLocaleString()}
                        </strong>{" "}
                        transactions/mo
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>
                        <strong>{limits.maxReports === -1 ? "200+" : limits.maxReports}</strong> reports
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-1.5 mb-6">
                    {FEATURE_LIST.map(({ key, label }) => {
                      const has = limits.features[key] !== false;
                      return (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          {has ? (
                            <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                          )}
                          <span className={has ? "text-gray-700" : "text-gray-400"}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className={`w-full gap-1 ${isPopular ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                      onClick={() => handleChoosePlan(tier)}
                      disabled={session ? !isLoaded : false}
                    >
                      {session ? "Upgrade" : "Start Free Trial"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ-style footer */}
        <div className="text-center mt-12 text-blue-200 text-sm">
          <p>All plans include a 14-day free trial. No credit card required.</p>
          <p className="mt-1">
            Questions?{" "}
            <Link href="/settings" className="underline hover:text-white">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
