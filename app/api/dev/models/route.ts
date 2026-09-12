import { errorMessage, llmFromRequest } from "@/lib/pipeline";

// Development-only diagnostic: which Gemini models can this key call? Never returns the key.
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  try {
    const { ai } = llmFromRequest(request);
    const models: { name: string; actions: string[] }[] = [];
    const pager = await ai.models.list({ config: { pageSize: 100 } });
    for await (const m of pager) {
      if (m.name?.includes("gemini")) models.push({ name: m.name, actions: m.supportedActions ?? [] });
    }
    return Response.json({ count: models.length, models });
  } catch (err) {
    return Response.json({ error: errorMessage(err) }, { status: 500 });
  }
}
