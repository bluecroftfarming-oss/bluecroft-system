import { ReactNode } from "react";

/** A single headline metric tile, used on the dashboard. `emphasis` gives it the brand gradient treatment. */
export function StatCard({
  label,
  value,
  sub,
  icon,
  emphasis = false,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  emphasis?: boolean;
  tone?: "good" | "warn" | "bad";
}) {
  if (emphasis) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[image:var(--gradient-brand)] p-5 text-white shadow-[0_12px_24px_-10px_rgba(0,112,134,0.55)]">
        <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex items-start justify-between">
          <p className="text-sm font-medium text-white/85">{label}</p>
          {icon && <div className="text-white/80">{icon}</div>}
        </div>
        <p className="relative mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="relative mt-1 text-xs text-white/75">{sub}</p>}
      </div>
    );
  }

  const toneText = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : "text-brand-900";

  return (
    <div className="rounded-2xl border border-brand-100 bg-white/90 p-5 shadow-[0_1px_2px_rgba(7,62,73,0.04),0_8px_20px_-14px_rgba(7,62,73,0.15)]">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-black/55">{label}</p>
        {icon && <div className="text-brand-400">{icon}</div>}
      </div>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${toneText}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-black/45">{sub}</p>}
    </div>
  );
}
