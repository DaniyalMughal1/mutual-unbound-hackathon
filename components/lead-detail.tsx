"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CircleCheck,
  Copy,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Send,
  SkipForward,
  Sparkles,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutual, type Activity } from "@/lib/store";
import type { Channel, ConnectionPoint, Lead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FitScore, Initials, SectionLabel, StatusPill, domainOf } from "./lead-bits";

const CHANNEL: Record<Channel, { label: string; limit: number }> = {
  linkedin: { label: "LinkedIn", limit: 550 },
  email: { label: "Email", limit: 1200 },
  x: { label: "X", limit: 280 },
  instagram: { label: "Instagram", limit: 300 },
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LeadDetail({ lead }: { lead: Lead }) {
  const m = useMutual();
  const act = m.activity[lead.id];
  const busy = lead.status === "researching";
  const rootRef = useRef<HTMLDivElement>(null);
  const hasAnalysis = Boolean(lead.analysis);

  useEffect(() => {
    if (!hasAnalysis || !rootRef.current || prefersReducedMotion()) return;
    const targets = rootRef.current.querySelectorAll("[data-reveal]");
    animate(targets, {
      opacity: [0, 1],
      translateY: [12, 0],
      delay: stagger(70),
      duration: 520,
      ease: "outCubic",
    });
    const links = rootRef.current.querySelectorAll("[data-link]");
    animate(links, { scale: [0.4, 1], opacity: [0, 1], delay: stagger(90, { start: 250 }), duration: 450, ease: "outBack" });
  }, [lead.id, hasAnalysis]);

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-4xl px-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Initials name={lead.name} className="size-11 text-sm" />
        <div className="min-w-[14rem] flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold tracking-tight">{lead.name}</h2>
            <StatusPill status={lead.status} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {lead.role} · {lead.company}
            {lead.location ? ` · ${lead.location}` : ""}
          </p>
          <p className="mt-2 text-sm text-foreground/80">{lead.whyTarget}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lead.profileUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={lead.profileUrl} target="_blank" rel="noreferrer">
                {domainOf(lead.profileUrl)} <ArrowUpRight className="size-3.5" />
              </a>
            </Button>
          )}
          {!lead.analysis && !busy && (
            <Button size="sm" onClick={() => void m.research(lead.id)}>
              <Sparkles className="size-3.5" /> Research & draft
            </Button>
          )}
        </div>
      </div>

      {lead.error && !busy && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1">{lead.error}</span>
          <Button size="sm" variant="ghost" onClick={() => void m.research(lead.id)}>
            <RefreshCw className="size-3.5" /> Retry
          </Button>
        </div>
      )}

      {(busy || (!lead.analysis && act)) && <PipelineTrace lead={lead} act={act} />}

      {!lead.analysis && !busy && !act && (
        <div className="mt-8 rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">Not researched yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Mutual will research {lead.name.split(" ")[0]}, compare what it finds with your profile, and draft a message built on your strongest real overlap.
          </p>
          <Button className="mt-4" size="sm" onClick={() => void m.research(lead.id)}>
            <Sparkles className="size-3.5" /> Research & draft
          </Button>
        </div>
      )}

      {lead.analysis && <AnalysisView lead={lead} />}
    </div>
  );
}

