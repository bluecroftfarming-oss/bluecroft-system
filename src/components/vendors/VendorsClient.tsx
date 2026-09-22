"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { VendorFormModal } from "@/components/vendors/VendorFormModal";
import { MergeVendorModal } from "@/components/vendors/MergeVendorModal";
import { formatNumber } from "@/lib/format";

export type VendorRow = {
  id: number;
  name: string;
  contactPhone: string | null;
  location: string | null;
  notes: string | null;
  legacyAliases: string | null;
  totalCrabs: number;
  mortalityCount: number;
  hardCount: number;
  batchCount: number;
  mortalityPct: number;
  hardPct: number;
};

export function VendorsClient({
  initialVendors,
  duplicateHints,
}: {
  initialVendors: VendorRow[];
  duplicateHints: Record<string, string[]>;
}) {
  const [vendors, setVendors] = useState(initialVendors);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorRow | null>(null);
  const [mergingVendor, setMergingVendor] = useState<VendorRow | null>(null);

  const refetch = async () => {
    const res = await fetch("/api/vendors");
    const json = await res.json();
    // The simple /api/vendors list doesn't carry crab stats, so re-derive by reloading the page
    // data via a fresh fetch would be more work than it's worth here — full reload keeps it simple
    // and correct after a merge or edit.
    window.location.reload();
    return json;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => v.name.toLowerCase().includes(q) || v.location?.toLowerCase().includes(q));
  }, [vendors, search]);

  function openAdd() {
    setEditingVendor(null);
    setModalOpen(true);
  }
  function openEdit(v: VendorRow) {
    setEditingVendor(v);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Vendors</h1>
          <p className="mt-1 text-sm text-black/50">
            {formatNumber(vendors.length)} vendor{vendors.length === 1 ? "" : "s"} — volume and outcome rates by source.
          </p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon /> Add Vendor
        </Button>
      </div>

      <Card padded={false}>
        <div className="border-b border-brand-100 p-4">
          <TextInput
            placeholder="Search vendors by name or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-brand-100 bg-brand-50/50 text-left text-xs text-black/50">
                <Th>Vendor</Th>
                <Th>Location</Th>
                <Th>Phone</Th>
                <Th>Crabs</Th>
                <Th>Batches</Th>
                <Th>Hard %</Th>
                <Th>Mortality %</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const dupes = duplicateHints[v.name];
                return (
                  <tr key={v.id} className="border-b border-brand-50 hover:bg-brand-50/40">
                    <Td className="font-medium text-brand-900">
                      <div className="flex items-center gap-2">
                        {v.name}
                        {dupes && (
                          <span
                            title={`Possibly the same as: ${dupes.join(", ")}`}
                            className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
                          >
                            possible dup
                          </span>
                        )}
                      </div>
                      {v.legacyAliases && (
                        <p className="mt-0.5 text-xs text-black/35">also: {v.legacyAliases.split("|").join(", ")}</p>
                      )}
                    </Td>
                    <Td>{v.location ?? "—"}</Td>
                    <Td>{v.contactPhone ?? "—"}</Td>
                    <Td>{formatNumber(v.totalCrabs)}</Td>
                    <Td>{formatNumber(v.batchCount)}</Td>
                    <Td>
                      <Badge tone="good">{v.hardPct}%</Badge>
                    </Td>
                    <Td>
                      <Badge tone={v.mortalityPct >= 35 ? "bad" : v.mortalityPct >= 20 ? "warn" : "neutral"}>
                        {v.mortalityPct}%
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(v)} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-100" aria-label="Edit">
                          <EditIcon />
                        </button>
                        {dupes && (
                          <button
                            onClick={() => setMergingVendor(v)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                          >
                            Merge…
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-black/40">
                    No vendors match “{search}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <VendorFormModal
        key={editingVendor ? `edit-${editingVendor.id}` : "new"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        vendor={editingVendor}
        onSaved={refetch}
      />
      <MergeVendorModal
        key={mergingVendor ? `merge-${mergingVendor.id}` : "no-merge"}
        open={!!mergingVendor}
        onClose={() => setMergingVendor(null)}
        source={mergingVendor}
        candidates={vendors.filter((v) => v.id !== mergingVendor?.id)}
        onMerged={refetch}
      />
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-2.5 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-2.5 text-black/70 ${className}`}>{children}</td>;
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 3a.75.75 0 01.75.75v5.5h5.5a.75.75 0 010 1.5h-5.5v5.5a.75.75 0 01-1.5 0v-5.5h-5.5a.75.75 0 010-1.5h5.5v-5.5A.75.75 0 0110 3z" />
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
