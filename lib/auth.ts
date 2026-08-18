import { ensureDatabase, getDatabase, type AppUser } from "./database";
import { createToken, hashToken } from "./security";

const COOKIE_NAME = "cc_session";

function cookieValue(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function getCurrentUser(request: Request) {
  await ensureDatabase();
  const token = cookieValue(request, COOKIE_NAME);
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const user = await getDatabase().prepare(`SELECT u.id, u.username, u.role, u.active FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`).bind(tokenHash, new Date().toISOString()).first() as AppUser | null;
  return user ?? null;
}

export async function createSession(userId: number) {
  const token = createToken();
  const tokenHash = await hashToken(token);
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 12);
  await getDatabase().prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").bind(tokenHash, userId, expires.toISOString(), now.toISOString()).run();
  return { token, expires };
}

export async function deleteSession(request: Request) {
  const token = cookieValue(request, COOKIE_NAME);
  if (token) await getDatabase().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await hashToken(token)).run();
}

export function sessionCookie(token: string, expires: Date, request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}${secure}`;
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function publicUser(user: AppUser) {
  return { id: user.id, username: user.username, role: user.role };
}
