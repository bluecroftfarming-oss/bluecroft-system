"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldLabel, FormRow, Textarea, TextInput } from "@/components/ui/Field";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import type { BoxRow } from "@/components/boxes/BoxesClient";

export function BoxFormModal({
  open,
  onClose,
  box,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  box: BoxRow | null;
  onSaved: () => void;
}) {
  const isEdit = !!box;
  const [label, setLabel] = useState(box?.label ?? "");
  const [section, setSection] = useState(box?.section ?? "");
  const [capacity, setCapacity] = useState(box?.capacity?.toString() ?? "");
  const [notes, setNotes] = useState(box?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      label: label.trim(),
      section: section.trim() || null,
      capacity: capacity ? Number(capacity) : null,
      notes: notes.trim() || null,
    };
    try {
      if (isEdit) {
        await apiFetch(`/api/system-boxes/${box!.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/api/system-boxes", { method: "POST", body: JSON.stringify(body) });
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
      title={isEdit ? `Edit ${box?.label}` : "Add System Box"}
      subtitle={isEdit ? "Update this box's details" : "Register a new hardening box"}
      width="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>}
        <FormRow cols={2}>
          <div>
            <FieldLabel required>Label</FieldLabel>
            <TextInput required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Box 200" />
          </div>
          <div>
            <FieldLabel>Section</FieldLabel>
            <TextInput value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. Shed A" />
          </div>
        </FormRow>
        <div>
          <FieldLabel>Capacity</FieldLabel>
          <TextInput type="number" className="max-w-[160px]" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Notes</FieldLabel>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 border-t border-brand-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !label.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Box"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
