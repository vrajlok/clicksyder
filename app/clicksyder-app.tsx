"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type User = { id: number; username: string; role: "admin" | "employee" };
type Product = { id: number; code: string; name: string; priceCents: number; stock: number; lowStock: number; active: number; updatedAt: string };
type SaleItem = { id: number; saleId: string; productId: number; productCode: string; productName: string; unitPriceCents: number; quantity: number; lineTotalCents: number };
type Sale = { id: string; totalCents: number; businessDate: string; createdAt: string; seller?: string | null; items: SaleItem[] };
type Employee = { id: number; username: string; role: "admin" | "employee"; active: number; createdAt: string };
type Closing = { id: number; month: string; totalCents: number; totalQuantity: number; summaryJson: string; closedAt: string; closedBy: string };
type AppData = { user: User; products: Product[]; sales: Sale[]; users?: Employee[]; closings?: Closing[] };
type PageKey = "dashboard" | "sale" | "products" | "movements" | "team" | "closing";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

function formatMoney(cents: number) { return money.format(cents / 100); }
function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function currentMonth() { return today().slice(0, 7); }
function initials(name: string) { return name.slice(0, 2).toUpperCase(); }
function displayMonth(value: string) { const [year, month] = value.split("-").map(Number); return monthLabel.format(new Date(Date.UTC(year, month - 1, 1))); }

export function ClicksyderApp() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [page, setPage] = useState<PageKey>("dashboard");
  const [toast, setToast] = useState("");

  async function loadData() {
    const response = await fetch("/api/app", { cache: "no-store" });
    if (response.status === 401) { setData(null); setLoading(false); return; }
    const payload = await response.json() as AppData & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o sistema.");
    setData(payload);
    setLoading(false);
  }

  useEffect(() => { loadData().catch(() => setLoading(false)); }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3500); return () => window.clearTimeout(timer); }, [toast]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setLoginError(payload.error || "Não foi possível entrar."); return; }
    setLoading(true);
    await loadData();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setData(null);
    setPage("dashboard");
  }

  async function action(url: string, body: unknown) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as { error?: string };
    if (response.status === 401) { setData(null); throw new Error("Sua sessão expirou."); }
    if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação.");
    return payload;
  }

  if (loading) return <LoadingScreen />;
  if (!data) return <LoginScreen onSubmit={login} error={loginError} showPassword={showPassword} setShowPassword={setShowPassword} />;

  const admin = data.user.role === "admin";
  const titles: Record<PageKey, { title: string; subtitle: string }> = {
    dashboard: { title: "Painel", subtitle: "Visão geral das vendas avulsas" },
    sale: { title: "Registrar venda", subtitle: "Busque os produtos e monte o registro" },
    products: { title: "Produtos e estoque", subtitle: "Consulte códigos, preços e quantidades" },
    movements: { title: "Movimentações", subtitle: "Acompanhe o extrato e os totais vendidos" },
    team: { title: "Gerenciar equipe", subtitle: "Controle os acessos dos funcionários" },
    closing: { title: "Fechamento mensal", subtitle: "Consolide o movimento de cada mês" },
  };

  function navigate(next: PageKey) { setPage(next); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark small">C</div><div><strong>Clicksyder</strong><span>Unidade Rio Grande da Serra</span></div></div>
        <nav aria-label="Menu principal">
          <NavButton active={page === "dashboard"} label="Painel" symbol="◆" onClick={() => navigate("dashboard")} />
          <NavButton active={page === "sale"} label="Registrar venda" symbol="＋" onClick={() => navigate("sale")} />
          <NavButton active={page === "products"} label="Produtos e estoque" symbol="▦" onClick={() => navigate("products")} />
          <NavButton active={page === "movements"} label="Movimentações" symbol="≡" onClick={() => navigate("movements")} />
          {admin && <div className="nav-section">ADMINISTRAÇÃO</div>}
          {admin && <NavButton active={page === "team"} label="Gerenciar equipe" symbol="◎" onClick={() => navigate("team")} />}
          {admin && <NavButton active={page === "closing"} label="Fechamento mensal" symbol="✓" onClick={() => navigate("closing")} />}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{initials(data.user.username)}</div>
          <div><strong>{data.user.username}</strong><span>{admin ? "Administrador" : "Funcionário"}</span></div>
          <button onClick={logout} title="Sair" aria-label="Sair">↗</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><p className="breadcrumb">CLICKSYDER / {titles[page].title.toUpperCase()}</p><h1>{titles[page].title}</h1><p>{titles[page].subtitle}</p></div>
          <div className="topbar-actions"><span className="live-badge"><i /> Sistema online</span><button className="quick-sale" onClick={() => navigate("sale")}>＋ Nova venda</button></div>
        </header>
        <section className="page-content">
          {page === "dashboard" && <Dashboard data={data} navigate={navigate} />}
          {page === "sale" && <SalePage data={data} reload={loadData} action={action} notify={setToast} />}
          {page === "products" && <ProductsPage data={data} reload={loadData} action={action} notify={setToast} />}
          {page === "movements" && <MovementsPage data={data} />}
          {page === "team" && admin && <TeamPage data={data} reload={loadData} action={action} notify={setToast} />}
          {page === "closing" && admin && <ClosingPage data={data} reload={loadData} action={action} notify={setToast} />}
        </section>
      </main>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  );
}

