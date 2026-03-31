"use client";

import { useState } from "react";
import { useAskAI, useAIInsights } from "@/hooks/use-ai";
import { useCanAccessFeature } from "@/components/feature-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, TrendingUp, Lock } from "lucide-react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIAssistant() {
  const hasAccess = useCanAccessFeature("aiFeatures");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const askMutation = useAskAI();

  const handleAsk = () => {
    if (!question.trim()) return;
    const q = question.trim();
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");

    askMutation.mutate(q, {
      onSuccess: (data) => {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      },
      onError: (err) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.message}` },
        ]);
      },
    });
  };

  if (!hasAccess) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="flex flex-col items-center py-8 text-center">
          <Lock className="h-8 w-8 text-gray-400 mb-3" />
          <p className="font-semibold text-gray-600 mb-1">AI Assistant</p>
          <p className="text-xs text-gray-500 mb-3">Available on the Enterprise plan</p>
          <Link href="/settings/billing">
            <Button size="sm" variant="outline">Upgrade</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          AI Assistant
          <Badge variant="outline" className="text-[10px] ml-auto">Enterprise</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ScrollArea className="h-64 mb-3 rounded border bg-gray-50 p-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-xs py-8">
              <Sparkles className="h-6 w-6 mx-auto mb-2 text-gray-300" />
              Ask me about your financials
              <div className="mt-2 space-y-1 text-gray-400">
                <p>"What were my top expenses last month?"</p>
                <p>"How much do customers owe me?"</p>
                <p>"Is my cash position healthy?"</p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`mb-3 ${msg.role === "user" ? "text-right" : ""}`}>
              <div
                className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-white border text-gray-700"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {askMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking...
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            placeholder="Ask a question about your finances..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            onClick={handleAsk}
            disabled={!question.trim() || askMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 h-8 px-3"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ReportInsightsProps {
  reportType: string;
  reportData: Record<string, unknown> | null;
}

export function ReportInsights({ reportType, reportData }: ReportInsightsProps) {
  const hasAccess = useCanAccessFeature("aiFeatures");
  const insightsMutation = useAIInsights();

  if (!hasAccess) return null;
  if (!reportData) return null;

  return (
    <Card className="border-purple-200 mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            AI Insights
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => insightsMutation.mutate({ reportType, reportData })}
            disabled={insightsMutation.isPending}
            className="h-7 text-xs gap-1"
          >
            {insightsMutation.isPending ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="h-3 w-3" /> Generate Insights</>
            )}
          </Button>
        </div>
      </CardHeader>
      {insightsMutation.data && (
        <CardContent className="pt-0">
          <Separator className="mb-3" />
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {insightsMutation.data.insights}
          </div>
        </CardContent>
      )}
      {insightsMutation.error && (
        <CardContent className="pt-0">
          <p className="text-sm text-red-500">{insightsMutation.error.message}</p>
        </CardContent>
      )}
    </Card>
  );
}
