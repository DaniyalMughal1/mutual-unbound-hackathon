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
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash — recommended" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite — fastest" },
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash — newest, slower" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro — paid tier keys" },
];

export function KeySettings() {
  const m = useMutual();
  const geminiReady = Boolean(m.apiKey) || m.serverKeys.gemini;
  const searchReady = Boolean(m.tavilyKey) || m.serverKeys.tavily;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => m.setKeyOpen(true)} className="gap-1.5">
        <span className={cn("size-1.5 rounded-full", geminiReady && searchReady ? "bg-emerald-500" : "bg-amber-500")} />
        <KeyRound className="size-3.5" />
        <span className="hidden sm:inline">
          {geminiReady && searchReady ? "Keys connected" : geminiReady ? "Add search key" : "Add API keys"}
        </span>
      </Button>

      <Dialog open={m.keyOpen} onOpenChange={m.setKeyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect your keys</DialogTitle>
            <DialogDescription>
              Mutual reasons with Google Gemini and researches people with Tavily web search. Both have free keys. Keys stay in this browser and are sent only with your own requests.
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
  const [tavily, setTavily] = useState(m.tavilyKey);
  const [model, setModel] = useState(m.model);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        m.setApiKey(draft.trim());
        m.setTavilyKey(tavily.trim());
        m.setModel(model);
        m.setKeyOpen(false);
      }}
    >
      <KeyField
        id="gemini-key"
        label="Gemini API key"
        href="https://aistudio.google.com/apikey"
        value={draft}
        onChange={setDraft}
        placeholder={m.serverKeys.gemini ? "Using the server's key" : "AIza…"}
      />

      <div className="space-y-1.5">
        <Label htmlFor="gemini-model" className="text-xs">
          Gemini model
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

      <KeyField
        id="tavily-key"
        label="Tavily API key (web search)"
        href="https://app.tavily.com"
        value={tavily}
        onChange={setTavily}
        placeholder={m.serverKeys.tavily ? "Using the server's key" : "tvly-…"}
      />
      <p className="-mt-2 text-xs text-muted-foreground">
        Without a Tavily key, search falls back to Gemini&apos;s Google Search grounding, which needs billing on the Gemini key.
      </p>

      <DialogFooter className="gap-2">
        {(m.apiKey || m.tavilyKey) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              m.setApiKey("");
              m.setTavilyKey("");
              setDraft("");
              setTavily("");
            }}
          >
            Remove keys
          </Button>
        )}
        <Button type="submit" disabled={!draft.trim() && !m.serverKeys.gemini}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

function KeyField(props: {
  id: string;
  label: string;
  href: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={props.id} className="text-xs">
          {props.label}
        </Label>
        <a
          href={props.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
        >
          Get a free key <ArrowUpRight className="size-3" />
        </a>
      </div>
      <Input
        id={props.id}
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
      />
    </div>
  );
}
