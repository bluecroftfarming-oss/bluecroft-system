"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldLabel, TextInput } from "@/components/ui/Field";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("next") || "/";
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#e6fbfd,_#f4fdfe)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-brand-100 bg-white/90 p-8 shadow-[0_1px_2px_rgba(7,62,73,0.04),0_20px_40px_-20px_rgba(7,62,73,0.25)] backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/bluecroft-logo.png" alt="Bluecroft Farming" width={56} height={56} className="h-14 w-14 object-contain" />
          <h1 className="mt-3 text-lg font-semibold text-brand-900">Bluecroft Farming</h1>
          <p className="mt-0.5 text-sm text-black/50">Sign in to the Crab Inventory System</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>
          )}
          <div>
            <FieldLabel required>Username</FieldLabel>
            <TextInput
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <FieldLabel required>Password</FieldLabel>
            <TextInput
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="mt-2 w-full justify-center" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
