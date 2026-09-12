// Shared contract between the API pipeline and the UI.

export type Channel = "linkedin" | "email" | "x" | "instagram";

export interface UserProfile {
  name: string;
  headline: string; // one line: "First-year Waterloo CS student building search infra"
  education: string[];
  work: string[];
  projects: { name: string; summary: string }[];
  skills: string[];
  interests: string[];
  goals: string[];
  notable: string[];
}

export interface TargetSpec {
  description: string; // free-text "who do you want to reach"
  goal: string; // "land a summer SWE internship"
  filters: {
    role?: string;
    company?: string;
    industry?: string;
    location?: string;
    school?: string;
    keywords?: string;
  };
  channel: Channel;
  tone: string; // "warm, concise, no flattery"
  baseMessage?: string;
  count: number;
}

export interface SourceLink {
  title: string;
  url: string;
}

export type LeadStatus =
  | "discovered"
  | "researching"
  | "ready"
  | "approved"
  | "sent"
  | "replied"
  | "skipped";

export interface Lead {
  id: string;
  name: string;
  role: string;
  company: string;
  location?: string;
  whyTarget: string; // why they match the target definition
  profileUrl?: string; // best public profile / page found
  sources: SourceLink[];
  source: string; // adapter id, e.g. "claude-web-search"
  status: LeadStatus;
  research?: LeadResearch;
  analysis?: ConnectionAnalysis;
  error?: string;
  updatedAt: number;
}

export interface LeadResearch {
  summary: string;
  education: string[];
  career: string[];
  companyFocus: string;
  recentActivity: string[]; // posts, launches, talks, hiring signals
  interests: string[];
  contactHints: string[]; // public ways to reach them (no private data)
  sources: SourceLink[];
}

export interface ConnectionPoint {
  label: string; // "Both built retrieval systems"
  youEvidence: string; // from the user profile
  themEvidence: string; // from lead research
  sourceUrl?: string;
  sourceTitle?: string;
  strength: "strong" | "medium" | "weak";
}

export interface ConnectionAnalysis {
  headline: string; // strongest genuine connection in one sentence
  whyReachOut: string;
  angle: string;
  connections: ConnectionPoint[];
  relevantOfYou: string[]; // parts of the user's background to lead with
  fitScore: number; // 0-100, always explained by connections
  message: { subject?: string; body: string };
  followUp: string;
  asset: { type: string; title: string; content: string }; // e.g. project to link, resume emphasis
  risks: string[]; // honest caveats: weak signals, stale info
}

// NDJSON stream events from /api/research
export type ResearchEvent =
  | { type: "stage"; stage: "researching" | "connecting" | "drafting"; note?: string }
  | { type: "search"; query: string }
  | { type: "research"; research: LeadResearch }
  | { type: "analysis"; analysis: ConnectionAnalysis }
  | { type: "error"; message: string }
  | { type: "done" };

// NDJSON stream events from /api/discover
export type DiscoverEvent =
  | { type: "stage"; note: string }
  | { type: "search"; query: string }
  | { type: "leads"; leads: Lead[] }
  | { type: "error"; message: string }
  | { type: "done" };
