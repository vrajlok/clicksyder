import { getCurrentUser } from "../../../lib/auth";
import { businessDate, getDatabase } from "../../../lib/database";

type ProductRow = { id: number; code: string; name: string; priceCents: number; active: number };

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Sessão expirada." }, { status: 401 });
  const payload = await request.json() as { items?: Array<{ productId?: number; quantity?: number }> };
  if (!Array.isArray(payload.items) || payload.items.length === 0) return Response.json({ error: "Adicione ao menos um produto." }, { status: 400 });

  const quantities = new Map<number, number>();
  for (const item of payload.items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) return Response.json({ error: "Quantidade inválida." }, { status: 400 });
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }

  const database = getDatabase();
  const productResult = await database.prepare("SELECT id, code, name, price_cents AS priceCents, active FROM products WHERE active = 1").all();
  const productRows = productResult.results as ProductRow[];
  const productMap = new Map<number, ProductRow>(productRows.map((product: ProductRow) => [product.id, product]));
  const selected = [...quantities.entries()].map(([id, quantity]) => ({ product: productMap.get(id), quantity }));
  if (selected.some((entry) => !entry.product)) return Response.json({ error: "Um dos produtos não está mais disponível." }, { status: 409 });

  const totalCents = selected.reduce((total, entry) => total + entry.product!.priceCents * entry.quantity, 0);
  const saleId = crypto.randomUUID();
  const now = new Date().toISOString();
  const statements = [
    database.prepare("INSERT INTO sales (id, user_id, total_cents, status, business_date, created_at) VALUES (?, ?, ?, 'completed', ?, ?)").bind(saleId, user.id, totalCents, businessDate(), now),
    ...selected.flatMap((entry) => [
      database.prepare("INSERT INTO sale_items (sale_id, product_id, product_code, product_name, unit_price_cents, quantity, line_total_cents) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(saleId, entry.product!.id, entry.product!.code, entry.product!.name, entry.product!.priceCents, entry.quantity, entry.product!.priceCents * entry.quantity),
      database.prepare("UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?").bind(entry.quantity, now, entry.product!.id),
    ]),
  ];
  await database.batch(statements);
  return Response.json({ id: saleId, totalCents }, { status: 201 });
}
