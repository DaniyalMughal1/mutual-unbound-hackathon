import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type {
  ConnectionAnalysis,
  Lead,
  LeadResearch,
  SourceLink,
  TargetSpec,
  UserProfile,
} from "./types";

// ---------- Model access (bring your own Gemini key) ----------

export const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"] as const;
export const DEFAULT_MODEL = "gemini-2.5-flash";

export interface LLM {
  ai: GoogleGenAI;
  model: string;
}

export class MissingKeyError extends Error {
  constructor() {
    super("Add your Gemini API key to run the pipeline.");
  }
}

// Key comes from the user's browser (x-gemini-key). A deployer can optionally set GEMINI_API_KEY instead.
export function llmFromRequest(request: Request): LLM {
  const apiKey = request.headers.get("x-gemini-key")?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingKeyError();
  const requested = request.headers.get("x-gemini-model") ?? "";
  const model = (MODELS as readonly string[]).includes(requested) ? requested : DEFAULT_MODEL;
  return { ai: new GoogleGenAI({ apiKey }), model };
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [2500, 7000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err instanceof ApiError && [429, 500, 503].includes(err.status);
      if (!retryable || attempt >= delays.length) throw err;
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
}

function jsonSchemaFor(schema: z.ZodType): unknown {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) {
        if (k === "$schema" || k === "additionalProperties") continue;
        out[k] = strip(v);
      }
      return out;
    }
    return node;
  };
  return strip(z.toJSONSchema(schema));
}

async function jsonCall<T>(llm: LLM, opts: { system: string; prompt: string; schema: z.ZodType<T> }): Promise<T> {
  const res = await withRetry(() =>
    llm.ai.models.generateContent({
      model: llm.model,
      contents: opts.prompt,
      config: {
        systemInstruction: opts.system,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchemaFor(opts.schema),
        temperature: 0.4,
      },
    }),
  );
  const text = (res.text ?? "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  if (!text) throw new Error("The model returned an empty response. Try again.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("The model returned malformed JSON. Try again.");
  }
  const parsed = opts.schema.safeParse(raw);
  if (!parsed.success) throw new Error("The model's answer was missing fields. Try again.");
  return parsed.data;
}

interface Grounded {
  text: string;
  queries: string[];
  sources: SourceLink[];
  supports: { text: string; chunks: number[] }[];
}

// Real web research: Gemini with Google Search grounding. Sources come from grounding metadata, not the model's prose.
async function groundedSearch(llm: LLM, opts: { system: string; prompt: string }): Promise<Grounded> {
  const res = await withRetry(() =>
    llm.ai.models.generateContent({
      model: llm.model,
      contents: opts.prompt,
      config: { systemInstruction: opts.system, tools: [{ googleSearch: {} }], temperature: 0.3 },
    }),
  );
  const meta = res.candidates?.[0]?.groundingMetadata;
  const sources: SourceLink[] = (meta?.groundingChunks ?? []).map((c) => ({
    title: c.web?.title || c.web?.domain || "Source",
    url: c.web?.uri ?? "",
  }));
  return {
    text: res.text ?? "",
    queries: meta?.webSearchQueries ?? [],
    sources,
    supports: (meta?.groundingSupports ?? []).map((s) => ({
      text: s.segment?.text ?? "",
      chunks: s.groundingChunkIndices ?? [],
    })),
  };
}

// ---------- Schemas ----------

const UserProfileSchema = z.object({
  name: z.string(),
  headline: z.string(),
  education: z.array(z.string()),
  work: z.array(z.string()),
  projects: z.array(z.object({ name: z.string(), summary: z.string() })),
  skills: z.array(z.string()),
  interests: z.array(z.string()),
  goals: z.array(z.string()),
  notable: z.array(z.string()),
});

const DiscoverySchema = z.object({
  leads: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      company: z.string(),
      location: z.string(),
      whyTarget: z.string(),
    }),
  ),
});

const ResearchSchema = z.object({
  summary: z.string(),
  education: z.array(z.string()),
  career: z.array(z.string()),
  companyFocus: z.string(),
  recentActivity: z.array(z.string()),
  interests: z.array(z.string()),
  contactHints: z.array(z.string()),
});

const AnalysisSchema = z.object({
  headline: z.string(),
  whyReachOut: z.string(),
  angle: z.string(),
  connections: z.array(
    z.object({
      label: z.string(),
      youEvidence: z.string(),
      themEvidence: z.string(),
      sourceIndex: z.number(),
      strength: z.enum(["strong", "medium", "weak"]),
    }),
  ),
  relevantOfYou: z.array(z.string()),
  fitScore: z.number(),
  message: z.object({ subject: z.string(), body: z.string() }),
  followUp: z.string(),
  asset: z.object({ type: z.string(), title: z.string(), content: z.string() }),
  risks: z.array(z.string()),
});

