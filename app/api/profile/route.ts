import { MissingKeyError, buildProfile, errorMessage, llmFromRequest } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const llm = llmFromRequest(request);
    const { raw } = (await request.json()) as { raw?: string };
    if (!raw || raw.trim().length < 20) {
      return Response.json({ error: "Paste at least a few sentences about yourself." }, { status: 400 });
    }
    const profile = await buildProfile(llm, raw);
    return Response.json({ profile });
  } catch (err) {
    const missing = err instanceof MissingKeyError;
    return Response.json(
      { error: errorMessage(err), code: missing ? "missing_key" : undefined },
      { status: missing ? 401 : 500 },
    );
  }
}
