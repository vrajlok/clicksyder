import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const testDirectory = resolve(".test-data");
const databasePath = resolve(testDirectory, "clicksyder-test.db").replaceAll("\\", "/");
const port = 4100 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;

rmSync(testDirectory, { recursive: true, force: true });
mkdirSync(testDirectory, { recursive: true });

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
  env: { ...process.env, TURSO_DATABASE_URL: `file:${databasePath}`, TURSO_AUTH_TOKEN: "" },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
server.stdout.on("data", (chunk) => { output += chunk; });
server.stderr.on("data", (chunk) => { output += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Servidor não iniciou.\n${output}`);
}

try {
  await waitForServer();
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "123" }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.ok(cookie);

  const app = await fetch(`${baseUrl}/api/app`, { headers: { cookie } });
  assert.equal(app.status, 200);
  const data = await app.json();
  assert.equal(data.user.username, "admin");
  assert.equal(data.user.role, "admin");
  assert.deepEqual(data.products, []);
  assert.deepEqual(data.sales, []);
  assert.equal(data.users.length, 1);
  assert.equal(data.users[0].username, "admin");
  assert.deepEqual(data.closings, []);
  console.log("Clicksyder validado: login administrativo ativo e banco inicial vazio.");
} finally {
  server.kill("SIGTERM");
  if (server.exitCode === null) {
    await new Promise((resolveExit) => server.once("exit", resolveExit));
  }
  rmSync(testDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
