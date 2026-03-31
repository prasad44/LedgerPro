import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

const KEY_PREFIX = "lp_live_";
const KEY_LENGTH = 32;

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const randomPart = crypto.randomBytes(KEY_LENGTH).toString("base64url");
  const key = `${KEY_PREFIX}${randomPart}`;
  const hash = hashKey(key);
  const prefix = key.slice(0, 12);
  return { key, hash, prefix };
}

export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(key: string) {
  const hash = hashKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    include: {
      organization: {
        select: {
          id: true,
          subscriptionTier: true,
          subscriptionStatus: true,
        },
      },
    },
  });

  if (!apiKey) return null;
  if (!apiKey.isActive) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
}

export function checkScope(apiKey: { scopes: string[] }, requiredScope: string): boolean {
  // Wildcard scope grants everything
  if (apiKey.scopes.includes("*")) return true;

  // Check exact match
  if (apiKey.scopes.includes(requiredScope)) return true;

  // Check category wildcard: "read:*" matches "read:invoices"
  const [action] = requiredScope.split(":");
  if (apiKey.scopes.includes(`${action}:*`)) return true;

  return false;
}

export const AVAILABLE_SCOPES = [
  "read:accounts",
  "write:accounts",
  "read:journal-entries",
  "write:journal-entries",
  "read:customers",
  "write:customers",
  "read:vendors",
  "write:vendors",
  "read:invoices",
  "write:invoices",
  "read:bills",
  "write:bills",
  "read:payments",
  "write:payments",
  "read:expenses",
  "write:expenses",
  "read:reports",
  "read:banking",
  "write:banking",
] as const;
