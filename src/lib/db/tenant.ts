import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

function forTenant(tenantId: string) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const [, result] = await client.$transaction([
              client.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    })
  );
}

export function getTenantDb(tenantId: string) {
  return prisma.$extends(forTenant(tenantId));
}

export type TenantPrismaClient = ReturnType<typeof getTenantDb>;
