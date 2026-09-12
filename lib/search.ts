import "server-only";

// Web search source adapter: Tavily (free tier, no card). Returns real URLs with text snippets.

export interface SearchHit {
  title: string;
  url: string;
  content: string;
}

export class SearchError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export async function tavilySearch(apiKey: string, query: string, maxResults = 5): Promise<SearchHit[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, search_depth: "basic", max_results: maxResults, topic: "general" }),
    cache: "no-store",
  });
  if (!res.ok) {
    const message =
      res.status === 401
        ? "Tavily API key is missing or invalid. Check it in API key settings."
        : res.status === 429
          ? "Tavily rate limit reached. Wait a moment and retry."
          : res.status === 432 || res.status === 433
            ? "This Tavily key has used its plan's search credits."
            : `Tavily search failed (${res.status}).`;
    throw new SearchError(message, res.status);
  }
  const json = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (json.results ?? [])
    .filter((r): r is { title?: string; url: string; content?: string } => Boolean(r.url))
    .map((r) => ({ title: r.title || r.url, url: r.url, content: (r.content ?? "").slice(0, 1200) }));
}
