"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Users } from "lucide-react";
import { useMutual } from "@/lib/store";
import type { Lead, LeadStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Column {
  key: string;
  label: string;
  statuses: LeadStatus[];
}

const COLUMNS: Column[] = [
  { key: "discovered", label: "Discovered", statuses: ["discovered", "researching"] },
  { key: "ready", label: "Ready", statuses: ["ready"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "sent", label: "Sent", statuses: ["sent"] },
  { key: "replied", label: "Replied", statuses: ["replied"] },
];

function fitScoreVariant(score: number): "default" | "secondary" | "outline" {
  if (score >= 70) return "default";
  if (score >= 40) return "secondary";
  return "outline";
}

function LeadCard({
  lead,
  onOpen,
  onAdvance,
}: {
  lead: Lead;
  onOpen: () => void;
  onAdvance?: { label: string; action: () => void };
}) {
  return (
    // A div with button semantics: the card contains its own action button, and buttons can't nest.
    <div
      role="button"
      tabIndex={0}
      data-lead-card
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex w-full cursor-pointer flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-foreground">{lead.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {lead.role}
            {lead.company ? ` · ${lead.company}` : ""}
          </div>
        </div>
        {lead.analysis && (
          <Badge variant={fitScoreVariant(lead.analysis.fitScore)} className="shrink-0 rounded-md">
            {lead.analysis.fitScore}
          </Badge>
        )}
      </div>

      {lead.status === "researching" ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Researching...
        </div>
      ) : lead.analysis ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{lead.analysis.headline}</p>
      ) : lead.error ? (
        <p className="line-clamp-2 text-xs text-destructive">{lead.error}</p>
      ) : (
        <p className="line-clamp-2 text-xs text-muted-foreground">{lead.whyTarget}</p>
      )}

      {onAdvance && (
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="mt-1"
          onClick={(e) => {
            e.stopPropagation();
            onAdvance.action();
          }}
        >
          {onAdvance.label}
        </Button>
      )}
    </div>
  );
}

export function PipelineView({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const { leads, setStatus } = useMutual();
  const [showSkipped, setShowSkipped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  const skipped = leads.filter((l) => l.status === "skipped");

  useEffect(() => {
    if (leads.length === prevCount.current) return;
    prevCount.current = leads.length;
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    let cancelled = false;
    import("animejs").then(({ animate, stagger }) => {
      if (cancelled || !containerRef.current) return;
      const cards = containerRef.current.querySelectorAll("[data-lead-card]");
      if (!cards.length) return;
      animate(cards, {
        opacity: [0, 1],
        translateY: [8, 0],
        delay: stagger(25),
        duration: 240,
        ease: "outQuad",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [leads.length]);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
        <Users className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No leads yet. Go find people to reach out to from Setup.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="flex min-w-max gap-4">
          {COLUMNS.map((col) => {
            const items = leads.filter((l) => col.statuses.includes(l.status));
            return (
              <div key={col.key} className="flex w-64 shrink-0 flex-col gap-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {col.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                      Empty
                    </div>
                  )}
                  {items.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onOpen={() => onOpenLead(lead.id)}
                      onAdvance={
                        lead.status === "approved"
                          ? { label: "Mark sent", action: () => setStatus(lead.id, "sent") }
                          : lead.status === "sent"
                            ? { label: "Mark replied", action: () => setStatus(lead.id, "replied") }
                            : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {skipped.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowSkipped((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showSkipped ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {skipped.length} skipped
          </button>
          {showSkipped && (
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {skipped.map((lead) => (
                  <div key={lead.id} className="w-64 shrink-0">
                    <LeadCard lead={lead} onOpen={() => onOpenLead(lead.id)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
