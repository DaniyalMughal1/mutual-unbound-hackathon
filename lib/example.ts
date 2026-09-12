import type { TargetSpec } from "./types";

// Example persona for demos. Clearly labeled as example data in the UI.
export const EXAMPLE_PROFILE_RAW = `Sam Rivera — first-year Computer Science student at the University of Waterloo (co-op program, first work term starts May 2027).

Projects:
- Lodestar: open-source vector search engine in Rust. HNSW index, product quantization, serves 2M embeddings at <20ms p95 on a laptop. 400+ GitHub stars.
- RAG-eval: small harness that scores retrieval quality for LLM apps (recall@k, answer faithfulness). Used by two student startups.

Work:
- Software intern, Dispatch Systems (summer 2026): built a route-optimization service for emergency dispatch in Go; cut average assignment time by 18%.
- Teaching assistant, Waterloo CS Club intro-to-Python workshops.

Skills: Rust, Go, Python, TypeScript, PostgreSQL, embeddings / vector databases, distributed systems basics.
Interests: AI infrastructure, retrieval, developer tools, climbing.
Goals: land a co-op internship at an early-stage AI infrastructure startup where I can work on retrieval or inference systems. Open to Toronto, Waterloo, or SF.`;

export const EXAMPLE_TARGET: TargetSpec = {
  description: "Founders or CTOs of early-stage AI infrastructure startups in Toronto or Waterloo who might hire a first-year Waterloo co-op student",
  goal: "Get a 15-minute call about a summer 2027 software co-op internship",
  filters: {
    role: "Founder, Co-founder, CTO",
    industry: "AI infrastructure, developer tools",
    location: "Toronto / Waterloo",
    school: "",
    company: "",
    keywords: "retrieval, vector search, inference, seed stage",
  },
  channel: "linkedin",
  tone: "warm, direct, concise — no flattery",
  baseMessage: "",
  count: 5,
};
