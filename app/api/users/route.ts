import { getCurrentUser } from "../../../lib/auth";
import { getDatabase } from "../../../lib/database";
import { hashPassword } from "../../../lib/security";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Sessão expirada." }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const payload = await request.json() as { action?: string; id?: number; username?: string; password?: string };
  const database = getDatabase();

  if (payload.action === "deactivate" || payload.action === "activate") {
    const id = Number(payload.id);
    if (id === user.id && payload.action === "deactivate") return Response.json({ error: "O administrador não pode desativar o próprio acesso." }, { status: 400 });
    await database.prepare("UPDATE users SET active = ? WHERE id = ? AND role != 'admin'").bind(payload.action === "activate" ? 1 : 0, id).run();
    return Response.json({ ok: true });
  }

  const username = payload.username?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  if (username.length < 3 || password.length < 3) return Response.json({ error: "Usuário e senha devem ter pelo menos 3 caracteres." }, { status: 400 });
  try {
    await database.prepare("INSERT INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, 'employee', 1, ?)").bind(username, await hashPassword(password), new Date().toISOString()).run();
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) return Response.json({ error: "Esse nome de usuário já está em uso." }, { status: 409 });
    throw error;
  }
}
