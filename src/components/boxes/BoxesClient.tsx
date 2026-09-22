"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { BoxFormModal } from "@/components/boxes/BoxFormModal";
import { formatNumber } from "@/lib/format";

export type BoxRow = {
  id: number;
  label: string;
  section: string | null;
  capacity: number | null;
  notes: string | null;
  occupancy: number;
};

export function BoxesClient({ initialBoxes }: { initialBoxes: BoxRow[] }) {
  const [boxes] = useState(initialBoxes);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<BoxRow | null>(null);

  const refetch = () => window.location.reload();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return boxes;
    return boxes.filter((b) => b.label.toLowerCase().includes(q) || b.section?.toLowerCase().includes(q));
  }, [boxes, search]);

  const totalOccupied = boxes.filter((b) => b.occupancy > 0).length;

  function openAdd() {
    setEditingBox(null);
    setModalOpen(true);
  }
  function openEdit(b: BoxRow) {
    setEditingBox(b);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-900">System Boxes</h1>
          <p className="mt-1 text-sm text-black/50">
            {formatNumber(boxes.length)} boxes registered — {formatNumber(totalOccupied)} currently occupied.
          </p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon /> Add Box
        </Button>
      </div>

      <Card padded={false}>
        <div className="border-b border-brand-100 p-4">
          <TextInput
            placeholder="Search boxes by label or section…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((b) => (
            <button
              key={b.id}
              onClick={() => openEdit(b)}
              className="flex flex-col items-start gap-1 rounded-xl border border-brand-100 bg-gradient-to-br from-white to-brand-50/60 px-3 py-2.5 text-left transition hover:border-brand-300 hover:shadow-sm"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-semibold text-brand-900">{b.label}</span>
                {b.occupancy > 0 ? (
                  <Badge tone="brand">{b.occupancy}</Badge>
                ) : (
                  <Badge tone="neutral">empty</Badge>
                )}
              </div>
              {b.section && <span className="text-xs text-black/45">{b.section}</span>}
              {b.capacity !== null && <span className="text-xs text-black/35">cap {b.capacity}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-black/40">No boxes match “{search}”.</p>
          )}
        </div>
      </Card>

      <BoxFormModal
        key={editingBox ? `edit-${editingBox.id}` : "new"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        box={editingBox}
        onSaved={refetch}
      />
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
