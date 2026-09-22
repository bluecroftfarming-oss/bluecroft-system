"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Select } from "@/components/ui/Field";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import type { VendorRow } from "@/components/vendors/VendorsClient";

export function MergeVendorModal({
  open,
  onClose,
  source,
  candidates,
  onMerged,
}: {
  open: boolean;
  onClose: () => void;
  source: VendorRow | null;
  candidates: VendorRow[];
  onMerged: () => void;
}) {
  const [targetId, setTargetId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!source) return null;

  async function handleMerge() {
    if (!targetId) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/vendors/${source!.id}/merge`, {
        method: "POST",
        body: JSON.stringify({ intoVendorId: targetId }),
      });
      onMerged();
      onClose();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not merge");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Merge "${source.name}"`} subtitle="Move its crabs and batches into another vendor" width="md">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This moves all {source.totalCrabs} crab record{source.totalCrabs === 1 ? "" : "s"} and {source.batchCount} batch
          {source.batchCount === 1 ? "" : "es"} from <strong>{source.name}</strong> to the vendor you pick below, then
          deletes <strong>{source.name}</strong>. This can&apos;t be undone.
        </div>
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>}
        <div>
          <FieldLabel required>Merge into</FieldLabel>
          <Select value={targetId} onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Select the vendor to keep</option>
            {candidates
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.totalCrabs} crabs)
                </option>
              ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 border-t border-brand-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" disabled={!targetId || saving} onClick={handleMerge}>
            {saving ? "Merging…" : "Merge Vendors"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
