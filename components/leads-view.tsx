"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { AlertTriangle, Loader2, Search, Sparkles, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutual } from "@/lib/store";
import { cn } from "@/lib/utils";
import { FitScore, StatusPill } from "./lead-bits";
import { LeadDetail } from "./lead-detail";

export function LeadsView({ onGoSetup }: { onGoSetup: () => void }) {
  const m = useMutual();
  const listRef = useRef<HTMLUListElement>(null);
  const selected = m.leads.find((l) => l.id === m.selectedId) ?? m.leads[0];
  const unresearched = m.leads.filter((l) => !l.analysis && l.status === "discovered");

  useEffect(() => {
    if (!listRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animate(listRef.current.querySelectorAll("li"), {
      opacity: [0, 1],
      translateX: [-8, 0],
      delay: stagger(55),
      duration: 420,
      ease: "outCubic",
    });
  }, [m.leads.length]);

  const empty = m.leads.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <aside className="flex max-h-[45vh] shrink-0 flex-col border-b md:max-h-none md:w-80 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm font-medium">
            People <span className="text-muted-foreground">{m.leads.length || ""}</span>
          </div>
          {unresearched.length > 0 && !m.discovery.active && (
            <Button size="sm" variant="ghost" onClick={() => unresearched.forEach((l) => void m.research(l.id))}>
              <Sparkles className="size-3.5" /> Research {unresearched.length}
            </Button>
          )}
        </div>

        {(m.discovery.active || m.discovery.error) && (
          <div className="mx-3 mb-3 rounded-md border bg-muted/30 p-3">
            {m.discovery.active ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="size-3.5 animate-spin text-primary" /> Discovering people
                </div>
                <ul className="mt-2 space-y-1">
                  {m.discovery.searches.slice(-5).map((q, i) => (
                    <li key={q + i} className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-1">
                      <Search className="size-3 shrink-0" /> <span className="truncate">{q}</span>
                    </li>
                  ))}
                  {!m.discovery.searches.length && <li className="text-xs text-muted-foreground">{m.discovery.note}</li>}
                </ul>
              </>
            ) : (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <div className="flex-1">
                  <p>{m.discovery.error}</p>
                  <div className="mt-1.5 flex flex-wrap gap-3">
                    <Button size="sm" variant="link" className="h-auto px-0" onClick={() => void m.discover()}>
                      Try again
                    </Button>
                    {/key/i.test(m.discovery.error ?? "") && (
                      <Button size="sm" variant="link" className="h-auto px-0" onClick={() => m.setKeyOpen(true)}>
                        Open key settings
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
          {m.leads.map((l) => {
            const active = selected?.id === l.id;
            return (
              <li key={l.id}>
                <button
                  onClick={() => m.select(l.id)}
                  className={cn(
                    "w-full border-l-2 border-transparent px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
                    active && "border-primary bg-muted/60",
                    l.status === "skipped" && "opacity-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{l.name}</span>
                    {l.analysis ? (
                      <FitScore score={l.analysis.fitScore} />
                    ) : l.status === "researching" ? (
                      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {l.role} · {l.company}
                  </div>
                  {l.analysis && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-foreground/80">{l.analysis.headline}</p>}
                  <StatusPill status={l.status} className="mt-1.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {selected ? (
          <LeadDetail key={selected.id} lead={selected} />
        ) : m.discovery.active ? (
          <div className="grid h-full place-items-center p-10 text-center">
            <div>
              <Loader2 className="mx-auto size-5 animate-spin text-primary" />
              <p className="mt-3 text-sm font-medium">Searching the public web for people who match your target</p>
              <p className="mt-1 text-sm text-muted-foreground">Usually 30–60 seconds. Research on the top matches starts automatically.</p>
            </div>
          </div>
        ) : (
          empty && (
            <div className="grid h-full place-items-center p-10 text-center">
              <div>
                <UserRoundSearch className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No people yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Build your profile and define who you want to reach.</p>
                <Button className="mt-4" size="sm" onClick={onGoSetup}>
                  Go to setup
                </Button>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
