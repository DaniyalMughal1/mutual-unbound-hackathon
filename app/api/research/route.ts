import {
  MissingKeyError,
  analyzeConnection,
  errorMessage,
  llmFromRequest,
  researchLead,
  type LLM,
} from "@/lib/pipeline";
import { ndjsonResponse } from "@/lib/ndjson";
import type { Lead, ResearchEvent, TargetSpec, UserProfile } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  let llm: LLM;
  try {
    llm = llmFromRequest(request);
  } catch (err) {
    const missing = err instanceof MissingKeyError;
    return Response.json({ error: errorMessage(err), code: missing ? "missing_key" : undefined }, { status: missing ? 401 : 500 });
  }
  const { profile, target, lead } = (await request.json()) as {
    profile: UserProfile;
    target: TargetSpec;
    lead: Lead;
  };
  return ndjsonResponse<ResearchEvent>(async (send) => {
    try {
      send({ type: "stage", stage: "researching", note: `Researching ${lead.name}` });
      const findings = await researchLead(llm, lead, target, (query) => send({ type: "search", query }));
      // Preliminary dossier so the UI can show sources while the connection engine runs.
      send({
        type: "research",
        research: {
          summary: "",
          education: [],
          career: [],
          companyFocus: "",
          recentActivity: [],
          interests: [],
          contactHints: [],
          sources: findings.sources,
        },
      });
      send({ type: "stage", stage: "connecting", note: "Comparing their context with yours" });
      const { research, analysis } = await analyzeConnection(llm, profile, target, lead, findings);
      send({ type: "research", research });
      send({ type: "analysis", analysis });
      send({ type: "done" });
    } catch (err) {
      send({ type: "error", message: errorMessage(err) });
    }
  });
}
