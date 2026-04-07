"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePaddle } from "@/components/paddle-provider";
import { PADDLE_PRICES } from "@/lib/paddle/config";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  FileText,
  Receipt,
  BarChart3,
  Calculator,
  Globe,
  ClipboardList,
  Landmark,
  Package,
  Sparkles,
  Check,
  ArrowRight,
  Star,
  Menu,
  X,
  Play,
  Shield,
  Zap,
  Users,
  TrendingUp,
  ChevronRight,
  Mail,
  type LucideIcon,
} from "lucide-react";

/* ────────────────────────────────────────────────────────
   Data
   ──────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Why LedgerPro", href: "#why" },
  { label: "Testimonials", href: "#testimonials" },
];

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: FileText,
    title: "Invoicing & Payments",
    desc: "Create polished invoices in seconds. Auto-send payment reminders and track aging receivables effortlessly.",
  },
  {
    icon: Receipt,
    title: "Expense Tracking",
    desc: "Categorize every dollar. Snap receipts, import bank feeds, and never miss a deduction at tax time.",
  },
  {
    icon: BarChart3,
    title: "Financial Reports",
    desc: "50+ reports at your fingertips. P&L, Balance Sheet, Cash Flow \u2014 generated in real time.",
  },
  {
    icon: Calculator,
    title: "Double-Entry Bookkeeping",
    desc: "Industry-standard accounting engine. Every transaction balanced, every audit trail complete.",
  },
  {
    icon: Landmark,
    title: "Bank Reconciliation",
    desc: "Auto-match your bank transactions. Spot discrepancies in minutes, not hours.",
  },
  {
    icon: Globe,
    title: "Multi-Currency",
    desc: "Transact globally with automatic exchange rates and real-time currency conversion.",
  },
  {
    icon: ClipboardList,
    title: "Purchase Orders",
    desc: "Streamline procurement. Create, approve, and convert POs to bills seamlessly.",
  },
  {
    icon: Package,
    title: "Inventory Management",
    desc: "Track stock levels, cost of goods, and reorder points. Never over-order again.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    desc: "Let AI categorize transactions, flag anomalies, and surface cash flow forecasts.",
  },
];

interface Plan {
  name: string;
  tier: SubscriptionTier;
  monthly: number;
  desc: string;
  features: string[];
  popular: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    tier: "STARTER",
    monthly: 19,
    desc: "For freelancers & sole proprietors",
    features: [
      "1 user",
      "500 transactions / mo",
      "5 reports",
      "Basic invoicing",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Standard",
    tier: "STANDARD",
    monthly: 39,
    desc: "For small businesses with AP/AR needs",
    features: [
      "3 users",
      "5,000 transactions / mo",
      "20 reports",
      "Bills & bank reconciliation",
      "Estimates & credit memos",
      "Email + chat support",
    ],
    popular: false,
  },
  {
    name: "Premium",
    tier: "PREMIUM",
    monthly: 69,
    desc: "For growing, multi-currency businesses",
    features: [
      "5 users",
      "25,000 transactions / mo",
      "50+ reports",
      "Purchase orders & inventory",
      "Multi-currency support",
      "Budgets & forecasts",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    tier: "ENTERPRISE",
    monthly: 149,
    desc: "Full control for established businesses",
    features: [
      "25 users",
      "Unlimited transactions",
      "200+ reports",
      "Advanced inventory",
      "API & webhook access",
      "AI-powered features",
      "Custom roles & permissions",
      "Dedicated support",
    ],
    popular: false,
  },
];

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  stars: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "LedgerPro replaced three tools we were paying for. Invoicing, expense tracking, and reporting \u2014 all in one place. Our month-end close went from 5 days to 1.",
    name: "Sarah Chen",
    role: "Founder, Bloom Studio",
    stars: 5,
  },
  {
    quote:
      "As a freelance consultant, I need something powerful but not overwhelming. LedgerPro hits that sweet spot \u2014 I invoice clients in 30 seconds flat.",
    name: "Marcus Thompson",
    role: "Independent Consultant",
    stars: 5,
  },
  {
    quote:
      "We moved 12 clients onto LedgerPro last quarter. The double-entry engine is rock-solid, and the audit trail gives us total confidence during reviews.",
    name: "Jennifer Walsh",
    role: "Partner, Walsh & Associates CPA",
    stars: 5,
  },
];

const FOOTER_COLS = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Integrations", "API", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Press", "Contact"],
  },
  {
    title: "Resources",
    links: ["Documentation", "Help Center", "Community", "Webinars", "Templates"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Security", "Compliance"],
  },
];

/* ────────────────────────────────────────────────────────
   Scroll-reveal wrapper
   ──────────────────────────────────────────────────────── */

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────── */