function NavButton({ active, label, symbol, onClick }: { active: boolean; label: string; symbol: string; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><span>{symbol}</span>{label}</button>;
}

function LoadingScreen() {
  return <div className="loading-screen"><div className="loading-mark">C</div><div className="loading-bar"><span /></div><p>Preparando seu ambiente...</p></div>;
}

function LoginScreen({ onSubmit, error, showPassword, setShowPassword }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; error: string; showPassword: boolean; setShowPassword: (value: boolean) => void }) {
  return (
    <main className="login-page">
      <section className="login-brand" aria-label="Clicksyder">
        <div className="brand-mark" aria-hidden="true">C</div>
        <div className="brand-copy"><p className="eyebrow">GESTÃO DE VENDAS</p><h1>Clicksyder</h1><p>Registre vendas avulsas e acompanhe o estoque com clareza.</p></div>
        <div className="brand-decoration" aria-hidden="true"><span /><span /><span /></div>
      </section>
      <section className="login-content">
        <div className="login-card">
          <div className="login-heading"><span className="status-dot" aria-hidden="true" /><p>Sistema disponível</p></div>
          <h2>Bem-vindo de volta</h2><p className="login-subtitle">Entre para registrar uma venda ou consultar o estoque.</p>
          <form onSubmit={onSubmit}>
            <label htmlFor="username">Nome de usuário</label><input id="username" name="username" autoComplete="username" placeholder="Digite seu usuário" required />
            <label htmlFor="password">Senha</label>
            <div className="password-field"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Digite sua senha" required /><button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Ocultar" : "Mostrar"}</button></div>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit">Entrar no sistema <span aria-hidden="true">→</span></button>
          </form>
          <div className="secure-note"><span aria-hidden="true">✓</span><p>Ambiente protegido · acesso restrito à equipe autorizada</p></div>
        </div>
        <p className="login-footer">Clicksyder · Unidade Rio Grande da Serra</p>
      </section>
    </main>
  );
}

