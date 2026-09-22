"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldLabel, FormRow, Select, Textarea, TextInput } from "@/components/ui/Field";
import { SelectOrCreate, type Option } from "@/components/ui/SelectOrCreate";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { GENDERS, GRADES, GRADE_LABELS, STATUSES, STATUS_META, type CrabStatus } from "@/lib/meta";
import type { CrabRow } from "@/components/inventory/InventoryClient";

export function CrabFormModal({
  open,
  onClose,
  crab,
  vendors,
  boxes,
  batches,
  nextLegacyNumber,
  onSaved,
  onRefetchOptions,
}: {
  open: boolean;
  onClose: () => void;
  crab: CrabRow | null;
  vendors: Option[];
  boxes: Option[];
  batches: Option[];
  nextLegacyNumber: number;
  onSaved: () => void;
  onRefetchOptions: () => void;
}) {
  const isEdit = !!crab;

  const [legacyCrabNumber, setLegacyCrabNumber] = useState<number>(crab?.legacyCrabNumber ?? nextLegacyNumber);
  const [vendorId, setVendorId] = useState<number | null>(crab?.vendorId ?? null);
  const [batchId, setBatchId] = useState<number | null>(crab?.batchId ?? null);
  const [boxId, setBoxId] = useState<number | null>(crab?.currentSystemBoxId ?? null);
  const [gender, setGender] = useState(crab?.gender ?? "UNKNOWN");
  const [grade, setGrade] = useState(crab?.grade ?? "UNGRADED");
  const [intakeDate, setIntakeDate] = useState(crab?.intakeDate ?? new Date().toISOString().slice(0, 10));
  const [intakeWeight, setIntakeWeight] = useState<string>(crab?.intakeWeightGrams?.toString() ?? "");
  const [purchasePrice, setPurchasePrice] = useState<string>(crab?.purchasePrice?.toString() ?? "");
  const [hardnessPct, setHardnessPct] = useState<string>(crab?.inwardHardnessPct?.toString() ?? "");
  const [remarks, setRemarks] = useState(crab?.legacyRemarks ?? "");

  const [status, setStatus] = useState<CrabStatus>((crab?.status as CrabStatus) ?? "IN_SYSTEM");
  const [exitDate, setExitDate] = useState(crab?.exitDate ?? "");
  const [exitWeight, setExitWeight] = useState<string>(crab?.exitWeightGrams?.toString() ?? "");
  const [saleAmount, setSaleAmount] = useState<string>(crab?.saleOrReturnAmount?.toString() ?? "");

  const [needsReview, setNeedsReview] = useState(crab?.needsReview ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      legacyCrabNumber,
      vendorId,
      batchId,
      currentSystemBoxId: boxId,
      gender,
      grade,
      intakeDate: intakeDate || null,
      intakeWeightGrams: intakeWeight ? Number(intakeWeight) : null,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      inwardHardnessPct: hardnessPct ? Number(hardnessPct) : null,
      legacyRemarks: remarks || null,
      status,
      exitDate: exitDate || null,
      exitWeightGrams: exitWeight ? Number(exitWeight) : null,
      saleOrReturnAmount: saleAmount ? Number(saleAmount) : null,
      ...(isEdit ? { needsReview } : {}),
    };
    try {
      if (isEdit) {
        await apiFetch(`/api/crabs/${crab!.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/api/crabs", { method: "POST", body: JSON.stringify(body) });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Crab #${crab?.legacyCrabNumber}` : "Add Crab Intake"}
      subtitle={isEdit ? "Update intake details or record its outcome" : "Register a new crab into the hardening system"}
      width="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {isEdit && crab?.needsReview && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-800">Flagged for review</p>
            <p className="mt-0.5 text-xs text-amber-700">{crab.reviewNote}</p>
            <label className="mt-2 flex items-center gap-2 text-xs text-amber-800">
              <input type="checkbox" checked={!needsReview} onChange={(e) => setNeedsReview(!e.target.checked)} />
              Mark as reviewed
            </label>
          </div>
        )}

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>}

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-600">Intake</p>
          <div className="flex flex-col gap-4">
            <FormRow cols={3}>
              <div>
                <FieldLabel required>Crab #</FieldLabel>
                <TextInput
                  type="number"
                  required
                  value={legacyCrabNumber}
                  onChange={(e) => setLegacyCrabNumber(Number(e.target.value))}
                />
              </div>
              <div>
                <FieldLabel>Batch</FieldLabel>
                <SelectOrCreate
                  options={batches}
                  value={batchId}
                  onChange={setBatchId}
                  placeholder="Select batch"
                  createLabel="New batch"
                  createPlaceholder="Batch number e.g. 463"
                  onCreate={async (name) => {
                    const batchNumber = parseInt(name, 10);
                    if (isNaN(batchNumber)) throw new Error("Enter a numeric batch number");
                    const res = await apiFetch<{ data: { id: number; batchNumber: number } }>("/api/batches", {
                      method: "POST",
                      body: JSON.stringify({ batchNumber }),
                    });
                    onRefetchOptions();
                    return { id: res.data.id, label: `Batch ${res.data.batchNumber}` };
                  }}
                />
              </div>
              <div>
                <FieldLabel>Intake Date</FieldLabel>
                <TextInput type="date" value={intakeDate} onChange={(e) => setIntakeDate(e.target.value)} />
              </div>
            </FormRow>

            <FormRow cols={3}>
              <div>
                <FieldLabel>Vendor</FieldLabel>
                <SelectOrCreate
                  options={vendors}
                  value={vendorId}
                  onChange={setVendorId}
                  placeholder="Select vendor"
                  createLabel="New vendor"
                  createPlaceholder="Vendor name"
                  onCreate={async (name) => {
                    const res = await apiFetch<{ data: { id: number; name: string } }>("/api/vendors", {
                      method: "POST",
                      body: JSON.stringify({ name }),
                    });
                    onRefetchOptions();
                    return { id: res.data.id, label: res.data.name };
                  }}
                />
              </div>
              <div>
                <FieldLabel>System Box</FieldLabel>
                <SelectOrCreate
                  options={boxes}
                  value={boxId}
                  onChange={setBoxId}
                  placeholder="Select box"
                  createLabel="New box"
                  createPlaceholder="Label e.g. Box 200"
                  onCreate={async (name) => {
                    const res = await apiFetch<{ data: { id: number; label: string } }>("/api/system-boxes", {
                      method: "POST",
                      body: JSON.stringify({ label: name }),
                    });
                    onRefetchOptions();
                    return { id: res.data.id, label: res.data.label };
                  }}
                />
              </div>
              <div>
                <FieldLabel>Gender</FieldLabel>
                <Select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g.charAt(0) + g.slice(1).toLowerCase()}
                    </option>
                  ))}
                </Select>
              </div>
            </FormRow>

            <FormRow cols={3}>
              <div>
                <FieldLabel>Grade</FieldLabel>
                <Select value={grade} onChange={(e) => setGrade(e.target.value as typeof grade)}>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {GRADE_LABELS[g]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Intake Weight (g)</FieldLabel>
                <TextInput type="number" step="any" value={intakeWeight} onChange={(e) => setIntakeWeight(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Inward Hardness %</FieldLabel>
                <TextInput
                  type="number"
                  step="any"
                  min={0}
                  max={100}
                  value={hardnessPct}
                  onChange={(e) => setHardnessPct(e.target.value)}
                />
              </div>
            </FormRow>

            <FormRow cols={1}>
              <div>
                <FieldLabel>Purchase Price (₹)</FieldLabel>
                <TextInput
                  type="number"
                  step="any"
                  className="max-w-[200px]"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </div>
            </FormRow>

            <div>
              <FieldLabel>Remarks</FieldLabel>
              <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any notes — treatments, injuries, etc." />
            </div>
          </div>
        </div>

        <div className="border-t border-brand-100 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-600">Outcome (fill in when the crab exits)</p>
          <div className="flex flex-col gap-4">
            <FormRow cols={2}>
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select value={status} onChange={(e) => setStatus(e.target.value as CrabStatus)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Exit Date</FieldLabel>
                <TextInput type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} />
              </div>
            </FormRow>
            <FormRow cols={2}>
              <div>
                <FieldLabel>Exit Weight (g)</FieldLabel>
                <TextInput type="number" step="any" value={exitWeight} onChange={(e) => setExitWeight(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Sale / Return Amount (₹)</FieldLabel>
                <TextInput type="number" step="any" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} />
              </div>
            </FormRow>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-brand-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Crab"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
