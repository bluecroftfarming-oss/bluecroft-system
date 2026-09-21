"use client";

import { useState } from "react";
import { Select, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export type Option = { id: number; label: string };

/** A <select> with an inline "+ Add new" affordance — used for vendor/box/batch pickers so the
 * intake form never has to send someone away to another page just to register a new vendor. */
export function SelectOrCreate({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Select…",
  createLabel = "Add new",
  createPlaceholder = "New name",
  disabled,
}: {
  options: Option[];
  value: number | null;
  onChange: (id: number | null) => void;
  onCreate: (name: string) => Promise<Option>;
  placeholder?: string;
  createLabel?: string;
  createPlaceholder?: string;
  disabled?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Holds options created from this picker that the parent's `options` list hasn't caught up with
  // yet (its refetch is async) — without this the <select> would briefly have a selected value
  // with no matching <option> and silently show nothing.
  const [localExtras, setLocalExtras] = useState<Option[]>([]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const created = await onCreate(name);
      setLocalExtras((prev) => [...prev.filter((o) => o.id !== created.id), created]);
      onChange(created.id);
      setCreating(false);
      setNewName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create");
    } finally {
      setSaving(false);
    }
  }

  const mergedOptions = [...options, ...localExtras.filter((e) => !options.some((o) => o.id === e.id))];

  if (creating) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <TextInput
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={createPlaceholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
              if (e.key === "Escape") setCreating(false);
            }}
          />
          <Button type="button" variant="primary" disabled={saving || !newName.trim()} onClick={handleCreate}>
            {saving ? "…" : "Add"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <Select
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => {
        if (e.target.value === "__create__") {
          setCreating(true);
          return;
        }
        onChange(e.target.value ? Number(e.target.value) : null);
      }}
    >
      <option value="">{placeholder}</option>
      {mergedOptions.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
      <option value="__create__">+ {createLabel}…</option>
    </Select>
  );
}
