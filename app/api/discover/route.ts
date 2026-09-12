import { MissingKeyError, discoverLeads, errorMessage, llmFromRequest, type LLM } from "@/lib/pipeline";
import { ndjsonResponse } from "@/lib/ndjson";
import type { DiscoverEvent, TargetSpec, UserProfile } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  let llm: LLM;
  try {
    llm = llmFromRequest(request);
  } catch (err) {
    const missing = err instanceof MissingKeyError;
    return Response.json({ error: errorMessage(err), code: missing ? "missing_key" : undefined }, { status: missing ? 401 : 500 });
  }
  const { profile, target } = (await request.json()) as { profile: UserProfile; target: TargetSpec };
  return ndjsonResponse<DiscoverEvent>(async (send) => {
    try {
      send({ type: "stage", note: "Searching Google for matching people" });
      const leads = await discoverLeads(llm, profile, target, (query) => send({ type: "search", query }));
      send({ type: "leads", leads });
      send({ type: "done" });
    } catch (err) {
      send({ type: "error", message: errorMessage(err) });
    }
  });
}