function PipelineTrace({ lead, act }: { lead: Lead; act?: Activity }) {
  const m = useMutual();
  const stage = act?.stage ?? "researching";
  const researchDone = Boolean(lead.research) || stage === "connecting" || stage === "done";
  const connectDone = Boolean(lead.analysis);
  const first = lead.name.split(" ")[0];
  const steps = [
    {
      label: `Researching ${first}`,
      state: researchDone ? "done" : stage === "error" ? "error" : "active",
    },
    {
      label: `Reading your profile${m.profile ? ` (${m.profile.projects.length} projects, ${m.profile.skills.length} skills)` : ""}`,
      state: connectDone ? "done" : researchDone ? "active" : "waiting",
    },
    { label: "Finding the strongest genuine connection", state: connectDone ? "done" : researchDone ? "active" : "waiting" },
    { label: "Drafting outreach", state: connectDone ? "done" : researchDone ? "active" : "waiting" },
  ] as const;

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full border text-[11px]",
                s.state === "done" && "border-primary bg-primary text-primary-foreground",
                s.state === "active" && "border-primary text-primary",
                s.state === "waiting" && "text-muted-foreground",
                s.state === "error" && "border-destructive text-destructive",
              )}
            >
              {s.state === "done" ? <Check className="size-3.5" /> : s.state === "active" ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
            </span>
            <span className={cn(s.state === "waiting" && "text-muted-foreground")}>{s.label}</span>
          </li>
        ))}
      </ol>
      <div className="rounded-lg border bg-muted/30 p-4">
        <SectionLabel>Live research</SectionLabel>
        <ul className="mt-2 space-y-1.5">
          {(act?.searches ?? []).map((q, i) => (
            <li key={i} className="flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-1">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{q}</span>
            </li>
          ))}
          {!act?.searches?.length && !researchDone && <li className="text-sm text-muted-foreground">Planning searches…</li>}
          {researchDone && lead.research && (
            <li className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
              <CircleCheck className="size-3.5 text-primary" /> {lead.research.sources.length} sources read
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function AnalysisView({ lead }: { lead: Lead }) {
  const m = useMutual();
  const a = lead.analysis!;
  const r = lead.research;
  const channel = CHANNEL[m.target.channel] ?? CHANNEL.linkedin;
  const body = a.message.body;
  const over = body.length > channel.limit;
  const regenerating = lead.status === "researching";

  const fullText = () => (a.message.subject ? `Subject: ${a.message.subject}\n\n${body}` : body);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText());
      toast.success("Message copied");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };
  const openChannel = async () => {
    await copy();
    if (m.target.channel === "email") {
      window.location.href = `mailto:?subject=${encodeURIComponent(a.message.subject ?? "")}&body=${encodeURIComponent(body)}`;
    } else if (lead.profileUrl) {
      window.open(lead.profileUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="mt-6 space-y-8">
      {/* Connection found */}
      <section data-reveal className="rounded-lg border border-primary/25 bg-primary/[0.03] p-5">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3.5" /> Connection found
            </div>
            <p className="mt-2 text-lg font-medium leading-snug tracking-tight">{a.headline}</p>
            <p className="mt-2 text-sm text-muted-foreground">{a.whyReachOut}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <FitScore score={a.fitScore} size="lg" />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Fit</span>
          </div>
        </div>
      </section>

      {/* Two-sided evidence */}
      <section>
        <div data-reveal className="mb-2 grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-end gap-3 px-1">
          <SectionLabel>You</SectionLabel>
          <span />
          <SectionLabel>{lead.name.split(" ")[0]}</SectionLabel>
        </div>
        <div className="divide-y rounded-lg border">
          {a.connections.map((c, i) => (
            <ConnectionRow key={i} c={c} />
          ))}
        </div>
      </section>

      {/* Outreach */}
      <section data-reveal>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionLabel>Suggested outreach · {channel.label}</SectionLabel>
          <span className="text-xs text-muted-foreground">
            Angle: <span className="text-foreground">{a.angle}</span>
          </span>
        </div>
        {a.relevantOfYou.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Leading with:</span>
            {a.relevantOfYou.map((x, i) => (
              <Badge key={i} variant="secondary" className="h-auto max-w-full text-left font-normal whitespace-normal">
                {x}
              </Badge>
            ))}
          </div>
        )}
        <div className={cn("mt-3 rounded-lg border", regenerating && "opacity-60")}>
          {m.target.channel === "email" && (
            <Input
              value={a.message.subject ?? ""}
              onChange={(e) => m.updateMessage(lead.id, { ...a.message, subject: e.target.value })}
              placeholder="Subject"
              className="rounded-none border-0 border-b font-medium shadow-none focus-visible:ring-0"
              aria-label="Email subject"
            />
          )}
          <Textarea
            value={body}
            onChange={(e) => m.updateMessage(lead.id, { ...a.message, body: e.target.value })}
            className="min-h-40 resize-y rounded-none border-0 text-[15px] leading-relaxed shadow-none focus-visible:ring-0"
            aria-label="Message body"
          />
          <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
            <span className={cn("text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
              {body.length}/{channel.limit}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => void m.research(lead.id)} disabled={regenerating}>
                {regenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Regenerate
              </Button>
              <Button variant="ghost" size="sm" onClick={copy}>
                <Copy className="size-3.5" /> Copy
              </Button>
              <ActionButtons lead={lead} onOpen={openChannel} channelLabel={channel.label} />
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Mutual never sends on your behalf. Approve, then copy and open {m.target.channel === "email" ? "your mail client" : "their profile"} to send it yourself.
        </p>
      </section>

      {/* Follow-up + asset */}
      <section data-reveal className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <SectionLabel>Follow-up · day 5–7</SectionLabel>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{a.followUp}</p>
        </div>
        <div className="rounded-lg border p-4">
          <SectionLabel>Attach · {a.asset.type}</SectionLabel>
          <p className="mt-2 text-sm font-medium">{a.asset.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.asset.content}</p>
        </div>
      </section>

      {/* Research */}
      {r && (
        <section data-reveal className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <SectionLabel>What we found</SectionLabel>
            <p className="mt-2 text-sm leading-relaxed">{r.summary}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <Facts label="Company focus" items={r.companyFocus ? [r.companyFocus] : []} />
              <Facts label="Recent activity" items={r.recentActivity} />
              <Facts label="Career" items={r.career} />
              <Facts label="Education" items={r.education} />
              <Facts label="Interests" items={r.interests} />
            </dl>
          </div>
          <div className="space-y-5">
            <div>
              <SectionLabel>Sources · {r.sources.length}</SectionLabel>
              <ul className="mt-2 space-y-1.5">
                {r.sources.map((s, i) => (
                  <li key={i} className="min-w-0">
                    <a href={s.url} target="_blank" rel="noreferrer" className="group flex items-baseline gap-2 text-sm hover:underline">
                      <span className="truncate">{s.title || domainOf(s.url)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            {a.risks.length > 0 && (
              <div>
                <SectionLabel>Caveats</SectionLabel>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {a.risks.map((x, i) => (
                    <li key={i} className="flex gap-2">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {x}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ConnectionRow({ c }: { c: ConnectionPoint }) {
  return (
    <div data-reveal className="p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{c.label}</span>
        <Badge
          variant="outline"
          className={cn(
            "h-5 px-1.5 text-[10px] font-medium uppercase tracking-wide",
            c.strength === "strong" && "border-primary/40 text-primary",
            c.strength === "weak" && "text-muted-foreground",
          )}
        >
          {c.strength}
        </Badge>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-start gap-3">
        <p className="text-sm leading-relaxed text-foreground/85">{c.youEvidence}</p>
        <span data-link className="mt-0.5 grid size-7 place-items-center rounded-full bg-primary/10 text-primary">
          <Link2 className="size-3.5" />
        </span>
        <p className="text-sm leading-relaxed text-foreground/85">
          {c.themEvidence}
          {c.sourceUrl && (
            <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="ml-1.5 text-xs break-words text-muted-foreground hover:underline">
              {c.sourceTitle || domainOf(c.sourceUrl)} ↗
            </a>
          )}
        </p>
      </div>
    </div>
  );
}

function ActionButtons({ lead, onOpen, channelLabel }: { lead: Lead; onOpen: () => void; channelLabel: string }) {
  const m = useMutual();
  switch (lead.status) {
    case "ready":
    case "discovered":
      return (
        <>
          <Button variant="outline" size="sm" onClick={() => m.setStatus(lead.id, "skipped")}>
            <SkipForward className="size-3.5" /> Skip
          </Button>
          <Button size="sm" onClick={() => m.setStatus(lead.id, "approved")}>
            <Check className="size-3.5" /> Approve
          </Button>
        </>
      );
    case "approved":
      return (
        <>
          <Button variant="outline" size="sm" onClick={onOpen}>
            <ArrowUpRight className="size-3.5" /> Copy & open {channelLabel}
          </Button>
          <Button size="sm" onClick={() => m.setStatus(lead.id, "sent")}>
            <Send className="size-3.5" /> Mark sent
          </Button>
        </>
      );
    case "sent":
      return (
        <Button size="sm" variant="outline" onClick={() => m.setStatus(lead.id, "replied")}>
          <CircleCheck className="size-3.5" /> Mark replied
        </Button>
      );
    case "replied":
      return (
        <Badge className="h-8 px-3">
          <CircleCheck className="size-3.5" /> Replied
        </Badge>
      );
    case "skipped":
      return (
        <Button size="sm" variant="outline" onClick={() => m.setStatus(lead.id, "ready")}>
          <Undo2 className="size-3.5" /> Restore
        </Button>
      );
    default:
      return null;
  }
}

function Facts({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <ul className="space-y-1">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </dd>
    </div>
  );
}
