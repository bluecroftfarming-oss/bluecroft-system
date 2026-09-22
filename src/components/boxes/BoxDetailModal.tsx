"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Select, TextInput } from "@/components/ui/Field";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";
import { GRADE_LABELS, STATUS_META, STATUSES } from "@/lib/meta";
import type { BoxRow } from "@/components/boxes/BoxesClient";

export function BoxDetailModal({
  open,
  onClose,
  box,
  allBoxes,
  onChanged,
  onEditBox,
}: {
  open: boolean;
  onClose: () => void;
  box: BoxRow | null;
  allBoxes: BoxRow[];
  onChanged: () => void;
  onEditBox: () => void;
}) {
  if (!box) return null;
  const capacity = box.capacity ?? 1;
  const isFull = box.occupancy >= capacity;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={box.label}
      subtitle={`${box.section ? box.section + " · " : ""}${box.occupancy}/${capacity} occupied`}
      width="lg"
    >
      <div className="flex flex-col gap-4">
        {box.notes && <p className="rounded-lg bg-brand-50/70 px-3 py-2 text-sm text-black/60">{box.notes}</p>}

        {box.occupants.length === 0 && (
          <p className="rounded-xl border border-dashed border-brand-200 py-8 text-center text-sm text-black/40">
            No crab currently in this box.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {box.occupants.map((crab) => (
            <OccupantRow key={crab.id} crab={crab} box={box} allBoxes={allBoxes} onChanged={onChanged} />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-brand-100 pt-4">
          <span className="text-xs text-black/40">
            {isFull ? "This box is at capacity." : `Room for ${capacity - box.occupancy} more crab${capacity - box.occupancy === 1 ? "" : "s"}.`}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onEditBox}>
              Edit Box Details
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

type Occupant = BoxRow["occupants"][number];

function OccupantRow({
  crab,
  box,
  allBoxes,
  onChanged,
}: {
  crab: Occupant;
  box: BoxRow;
  allBoxes: BoxRow[];
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"none" | "status" | "transfer">("none");
  const [status, setStatus] = useState("HARD");
  const [targetBoxId, setTargetBoxId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(next: "status" | "transfer") {
    setError(null);
    setMode((m) => (m === next ? "none" : next));
  }

  async function submitStatus(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/crabs/${crab.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, timelineNote: note.trim() || undefined }),
      });
      setMode("none");
      setNote("");
      onChanged();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function submitTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!targetBoxId) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/crabs/${crab.id}`, {
        method: "PATCH",
        body: JSON.stringify({ currentSystemBoxId: Number(targetBoxId), timelineNote: note.trim() || undefined }),
      });
      setMode("none");
      setNote("");
      setTargetBoxId("");
      onChanged();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const transferTargets = allBoxes.filter((b) => b.id !== box.id);

  return (
    <div className="rounded-xl border border-brand-100 bg-white p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/inventory/${crab.id}`} className="text-sm font-semibold text-brand-800 hover:underline">
              Crab #{crab.legacyCrabNumber ?? crab.id}
            </Link>
            <Badge tone="neutral">In System</Badge>
          </div>
          <p className="mt-0.5 text-xs text-black/45">
            {GRADE_LABELS[crab.grade as keyof typeof GRADE_LABELS] ?? crab.grade} · {crab.gender.charAt(0)} · In{" "}
            {formatDate(crab.intakeDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => toggle("status")}>
            Update Status
          </Button>
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => toggle("transfer")}>
            Transfer
          </Button>
        </div>
      </div>

      {error && <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{error}</p>}

      {mode === "status" && (
        <form onSubmit={submitStatus} className="mt-3 flex flex-col gap-2 border-t border-brand-50 pt-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FieldLabel>New status</FieldLabel>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.filter((s) => s !== "IN_SYSTEM").map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <FieldLabel>Note (optional)</FieldLabel>
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. sold to buyer X" />
          </div>
          <Button type="submit" disabled={saving} className="!px-4 !py-2">
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      )}

      {mode === "transfer" && (
        <form onSubmit={submitTransfer} className="mt-3 flex flex-col gap-2 border-t border-brand-50 pt-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FieldLabel required>Move to box</FieldLabel>
            <Select required value={targetBoxId} onChange={(e) => setTargetBoxId(e.target.value)}>
              <option value="">Select a box…</option>
              {transferTargets.map((b) => {
                const cap = b.capacity ?? 1;
                const full = b.occupancy >= cap;
                return (
                  <option key={b.id} value={b.id} disabled={full}>
                    {b.label} ({b.occupancy}/{cap}){full ? " — full" : ""}
                  </option>
                );
              })}
            </Select>
          </div>
          <div className="flex-1">
            <FieldLabel>Note (optional)</FieldLabel>
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. box cleaning" />
          </div>
          <Button type="submit" disabled={saving || !targetBoxId} className="!px-4 !py-2">
            {saving ? "Moving…" : "Move"}
          </Button>
        </form>
      )}
    </div>
  );
}