const DossierSchema = z.object({ research: ResearchSchema, analysis: AnalysisSchema });

// ---------- Shared prompt fragments ----------

const ETHICS = `Only use public, professional information. Never invent people, titles, employers, quotes, or URLs; if something is not supported by the search results, leave it out. Do not research or profile minors as individuals; if the target group is minors (e.g. high-school students), look for public organizations, clubs, teachers, or community leaders instead and say so.`;

function profileBlock(p: UserProfile) {
  return `<user_profile>\n${JSON.stringify(p, null, 2)}\n</user_profile>`;
}

function targetBlock(t: TargetSpec) {
  const filters = Object.entries(t.filters)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return `<target>
Who: ${t.description}
Goal: ${t.goal}
${filters ? `Filters:\n${filters}` : "Filters: none"}
Channel: ${t.channel}
Tone: ${t.tone}
${t.baseMessage ? `User's base message (adapt, don't copy):\n${t.baseMessage}` : ""}
</target>`;
}

// A search link is always real, unlike a guessed profile URL.
function profileSearchUrl(name: string, company: string, channel: TargetSpec["channel"]) {
  const q = encodeURIComponent(`${name} ${company}`.trim());
  if (channel === "x") return `https://x.com/search?q=${q}&f=user`;
  if (channel === "instagram") return `https://www.google.com/search?q=${q}+instagram`;
  if (channel === "email") return `https://www.google.com/search?q=${q}`;
  return `https://www.linkedin.com/search/results/people/?keywords=${q}`;
}

// ---------- 1. Understand the user ----------

export async function buildProfile(llm: LLM, raw: string): Promise<UserProfile> {
  return jsonCall(llm, {
    system:
      'You turn raw personal context (bios, resumes, portfolio notes, or AI chat exports) into a compact, factual profile for outreach. Keep every item short and specific (numbers, names, technologies). Only include what the text supports. If the name is unknown use "You".',
    prompt: `<raw_context>\n${raw.slice(0, 60000)}\n</raw_context>`,
    schema: UserProfileSchema,
  });
}

// ---------- 2. Discover leads ----------

export async function discoverLeads(
  llm: LLM,
  profile: UserProfile,
  target: TargetSpec,
  onSearch?: (q: string) => void,
): Promise<Lead[]> {
  const count = Math.min(Math.max(target.count || 5, 1), 8);
  const found = await groundedSearch(llm, {
    system: `You are the lead-discovery stage of a two-sided outreach agent. Use Google Search to find real, currently identifiable people matching the user's target. Prefer people where the user's own background gives a genuine reason to connect (shared school, overlapping technical work, public statements about hiring students). ${ETHICS}`,
    prompt: `${profileBlock(profile)}\n\n${targetBlock(target)}\n\nFind up to ${count} specific people. For each, write a short paragraph starting with their full name that states their current role, company, location, and the concrete facts from search that make them a match.`,
  });
  found.queries.forEach((q) => onSearch?.(q));

  const { leads } = await jsonCall(llm, {
    system: `Extract outreach leads from web search findings. Only include people explicitly named in the findings with a role and company. ${ETHICS}`,
    prompt: `<findings>\n${found.text}\n</findings>\n\nReturn up to ${count} leads. whyTarget: one sentence on how they match this target: ${target.description}. location: "" if unknown.`,
    schema: DiscoverySchema,
  });

  const now = Date.now();
  return leads.slice(0, count).map((l, i) => {
    const first = l.name.split(" ")[0].toLowerCase();
    const idx = new Set(
      found.supports.filter((s) => s.text.toLowerCase().includes(first)).flatMap((s) => s.chunks),
    );
    const sources = [...idx].map((n) => found.sources[n]).filter((s): s is SourceLink => Boolean(s?.url));
    return {
      id: `${now.toString(36)}-${i}-${slug(l.name)}`,
      name: l.name,
      role: l.role,
      company: l.company,
      location: l.location || undefined,
      whyTarget: l.whyTarget,
      profileUrl: profileSearchUrl(l.name, l.company, target.channel),
      sources: dedupe(sources).slice(0, 5),
      source: "gemini-google-search",
      status: "discovered" as const,
      updatedAt: now,
    };
  });
}

// ---------- 3. Research one lead (grounded) ----------

