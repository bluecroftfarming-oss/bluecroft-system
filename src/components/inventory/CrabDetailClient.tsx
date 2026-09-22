"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Option } from "@/components/ui/SelectOrCreate";
import { CrabFormModal } from "@/components/inventory/CrabFormModal";
import { formatCurrency, formatDate, formatNumber, daysBetween } from "@/lib/format";
import { GRADE_LABELS, STATUS_META } from "@/lib/meta";
import type { CrabRow } from "@/components/inventory/InventoryClient";

type TimelineEntry = {
  id: number;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  fromSystemBoxId: number | null;
  toSystemBoxId: number | null;
  fromBoxLabel: string | null;
  toBoxLabel: string | null;
  note: string | null;
  eventDate: string;
  createdAt: string | null;
};

type LegacyEvent = {
  id: number;
  eventType: string;
  eventDate: string | null;
  category: string | null;
  description: string | null;
};

type Transaction = {
  id: number;
  type: string;
  amount: number | null;
  date: string | null;
  notes: string | null;
};

type HardnessCheck = {
  id: number;
  checkDate: string | null;
  hardnessPct: number | null;
  notes: string | null;
};

export function CrabDetailClient({
  crab,
  events,
  transactions,
  hardnessChecks,
  timeline,
  vendors,
  boxes,
  batches,
}: {
  crab: CrabRow;
  events: LegacyEvent[];
  transactions: Transaction[];
  hardnessChecks: HardnessCheck[];
  timeline: TimelineEntry[];
  vendors: Option[];
  boxes: Option[];
  batches: Option[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const meta = STATUS_META[crab.status as keyof typeof STATUS_META];
  const days = daysBetween(crab.intakeDate, crab.exitDate);
  const weightGain =
    crab.intakeWeightGrams !== null && crab.exitWeightGrams !== null ? crab.exitWeightGrams - crab.intakeWeightGrams : null;

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <Link href="/inventory" className="text-xs font-medium text-brand-600 hover:text-brand-800">
            ← Back to Inventory
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Crab #{crab.legacyCrabNumber}</h1>
            <Badge tone={meta?.tone ?? "neutral"}>{meta?.label ?? crab.status}</Badge>
            {crab.needsReview && <Badge tone="warn">Needs Review</Badge>}
          </div>
          <p className="mt-1 text-sm text-black/50">
            {crab.vendorName ?? "No vendor"} · {crab.systemBoxLabel ?? "No box"} ·{" "}
            {crab.batchNumber !== null ? `Batch ${crab.batchNumber}` : "No batch"}
          </p>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <EditIcon /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Intake" />
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Date" value={formatDate(crab.intakeDate)} />
            <Row label="Weight" value={formatNumber(crab.intakeWeightGrams, "g")} />
            <Row label="Gender" value={crab.gender} />
            <Row label="Grade" value={GRADE_LABELS[crab.grade as keyof typeof GRADE_LABELS] ?? crab.grade} />
            <Row label="Hardness %" value={crab.inwardHardnessPct !== null ? `${crab.inwardHardnessPct}%` : "—"} />
            <Row label="Purchase Price" value={formatCurrency(crab.purchasePrice)} />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Outcome" />
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Status" value={meta?.label ?? crab.status} />
            <Row label="Exit Date" value={formatDate(crab.exitDate)} />
            <Row label="Exit Weight" value={formatNumber(crab.exitWeightGrams, "g")} />
            <Row label="Weight Gain" value={weightGain !== null ? `${weightGain}g` : "—"} />
            <Row label="Days in System" value={days !== null ? String(days) : "—"} />
            <Row label="Sale / Return" value={formatCurrency(crab.saleOrReturnAmount)} />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Notes" />
          <p className="text-sm text-black/60">{crab.legacyRemarks || "No remarks on file."}</p>
          {crab.needsReview && crab.reviewNote && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {crab.reviewNote}
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Status Timeline" subtitle="Full history of status changes and box transfers for this crab" />
        {timeline.length === 0 ? (
          <p className="py-6 text-center text-sm text-black/40">No timeline entries yet.</p>
        ) : (
          <ol className="flex flex-col gap-0">
            {timeline.map((t, i) => (
              <li key={t.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i !== timeline.length - 1 && (
                  <span className="absolute left-[7px] top-4 h-full w-px bg-brand-100" aria-hidden />
                )}
                <span className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white bg-brand-500 shadow" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-sm font-medium text-brand-900">{describeTimelineEvent(t)}</p>
                    <span className="text-xs text-black/40">{formatDate(t.eventDate)}</span>
                  </div>
                  {t.note && <p className="mt-0.5 text-xs text-black/50">{t.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {events.length > 0 && (
        <Card>
          <CardHeader title="Legacy Notes" subtitle="Structured remarks carried over from the original tracking sheet" />
          <div className="flex flex-col gap-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-brand-50 bg-brand-50/40 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-brand-800">{e.eventType.replace(/_/g, " ")}</span>
                  {e.category && e.category !== "N_A" && <span className="text-black/40"> · {e.category.replace(/_/g, " ")}</span>}
                  {e.description && <p className="mt-0.5 text-black/60">{e.description}</p>}
                </div>
                <span className="shrink-0 text-xs text-black/40">{formatDate(e.eventDate)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {transactions.length > 0 && (
          <Card>
            <CardHeader title="Transactions" />
            <div className="flex flex-col gap-2">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-black/60">{t.type.replace(/_/g, " ")}</span>
                  <span className="font-medium text-brand-900">{formatCurrency(t.amount)}</span>
                  <span className="text-xs text-black/40">{formatDate(t.date)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
        {hardnessChecks.length > 0 && (
          <Card>
            <CardHeader title="Hardness Checks" />
            <div className="flex flex-col gap-2">
              {hardnessChecks.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-black/60">{formatDate(h.checkDate)}</span>
                  <span className="font-medium text-brand-900">{h.hardnessPct !== null ? `${h.hardnessPct}%` : "—"}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <CrabFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        crab={crab}
        vendors={vendors}
        boxes={boxes}
        batches={batches}
        nextLegacyNumber={crab.legacyCrabNumber ?? 1}
        onSaved={() => window.location.reload()}
        onRefetchOptions={() => {}}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-brand-50 pb-1.5 last:border-0 last:pb-0">
      <dt className="text-black/45">{label}</dt>
      <dd className="font-medium text-brand-900">{value}</dd>
    </div>
  );
}

function describeTimelineEvent(t: TimelineEntry): string {
  switch (t.eventType) {
    case "IMPORT":
      return "Import from Excel";
    case "CREATED":
      return `Added to inventory${t.toBoxLabel ? ` — placed in ${t.toBoxLabel}` : ""}`;
    case "STATUS_CHANGE": {
      const from = t.fromStatus ? (STATUS_META[t.fromStatus as keyof typeof STATUS_META]?.label ?? t.fromStatus) : "—";
      const to = t.toStatus ? (STATUS_META[t.toStatus as keyof typeof STATUS_META]?.label ?? t.toStatus) : "—";
      return `Status changed: ${from} → ${to}`;
    }
    case "BOX_TRANSFER":
      return `Transferred: ${t.fromBoxLabel ?? "Unassigned"} → ${t.toBoxLabel ?? "Unassigned"}`;
    default:
      return t.eventType;
  }
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-8.5 8.5a2 2 0 01-.848.502l-3.077.878a.5.5 0 01-.62-.62l.878-3.077a2 2 0 01.502-.848l8.5-8.5z" />
    </svg>
  );
}
