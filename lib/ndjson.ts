import "server-only";

// Streams newline-delimited JSON events so the UI can show pipeline stages live.
export function ndjsonResponse<E>(run: (send: (event: E) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: E) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          // client disconnected; keep the pipeline from crashing
        }
      };
      try {
        await run(send);
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
