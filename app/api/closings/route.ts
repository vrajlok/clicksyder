import { getCurrentUser } from "../../../lib/auth";
import { getDatabase } from "../../../lib/database";

type SummaryRow = { productCode: string; productName: string; quantity: number; totalCents: number };

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Sessão expirada." }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const payload = await request.json() as { month?: string };
  const month = payload.month?.trim() ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: "Mês inválido." }, { status: 400 });
  const database = getDatabase();
  const existing = await database.prepare("SELECT id FROM monthly_closings WHERE month = ?").bind(month).first();
  if (existing) return Response.json({ error: "Esse mês já foi fechado." }, { status: 409 });

  const summary = await database.prepare(`SELECT si.product_code AS productCode, si.product_name AS productName, SUM(si.quantity) AS quantity, SUM(si.line_total_cents) AS totalCents FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE s.status = 'completed' AND substr(s.business_date, 1, 7) = ? GROUP BY si.product_code, si.product_name ORDER BY si.product_name`).bind(month).all();
  const rows = summary.results as SummaryRow[];
  const totalCents = rows.reduce((total: number, row: SummaryRow) => total + Number(row.totalCents), 0);
  const totalQuantity = rows.reduce((total: number, row: SummaryRow) => total + Number(row.quantity), 0);
  await database.prepare("INSERT INTO monthly_closings (month, closed_by, total_cents, total_quantity, summary_json, closed_at) VALUES (?, ?, ?, ?, ?, ?)").bind(month, user.id, totalCents, totalQuantity, JSON.stringify(rows), new Date().toISOString()).run();
  return Response.json({ ok: true }, { status: 201 });
}
