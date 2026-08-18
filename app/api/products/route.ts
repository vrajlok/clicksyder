import { getCurrentUser } from "../../../lib/auth";
import { getDatabase } from "../../../lib/database";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Sessão expirada." }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const payload = await request.json() as { action?: string; id?: number; code?: string; name?: string; priceCents?: number; stock?: number; lowStock?: number; active?: boolean };
  const database = getDatabase();
  const now = new Date().toISOString();

  if (payload.action === "deactivate") {
    await database.prepare("UPDATE products SET active = 0, updated_at = ? WHERE id = ?").bind(now, Number(payload.id)).run();
    return Response.json({ ok: true });
  }
  if (payload.action === "activate") {
    await database.prepare("UPDATE products SET active = 1, updated_at = ? WHERE id = ?").bind(now, Number(payload.id)).run();
    return Response.json({ ok: true });
  }

  const code = payload.code?.trim() ?? "";
  const name = payload.name?.trim() ?? "";
  const priceCents = Number(payload.priceCents);
  const stock = Number(payload.stock);
  const lowStock = Number(payload.lowStock);
  if (!code || !name || !Number.isInteger(priceCents) || priceCents < 0 || !Number.isInteger(stock) || !Number.isInteger(lowStock) || lowStock < 0) {
    return Response.json({ error: "Revise os dados do produto." }, { status: 400 });
  }

  try {
    if (payload.action === "update") {
      await database.prepare("UPDATE products SET code = ?, name = ?, price_cents = ?, stock = ?, low_stock = ?, updated_at = ? WHERE id = ?").bind(code, name, priceCents, stock, lowStock, now, Number(payload.id)).run();
    } else {
      await database.prepare("INSERT INTO products (code, name, price_cents, stock, low_stock, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)").bind(code, name, priceCents, stock, lowStock, now, now).run();
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) return Response.json({ error: "Já existe um produto com esse código." }, { status: 409 });
    throw error;
  }
}
