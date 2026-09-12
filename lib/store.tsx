"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  ConnectionAnalysis,
  DiscoverEvent,
  Lead,
  LeadStatus,
  ResearchEvent,
  TargetSpec,
  UserProfile,
} from "./types";

export interface Activity {
  stage: "idle" | "researching" | "connecting" | "done" | "error";
  searches: string[];
  note?: string;
  error?: string;
}

interface State {
  profileRaw: string;
  profile: UserProfile | null;
  target: TargetSpec;
  leads: Lead[];
  selectedId: string | null;
}

const EMPTY_TARGET: TargetSpec = {
  description: "",
  goal: "",
  filters: {},
  channel: "linkedin",
  tone: "warm, direct, concise — no flattery",
  baseMessage: "",
  count: 5,
};

const STORAGE_KEY = "mutual:v1";
const KEY_STORAGE = "mutual:gemini";
const DEFAULT_MODEL = "gemini-3.6-flash";

class KeyNeeded extends Error {}

async function readNdjson<E>(res: Response, onEvent: (e: E) => void) {
  if (res.status === 401) throw new KeyNeeded("Add your Gemini API key to run the pipeline.");
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  if (!res.body) throw new Error("No response stream");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (line) onEvent(JSON.parse(line) as E);
    }
  }
  if (buf.trim()) onEvent(JSON.parse(buf) as E);
}

