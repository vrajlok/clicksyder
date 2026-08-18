import { getCurrentUser, publicUser } from "../../../lib/auth";
import { getDatabase } from "../../../lib/database";

type SaleRow = { id: string; totalCents: number; businessDate: string; createdAt: string; seller: string | null };
type ItemRow = { id: number; saleId: string; productId: number; productCode: string; productName: string; unitPriceCents: number; quantity: number; lineTotalCents: number };

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Sessão expirada." }, { status: 401 });
  const database = getDatabase();

  const productQuery = user.role === "admin"
    ? "SELECT id, code, name, price_cents AS priceCents, stock, low_stock AS lowStock, active, updated_at AS updatedAt FROM products ORDER BY active DESC, name"
    : "SELECT id, code, name, price_cents AS priceCents, stock, low_stock AS lowStock, active, updated_at AS updatedAt FROM products WHERE active = 1 ORDER BY name";

  const [productResult, saleResult, itemResult] = await Promise.all([
    database.prepare(productQuery).all(),
    database.prepare(`SELECT s.id, s.total_cents AS totalCents, s.business_date AS businessDate, s.created_at AS createdAt, ${user.role === "admin" ? "u.username" : "NULL"} AS seller FROM sales s JOIN users u ON u.id = s.user_id WHERE s.status = 'completed' ORDER BY s.created_at DESC LIMIT 500`).all(),
    database.prepare("SELECT si.id, si.sale_id AS saleId, si.product_id AS productId, si.product_code AS productCode, si.product_name AS productName, si.unit_price_cents AS unitPriceCents, si.quantity, si.line_total_cents AS lineTotalCents FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE s.status = 'completed' ORDER BY s.created_at DESC, si.id ASC LIMIT 2000").all(),
  ]);

  const response: Record<string, unknown> = {
    user: publicUser(user),
    products: productResult.results,
    sales: (saleResult.results as SaleRow[]).map((sale) => ({ ...sale, items: (itemResult.results as ItemRow[]).filter((item) => item.saleId === sale.id) })),
  };

  if (user.role === "admin") {
    const [users, closings] = await Promise.all([
      database.prepare("SELECT id, username, role, active, created_at AS createdAt FROM users ORDER BY role = 'admin' DESC, active DESC, username").all(),
      database.prepare("SELECT mc.id, mc.month, mc.total_cents AS totalCents, mc.total_quantity AS totalQuantity, mc.summary_json AS summaryJson, mc.closed_at AS closedAt, u.username AS closedBy FROM monthly_closings mc JOIN users u ON u.id = mc.closed_by ORDER BY mc.month DESC").all(),
    ]);
    response.users = users.results;
    response.closings = closings.results;
  }

  return Response.json(response);
}