function Dashboard({ data, navigate }: { data: AppData; navigate: (page: PageKey) => void }) {
  const todaysSales = data.sales.filter((sale) => sale.businessDate === today());
  const monthlySales = data.sales.filter((sale) => sale.businessDate.startsWith(currentMonth()));
  const lowStock = data.products.filter((product) => product.active && product.stock <= product.lowStock);
  const soldQuantity = monthlySales.reduce((total, sale) => total + sale.items.reduce((sum, item) => sum + item.quantity, 0), 0);
  return (
    <>
      <div className="stats-grid">
        <StatCard label="Registros hoje" value={String(todaysSales.length).padStart(2, "0")} helper="vendas finalizadas" tone="brown" />
        <StatCard label="Valor hoje" value={formatMoney(todaysSales.reduce((total, sale) => total + sale.totalCents, 0))} helper="acumulado do dia" tone="gold" />
        <StatCard label="Itens no mês" value={String(soldQuantity)} helper={displayMonth(currentMonth())} tone="green" />
        <StatCard label="Estoque baixo" value={String(lowStock.length).padStart(2, "0")} helper="produtos para atenção" tone="red" />
      </div>
      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <PanelHeader title="Movimentações recentes" subtitle="Últimos registros finalizados" action="Ver todas" onClick={() => navigate("movements")} />
          {data.sales.length === 0 ? <EmptyState text="Nenhuma venda registrada ainda." /> : <div className="recent-list">{data.sales.slice(0, 6).map((sale) => <div className="recent-row" key={sale.id}><div className="product-bullet">{sale.items.length}</div><div className="recent-main"><strong>{sale.items.map((item) => item.productName).slice(0, 2).join(", ")}{sale.items.length > 2 ? ` +${sale.items.length - 2}` : ""}</strong><span>{dateTime.format(new Date(sale.createdAt))}{sale.seller ? ` · ${sale.seller}` : ""}</span></div><div className="recent-total"><strong>{formatMoney(sale.totalCents)}</strong><span>{sale.items.reduce((sum, item) => sum + item.quantity, 0)} itens</span></div></div>)}</div>}
        </section>
        <aside className="side-stack">
          <section className="panel quick-panel"><p className="eyebrow dark">ATALHO PRINCIPAL</p><h2>Registrar uma nova venda avulsa</h2><p>Busque os produtos, confirme os valores e finalize sem informar pagamento.</p><button className="large-action" onClick={() => navigate("sale")}>Começar registro <span>→</span></button></section>
          <section className="panel alert-panel"><PanelHeader title="Atenção ao estoque" subtitle={`${lowStock.length} produtos no limite`} action="Ver estoque" onClick={() => navigate("products")} />{lowStock.slice(0, 3).map((product) => <div className="stock-alert" key={product.id}><span>{product.stock}</span><div><strong>{product.name}</strong><small>Cód. {product.code}</small></div></div>)}{lowStock.length === 0 && <p className="all-good">Todos os produtos estão acima do limite.</p>}</section>
        </aside>
      </div>
    </>
  );
}

function StatCard({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: string }) {
  return <article className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span><i /></div><strong>{value}</strong><small>{helper}</small></article>;
}

function PanelHeader({ title, subtitle, action, onClick }: { title: string; subtitle: string; action?: string; onClick?: () => void }) {
  return <header className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button onClick={onClick}>{action} →</button>}</header>;
}

function EmptyState({ text }: { text: string }) { return <div className="empty-state"><span>○</span><p>{text}</p></div>; }

function SalePage({ data, reload, action, notify }: { data: AppData; reload: () => Promise<void>; action: (url: string, body: unknown) => Promise<unknown>; notify: (message: string) => void }) {
  const products = data.products.filter((product) => product.active);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const filtered = products.filter((product) => `${product.code} ${product.name}`.toLowerCase().includes(search.toLowerCase())).slice(0, 12);
  const cartItems = products.filter((product) => cart[product.id]).map((product) => ({ product, quantity: cart[product.id] }));
  const total = cartItems.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);

  function change(id: number, amount: number) { setCart((current) => { const next = Math.max(0, (current[id] ?? 0) + amount); const updated = { ...current, [id]: next }; if (!next) delete updated[id]; return updated; }); }
  function clear() { setCart({}); setConfirming(false); setError(""); }
  async function finalize() { setSaving(true); setError(""); try { await action("/api/sales", { items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })) }); clear(); await reload(); notify("Venda registrada e estoque atualizado."); } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível finalizar."); } finally { setSaving(false); } }

  return (
    <div className="sale-layout">
      <section className="panel product-picker">
        <div className="search-hero"><div><p className="eyebrow dark">BUSCA DE PRODUTOS</p><h2>O que foi comprado?</h2></div><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite o código ou nome do produto" autoFocus /></label></div>
        <div className="product-results">{filtered.map((product) => <button className="product-card" key={product.id} onClick={() => change(product.id, 1)}><div className="product-code">{product.code}</div><strong>{product.name}</strong><div className="product-meta"><span>{formatMoney(product.priceCents)}</span><small className={product.stock <= product.lowStock ? "low" : ""}>Estoque: {product.stock}</small></div><div className="add-product">Adicionar <b>＋</b></div></button>)}</div>
        {filtered.length === 0 && <EmptyState text="Nenhum produto encontrado com essa busca." />}
      </section>
      <aside className="panel cart-panel">
        <div className="cart-title"><div><p className="eyebrow dark">REGISTRO ATUAL</p><h2>Resumo da venda</h2></div><span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} itens</span></div>
        <div className="cart-lines">{cartItems.length === 0 ? <EmptyState text="Selecione um produto para começar." /> : cartItems.map(({ product, quantity }) => <div className="cart-line" key={product.id}><div><strong>{product.name}</strong><span>{product.code} · {formatMoney(product.priceCents)}</span></div><div className="quantity"><button onClick={() => change(product.id, -1)}>−</button><b>{quantity}</b><button onClick={() => change(product.id, 1)}>＋</button></div><strong>{formatMoney(product.priceCents * quantity)}</strong></div>)}</div>
        <div className="cart-footer"><div className="cart-total"><span>Valor total</span><strong>{formatMoney(total)}</strong></div><button className="secondary-danger" disabled={!cartItems.length} onClick={clear}>Cancelar compra</button><button className="confirm-button" disabled={!cartItems.length} onClick={() => setConfirming(true)}>Contabilizar <span>→</span></button><small>Nenhum método de pagamento será solicitado.</small></div>
      </aside>
      {confirming && <Modal title="Confirmar valores" subtitle="Confira os produtos antes de finalizar o registro." onClose={() => setConfirming(false)} wide><div className="confirm-list">{cartItems.map(({ product, quantity }) => <div key={product.id}><span>{quantity}×</span><div><strong>{product.name}</strong><small>Cód. {product.code} · {formatMoney(product.priceCents)} cada</small></div><b>{formatMoney(product.priceCents * quantity)}</b></div>)}</div><div className="confirm-total"><span>Total da compra</span><strong>{formatMoney(total)}</strong></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions triple"><button className="secondary-danger" onClick={clear}>Cancelar compra</button><button className="ghost-button" onClick={() => setConfirming(false)}>Voltar</button><button className="confirm-button" onClick={finalize} disabled={saving}>{saving ? "Finalizando..." : "Finalizar registro"}</button></div></Modal>}
    </div>
  );
}

