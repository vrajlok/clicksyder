import { createSession, publicUser, sessionCookie } from "../../../../lib/auth";
import { ensureDatabase, getDatabase, type AppUser } from "../../../../lib/database";
import { verifyPassword } from "../../../../lib/security";

export async function POST(request: Request) {
  await ensureDatabase();
  const payload = await request.json() as { username?: string; password?: string };
  const username = payload.username?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  if (!username || !password) return Response.json({ error: "Informe o usuário e a senha." }, { status: 400 });

  const row = await getDatabase().prepare("SELECT id, username, password_hash AS passwordHash, role, active FROM users WHERE lower(username) = ?").bind(username).first() as (AppUser & { passwordHash: string }) | null;
  if (!row || !row.active || !(await verifyPassword(password, row.passwordHash))) {
    return Response.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  const session = await createSession(row.id);
  return Response.json({ user: publicUser(row) }, { headers: { "Set-Cookie": sessionCookie(session.token, session.expires, request) } });
}
