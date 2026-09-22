"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Field";
import type { Option } from "@/components/ui/SelectOrCreate";
import { CrabFormModal } from "@/components/inventory/CrabFormModal";
import { apiFetch } from "@/lib/apiClient";
import { formatCurrency, formatDate, formatNumber, daysBetween } from "@/lib/format";
import { GRADE_LABELS, GRADES, STATUS_META, STATUSES } from "@/lib/meta";

export type CrabRow = {
  id: number;
  legacyCrabNumber: number | null;
  batchId: number | null;
  batchNumber: number | null;
  vendorId: number | null;
  vendorName: string | null;
  currentSystemBoxId: number | null;
  systemBoxLabel: string | null;
  intakeDate: string | null;
  intakeWeightGrams: number | null;
  gender: string;
  grade: string;
  inwardHardnessPct: number | null;
  status: string;
  exitDate: string | null;
  exitWeightGrams: number | null;
  purchasePrice: number | null;
  saleOrReturnAmount: number | null;
  legacyRemarks: string | null;
  needsReview: boolean;
  reviewNote: string | null;
  updatedAt: string;
};

const PAGE_SIZE = 25;

export function InventoryClient({
  initialRows,
  initialTotal,
  vendors: initialVendors,
  boxes: initialBoxes,
  batches: initialBatches,
  maxLegacyNumber,
}: {
  initialRows: CrabRow[];
  initialTotal: number;
  vendors: Option[];
  boxes: Option[];
  batches: Option[];
  maxLegacyNumber: number;
}) {
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [search, setSearch] = useState("");

  const [vendors, setVendors] = useState(initialVendors);
  const [boxes, setBoxes] = useState(initialBoxes);
  const [batches, setBatches] = useState(initialBatches);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCrab, setEditingCrab] = useState<CrabRow | null>(null);
  const [nextNumber, setNextNumber] = useState(maxLegacyNumber + 1);

  const refetchOptions = useCallback(() => {
    Promise.all([
      apiFetch<{ data: { id: number; name: string }[] }>("/api/vendors"),
      apiFetch<{ data: { id: number; label: string }[] }>("/api/system-boxes"),
      apiFetch<{ data: { id: number; batchNumber: number }[] }>("/api/batches"),
    ]).then(([v, b, ba]) => {
      setVendors(v.data.map((x) => ({ id: x.id, label: x.name })));
      setBoxes(b.data.map((x) => ({ id: x.id, label: x.label })));
      setBatches(ba.data.map((x) => ({ id: x.id, label: `Batch ${x.batchNumber}` })).sort((a, b2) => b2.id - a.id));
    });
  }, []);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      if (vendorFilter) params.set("vendorId", vendorFilter);
      if (needsReviewOnly) params.set("needsReview", "true");
      if (search.trim()) params.set("legacyCrabNumber", search.trim());
      const res = await apiFetch<{ data: CrabRow[]; pagination: { total: number } }>(`/api/crabs?${params}`);
      let data = res.data;
      if (gradeFilter) data = data.filter((r) => r.grade === gradeFilter);
      setRows(data);
      setTotal(res.pagination.total);
      setLoading(false);
    },
    [status, vendorFilter, gradeFilter, needsReviewOnly, search]
  );

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, vendorFilter, gradeFilter, needsReviewOnly, search]);

  function goToPage(p: number) {
    setPage(p);
    load(p);
  }

  function openAdd() {
    setEditingCrab(null);
    setModalOpen(true);
  }
  function openEdit(row: CrabRow) {
    setEditingCrab(row);
    setModalOpen(true);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Inventory</h1>
          <p className="mt-1 text-sm text-black/50">
            {formatNumber(total)} crab record{total === 1 ? "" : "s"} — every field from the original tracking sheet.
          </p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon /> Add Crab Intake
        </Button>
      </div>

      <Card padded={false} className="overflow-visible">
        <div className="flex flex-col gap-3 border-b border-brand-100 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <TextInput
            placeholder="Search by crab #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-40"
            type="number"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
          <Select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="sm:w-44">
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
          <Select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="sm:w-36">
            <option value="">All grades</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {GRADE_LABELS[g]}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-black/60">
            <input type="checkbox" checked={needsReviewOnly} onChange={(e) => setNeedsReviewOnly(e.target.checked)} />
            Needs review only
          </label>
          {(status || vendorFilter || gradeFilter || needsReviewOnly || search) && (
            <button
              onClick={() => {
                setStatus("");
                setVendorFilter("");
                setGradeFilter("");
                setNeedsReviewOnly(false);
                setSearch("");
              }}
              className="text-xs font-medium text-brand-600 hover:text-brand-800"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
          <table className="w-full min-w-[1400px] text-sm">
            <thead>
              <tr className="border-b border-brand-100 bg-brand-50/50 text-left text-xs text-black/50">
                <Th>#</Th>
                <Th>Batch</Th>
                <Th>Vendor</Th>
                <Th>Box</Th>
                <Th>Gender</Th>
                <Th>Grade</Th>
                <Th>In Date</Th>
                <Th>Out Date</Th>
                <Th>Days</Th>
                <Th>In Wt (g)</Th>
                <Th>Out Wt (g)</Th>
                <Th>Wt Gain</Th>
                <Th>Purchase ₹</Th>
                <Th>Sale ₹</Th>
                <Th>Hardness %</Th>
                <Th>Status</Th>
                <Th>Remarks</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const days = daysBetween(r.intakeDate, r.exitDate);
                const gain =
                  r.intakeWeightGrams !== null && r.exitWeightGrams !== null ? r.exitWeightGrams - r.intakeWeightGrams : null;
                const meta = STATUS_META[r.status as keyof typeof STATUS_META];
                return (
                  <tr key={r.id} className="border-b border-brand-50 hover:bg-brand-50/40">
                    <Td className="font-medium text-brand-900">
                      <span className="flex items-center gap-1.5">
                        {r.legacyCrabNumber}
                        {r.needsReview && (
                          <span title={r.reviewNote ?? "Needs review"} className="text-amber-500">
                            <WarnIcon />
                          </span>
                        )}
                      </span>
                    </Td>
                    <Td>{r.batchNumber !== null ? `B${r.batchNumber}` : "—"}</Td>
                    <Td className="max-w-[140px] truncate">{r.vendorName ?? "—"}</Td>
                    <Td>{r.systemBoxLabel ?? "—"}</Td>
                    <Td>{r.gender.charAt(0)}</Td>
                    <Td>{GRADE_LABELS[r.grade as keyof typeof GRADE_LABELS] ?? r.grade}</Td>
                    <Td>{formatDate(r.intakeDate)}</Td>
                    <Td>{formatDate(r.exitDate)}</Td>
                    <Td>{days ?? "—"}</Td>
                    <Td>{formatNumber(r.intakeWeightGrams)}</Td>
                    <Td>{formatNumber(r.exitWeightGrams)}</Td>
                    <Td className={gain !== null && gain < 0 ? "text-rose-500" : ""}>{gain ?? "—"}</Td>
                    <Td>{formatCurrency(r.purchasePrice)}</Td>
                    <Td>{formatCurrency(r.saleOrReturnAmount)}</Td>
                    <Td>{r.inwardHardnessPct ?? "—"}</Td>
                    <Td>
                      <Badge tone={meta?.tone ?? "neutral"}>{meta?.label ?? r.status}</Badge>
                    </Td>
                    <Td className="max-w-[180px] truncate text-black/50">{r.legacyRemarks ?? ""}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/inventory/${r.id}`}
                          className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-100"
                          aria-label="View"
                        >
                          <ViewIcon />
                        </Link>
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-100"
                          aria-label="Edit"
                        >
                          <EditIcon />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={18} className="py-10 text-center text-sm text-black/40">
                    No crabs match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-brand-100 p-4 text-sm">
          <p className="text-black/50">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              Previous
            </Button>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      <CrabFormModal
        key={editingCrab ? `edit-${editingCrab.id}` : "new"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        crab={editingCrab}
        vendors={vendors}
        boxes={boxes}
        batches={batches}
        nextLegacyNumber={nextNumber}
        onSaved={() => {
          if (!editingCrab) setNextNumber((n) => n + 1);
          load(page);
        }}
        onRefetchOptions={refetchOptions}
      />
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-2.5 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-3 py-2.5 text-black/70 ${className}`}>{children}</td>;
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 3a.75.75 0 01.75.75v5.5h5.5a.75.75 0 010 1.5h-5.5v5.5a.75.75 0 01-1.5 0v-5.5h-5.5a.75.75 0 010-1.5h5.5v-5.5A.75.75 0 0110 3z" />
    </svg>
  );
}
function ViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 3.5c-4.5 0-7.5 3.5-8.5 6.5 1 3 4 6.5 8.5 6.5s7.5-3.5 8.5-6.5c-1-3-4-6.5-8.5-6.5zM10 13.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-8.5 8.5a2 2 0 01-.848.502l-3.077.878a.5.5 0 01-.62-.62l.878-3.077a2 2 0 01.502-.848l8.5-8.5z" />
    </svg>
  );
}
function WarnIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.516-2.63L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
