"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldLabel, FormRow, Textarea, TextInput } from "@/components/ui/Field";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import type { VendorRow } from "@/components/vendors/VendorsClient";

export function VendorFormModal({
  open,
  onClose,
  vendor,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  vendor: VendorRow | null;
  onSaved: () => void;
}) {
  const isEdit = !!vendor;
  const [name, setName] = useState(vendor?.name ?? "");
  const [contactPhone, setContactPhone] = useState(vendor?.contactPhone ?? "");
  const [location, setLocation] = useState(vendor?.location ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      name: name.trim(),
      contactPhone: contactPhone.trim() || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (isEdit) {
        await apiFetch(`/api/vendors/${vendor!.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/api/vendors", { method: "POST", body: JSON.stringify(body) });
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
      title={isEdit ? `Edit ${vendor?.name}` : "Add Vendor"}
      subtitle={isEdit ? "Update vendor contact details" : "Register a new vendor / customer"}
      width="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>}
        <div>
          <FieldLabel required>Name</FieldLabel>
          <TextInput required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <FormRow cols={2}>
          <div>
            <FieldLabel>Contact Phone</FieldLabel>
            <TextInput value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Location</FieldLabel>
            <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kumbalangi" />
          </div>
        </FormRow>
        <div>
          <FieldLabel>Notes</FieldLabel>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 border-t border-brand-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Vendor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
