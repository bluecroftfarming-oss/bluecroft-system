"use client";

import { useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { endOfMonth, endOfQuarter, endOfYear, format, startOfMonth, startOfQuarter, startOfYear, subMonths } from "date-fns";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { FieldLabel, TextInput } from "@/components/ui/Field";
import { formatCurrency, formatNumber } from "@/lib/format";
import { GRADES, GRADE_LABELS } from "@/lib/meta";
import type { ReportsData } from "@/lib/reports";

const QUICK_RANGES = [
  { label: "This Month", get: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  {
    label: "Last Month",
    get: () => {
      const d = subMonths(new Date(), 1);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    },
  },
  { label: "This Quarter", get: () => ({ start: startOfQuarter(new Date()), end: endOfQuarter(new Date()) }) },
  { label: "This Year", get: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) }) },
];

function ymd(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function ReportsClient({ initialData }: { initialData: ReportsData }) {
  const [data, setData] = useState(initialData);
  const [start, setStart] = useState(initialData.range.start);
  const [end, setEnd] = useState(initialData.range.end);
  const [isPending, startTransition] = useTransition();

  function applyRange(newStart: string, newEnd: string) {
    setStart(newStart);
    setEnd(newEnd);
    startTransition(async () => {
      const res = await fetch(`/api/reports?start=${newStart}&end=${newEnd}`);
      const json = await res.json();
      if (res.ok) setData(json.data);
    });
  }

  const financialChartData = data.financials.monthly.map((m) => ({
    month: String(m.month).slice(2),
    Purchases: m.PURCHASE ?? 0,
    Sales: m.SALE ?? 0,
    Returns: m.RETURN_REFUND ?? 0,
  }));

  const statusChartData = data.statuses.monthly.map((m) => ({
    month: String(m.month).slice(2),
    Mortality: m.mortality ?? 0,
    Hard: m.hard ?? 0,
    Returned: m.returned ?? 0,
    Missing: m.missing ?? 0,
  }));

  const gradeChartData = GRADES.map((g) => ({
    grade: GRADE_LABELS[g],
    count: data.gradeIntake.find((r) => r.grade === g)?.count ?? 0,
  })).filter((r) => r.count > 0);

  return (
    <div className="flex flex-col gap-7 pb-10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Reports &amp; Analysis</h1>
          <p className="mt-1 text-sm text-black/50">Financials and outcomes for a date range you choose.</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <FieldLabel>From</FieldLabel>
              <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-40" />
            </div>
            <div>
              <FieldLabel>To</FieldLabel>
              <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-40" />
            </div>
            <Button variant="secondary" onClick={() => applyRange(start, end)} disabled={isPending}>
              {isPending ? "Loading…" : "Apply"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => {
                  const { start: s, end: e } = r.get();
                  applyRange(ymd(s), ymd(e));
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className={`flex flex-col gap-7 transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}>
        {/* ===== Section 1: Monthly Financials ===== */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-brand-900">1. Monthly Financials</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Purchases" value={formatCurrency(data.financials.totalPurchase)} sub={`${formatNumber(data.financials.countPurchase)} transactions`} />
            <StatCard label="Total Sales" value={formatCurrency(data.financials.totalSale)} sub={`${formatNumber(data.financials.countSale)} transactions`} tone="good" />
            <StatCard label="Total Returns/Refunds" value={formatCurrency(data.financials.totalReturn)} sub={`${formatNumber(data.financials.countReturn)} transactions`} tone="warn" />
            <StatCard
              emphasis
              label="Net Cash Flow"
              value={formatCurrency(data.financials.netCashFlow)}
              sub="Sales + Returns − Purchases"
            />
          </div>
          <Card>
            <CardHeader title="Financials by Month" subtitle="Purchases, sales and returns within the selected range" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialChartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5f4f6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5b7a80" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#5b7a80" }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #cdf4f7", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Purchases" fill="#00A2B6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Sales" fill="#0F9D6B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Returns" fill="#D99A1F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {financialChartData.length === 0 && (
              <p className="py-6 text-center text-sm text-black/40">No transactions recorded in this range.</p>
            )}
          </Card>
        </section>

        {/* ===== Section 2: Monthly Statuses ===== */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-brand-900">2. Monthly Statuses</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Hard (Sold)" value={formatNumber(data.statuses.counts.hard)} sub={`${data.statuses.percentages.hardPct}% of concluded`} tone="good" />
            <StatCard label="Mortality" value={formatNumber(data.statuses.counts.mortality)} sub={`${data.statuses.percentages.mortalityPct}% of concluded`} tone="bad" />
            <StatCard label="Returned" value={formatNumber(data.statuses.counts.returned)} tone="warn" />
            <StatCard label="Missing" value={formatNumber(data.statuses.counts.missing)} />
          </div>
          <Card>
            <CardHeader
              title="Outcomes by Month"
              subtitle={`${formatNumber(data.statuses.concluded)} crab${data.statuses.concluded === 1 ? "" : "s"} concluded (exited) in this range`}
            />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5f4f6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5b7a80" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#5b7a80" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #cdf4f7", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Hard" stackId="s" fill="#0F9D6B" />
                  <Bar dataKey="Mortality" stackId="s" fill="#D64545" />
                  <Bar dataKey="Returned" stackId="s" fill="#D99A1F" />
                  <Bar dataKey="Missing" stackId="s" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {statusChartData.length === 0 && (
              <p className="py-6 text-center text-sm text-black/40">No crabs concluded in this range.</p>
            )}
          </Card>
        </section>

        {/* ===== Section 3: Vendor Performance ===== */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-brand-900">3. Vendor Performance</h2>
          <Card padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-100 bg-brand-50/50 text-left text-xs text-black/50">
                    <th className="px-4 py-2.5 font-medium">Vendor</th>
                    <th className="px-4 py-2.5 font-medium">Crabs Supplied</th>
                    <th className="px-4 py-2.5 font-medium">Hard %</th>
                    <th className="px-4 py-2.5 font-medium">Mortality %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vendorPerformance.map((v) => (
                    <tr key={v.vendorId} className="border-b border-brand-50">
                      <td className="px-4 py-2.5 font-medium text-brand-900">{v.name}</td>
                      <td className="px-4 py-2.5 text-black/70">{formatNumber(v.totalCrabs)}</td>
                      <td className="px-4 py-2.5 text-emerald-600">{v.hardPct}%</td>
                      <td className="px-4 py-2.5 text-rose-600">{v.mortalityPct}%</td>
                    </tr>
                  ))}
                  {data.vendorPerformance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-black/40">
                        No intake recorded from any vendor in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* ===== Section 4: Grade & Intake Overview ===== */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-brand-900">4. Grade &amp; Intake Overview</h2>
          <Card>
            <CardHeader title="Intake by Grade" subtitle={`${formatNumber(data.intakeTotal)} crabs taken in during this range`} />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeChartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5f4f6" vertical={false} />
                  <XAxis dataKey="grade" tick={{ fontSize: 11, fill: "#5b7a80" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#5b7a80" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #cdf4f7", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#00A2B6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {gradeChartData.length === 0 && <p className="py-6 text-center text-sm text-black/40">No intake in this range.</p>}
          </Card>
        </section>

        {/* ===== Section 5: Box Utilization (current, not date-ranged) ===== */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-brand-900">5. Box Utilization</h2>
          <p className="-mt-2 text-xs text-black/40">Current snapshot — not affected by the date range above.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Boxes" value={formatNumber(data.boxUtilization.totalBoxes)} />
            <StatCard
              label="Occupied Boxes"
              value={formatNumber(data.boxUtilization.occupiedBoxes)}
              sub={`of ${formatNumber(data.boxUtilization.totalBoxes)}`}
            />
            <StatCard
              label="In-box Reserve"
              value={`${data.boxUtilization.reserveOccupancy}/${data.boxUtilization.reserveCapacity}`}
              sub="Overflow crabs currently held"
              tone={data.boxUtilization.reserveOccupancy > 0 ? "warn" : undefined}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