function ProductsPage({ data, reload, action, notify }: { data: AppData; reload: () => Promise<void>; action: (url: string, body: unknown) => Promise<unknown>; notify: (message: string) => void }) {
  const admin = data.user.role === "admin";
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [error, setError] = useState("");
  const products = data.products.filter((product) => `${product.code} ${product.name}`.toLowerCase().includes(search.toLowerCase()));
  async function toggle(product: Product) { try { await action("/api/products", { action: product.active ? "deactivate" : "activate", id: product.id }); await reload(); notify(product.active ? "Produto desativado." : "Produto reativado."); } catch (failure) { notify(failure instanceof Error ? failure.message : "Não foi possível atualizar."); } }
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); const form = new FormData(event.currentTarget); try { await action("/api/products", { action: editing === "new" ? "create" : "update", id: editing === "new" ? undefined : editing?.id, code: form.get("code"), name: form.get("name"), priceCents: Math.round(Number(String(form.get("price")).replace(",", ".")) * 100), stock: Number(form.get("stock")), lowStock: Number(form.get("lowStock")) }); setEditing(null); await reload(); notify(editing === "new" ? "Produto adicionado." : "Produto atualizado."); } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível salvar."); } }
  return (
    <section className="panel table-panel">
      <div className="table-toolbar"><label className="search-box compact"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código ou nome" /></label><div className="toolbar-count">{products.length} produtos</div>{admin && <button className="confirm-button small" onClick={() => setEditing("new")}>＋ Adicionar produto</button>}</div>
      <div className="data-table"><div className="table-row table-head"><span>Produto</span><span>Código</span><span>Valor</span><span>Estoque</span><span>Status</span>{admin && <span>Ações</span>}</div>{products.map((product) => <div className={`table-row ${!product.active ? "inactive" : ""}`} key={product.id}><div className="product-cell"><span>{initials(product.name)}</span><strong>{product.name}</strong></div><code>{product.code}</code><strong>{formatMoney(product.priceCents)}</strong><span className={`stock-pill ${product.stock <= product.lowStock ? "low" : ""}`}>{product.stock} un.</span><span className={`status-pill ${product.active ? "active" : "off"}`}>{product.active ? "Ativo" : "Inativo"}</span>{admin && <div className="row-actions"><button onClick={() => setEditing(product)}>Editar</button><button onClick={() => toggle(product)}>{product.active ? "Desativar" : "Reativar"}</button></div>}</div>)}</div>
      {editing && <Modal title={editing === "new" ? "Adicionar produto" : "Editar produto"} subtitle="Defina os dados usados na busca, venda e estoque." onClose={() => { setEditing(null); setError(""); }}><form className="modal-form" onSubmit={save}><label>Código<input name="code" defaultValue={editing === "new" ? "" : editing.code} required /></label><label>Nome do produto<input name="name" defaultValue={editing === "new" ? "" : editing.name} required /></label><div className="form-grid"><label>Valor (R$)<input name="price" type="number" min="0" step="0.01" defaultValue={editing === "new" ? "" : (editing.priceCents / 100).toFixed(2)} required /></label><label>Estoque atual<input name="stock" type="number" step="1" defaultValue={editing === "new" ? 0 : editing.stock} required /></label></div><label>Alerta de estoque baixo<input name="lowStock" type="number" min="0" step="1" defaultValue={editing === "new" ? 5 : editing.lowStock} required /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button><button className="confirm-button" type="submit">Salvar produto</button></div></form></Modal>}
    </section>
  );
}