export default function LandingPage() {
  const { data: session } = useSession();
  const { openCheckout, isLoaded: paddleLoaded } = usePaddle();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [annual, setAnnual] = useState(false);

  function handleChoosePlan(plan: Plan) {
    const priceId = PADDLE_PRICES[plan.tier];
    if (!priceId) return;
    openCheckout(
      priceId,
      session?.user?.email ?? undefined,
      session?.user?.organizationId
        ? { organizationId: session.user.organizationId }
        : undefined,
    );
  }

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ───────── Header / Nav ───────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-lg shadow-[0_1px_3px_rgba(0,0,0,.08)] border-b border-gray-100"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className={`rounded-lg p-1.5 transition-colors ${
                scrolled ? "bg-[#0B1D3A]" : "bg-white/15"
              }`}
            >
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span
              className={`text-lg font-bold tracking-tight transition-colors ${
                scrolled ? "text-gray-900" : "text-white"
              }`}
            >
              LedgerPro
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`text-[0.84rem] font-medium transition-colors ${
                  scrolled
                    ? "text-gray-600 hover:text-gray-900"
                    : "text-blue-100/80 hover:text-white"
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login">
              <Button
                variant="ghost"
                className={`font-medium ${
                  scrolled
                    ? "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    : "text-white hover:bg-white/10"
                }`}
              >
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm font-medium px-4">
                Start Free Trial
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className={`lg:hidden p-2 rounded-md transition ${
              scrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10"
            }`}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[70] w-72 bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <span className="font-bold text-gray-900">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <nav className="p-5 space-y-1">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block rounded-md px-3 py-2.5 text-[0.92rem] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="px-5 space-y-2.5 mt-2">
          <Link href="/login" className="block">
            <Button variant="outline" className="w-full justify-center">
              Log In
            </Button>
          </Link>
          <Link href="/register" className="block">
            <Button className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </div>

      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0B1D3A] via-[#0F2847] to-[#0B1D3A] pt-28 pb-20 lg:pt-36 lg:pb-28">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-1/2 h-[700px] w-[700px] -translate-y-1/2 translate-x-1/4 rounded-full bg-emerald-500/[0.06] blur-[100px]" />
          <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-sky-500/[0.05] blur-[80px]" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-14 px-5 lg:flex-row lg:gap-12 lg:px-8">
          {/* Text column */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-emerald-300 backdrop-blur-sm">
              <Zap className="h-3.5 w-3.5" />
              Now with AI-powered insights
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Master Your Books.
              <br />
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                Grow Your Business.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-blue-100/70 lg:mx-0 lg:text-lg">
              Professional double-entry accounting software built for modern
              businesses. Invoice clients, track expenses, reconcile banks, and
              get real-time financial insights &mdash; all in one place.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-11 gap-2 rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="ghost"
                className="h-11 gap-2 rounded-lg px-5 text-sm font-medium text-white hover:bg-white/10"
              >
                <Play className="h-4 w-4" />
                Watch Demo
              </Button>
            </div>

            <p className="mt-4 text-xs text-blue-200/40">
              Free 14-day trial &middot; No credit card required
            </p>
          </div>

          {/* Dashboard illustration */}
          <div className="relative flex-1 max-w-xl lg:max-w-none">
            {/* Floating card — upper-left */}
            <div className="lp-float absolute -left-4 top-8 z-20 hidden rounded-xl border border-white/10 bg-white/[0.07] p-3.5 shadow-2xl backdrop-blur-md sm:block">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                  <Check className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-white">Invoice #1047 Paid</p>
                  <p className="text-[10px] text-blue-200/60">$4,500.00 received</p>
                </div>
              </div>
            </div>

            {/* Floating card — lower-right */}
            <div className="lp-float-alt absolute -right-2 bottom-12 z-20 hidden rounded-xl border border-white/10 bg-white/[0.07] p-3.5 shadow-2xl backdrop-blur-md sm:block">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20">
                  <TrendingUp className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-white">Revenue</p>
                  <p className="text-[10px] text-emerald-400">+24.5% this month</p>
                </div>
              </div>
            </div>

            {/* Main dashboard card */}
            <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 shadow-[0_20px_60px_rgba(0,0,0,.4)] backdrop-blur-sm">
              {/* Browser chrome */}
              <div className="flex items-center gap-3 rounded-t-xl bg-[#1a2d45] px-4 py-2.5">
                <div className="flex gap-1.5">
                  <span className="block h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="block h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="block h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 rounded-md bg-white/[0.06] px-3 py-1">
                  <span className="text-[10px] text-blue-200/40">app.ledgerpro.com/dashboard</span>
                </div>
              </div>

              {/* Dashboard body */}
              <div className="flex rounded-b-xl bg-[#0e2035]">
                {/* Sidebar */}
                <div className="hidden w-28 border-r border-white/[0.06] py-4 px-3 sm:block">
                  {["Dashboard", "Invoices", "Expenses", "Reports", "Banking", "Settings"].map(
                    (item, i) => (
                      <div
                        key={item}
                        className={`mb-1 rounded-md px-2 py-1.5 text-[9px] font-medium ${
                          i === 0
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "text-blue-200/40"
                        }`}
                      >
                        {item}
                      </div>
                    ),
                  )}
                </div>

                {/* Main area */}
                <div className="flex-1 p-4 space-y-3">
                  {/* Stat cards */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Revenue", value: "$124,563", change: "+12.5%", positive: true },
                      { label: "Expenses", value: "$45,230", change: "-3.2%", positive: true },
                      { label: "Net Profit", value: "$79,333", change: "+18.7%", positive: true },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5"
                      >
                        <p className="text-[8px] text-blue-200/40">{s.label}</p>
                        <p className="mt-0.5 text-sm font-bold text-white">{s.value}</p>
                        <p className={`text-[8px] mt-0.5 ${s.positive ? "text-emerald-400" : "text-red-400"}`}>
                          {s.change}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart */}
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                    <p className="text-[9px] text-blue-200/40 mb-2">Monthly Revenue</p>
                    <div className="flex items-end gap-[6px] h-20">
                      {[42, 58, 51, 74, 63, 88, 70, 80, 65, 92, 78, 100].map(
                        (h, i) => (
                          <div
                            key={i}
                            className="lp-bar-grow flex-1 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400"
                            style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
                          />
                        ),
                      )}
                    </div>
                    <div className="flex justify-between mt-1.5">
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
                        (m) => (
                          <span key={m} className="text-[6px] text-blue-200/25 flex-1 text-center">
                            {m}
                          </span>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Transaction rows */}
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 space-y-1.5">
                    <p className="text-[9px] text-blue-200/40 mb-1">Recent Transactions</p>
                    {[
                      { name: "Acme Corp", amount: "+$12,400", type: "Invoice" },
                      { name: "Office Supplies", amount: "-$340", type: "Expense" },
                      { name: "Cloud Hosting", amount: "-$2,100", type: "Bill" },
                    ].map((t) => (
                      <div
                        key={t.name}
                        className="flex items-center justify-between rounded bg-white/[0.02] px-2 py-1.5"
                      >
                        <div>
                          <p className="text-[9px] font-medium text-white/80">{t.name}</p>
                          <p className="text-[7px] text-blue-200/30">{t.type}</p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold ${
                            t.amount.startsWith("+") ? "text-emerald-400" : "text-red-300/70"
                          }`}
                        >
                          {t.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Social Proof / Stats ───────── */}
      <section id="why" className="border-b border-gray-100 bg-gray-50/80">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <Reveal>
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
              {[
                { icon: Users, value: "10,000+", label: "Businesses" },
                { icon: Shield, value: "99.9%", label: "Uptime SLA" },
                { icon: TrendingUp, value: "$2B+", label: "Transactions Processed" },
                { icon: BarChart3, value: "50+", label: "Built-in Reports" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center">
                  <s.icon className="mb-2 h-5 w-5 text-emerald-600" />
                  <p className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                    {s.value}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section id="features" className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Everything you need
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Powerful features, simple interface
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-500">
                From invoicing to AI-powered insights, LedgerPro gives you the
                tools to manage your finances with confidence.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <div className="group relative rounded-xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.04)] transition-all duration-300 hover:shadow-lg hover:border-emerald-100 hover:-translate-y-0.5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Why LedgerPro highlight ───────── */}
      <section className="bg-gray-50/80 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                  Why LedgerPro
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Built for real accountants,
                  <br className="hidden sm:block" /> loved by business owners
                </h2>
                <p className="mt-4 text-base leading-relaxed text-gray-500">
                  Unlike basic bookkeeping apps, LedgerPro uses a real
                  double-entry engine &mdash; the same methodology used by
                  professional accountants worldwide. Every debit has a credit,
                  every balance is verifiable.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Bank-grade encryption & data security",
                    "Automatic backups with 99.9% uptime SLA",
                    "Real-time collaboration for your whole team",
                    "Seamless migration from QuickBooks & Xero",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 inline-block">
                  <Button className="h-10 gap-2 bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700">
                    Get Started Free
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: Shield,
                    title: "Enterprise Security",
                    desc: "SOC 2 compliant with end-to-end encryption",
                  },
                  {
                    icon: Zap,
                    title: "Lightning Fast",
                    desc: "Reports generated in under 2 seconds",
                  },
                  {
                    icon: Globe,
                    title: "Global Ready",
                    desc: "Multi-currency with 150+ supported currencies",
                  },
                  {
                    icon: Sparkles,
                    title: "AI Assistant",
                    desc: "Smart categorization and anomaly detection",
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                  >
                    <card.icon className="mb-3 h-6 w-6 text-emerald-600" />
                    <h4 className="text-sm font-semibold text-gray-900">{card.title}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">{card.desc}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────── Pricing ───────── */}
      <section id="pricing" className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Pricing
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Simple, transparent plans
              </h2>
              <p className="mt-4 text-base text-gray-500">
                Start free for 14 days. No credit card required. Upgrade, downgrade, or cancel anytime.
              </p>

              {/* Toggle */}
              <div className="mt-8 inline-flex items-center rounded-full bg-gray-100 p-1">
                <button
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                    !annual
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setAnnual(false)}
                >
                  Monthly
                </button>
                <button
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                    annual
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setAnnual(true)}
                >
                  Annual{" "}
                  <span className="text-emerald-600 font-semibold">-20%</span>
                </button>
              </div>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan, i) => {
              const price = annual
                ? Math.round(plan.monthly * 0.8)
                : plan.monthly;

              return (
                <Reveal key={plan.name} delay={i * 80}>
                  <div
                    className={`relative flex h-full flex-col rounded-2xl border p-6 transition-shadow ${
                      plan.popular
                        ? "border-emerald-200 bg-emerald-50/40 shadow-lg shadow-emerald-100/50 ring-1 ring-emerald-200"
                        : "border-gray-200 bg-white shadow-sm hover:shadow-md"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                        Most Popular
                      </span>
                    )}

                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <p className="mt-1 text-xs text-gray-500">{plan.desc}</p>

                    <div className="mt-5 mb-6">
                      <span className="text-4xl font-extrabold tracking-tight text-gray-900">
                        ${price}
                      </span>
                      <span className="ml-1 text-sm text-gray-500">/ mo</span>
                      {annual && (
                        <p className="mt-1 text-xs text-gray-400">
                          Billed ${price * 12}/year
                        </p>
                      )}
                    </div>

                    <ul className="mb-8 flex-1 space-y-2.5">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                          {feat}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`mt-auto w-full justify-center font-semibold ${
                        plan.popular
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      }`}
                      onClick={() => handleChoosePlan(plan)}
                      disabled={!paddleLoaded}
                    >
                      Start Free Trial
                    </Button>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── Testimonials ───────── */}
      <section id="testimonials" className="bg-gray-50/80 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Testimonials
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Trusted by thousands of businesses
              </h2>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  {/* Stars */}
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star
                        key={j}
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>

                  <p className="flex-1 text-sm leading-relaxed text-gray-600">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  <div className="mt-5 flex items-center gap-3 border-t border-gray-50 pt-4">
                    {/* Avatar placeholder */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      {t.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 py-20 lg:py-28">
        {/* Decorative */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/[0.06] blur-3xl" />
          <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-teal-400/10 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-3xl px-5 text-center lg:px-8">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to take control of your finances?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-emerald-50/80">
              Join 10,000+ businesses that trust LedgerPro for their accounting.
              Start your free 14-day trial today &mdash; no credit card needed.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-11 gap-2 rounded-lg bg-white px-7 text-sm font-semibold text-emerald-700 shadow-lg hover:bg-emerald-50"
                >
                  Start Your Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#pricing">
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-11 gap-2 rounded-lg px-5 text-sm font-medium text-white hover:bg-white/10"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className="bg-[#0B1D3A] pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-600 p-1.5">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">LedgerPro</span>
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-blue-200/50">
                Professional accounting software for small and medium
                businesses. Invoicing, expenses, reports, and more.
              </p>
              <div className="mt-5 flex gap-3">
                {/* Twitter / X */}
                <a
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] text-blue-200/50 transition hover:bg-white/10 hover:text-white"
                  aria-label="Twitter"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                {/* LinkedIn */}
                <a
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] text-blue-200/50 transition hover:bg-white/10 hover:text-white"
                  aria-label="LinkedIn"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                {/* GitHub */}
                <a
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] text-blue-200/50 transition hover:bg-white/10 hover:text-white"
                  aria-label="GitHub"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                </a>
                {/* Email */}
                <a
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] text-blue-200/50 transition hover:bg-white/10 hover:text-white"
                  aria-label="Email"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Link columns */}
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-200/70">
                  {col.title}
                </h4>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-blue-200/40 transition hover:text-white"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 sm:flex-row">
            <p className="text-xs text-blue-200/30">
              &copy; {new Date().getFullYear()} LedgerPro, Inc. All rights reserved.
            </p>
            <div className="flex gap-5 text-xs text-blue-200/30">
              <a href="#" className="hover:text-white transition">
                Privacy
              </a>
              <a href="#" className="hover:text-white transition">
                Terms
              </a>
              <a href="#" className="hover:text-white transition">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
