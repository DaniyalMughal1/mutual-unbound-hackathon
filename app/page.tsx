"use client";

import { useEffect, useState } from "react";
import { MutualProvider, useMutual } from "@/lib/store";
import { SetupView } from "@/components/setup-view";
import { LeadsView } from "@/components/leads-view";
import { PipelineView } from "@/components/pipeline-view";
import { Initials, LogoMark } from "@/components/lead-bits";
import { KeySettings } from "@/components/key-settings";
import { cn } from "@/lib/utils";

type View = "setup" | "leads" | "pipeline";

export default function Home() {
  return (
    <MutualProvider>
      <Workspace />
    </MutualProvider>
  );
}

function Workspace() {
  const m = useMutual();
  const [view, setView] = useState<View>("setup");

  useEffect(() => {
    if (m.hydrated && m.leads.length > 0) setView("leads");
    // only on first hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.hydrated]);

  const inPipeline = m.leads.filter((l) => ["approved", "sent", "replied"].includes(l.status)).length;
  const tabs: { id: View; label: string; count?: number }[] = [
    { id: "setup", label: "Setup" },
    { id: "leads", label: "People", count: m.leads.length || undefined },
    { id: "pipeline", label: "Pipeline", count: inPipeline || undefined },
  ];

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-5 border-b px-4 md:px-5">
        <div className="flex items-center gap-2">
          <LogoMark className="text-foreground" />
          <span className="text-[15px] font-semibold tracking-tight">Mutual</span>
        </div>
        <span className="hidden text-sm text-muted-foreground lg:inline">Outreach that starts from common ground</span>

        <nav className="flex items-center gap-1 rounded-lg bg-muted p-1 lg:ml-6" aria-label="Views">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              aria-current={view === t.id ? "page" : undefined}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                view === t.id && "bg-background text-foreground shadow-sm",
              )}
            >
              {t.label}
              {t.count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{t.count}</span>}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <KeySettings />
          {m.profile ? (
            <button onClick={() => setView("setup")} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
              <Initials name={m.profile.name} className="size-7 text-[11px]" />
              <span className="hidden text-left sm:block">
                <span className="block text-sm leading-tight font-medium">{m.profile.name}</span>
                <span className="block max-w-56 truncate text-xs leading-tight text-muted-foreground">{m.profile.headline}</span>
              </span>
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">No profile yet</span>
          )}
        </div>
      </header>

      <div className={cn("min-h-0 flex-1", view === "leads" ? "overflow-hidden" : "overflow-y-auto")}>
        {view === "setup" && (
          <div className="mx-auto w-full max-w-6xl px-5 py-6">
            <SetupView onDiscover={() => setView("leads")} />
          </div>
        )}
        {view === "leads" && <LeadsView onGoSetup={() => setView("setup")} />}
        {view === "pipeline" && (
          <div className="px-5 py-6">
            <PipelineView
              onOpenLead={(id) => {
                m.select(id);
                setView("leads");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
