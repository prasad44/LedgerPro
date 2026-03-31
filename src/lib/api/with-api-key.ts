import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, checkScope } from "./api-keys";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Middleware for external API key-based authentication.
 * Use this for public API endpoints consumed by third parties.
 * Requires Enterprise tier.
 */
export async function withApiKey(request: NextRequest, requiredScope?: string) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Missing or invalid Authorization header. Use: Bearer lp_live_xxx" },
        { status: 401 }
      ),
    };
  }

  const key = authHeader.slice(7); // Remove "Bearer "
  const apiKey = await validateApiKey(key);

  if (!apiKey) {
    return {
      error: NextResponse.json(
        { error: "Invalid or expired API key" },
        { status: 401 }
      ),
    };
  }

  // Check Enterprise tier
  if (apiKey.organization.subscriptionTier !== "ENTERPRISE") {
    return {
      error: NextResponse.json(
        { error: "API access requires the Enterprise plan" },
        { status: 403 }
      ),
    };
  }

  // Check scope
  if (requiredScope && !checkScope(apiKey, requiredScope)) {
    return {
      error: NextResponse.json(
        { error: `Insufficient scope. Required: ${requiredScope}` },
        { status: 403 }
      ),
    };
  }

  const db = getTenantDb(apiKey.organizationId);

  return {
    apiKey,
    db,
    organizationId: apiKey.organizationId,
  };
}
