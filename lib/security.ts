const encoder = new TextEncoder();
const PBKDF2_ITERATIONS = 100_000;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function hashPassword(password: string) {
  const iterations = PBKDF2_ITERATIONS;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return `pbkdf2$${iterations}$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, iterationsText, saltText, hashText] = stored.split("$");
  if (algorithm !== "pbkdf2" || !iterationsText || !saltText || !hashText) return false;
  const iterations = Number(iterationsText);
  const expected = fromBase64(hashText);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64(saltText), iterations }, key, 256);
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export function createToken() {
  return toBase64(crypto.getRandomValues(new Uint8Array(32))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return toBase64(new Uint8Array(digest));
}
