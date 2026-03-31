export type SubscriptionTier = "STARTER" | "STANDARD" | "PREMIUM" | "ENTERPRISE";

export interface TierLimits {
  maxUsers: number;
  maxTransactionsPerMonth: number; // -1 = unlimited
  maxReports: number; // -1 = unlimited
  features: {
    basicInvoicing: boolean;
    estimatesAndCreditMemos: boolean;
    expenseTracking: "basic" | "full";
    billsAndBillPayments: boolean;
    customerVendorCenters: boolean;
    bankReconciliation: boolean;
    purchaseOrders: boolean;
    inventoryTracking: boolean;
    multiCurrency: boolean;
    classLocationTracking: boolean;
    budgetsAndForecasts: boolean;
    advancedInventory: boolean;
    advancedReporting: boolean;
    customUserRoles: boolean;
    apiAccess: boolean;
    webhooks: boolean;
    aiFeatures: boolean;
  };
  support: "email" | "email_chat" | "priority" | "dedicated";
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  STARTER: {
    maxUsers: 1,
    maxTransactionsPerMonth: 500,
    maxReports: 5,
    features: {
      basicInvoicing: true,
      estimatesAndCreditMemos: false,
      expenseTracking: "basic",
      billsAndBillPayments: false,
      customerVendorCenters: false,
      bankReconciliation: false,
      purchaseOrders: false,
      inventoryTracking: false,
      multiCurrency: false,
      classLocationTracking: false,
      budgetsAndForecasts: false,
      advancedInventory: false,
      advancedReporting: false,
      customUserRoles: false,
      apiAccess: false,
      webhooks: false,
      aiFeatures: false,
    },
    support: "email",
  },
  STANDARD: {
    maxUsers: 3,
    maxTransactionsPerMonth: 5000,
    maxReports: 20,
    features: {
      basicInvoicing: true,
      estimatesAndCreditMemos: true,
      expenseTracking: "full",
      billsAndBillPayments: true,
      customerVendorCenters: true,
      bankReconciliation: true,
      purchaseOrders: false,
      inventoryTracking: false,
      multiCurrency: false,
      classLocationTracking: false,
      budgetsAndForecasts: false,
      advancedInventory: false,
      advancedReporting: false,
      customUserRoles: false,
      apiAccess: false,
      webhooks: false,
      aiFeatures: false,
    },
    support: "email_chat",
  },
  PREMIUM: {
    maxUsers: 5,
    maxTransactionsPerMonth: 25000,
    maxReports: 50,
    features: {
      basicInvoicing: true,
      estimatesAndCreditMemos: true,
      expenseTracking: "full",
      billsAndBillPayments: true,
      customerVendorCenters: true,
      bankReconciliation: true,
      purchaseOrders: true,
      inventoryTracking: true,
      multiCurrency: true,
      classLocationTracking: true,
      budgetsAndForecasts: true,
      advancedInventory: false,
      advancedReporting: false,
      customUserRoles: false,
      apiAccess: false,
      webhooks: false,
      aiFeatures: false,
    },
    support: "priority",
  },
  ENTERPRISE: {
    maxUsers: 25,
    maxTransactionsPerMonth: -1,
    maxReports: -1,
    features: {
      basicInvoicing: true,
      estimatesAndCreditMemos: true,
      expenseTracking: "full",
      billsAndBillPayments: true,
      customerVendorCenters: true,
      bankReconciliation: true,
      purchaseOrders: true,
      inventoryTracking: true,
      multiCurrency: true,
      classLocationTracking: true,
      budgetsAndForecasts: true,
      advancedInventory: true,
      advancedReporting: true,
      customUserRoles: true,
      apiAccess: true,
      webhooks: true,
      aiFeatures: true,
    },
    support: "dedicated",
  },
};

export const PADDLE_PRICES = {
  STARTER: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER!,
  STANDARD: process.env.NEXT_PUBLIC_PADDLE_PRICE_STANDARD!,
  PREMIUM: process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM!,
  ENTERPRISE: process.env.NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE!,
} as const;

export function getTierFromPriceId(priceId: string): SubscriptionTier {
  for (const [tier, id] of Object.entries(PADDLE_PRICES)) {
    if (id === priceId) return tier as SubscriptionTier;
  }
  return "STARTER";
}
