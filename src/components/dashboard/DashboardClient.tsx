"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DashboardSummary } from "@/lib/dashboard";
import type { PeriodStats } from "@/lib/dashboardPeriod";
import { GRADES, GRADE_LABELS, PERIOD_OPTIONS, STATUS_META, type PeriodValue } from "@/lib/meta";
import { formatCurrency, formatNumber } from "@/lib/format";

const GRADE_COLORS: Record<string, string> = {
  XXL: "#008096",
  XL: "#00A2B6",
  BIG: "#1CBDCD",
  MED: "#5FD6E1",
  SM: "#9EE8EE",
  LOCAL: "#0F9D6B",
  LC: "#66C79A",
  LLC: "#A6DFC4",
  MOLT: "#D99A1F",
  UNGRADED: "#94A3B8",
};

const STATUS_COLORS: Record<string, string> = {
  IN_SYSTEM: "#00B0C4",
  HARD: "#0F9D6B",
  MORTALITY: "#D64545",
  RESERVE_MORTALITY: "#E37373",
  TRANSPORT_MORTALITY: "#EF9A9A",
  MOLTING_MORTALITY: "#F3B7B7",
  RETURNED: "#D99A1F",
  MISSING: "#8B5CF6",
  FROZEN: "#64748B",
};

export function DashboardClient({
  initialSummary,
  initialPeriod,
}: {
  initialSummary: DashboardSummary;
  initialPeriod: PeriodStats;
}) {
  const [period, setPeriod] = useState<PeriodStats>(initialPeriod);
  const [range, setRange] = useState<PeriodValue>("today");
  const [isPending, startTransition] = useTransition();
  const summary = initialSummary;

  function selectRange(r: PeriodValue) {
    setRange(r);
    startTransition(async () => {
      const res = await fetch(`/api/dashboard/period?range=${r}`);
      const json = await res.json();
      setPeriod(json.data);
    });
  }

  const gradeMap = new Map(summary.gradeBreakdown.map((g) => [g.grade, g.count]));
  const gradesToShow = GRADES.filter((g) => g !== "UNGRADED" || (gradeMap.get("UNGRADED") ?? 0) > 0);

  const statusDonutData = summary.statusBreakdown
    .filter((s) => s.count > 0)
    .map((s) => ({ name: STATUS_META[s.status as keyof typeof STATUS_META]?.label ?? s.status, value: s.count, status: s.status }));

  const monthlyChartData = summary.monthlyIntake.slice(-12).map((m) => ({
    month: m.month.slice(2), // "26-09"
    intake: m.count,
  }));

  const totalPurchase = summary.financials.find((f) => f.type === "PURCHASE")?.total ?? 0;
  const totalSale = summary.financials.find((f) => f.type === "SALE")?.total ?? 0;
  const totalReturn = summary.financials.find((f) => f.type === "RETURN_REFUND")?.total ?? 0;

  return (
    <div className="flex flex-col gap-7 pb-10">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Dashboard</h1>
          <p className="mt-1 text-sm text-black/50">
            Live crab hardening inventory at a glance — Bluecroft Farming.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory">
            <Button variant="primary">
              <PlusIcon /> Add Crab Intake
            </Button>
          </Link>
        </div>
      </div>

      {/* ===================== SECTION 1 — Live inventory by grade ===================== */}
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            emphasis
            label="Live in System"
            value={formatNumber(summary.liveInSystemTotal)}
            sub={`${summary.boxOccupancy.occupiedBoxes} of ${summary.boxOccupancy.totalBoxes} boxes occupied`}
            icon={<CrabIcon />}
          />
          <StatCard
            label="Hard (All-time)"
            value={formatNumber(summary.overview.hard)}
            sub={`of ${formatNumber(summary.overview.totalCrabs)} total`}
            tone="good"
          />
          <StatCard
            label="Mortality Rate"
            value={`${summary.overview.mortalityRatePct}%`}
            sub="All-time, all causes"
            tone="bad"
          />
          <StatCard
            label="Needs Review"
            value={formatNumber(summary.overview.needsReviewCount)}
            sub="Flagged legacy records"
            tone="warn"
          />
        </div>

        <Card>
          <CardHeader
            title="Live Crab Inventory by Grade"
            subtitle={`${formatNumber(summary.liveInSystemTotal)} crabs currently in the hardening system`}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {gradesToShow.map((grade) => {
              const count = gradeMap.get(grade) ?? 0;
              return (
                <div
                  key={grade}
                  className="rounded-xl border border-brand-100 bg-gradient-to-br from-white to-brand-50/60 px-4 py-3"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: GRADE_COLORS[grade] }} />
                    <p className="truncate text-xs font-medium text-black/50">{GRADE_LABELS[grade]}</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-brand-900">{count}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* ===================== SECTION 2 & 3 — period activity + rates ===================== */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-brand-900">Activity</h2>
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-brand-100 bg-white p-1 shadow-sm">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => selectRange(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  range === opt.value ? "bg-[image:var(--gradient-brand)] text-white shadow" : "text-brand-700 hover:bg-brand-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}>
          <StatCard label="Mortality" value={formatNumber(period.counts.mortality)} tone="bad" icon={<SkullIcon />} />
          <StatCard label="Returned" value={formatNumber(period.counts.returned)} tone="warn" icon={<ReturnIcon />} />
          <StatCard label="Sales (Hard)" value={formatNumber(period.counts.sales)} tone="good" icon={<SaleIcon />} />
          <StatCard label="Missing" value={formatNumber(period.counts.missing)} icon={<MissingIcon />} />
        </div>

        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-3 transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}>
          <PercentGauge label="Output %" value={period.percentages.outputPct} tone="good" note="Sold + returned alive, of concluded" />
          <PercentGauge label="Hard %" value={period.percentages.hardPct} tone="brand" note="Successfully hardened & sold" />
          <PercentGauge label="Mortality %" value={period.percentages.mortalityPct} tone="bad" note="Lost, of concluded" />
        </div>
        <p className="text-xs text-black/40">
          Based on {formatNumber(period.concluded)} crab{period.concluded === 1 ? "" : "s"} that concluded (exited the
          system) between {period.window.start} and {period.window.end}.
        </p>
      </section>

      {/* ===================== Trends & distribution (graphical) ===================== */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Monthly Intake Trend" subtitle="Crabs received per month (last 12 months)" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="intakeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00B0C4" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#008096" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5b7a80" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5b7a80" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #cdf4f7", fontSize: 12 }}
                  cursor={{ fill: "rgba(0,176,196,0.08)" }}
                />
                <Bar dataKey="intake" fill="url(#intakeGradient)" radius={[6, 6, 0, 0]} name="Crabs In" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Lifetime Status Mix" subtitle={`${formatNumber(summary.overview.totalCrabs)} crabs total`} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDonutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {statusDonutData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94A3B8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #cdf4f7", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
            {statusDonutData.map((s) => (
              <span key={s.status} className="flex items-center gap-1.5 text-xs text-black/55">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] ?? "#94A3B8" }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </Card>
      </section>

      {/* ===================== Vendor scorecard + financials ===================== */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Vendor Scorecard"
            subtitle="Top vendors by volume — full list on the Vendors page"
            action={
              <Link href="/vendors" className="text-xs font-medium text-brand-600 hover:text-brand-800">
                View all →
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left text-xs text-black/45">
                  <th className="py-2 pr-3 font-medium">Vendor</th>
                  <th className="py-2 pr-3 font-medium">Crabs</th>
                  <th className="py-2 pr-3 font-medium">Hard %</th>
                  <th className="py-2 pr-3 font-medium">Mortality %</th>
                </tr>
              </thead>
              <tbody>
                {summary.vendorScorecard.slice(0, 6).map((v) => (
                  <tr key={v.vendorId} className="border-b border-brand-50 last:border-0">
                    <td className="py-2 pr-3 font-medium text-brand-900">{v.name}</td>
                    <td className="py-2 pr-3 text-black/60">{v.totalCrabs}</td>
                    <td className="py-2 pr-3">
                      <Badge tone="good">{v.hardPct}%</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone={v.mortalityPct >= 35 ? "bad" : v.mortalityPct >= 20 ? "warn" : "neutral"}>
                        {v.mortalityPct}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Financials" subtitle="All-time transaction totals" />
          <div className="flex flex-col gap-3">
            <FinRow label="Total Purchases" value={formatCurrency(totalPurchase)} tone="neutral" />
            <FinRow label="Total Sales" value={formatCurrency(totalSale)} tone="good" />
            <FinRow label="Total Returns / Refunds" value={formatCurrency(totalReturn)} tone="warn" />
            <div className="mt-1 border-t border-brand-100 pt-3">
              <FinRow label="Net (Sales − Purchases)" value={formatCurrency(totalSale - totalPurchase)} tone="brand" bold />
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

function FinRow({ label, value, tone, bold }: { label: string; value: string; tone: "good" | "warn" | "neutral" | "brand"; bold?: boolean }) {
  const toneClass =
    tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "brand" ? "text-brand-700" : "text-black/70";
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <span className="text-sm text-black/55">{label}</span>
      <span className={`text-sm whitespace-nowrap ${bold ? "font-semibold" : "font-medium"} ${toneClass}`}>{value}</span>
    </div>
  );
}

function PercentGauge({ label, value, tone, note }: { label: string; value: number; tone: "good" | "bad" | "brand"; note: string }) {
  const barColor = tone === "good" ? "#0F9D6B" : tone === "bad" ? "#D64545" : "#00A2B6";
  const textColor = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-brand-700";
  return (
    <div className="rounded-2xl border border-brand-100 bg-white/90 p-5 shadow-[0_1px_2px_rgba(7,62,73,0.04)]">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-black/55">{label}</p>
        <p className={`text-2xl font-semibold ${textColor}`}>{value}%</p>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, value)}%`, backgroundColor: barColor }}
        />
      </div>
      <p className="mt-2 text-xs text-black/40">{note}</p>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 3a.75.75 0 01.75.75v5.5h5.5a.75.75 0 010 1.5h-5.5v5.5a.75.75 0 01-1.5 0v-5.5h-5.5a.75.75 0 010-1.5h5.5v-5.5A.75.75 0 0110 3z" />
    </svg>
  );
}
function CrabIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="11" r="4" />
      <path d="M3 8l2.5 1.5M17 8l-2.5 1.5M2 13l3-1M18 13l-3-1M7 6l1-2M13 6l-1-2" strokeLinecap="round" />
    </svg>
  );
}
function SkullIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a6 6 0 00-6 6c0 2.2 1.1 4 2.5 5.2V16a1 1 0 001 1H8v-1.5h1V17h2v-1.5h1V17h.5a1 1 0 001-1v-2.8C15 12 16 10.2 16 8a6 6 0 00-6-6zM8 9a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );
}
function ReturnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.53 2.47a.75.75 0 010 1.06L7.06 6h5.69a4.75 4.75 0 010 9.5H9a.75.75 0 010-1.5h3.75a3.25 3.25 0 000-6.5H7.06l2.47 2.47a.75.75 0 11-1.06 1.06l-3.75-3.75a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" />
    </svg>
  );
}
function SaleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2.5 3A1.5 1.5 0 001 4.5v.379a1.5 1.5 0 00.44 1.06l7.62 7.62a1.5 1.5 0 002.12 0l5.379-5.38a1.5 1.5 0 000-2.12L9.94 1.44A1.5 1.5 0 008.879 1H4.5A1.5 1.5 0 003 2.5V3H2.5zM6 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );
}
function MissingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.516-2.63L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