export async function researchLead(
  llm: LLM,
  lead: Pick<Lead, "name" | "role" | "company">,
  target: TargetSpec,
  onSearch?: (q: string) => void,
): Promise<Grounded> {
  const found = await groundedSearch(llm, {
    system: `You are the research stage of an outreach agent. Build a concise public dossier on ONE person so a message to them can be specific. ${ETHICS} Never guess personal emails.`,
    prompt: `Research ${lead.name}, ${lead.role} at ${lead.company}. Outreach goal for context: ${target.goal}.\n\nCover, with dates where known: education; career path; what their company does right now; recent activity (posts, launches, talks, funding, hiring of students or interns); stated interests; public ways to contact them (e.g. LinkedIn, team page).`,
  });
  found.queries.forEach((q) => onSearch?.(q));
  return found;
}

// ---------- 4 + 5. Connection engine + personalized outreach ----------

const CHANNEL_RULES: Record<TargetSpec["channel"], string> = {
  linkedin: "LinkedIn message: max 550 characters, subject is an empty string.",
  email: "Email: subject under 8 words; body 80-140 words; sign off with the user's first name.",
  x: "X DM: max 280 characters, subject is an empty string.",
  instagram: "Instagram DM: max 300 characters, casual, subject is an empty string.",
};

export async function analyzeConnection(
  llm: LLM,
  profile: UserProfile,
  target: TargetSpec,
  lead: Pick<Lead, "name" | "role" | "company" | "whyTarget">,
  findings: Grounded,
): Promise<{ research: LeadResearch; analysis: ConnectionAnalysis }> {
  const sources = dedupe([...findings.sources]).slice(0, 12);
  const numbered = sources.map((s, i) => `[${i}] ${s.title}`).join("\n");
  const out = await jsonCall(llm, {
    system: `You are the connection engine of a two-sided outreach agent. You see who the USER is and who the LEAD is, and you decide why these two people should talk.

First, "research": structure the web findings about the lead into a dossier (bullets under 25 words). contactHints: public channels only.

Then, "analysis":
- A connection is only valid if it is supported on BOTH sides: youEvidence must come from the user profile, themEvidence from the findings. Quote or tightly paraphrase. Never invent.
- Rank connections strongest first, 2-4 of them. Specific overlaps (same technical problem, same school program, something they said that the user's work answers) beat generic ones (both like AI). Mark generic ones "weak".
- sourceIndex: the number of the source backing themEvidence, or -1.
- fitScore (0-100) must be justified by the connections; weak evidence means a low score.
- headline: the strongest genuine connection in one sentence, phrased to the user ("You both...").
- The message must read as individually written by the user: open with the strongest specific connection, say who the user is in one clause, make one clear, low-friction ask tied to the goal. No flattery, no "I hope this finds you well", no buzzwords, no emojis unless the tone asks.
- ${CHANNEL_RULES[target.channel]}
- followUp: a short follow-up for 5-7 days later that adds new value, not "just bumping".
- asset: the single most useful supporting item, e.g. {type:"project", title:<which user project to link and why>, content:<2-3 sentence pitch>} or {type:"resume emphasis", ...}.
- risks: honest caveats (stale info, weak overlap, may not be hiring).`,
    prompt: `${profileBlock(profile)}\n\n${targetBlock(target)}\n\n<lead>\n${JSON.stringify(lead, null, 2)}\n</lead>\n\n<findings>\n${findings.text}\n</findings>\n\n<sources>\n${numbered || "(none)"}\n</sources>`,
    schema: DossierSchema,
  });

  const a = out.analysis;
  return {
    research: { ...out.research, sources },
    analysis: {
      ...a,
      fitScore: Math.max(0, Math.min(100, Math.round(a.fitScore))),
      message: { subject: a.message.subject || undefined, body: a.message.body },
      connections: a.connections.map(({ sourceIndex, ...c }) => ({
        ...c,
        sourceUrl: sources[sourceIndex]?.url,
        sourceTitle: sources[sourceIndex]?.title,
      })),
    },
  };
}

// ---------- utils ----------

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
}

function dedupe(list: SourceLink[]) {
  const seen = new Set<string>();
  return list.filter((s) => s.url && !seen.has(s.url) && seen.add(s.url));
}

export function errorMessage(err: unknown): string {
  if (err instanceof MissingKeyError) return err.message;
  if (err instanceof ApiError) {
    if (err.status === 400 && /api key/i.test(err.message)) return "That Gemini API key isn't valid. Check it in API key settings.";
    if (err.status === 403) return "This Gemini API key doesn't have access. Check it in Google AI Studio.";
    if (err.status === 404) return "That Gemini model isn't available for this key. Pick another model in API key settings.";
    if (err.status === 429) return "Gemini rate limit reached (free tier). Wait a minute and retry, or research fewer people at once.";
    if (err.status === 503) return "Gemini is overloaded right now. Retry in a few seconds.";
    return `Gemini API error ${err.status}: ${err.message.slice(0, 200)}`;
  }
  return err instanceof Error ? err.message : "Unknown error";
}
