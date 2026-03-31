import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { ReportService } from "@/lib/accounting/report.service";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId } = result;

  const sp = request.nextUrl.searchParams;
  const asOfDate = sp.get("asOfDate") || new Date().toISOString().split("T")[0];

  try {
    const service = new ReportService(prisma, organizationId);
    const report = await service.balanceSheet(new Date(asOfDate));
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
