"use client";

import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/types";

export const STATUS_META: Record<LeadStatus, { label: string; dot: string }> = {
  discovered: { label: "Discovered", dot: "bg-zinc-400" },
  researching: { label: "Researching", dot: "bg-amber-500 animate-pulse" },
  ready: { label: "Ready", dot: "bg-primary" },
  approved: { label: "Approved", dot: "bg-sky-500" },
  sent: { label: "Sent", dot: "bg-emerald-500" },
  replied: { label: "Replied", dot: "bg-emerald-700" },
  skipped: { label: "Skipped", dot: "bg-zinc-300" },
};

export function StatusPill({ status, className }: { status: LeadStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground", className)}>
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function FitScore({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const tone = score >= 75 ? "text-primary" : score >= 50 ? "text-foreground" : "text-muted-foreground";
  if (size === "lg") {
    const r = 22;
    const c = 2 * Math.PI * r;
    return (
      <div className="relative size-14 shrink-0" aria-label={`Fit score ${score} of 100`}>
        <svg viewBox="0 0 56 56" className="size-14 -rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" className="stroke-muted" />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
            className="stroke-primary transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <span className={cn("absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums", tone)}>{score}</span>
      </div>
    );
  }
  return <span className={cn("text-xs font-semibold tabular-nums", tone)}>{score}</span>;
}

export function Initials({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground/80",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <circle cx="9" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 6.804A6 6 0 0 1 12 17.196A6 6 0 0 1 12 6.804Z" className="fill-primary" />
    </svg>
  );
}

export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11px] font-medium uppercase tracking-wide text-muted-foreground", className)}>{children}</div>
  );
}
