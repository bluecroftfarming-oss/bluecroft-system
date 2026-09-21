import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-brand-100 bg-white/90 shadow-[0_1px_2px_rgba(7,62,73,0.04),0_8px_24px_-12px_rgba(7,62,73,0.12)] backdrop-blur-sm ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-brand-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-black/50">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
