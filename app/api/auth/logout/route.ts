import { clearSessionCookie, deleteSession } from "../../../../lib/auth";
import { ensureDatabase } from "../../../../lib/database";

export async function POST(request: Request) {
  await ensureDatabase();
  await deleteSession(request);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
}
