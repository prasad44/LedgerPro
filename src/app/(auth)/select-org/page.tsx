"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Building2,
  ChevronRight,
  Check,
  Loader2,
  Crown,
  Lock,
} from "lucide-react";

interface OrgEntry {
  organizationId: string;
  role: string | null;
  isMember: boolean;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    subscriptionTier: string;
    subscriptionStatus: string;
  };
}

const roleLabelMap: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  ACCOUNTANT: "Accountant",
  ACCOUNTS_PAYABLE: "Accounts Payable",
  ACCOUNTS_RECEIVABLE: "Accounts Receivable",
  BANKING: "Banking",
  SALES: "Sales",
  PURCHASING: "Purchasing",
  VIEWER: "Viewer",
  MEMBER: "Member",
};

const tierLabelMap: Record<string, string> = {
  STARTER: "Starter",
  STANDARD: "Standard",
  PREMIUM: "Premium",
  ENTERPRISE: "Enterprise",
};

const tierColorMap: Record<string, string> = {
  STARTER: "bg-gray-100 text-gray-700",
  STANDARD: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-amber-100 text-amber-700",
};

export default function SelectOrgPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<OrgEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const res = await fetch("/api/v1/memberships");
        if (!res.ok) {
          setError("Failed to load organizations. Please try again.");
          setLoading(false);
          return;
        }
        const json = await res.json();
        const data: OrgEntry[] = json.data ?? [];

        if (data.length === 0) {
          setError("No organizations found.");
          setLoading(false);
          return;
        }

        // Sort: user's orgs first, then others alphabetically
        data.sort((a, b) => {
          if (a.isMember && !b.isMember) return -1;
          if (!a.isMember && b.isMember) return 1;
          return a.organization.name.localeCompare(b.organization.name);
        });

        setEntries(data);
        setLoading(false);
      } catch {
        setError("Failed to load organizations. Please try again.");
        setLoading(false);
      }
    }

    fetchOrganizations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSelectOrg(organizationId: string) {
    setSwitchingOrgId(organizationId);
    try {
      await update({ organizationId });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Failed to switch organization. Please try again.");
      setSwitchingOrgId(null);
    }
  }

  if (loading || (entries.length === 0 && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0054A6] to-[#003366] p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
          <p className="text-sm text-blue-200">Loading organizations...</p>
        </div>
      </div>
    );
  }

  const myOrgs = entries.filter((e) => e.isMember);
  const otherOrgs = entries.filter((e) => !e.isMember);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0054A6] to-[#003366] p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="bg-blue-600 p-3 rounded-xl">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl">Select Organization</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Choose which company to work in
          </p>
        </CardHeader>

        <CardContent className="space-y-2">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
              {error}
            </p>
          )}

          {/* User's organizations */}
          {myOrgs.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1 pt-1">
                Your Companies
              </p>
              {myOrgs.map((entry) => {
                const isActive =
                  session?.user?.organizationId === entry.organizationId;
                const isSwitching = switchingOrgId === entry.organizationId;
                const tier = entry.organization.subscriptionTier;

                return (
                  <button
                    key={entry.organizationId}
                    type="button"
                    onClick={() => handleSelectOrg(entry.organizationId)}
                    disabled={switchingOrgId !== null}
                    className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      isActive
                        ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                        : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                    } ${
                      switchingOrgId !== null && !isSwitching
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {entry.organization.name}
                        </span>
                        {tier === "ENTERPRISE" && (
                          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 h-4"
                        >
                          {roleLabelMap[entry.role ?? ""] ?? entry.role}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 h-4 border-0 ${tierColorMap[tier] ?? ""}`}
                        >
                          {tierLabelMap[tier] ?? tier}
                        </Badge>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isSwitching ? (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      ) : isActive ? (
                        <Check className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Other organizations */}
          {otherOrgs.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1 pt-3">
                Other Companies
              </p>
              {otherOrgs.map((entry) => {
                const tier = entry.organization.subscriptionTier;

                return (
                  <div
                    key={entry.organizationId}
                    className="w-full flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-500 truncate block">
                        {entry.organization.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 h-4 border-0 ${tierColorMap[tier] ?? ""}`}
                        >
                          {tierLabelMap[tier] ?? tier}
                        </Badge>
                        <span className="text-[10px] text-gray-400">
                          No access
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Lock className="h-4 w-4 text-gray-300" />
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Sign out link */}
          <div className="pt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500 hover:text-gray-700"
              onClick={() => signOut({ callbackUrl: "/login" })}
              disabled={switchingOrgId !== null}
            >
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
