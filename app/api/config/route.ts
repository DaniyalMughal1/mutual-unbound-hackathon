import { serverKeys } from "@/lib/pipeline";

// Tells the UI which keys the server already has (booleans only), so users know whether they must bring their own.
export async function GET() {
  return Response.json(serverKeys());
}
