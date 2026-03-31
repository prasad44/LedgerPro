import Anthropic from "@anthropic-ai/sdk";
import type { PrismaClient } from "@prisma/client";
import { ACCOUNT_TYPE_LABELS } from "@/lib/accounting/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CategorizeInput {
  description: string;
  amount: number;
  date?: string;
  vendor?: string;
}

interface CategorizeResult {
  suggestedAccountId: string;
  suggestedAccountName: string;
  suggestedAccountCode: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

export class ClaudeAIService {
  constructor(
    private prisma: PrismaClient,
    private organizationId: string
  ) {}

  async categorizeTransaction(input: CategorizeInput): Promise<CategorizeResult> {
    // Fetch the organization's chart of accounts for context
    await this.prisma.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

    const accounts = await this.prisma.chartAccount.findMany({
      where: { organizationId: this.organizationId, isActive: true },
      select: { id: true, code: true, name: true, type: true },
      orderBy: { code: "asc" },
    });

    const accountList = accounts
      .map((a) => `${a.code || "----"} | ${a.name} | ${ACCOUNT_TYPE_LABELS[a.type]}`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are an accounting assistant. Categorize this transaction to the most appropriate account.

TRANSACTION:
- Description: ${input.description}
- Amount: $${input.amount.toFixed(2)}
${input.date ? `- Date: ${input.date}` : ""}
${input.vendor ? `- Vendor: ${input.vendor}` : ""}

AVAILABLE ACCOUNTS:
Code | Name | Type
${accountList}

Respond in this exact JSON format (no markdown, no code blocks):
{"accountCode":"XXXX","confidence":"high|medium|low","reasoning":"Brief explanation"}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: { accountCode: string; confidence: string; reasoning: string };
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      // Fallback: try to extract JSON from response
      const jsonMatch = text.match(/\{[^}]+\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("AI returned an unparseable response.");
      }
    }

    const matchedAccount = accounts.find((a) => a.code === parsed.accountCode);
    if (!matchedAccount) {
      // Fall back to Miscellaneous Expense
      const fallback = accounts.find((a) => a.code === "6190") || accounts[0];
      return {
        suggestedAccountId: fallback.id,
        suggestedAccountName: fallback.name,
        suggestedAccountCode: fallback.code || "",
        confidence: "low",
        reasoning: parsed.reasoning || "Could not match to a specific account.",
      };
    }

    return {
      suggestedAccountId: matchedAccount.id,
      suggestedAccountName: matchedAccount.name,
      suggestedAccountCode: matchedAccount.code || "",
      confidence: parsed.confidence as "high" | "medium" | "low",
      reasoning: parsed.reasoning,
    };
  }

  async batchCategorize(transactions: CategorizeInput[]): Promise<CategorizeResult[]> {
    const results: CategorizeResult[] = [];
    for (const txn of transactions) {
      const result = await this.categorizeTransaction(txn);
      results.push(result);
    }
    return results;
  }

  async generateInsights(reportData: Record<string, unknown>, reportType: string): Promise<string> {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are a financial analyst assistant. Analyze this ${reportType} report and provide 3-5 key insights.

REPORT DATA:
${JSON.stringify(reportData, null, 2)}

Provide insights in this format:
1. [Insight title]: Brief explanation
2. [Insight title]: Brief explanation
...

Focus on: trends, anomalies, areas of concern, opportunities for improvement. Be specific with numbers.`,
        },
      ],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  async answerQuestion(question: string): Promise<string> {
    // Fetch summary financial data for context
    await this.prisma.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

    const [accounts, recentEntries, invoiceStats, billStats] = await Promise.all([
      this.prisma.chartAccount.findMany({
        where: { organizationId: this.organizationId, isActive: true },
        select: { code: true, name: true, type: true, balance: true },
        orderBy: { code: "asc" },
      }),
      this.prisma.journalEntry.count({
        where: { organizationId: this.organizationId, status: "POSTED" },
      }),
      this.prisma.invoice.groupBy({
        by: ["status"],
        where: { organizationId: this.organizationId },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.bill.groupBy({
        by: ["status"],
        where: { organizationId: this.organizationId },
        _count: true,
        _sum: { totalAmount: true },
      }),
    ]);

    const accountSummary = accounts
      .filter((a) => Number(a.balance) !== 0)
      .map((a) => `${a.code} ${a.name}: $${Number(a.balance).toFixed(2)}`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are an accounting assistant for a small business. Answer this question based on the financial data below.

QUESTION: ${question}

ACCOUNT BALANCES:
${accountSummary || "No account balances yet."}

JOURNAL ENTRIES: ${recentEntries} posted entries

INVOICE STATUS:
${invoiceStats.map((s) => `${s.status}: ${s._count} invoices, total $${Number(s._sum.totalAmount || 0).toFixed(2)}`).join("\n") || "No invoices"}

BILL STATUS:
${billStats.map((s) => `${s.status}: ${s._count} bills, total $${Number(s._sum.totalAmount || 0).toFixed(2)}`).join("\n") || "No bills"}

Answer concisely and specifically. If you cannot answer from the available data, say so.`,
        },
      ],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}
