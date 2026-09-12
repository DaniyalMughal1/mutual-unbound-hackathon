"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useMutual } from "@/lib/store";
import { EXAMPLE_PROFILE_RAW, EXAMPLE_TARGET } from "@/lib/example";
import type { Channel, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </div>
  );
}

function ChipRow({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge key={i} variant="secondary" className="h-auto max-w-full rounded-md text-left font-normal whitespace-normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function ProfileSummary({ profile }: { profile: UserProfile }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3.5">
      <div>
        <div className="text-sm font-semibold text-foreground">{profile.name}</div>
        <div className="text-[13px] text-muted-foreground">{profile.headline}</div>
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <SectionLabel>Education</SectionLabel>
          {profile.education.length ? (
            <ul className="space-y-0.5 text-[13px] text-foreground">
              {profile.education.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <div className="space-y-1">
          <SectionLabel>Work</SectionLabel>
          {profile.work.length ? (
            <ul className="space-y-0.5 text-[13px] text-foreground">
              {profile.work.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <SectionLabel>Projects</SectionLabel>
        {profile.projects.length ? (
          <ul className="space-y-0.5 text-[13px] text-foreground">
            {profile.projects.map((p, i) => (
              <li key={i}>
                <span className="font-medium">{p.name}</span> — {p.summary}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <SectionLabel>Skills</SectionLabel>
          <ChipRow items={profile.skills} />
        </div>
        <div className="space-y-1">
          <SectionLabel>Interests</SectionLabel>
          <ChipRow items={profile.interests} />
        </div>
      </div>
      <div className="space-y-1">
        <SectionLabel>Goals</SectionLabel>
        {profile.goals.length ? (
          <ul className="space-y-0.5 text-[13px] text-foreground">
            {profile.goals.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}

export function SetupView({ onDiscover }: { onDiscover: () => void }) {
  const {
    profileRaw,
    setProfileRaw,
    profile,
    profileLoading,
    profileError,
    buildProfile,
    target,
    setTarget,
    discovery,
    discover,
  } = useMutual();
  const [sourceOpen, setSourceOpen] = useState(true);

  const missing: string[] = [];
  if (!profile) missing.push("build your profile");
  if (!target.description.trim()) missing.push("describe who you want to reach");
  if (!target.goal.trim()) missing.push("add your goal");
  const canDiscover = missing.length === 0 && !discovery.active;

  const setFilter = (key: keyof NonNullable<typeof target.filters>, value: string) =>
    setTarget({ filters: { ...target.filters, [key]: value } });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* LEFT: You */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel>You</SectionLabel>
            {profile && (
              <button
                type="button"
                onClick={() => setSourceOpen((v) => !v)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {sourceOpen ? "Hide source" : "Edit source"}
              </button>
            )}
          </div>

          {(sourceOpen || !profile) && (
            <div className="space-y-2">
              <Textarea
                value={profileRaw}
                onChange={(e) => setProfileRaw(e.target.value)}
                placeholder="Paste your bio, resume, portfolio notes, or a ChatGPT/Claude export about yourself..."
                className="min-h-40 text-[13px]"
                aria-label="Your background"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setProfileRaw(EXAMPLE_PROFILE_RAW)}
                >
                  Use example profile (Sam Rivera, demo data)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={profileLoading || !profileRaw.trim()}
                  onClick={() => void buildProfile()}
                >
                  {profileLoading ? (
                    <>
                      <Loader2 className="animate-spin" /> Building...
                    </>
                  ) : (
                    "Build my profile"
                  )}
                </Button>
              </div>
              {profileError && (
                <p className="text-xs text-destructive">{profileError}</p>
              )}
            </div>
          )}

          {profile && <ProfileSummary profile={profile} />}
        </div>

        {/* RIGHT: Who you want to reach */}
        <div className="space-y-3">
          <SectionLabel>Who you want to reach</SectionLabel>

          <div className="space-y-1.5">
            <Label htmlFor="target-description" className="text-xs">
              Description
            </Label>
            <Textarea
              id="target-description"
              value={target.description}
              onChange={(e) => setTarget({ description: e.target.value })}
              placeholder="Describe who you want to reach, e.g. founders of early-stage AI infra startups in Toronto"
              className="min-h-20 text-[13px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="target-goal" className="text-xs">
              Goal
            </Label>
            <Input
              id="target-goal"
              value={target.goal}
              onChange={(e) => setTarget({ goal: e.target.value })}
              placeholder="What outcome are you after? e.g. a 15-minute call about an internship"
            />
          </div>

          <div className="space-y-1.5">
            <SectionLabel>Filters (optional)</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Role"
                placeholder="Role"
                value={target.filters.role ?? ""}
                onChange={(e) => setFilter("role", e.target.value)}
              />
              <Input
                aria-label="Company"
                placeholder="Company"
                value={target.filters.company ?? ""}
                onChange={(e) => setFilter("company", e.target.value)}
              />
              <Input
                aria-label="Industry"
                placeholder="Industry"
                value={target.filters.industry ?? ""}
                onChange={(e) => setFilter("industry", e.target.value)}
              />
              <Input
                aria-label="Location"
                placeholder="Location"
                value={target.filters.location ?? ""}
                onChange={(e) => setFilter("location", e.target.value)}
              />
              <Input
                aria-label="School"
                placeholder="School"
                value={target.filters.school ?? ""}
                onChange={(e) => setFilter("school", e.target.value)}
              />
              <Input
                aria-label="Keywords"
                placeholder="Keywords"
                value={target.filters.keywords ?? ""}
                onChange={(e) => setFilter("keywords", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="target-channel" className="text-xs">
                Channel
              </Label>
              <Select
                value={target.channel}
                onValueChange={(v) => setTarget({ channel: v as Channel })}
              >
                <SelectTrigger id="target-channel" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="x">X</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-count" className="text-xs">
                How many people
              </Label>
              <Input
                id="target-count"
                type="number"
                min={1}
                max={8}
                value={target.count}
                onChange={(e) =>
                  setTarget({ count: Math.min(8, Math.max(1, Number(e.target.value) || 1)) })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="target-tone" className="text-xs">
              Tone
            </Label>
            <Input
              id="target-tone"
              value={target.tone}
              onChange={(e) => setTarget({ tone: e.target.value })}
              placeholder="warm, direct, concise — no flattery"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="target-base-message" className="text-xs">
              Base message (optional)
            </Label>
            <Textarea
              id="target-base-message"
              value={target.baseMessage ?? ""}
              onChange={(e) => setTarget({ baseMessage: e.target.value })}
              placeholder="Draft you already have that Mutual should adapt, if any"
              className="min-h-14 text-[13px]"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTarget(EXAMPLE_TARGET)}
          >
            Use example target (demo data)
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          {discovery.active
            ? `Discovering... ${discovery.note ?? ""}`
            : discovery.error
              ? <span className="text-destructive">{discovery.error}</span>
              : !canDiscover
                ? `Before you can find people: ${missing.join(", ")}.`
                : "Ready to find real people matching your target."}
        </div>
        <Button
          type="button"
          disabled={!canDiscover}
          onClick={() => {
            void discover();
            onDiscover();
          }}
        >
          {discovery.active ? (
            <>
              <Loader2 className="animate-spin" /> Finding people...
            </>
          ) : (
            <>
              <Search /> Find people
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