function MovementsPage({ data }: { data: AppData }) {
  const [view, setView] = useState<"statement" | "total">("statement");
  const [month, setMonth] = useState(currentMonth());
  const sales = data.sales.filter((sale) => sale.businessDate.startsWith(month));
  const consolidated = useMemo(() => { const map = new Map<string, { code: string; name: string; quantity: number; totalCents: number }>(); for (const sale of sales) for (const item of sale.items) { const current = map.get(item.productCode) ?? { code: item.productCode, name: item.productName, quantity: 0, totalCents: 0 }; current.quantity += item.quantity; current.totalCents += item.lineTotalCents; map.set(item.productCode, current); } return [...map.values()].sort((a, b) => b.quantity - a.quantity); }, [sales]);
  return (
    <section className="panel movements-panel">
      <div className="movement-toolbar"><div className="segmented"><button className={view === "statement" ? "active" : ""} onClick={() => setView("statement")}>Extrato detalhado</button><button className={view === "total" ? "active" : ""} onClick={() => setView("total")}>Total por produto</button></div><label className="month-filter">Período<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label></div>
      <div className="movement-summary"><div><span>Vendas no período</span><strong>{sales.length}</strong></div><div><span>Itens contabilizados</span><strong>{sales.reduce((total, sale) => total + sale.items.reduce((sum, item) => sum + item.quantity, 0), 0)}</strong></div><div><span>Valor acumulado</span><strong>{formatMoney(sales.reduce((total, sale) => total + sale.totalCents, 0))}</strong></div></div>
      {view === "statement" ? <div className="statement-list">{sales.length === 0 ? <EmptyState text="Nenhuma movimentação nesse período." /> : sales.map((sale) => <article className="statement-card" key={sale.id}><header><div><span>{dateTime.format(new Date(sale.createdAt))}</span>{sale.seller && <small>Registrado por {sale.seller}</small>}</div><strong>{formatMoney(sale.totalCents)}</strong></header>{sale.items.map((item) => <div className="statement-item" key={item.id}><div><strong>{item.productName}</strong><span>Cód. {item.productCode}</span></div><span>{formatMoney(item.unitPriceCents)}</span><span>{item.quantity} un.</span><strong>{formatMoney(item.lineTotalCents)}</strong></div>)}</article>)}</div> : <div className="data-table consolidated"><div className="table-row table-head"><span>Produto</span><span>Código</span><span>Quantidade vendida</span><span>Valor acumulado</span></div>{consolidated.map((item) => <div className="table-row" key={item.code}><div className="product-cell"><span>{initials(item.name)}</span><strong>{item.name}</strong></div><code>{item.code}</code><strong>{item.quantity} unidades</strong><strong>{formatMoney(item.totalCents)}</strong></div>)}</div>}
    </section>
  );
}

