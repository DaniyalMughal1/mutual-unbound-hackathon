"use client";

import { useState } from "react";
import { ArrowUpRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutual } from "@/lib/store";
import { cn } from "@/lib/utils";

const MODEL_OPTIONS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash — free tier, recommended" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite — fastest" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro — best quality, lower free limits" },
];

export function KeySettings() {
  const m = useMutual();
  const connected = Boolean(m.apiKey);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => m.setKeyOpen(true)} className="gap-1.5">
        <span className={cn("size-1.5 rounded-full", connected ? "bg-emerald-500" : "bg-amber-500")} />
        <KeyRound className="size-3.5" />
        <span className="hidden sm:inline">{connected ? "Gemini connected" : "Add API key"}</span>
      </Button>

      <Dialog open={m.keyOpen} onOpenChange={m.setKeyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Gemini</DialogTitle>
            <DialogDescription>
              Mutual runs its research and connection engine on Google Gemini with Google Search grounding. Use your own key, which is free from Google AI Studio.
            </DialogDescription>
          </DialogHeader>
          {m.keyOpen && <KeyForm />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Mounted only while the dialog is open, so its draft state starts from the saved values each time.
function KeyForm() {
  const m = useMutual();
  const [draft, setDraft] = useState(m.apiKey);
  const [model, setModel] = useState(m.model);
  const connected = Boolean(m.apiKey);

  return (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              m.setApiKey(draft.trim());
              m.setModel(model);
              m.setKeyOpen(false);
            }}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="gemini-key" className="text-xs">
                  Gemini API key
                </Label>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                >
                  Get a free key <ArrowUpRight className="size-3" />
                </a>
              </div>
              <Input
                id="gemini-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="AIza…"
              />
              <p className="text-xs text-muted-foreground">
                Stored only in this browser. It&apos;s sent with your own requests to Gemini and never saved on the server.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gemini-model" className="text-xs">
                Model
              </Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="gemini-model" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2">
              {connected && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    m.setApiKey("");
                    setDraft("");
                  }}
                >
                  Remove key
                </Button>
              )}
              <Button type="submit" disabled={!draft.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
  );
}