function useMutualState() {
  const [state, setState] = useState<State>({
    profileRaw: "",
    profile: null,
    target: EMPTY_TARGET,
    leads: [],
    selectedId: null,
  });
  const [hydrated, setHydrated] = useState(false);
  const [apiKey, setApiKeyState] = useState("");
  const [model, setModelState] = useState(DEFAULT_MODEL);
  const [tavilyKey, setTavilyKeyState] = useState("");
  const [serverKeys, setServerKeys] = useState({ gemini: false, tavily: false });
  const [keyOpen, setKeyOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<{ active: boolean; searches: string[]; error?: string; note?: string }>({
    active: false,
    searches: [],
  });
  const [activity, setActivity] = useState<Record<string, Activity>>({});
  const stateRef = useRef(state);
  stateRef.current = state;
  const keyRef = useRef({ apiKey, model, tavilyKey });
  keyRef.current = { apiKey, model, tavilyKey };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as State;
        // any in-flight research from a previous session is no longer running
        parsed.leads = parsed.leads.map((l) => (l.status === "researching" ? { ...l, status: l.analysis ? "ready" : "discovered" } : l));
        setState({ ...parsed, target: { ...EMPTY_TARGET, ...parsed.target } });
      }
      const k = JSON.parse(localStorage.getItem(KEY_STORAGE) ?? "{}") as { apiKey?: string; model?: string; tavilyKey?: string };
      if (k.apiKey) setApiKeyState(k.apiKey);
      if (k.tavilyKey) setTavilyKeyState(k.tavilyKey);
      // Gemini 2.5 models are closed to new API users, so older saved choices fall back to the default.
      if (k.model && !k.model.startsWith("gemini-2.5")) setModelState(k.model);
    } catch {}
    fetch("/api/config")
      .then((r) => r.json())
      .then(setServerKeys)
      .catch(() => {});
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY_STORAGE, JSON.stringify({ apiKey, model, tavilyKey }));
    } catch {}
  }, [apiKey, model, tavilyKey, hydrated]);

  const headers = useCallback((): HeadersInit => {
    const h: Record<string, string> = { "Content-Type": "application/json", "x-gemini-model": keyRef.current.model };
    if (keyRef.current.apiKey) h["x-gemini-key"] = keyRef.current.apiKey;
    if (keyRef.current.tavilyKey) h["x-tavily-key"] = keyRef.current.tavilyKey;
    return h;
  }, []);

  const patchLead = useCallback((id: string, patch: Partial<Lead> | ((l: Lead) => Partial<Lead>)) => {
    setState((s) => ({
      ...s,
      leads: s.leads.map((l) =>
        l.id === id ? { ...l, ...(typeof patch === "function" ? patch(l) : patch), updatedAt: Date.now() } : l,
      ),
    }));
  }, []);

  const setProfileRaw = useCallback((profileRaw: string) => setState((s) => ({ ...s, profileRaw })), []);
  const setProfile = useCallback((profile: UserProfile | null) => setState((s) => ({ ...s, profile })), []);
  const setTarget = useCallback(
    (patch: Partial<TargetSpec>) => setState((s) => ({ ...s, target: { ...s.target, ...patch } })),
    [],
  );
  const select = useCallback((selectedId: string | null) => setState((s) => ({ ...s, selectedId })), []);
  const setApiKey = useCallback((k: string) => setApiKeyState(k), []);
  const setModel = useCallback((mdl: string) => setModelState(mdl), []);
  const setTavilyKey = useCallback((k: string) => setTavilyKeyState(k), []);

  const buildProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ raw: stateRef.current.profileRaw }),
      });
      const json = await res.json();
      if (res.status === 401) {
        setKeyOpen(true);
        throw new Error(json.error);
      }
      if (!res.ok) throw new Error(json.error || "Profile extraction failed");
      setProfile(json.profile);
      return json.profile as UserProfile;
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [headers, setProfile]);

  const research = useCallback(
    async (id: string, known?: Lead) => {
      const { profile, target, leads } = stateRef.current;
      // Freshly discovered leads may not be committed to state yet, so callers can pass them in.
      const lead = known ?? leads.find((l) => l.id === id);
      if (!lead || !profile) return;
      setActivity((a) => ({ ...a, [id]: { stage: "researching", searches: [] } }));
      patchLead(id, { status: "researching", error: undefined });
      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ profile, target, lead: { ...lead, research: undefined, analysis: undefined } }),
        });
        let gotAnalysis = false;
        await readNdjson<ResearchEvent>(res, (e) => {
          if (e.type === "stage")
            setActivity((a) => ({ ...a, [id]: { ...a[id], stage: e.stage === "researching" ? "researching" : "connecting", note: e.note } }));
          if (e.type === "search")
            setActivity((a) => ({ ...a, [id]: { ...a[id], searches: [...(a[id]?.searches ?? []), e.query] } }));
          if (e.type === "research") patchLead(id, { research: e.research });
          if (e.type === "analysis") {
            gotAnalysis = true;
            patchLead(id, { analysis: e.analysis, status: "ready" });
            setActivity((a) => ({ ...a, [id]: { ...a[id], stage: "done" } }));
          }
          if (e.type === "error") throw new Error(e.message);
        });
        if (!gotAnalysis) throw new Error("Research ended without a result");
      } catch (err) {
        if (err instanceof KeyNeeded) setKeyOpen(true);
        const message = err instanceof Error ? err.message : String(err);
        patchLead(id, (l) => ({ status: l.analysis ? "ready" : "discovered", error: message }));
        setActivity((a) => ({ ...a, [id]: { ...(a[id] ?? { searches: [] }), stage: "error", error: message } }));
      }
    },
    [headers, patchLead],
  );

  const discover = useCallback(async () => {
    const { profile, target } = stateRef.current;
    if (!profile) return;
    setDiscovery({ active: true, searches: [], note: "Starting discovery" });
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ profile, target }),
      });
      let found: Lead[] = [];
      await readNdjson<DiscoverEvent>(res, (e) => {
        if (e.type === "stage") setDiscovery((d) => ({ ...d, note: e.note }));
        if (e.type === "search") setDiscovery((d) => ({ ...d, searches: [...d.searches, e.query] }));
        if (e.type === "leads") found = e.leads;
        if (e.type === "error") throw new Error(e.message);
      });
      if (!found.length) throw new Error("No verifiable leads found. Try broadening the target.");
      // People already in the list are skipped, so only new leads are added and researched.
      const existing = new Set(stateRef.current.leads.map((l) => l.name.toLowerCase()));
      const fresh = found.filter((l) => !existing.has(l.name.toLowerCase()));
      setState((s) => ({ ...s, leads: [...fresh, ...s.leads], selectedId: fresh[0]?.id ?? s.selectedId }));
      setDiscovery((d) => ({ ...d, active: false, note: `Found ${found.length} people` }));
      // Research the top two new leads automatically, staggered to stay inside free-tier rate limits.
      fresh.slice(0, 2).forEach((l, i) => setTimeout(() => void research(l.id, l), i * 1500));
    } catch (err) {
      if (err instanceof KeyNeeded) setKeyOpen(true);
      setDiscovery((d) => ({ ...d, active: false, error: err instanceof Error ? err.message : String(err) }));
    }
  }, [headers, research]);

  const setStatus = useCallback((id: string, status: LeadStatus) => patchLead(id, { status }), [patchLead]);

  const updateMessage = useCallback(
    (id: string, message: ConnectionAnalysis["message"]) =>
      patchLead(id, (l) => (l.analysis ? { analysis: { ...l.analysis, message } } : {})),
    [patchLead],
  );

  const reset = useCallback(() => {
    setState((s) => ({ ...s, leads: [], selectedId: null }));
    setActivity({});
    setDiscovery({ active: false, searches: [] });
  }, []);

  return useMemo(
    () => ({
      ...state,
      hydrated,
      apiKey,
      tavilyKey,
      serverKeys,
      model,
      keyOpen,
      profileLoading,
      profileError,
      discovery,
      activity,
      setApiKey,
      setTavilyKey,
      setModel,
      setKeyOpen,
      setProfileRaw,
      setProfile,
      setTarget,
      select,
      buildProfile,
      discover,
      research,
      setStatus,
      updateMessage,
      reset,
    }),
    [state, hydrated, apiKey, tavilyKey, serverKeys, model, keyOpen, setTavilyKey, profileLoading, profileError, discovery, activity, setApiKey, setModel, setProfileRaw, setProfile, setTarget, select, buildProfile, discover, research, setStatus, updateMessage, reset],
  );
}

type MutualStore = ReturnType<typeof useMutualState>;
const Ctx = createContext<MutualStore | null>(null);

export function MutualProvider({ children }: { children: React.ReactNode }) {
  const store = useMutualState();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useMutual() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMutual must be used inside MutualProvider");
  return v;
}