function TeamPage({ data, reload, action, notify }: { data: AppData; reload: () => Promise<void>; action: (url: string, body: unknown) => Promise<unknown>; notify: (message: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); const form = new FormData(event.currentTarget); try { await action("/api/users", { username: form.get("username"), password: form.get("password") }); setAdding(false); await reload(); notify("Funcionário adicionado."); } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível adicionar."); } }
  async function toggle(employee: Employee) { try { await action("/api/users", { action: employee.active ? "deactivate" : "activate", id: employee.id }); await reload(); notify(employee.active ? "Acesso removido." : "Acesso reativado."); } catch (failure) { notify(failure instanceof Error ? failure.message : "Não foi possível atualizar."); } }
  return (
    <section className="panel table-panel"><div className="table-toolbar"><div><h2>Equipe cadastrada</h2><p>Funcionários ativos podem acessar e registrar vendas.</p></div><button className="confirm-button small" onClick={() => setAdding(true)}>＋ Adicionar funcionário</button></div><div className="data-table team-table"><div className="table-row table-head"><span>Usuário</span><span>Perfil</span><span>Cadastrado em</span><span>Status</span><span>Ação</span></div>{data.users?.map((employee) => <div className={`table-row ${!employee.active ? "inactive" : ""}`} key={employee.id}><div className="product-cell"><span>{initials(employee.username)}</span><strong>{employee.username}</strong></div><span>{employee.role === "admin" ? "Administrador" : "Funcionário"}</span><span>{new Intl.DateTimeFormat("pt-BR").format(new Date(employee.createdAt))}</span><span className={`status-pill ${employee.active ? "active" : "off"}`}>{employee.active ? "Ativo" : "Sem acesso"}</span><div className="row-actions">{employee.role !== "admin" && <button onClick={() => toggle(employee)}>{employee.active ? "Remover acesso" : "Reativar"}</button>}</div></div>)}</div>{adding && <Modal title="Novo funcionário" subtitle="O administrador define o usuário e a senha inicial." onClose={() => { setAdding(false); setError(""); }}><form className="modal-form" onSubmit={save}><label>Nome de usuário<input name="username" minLength={3} autoComplete="off" required /></label><label>Senha inicial<input name="password" type="password" minLength={3} autoComplete="new-password" required /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setAdding(false)}>Cancelar</button><button className="confirm-button" type="submit">Adicionar funcionário</button></div></form></Modal>}</section>
  );
}

function ClosingPage({ data, reload, action, notify }: { data: AppData; reload: () => Promise<void>; action: (url: string, body: unknown) => Promise<unknown>; notify: (message: string) => void }) {
  const [month, setMonth] = useState(currentMonth());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const monthSales = data.sales.filter((sale) => sale.businessDate.startsWith(month));
  const totalCents = monthSales.reduce((total, sale) => total + sale.totalCents, 0);
  const quantity = monthSales.reduce((total, sale) => total + sale.items.reduce((sum, item) => sum + item.quantity, 0), 0);
  const alreadyClosed = data.closings?.some((closing) => closing.month === month);
  async function closeMonth() { setError(""); try { await action("/api/closings", { month }); setConfirming(false); await reload(); notify("Fechamento mensal concluído."); } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível fechar o mês."); } }
  return (
    <div className="closing-layout"><section className="panel closing-main"><p className="eyebrow dark">NOVO FECHAMENTO</p><h2>Consolidar período</h2><p>O fechamento registra uma fotografia dos totais acumulados no mês selecionado.</p><label className="closing-month">Mês de referência<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><div className="closing-preview"><div><span>Vendas registradas</span><strong>{monthSales.length}</strong></div><div><span>Produtos vendidos</span><strong>{quantity}</strong></div><div><span>Valor acumulado</span><strong>{formatMoney(totalCents)}</strong></div></div>{alreadyClosed ? <div className="closed-notice">✓ Este mês já foi fechado.</div> : <button className="confirm-button closing-button" onClick={() => setConfirming(true)}>Revisar e fechar {displayMonth(month)}</button>}</section><section className="panel closing-history"><PanelHeader title="Histórico de fechamentos" subtitle="Períodos já consolidados" />{data.closings?.length ? data.closings.map((closing) => <div className="closing-row" key={closing.id}><div className="closing-check">✓</div><div><strong>{displayMonth(closing.month)}</strong><span>Fechado por {closing.closedBy} · {dateTime.format(new Date(closing.closedAt))}</span></div><div><strong>{formatMoney(closing.totalCents)}</strong><span>{closing.totalQuantity} itens</span></div></div>) : <EmptyState text="Nenhum mês foi fechado ainda." />}</section>{confirming && <Modal title={`Fechar ${displayMonth(month)}`} subtitle="Após confirmar, o período ficará registrado no histórico." onClose={() => setConfirming(false)}><div className="confirm-total stacked"><span>{monthSales.length} vendas · {quantity} produtos</span><strong>{formatMoney(totalCents)}</strong></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button className="ghost-button" onClick={() => setConfirming(false)}>Voltar</button><button className="confirm-button" onClick={closeMonth}>Confirmar fechamento</button></div></Modal>}</div>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><div><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button onClick={onClose} aria-label="Fechar">×</button></header>{children}</div></div>;
}
