import { createClient, type Client, type InStatement, type InValue } from "@libsql/client";
import { hashPassword } from "./security";

export type AppUser = { id: number; username: string; role: "admin" | "employee"; active: number };

class PortableStatement {
  constructor(
    private readonly client: Client,
    private readonly sql: string,
    private readonly args: InValue[] = [],
  ) {}

  bind(...args: InValue[]) {
    return new PortableStatement(this.client, this.sql, args);
  }

  toInput(): InStatement {
    return { sql: this.sql, args: this.args };
  }

  async first<T = Record<string, unknown>>() {
    const result = await this.client.execute(this.toInput());
    const row = result.rows[0];
    return row ? ({ ...row } as T) : null;
  }

  async all<T = Record<string, unknown>>() {
    const result = await this.client.execute(this.toInput());
    return { results: result.rows.map((row) => ({ ...row } as T)) };
  }

  async run() {
    return this.client.execute(this.toInput());
  }
}

class PortableDatabase {
  constructor(private readonly client: Client) {}

  prepare(sql: string) {
    return new PortableStatement(this.client, sql);
  }

  async batch(statements: PortableStatement[]) {
    return this.client.batch(statements.map((statement) => statement.toInput()), "write");
  }
}

let client: Client | null = null;
let database: PortableDatabase | null = null;
let initialization: Promise<void> | null = null;

export function getDatabase() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:clicksyder.db";
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || undefined;
    client = createClient({ url, authToken });
    database = new PortableDatabase(client);
  }
  return database!;
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'employee', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, price_cents INTEGER NOT NULL, stock INTEGER NOT NULL DEFAULT 0, low_stock INTEGER NOT NULL DEFAULT 5, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, total_cents INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'completed', business_date TEXT NOT NULL, created_at TEXT NOT NULL, cancelled_at TEXT, FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS sale_items (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id TEXT NOT NULL, product_id INTEGER NOT NULL, product_code TEXT NOT NULL, product_name TEXT NOT NULL, unit_price_cents INTEGER NOT NULL, quantity INTEGER NOT NULL, line_total_cents INTEGER NOT NULL, FOREIGN KEY (sale_id) REFERENCES sales(id), FOREIGN KEY (product_id) REFERENCES products(id))`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS monthly_closings (id INTEGER PRIMARY KEY AUTOINCREMENT, month TEXT NOT NULL UNIQUE, closed_by INTEGER NOT NULL, total_cents INTEGER NOT NULL, total_quantity INTEGER NOT NULL, summary_json TEXT NOT NULL, closed_at TEXT NOT NULL, FOREIGN KEY (closed_by) REFERENCES users(id))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code ON products(code)`,
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_business_date ON sales(business_date)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_closings_month ON monthly_closings(month)`,
];

async function initializeDatabase() {
  const currentDatabase = getDatabase();
  await currentDatabase.batch(schemaStatements.map((statement) => currentDatabase.prepare(statement)));
  const admin = await currentDatabase.prepare("SELECT id FROM users WHERE username = ?").bind("admin").first();
  if (!admin) {
    const passwordHash = await hashPassword("123");
    await currentDatabase.prepare("INSERT OR IGNORE INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, 'admin', 1, ?)").bind("admin", passwordHash, new Date().toISOString()).run();
  }
  await currentDatabase.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(new Date().toISOString()).run();
  await currentDatabase.prepare("PRAGMA optimize").run();
}

export async function ensureDatabase() {
  initialization ??= initializeDatabase().catch((error) => {
    initialization = null;
    throw error;
  });
  return initialization;
}

export function businessDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
