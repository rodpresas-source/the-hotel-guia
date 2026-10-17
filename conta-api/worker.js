/**
 * The Hotel · API "Minha conta" (Cloudflare Worker)
 *
 * Fica entre a página do hóspede e o PMS (HITS). A página nunca fala com o PMS.
 *
 *   POST /login   {uh, sobrenome, pin}          -> {token, conta}
 *   GET  /conta   Authorization: Bearer <token> -> {conta}
 *
 * Login: apartamento + sobrenome + 4 últimos caracteres do CPF ou passaporte de QUALQUER hóspede
 * da reserva (campo "pin"). O documento é só comparado em memória: nunca é devolvido, gravado ou logado.
 *
 * Segredos (wrangler secret put ...): TOKEN_SECRET e as credenciais do HITS.
 * KV "RATE": controle de tentativas (5 erros por apartamento/IP a cada 15 min).
 * Variável MOCK="1": usa uma reserva de exemplo enquanto a integração com o HITS não existe.
 */

const ORIGINS = ["https://guia.thehotel.com.br", "https://rodpresas-source.github.io"];
const MAX_TRIES = 5, WINDOW_S = 15 * 60;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === "/login" && req.method === "POST") return await login(req, env, cors);
      if (url.pathname === "/conta" && req.method === "GET") return await conta(req, env, cors);
      return json({ erro: "não encontrado" }, 404, cors);
    } catch (e) {
      console.error(e);
      return json({ erro: "indisponível" }, 503, cors);
    }
  },
};

/* ---------- rotas ---------- */

async function login(req, env, cors) {
  const ip = req.headers.get("CF-Connecting-IP") || "?";
  const body = await req.json().catch(() => ({}));
  const uh = String(body.uh || "").replace(/\D/g, "").slice(0, 5);
  const sobrenome = norm(body.sobrenome).slice(0, 60);
  const pin = String(body.pin || "").replace(/[^0-9a-z]/gi, "").toUpperCase();
  if (!uh || sobrenome.length < 2 || pin.length !== 4) return json({ erro: "dados" }, 400, cors);

  const key = `t:${ip}:${uh}`;
  const tries = Number((await env.RATE?.get(key)) || 0);
  if (tries >= MAX_TRIES) return json({ erro: "bloqueado" }, 429, cors);

  const r = await reservaAtiva(env, uh);
  const ok = r
    && r.sobrenomes.some(s => norm(s) === sobrenome)
    && r.documentos.some(d => timingSafeEqual(pin, ultimos4(d)));

  if (!ok) {
    await env.RATE?.put(key, String(tries + 1), { expirationTtl: WINDOW_S });
    return json({ erro: "não encontrado" }, 401, cors);
  }
  await env.RATE?.delete(key);
  const exp = Math.floor(fimDaEstadia(r) / 1000);
  const token = await assinar(env, { rid: r.id, uh, exp });
  return json({ token, conta: await extrato(env, r) }, 200, cors);
}

async function conta(req, env, cors) {
  const tok = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const p = await verificar(env, tok);
  if (!p) return json({ erro: "sessão expirada" }, 401, cors);
  const r = await reservaAtiva(env, p.uh);
  if (!r || r.id !== p.rid) return json({ erro: "sessão expirada" }, 401, cors);
  return json({ conta: await extrato(env, r) }, 200, cors);
}

/* ---------- PMS (HITS) ----------
 * Única parte que depende do HITS. Devolve a reserva hospedada no apartamento hoje:
 * { id, uh, hospede, sobrenomes:[...], documentos:[CPF/passaporte de cada hóspede], checkin:"YYYY-MM-DD", checkout:"YYYY-MM-DD",
 *   hora_checkin, hora_checkout, lancamentos:[{data,descricao,valor}], pagamentos:[{data,descricao,valor}] }
 */
async function reservaAtiva(env, uh) {
  if (env.MOCK === "1") return mock(uh);
  // TODO: implementar com a API do HITS assim que a documentação for liberada.
  // Exemplo do formato esperado:
  // const res = await fetch(`${env.HITS_URL}/reservas?uh=${uh}&status=inhouse`, { headers: { Authorization: `Bearer ${env.HITS_TOKEN}` } });
  // const d = await res.json();  -> mapear para o formato acima
  throw new Error("Integração com o HITS ainda não configurada");
}

async function extrato(env, r) {
  return {
    hospede: r.hospede, uh: r.uh, checkin: r.checkin, checkout: r.checkout,
    hora_checkin: r.hora_checkin || "14h", hora_checkout: r.hora_checkout || "12h",
    lancamentos: r.lancamentos || [], pagamentos: r.pagamentos || [],
  };
}

function mock(uh) {
  if (uh !== "101") return null;
  const d = n => new Date(Date.now() + n * 864e5 - 3 * 3600e3).toISOString().slice(0, 10);
  return {
    id: "R-TESTE-101", uh, hospede: "Ana Silva", sobrenomes: ["Silva", "Souza"], documentos: ["123.456.781-23", "AB991234"],
    checkin: d(-2), checkout: d(2),
    lancamentos: [{ data: d(-2), descricao: "Diária", valor: 420 }, { data: d(-1), descricao: "Diária", valor: 420 }],
    pagamentos: [{ data: d(-2), descricao: "Pré-pagamento", valor: 420 }],
  };
}

/* ---------- PIN, token e utilidades ---------- */

function fimDaEstadia(r) {                          // check-out às 12h de Salvador (UTC-3) + 2h de folga
  return Date.parse(`${r.checkout}T14:00:00-03:00`);
}

async function assinar(env, payload) {
  const body = b64u(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = b64u(new Uint8Array(await hmac(env.TOKEN_SECRET, body)));
  return `${body}.${sig}`;
}
async function verificar(env, tok) {
  const [body, sig] = String(tok).split(".");
  if (!body || !sig) return null;
  const ok = b64u(new Uint8Array(await hmac(env.TOKEN_SECRET, body)));
  if (!timingSafeEqual(ok, sig)) return null;
  const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
  return p.exp * 1000 > Date.now() ? p : null;
}

async function hmac(secret, msg) {
  if (!secret) throw new Error("segredo ausente");
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
}
const b64u = a => btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
function timingSafeEqual(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
const ultimos4 = d => String(d || "").replace(/[^0-9a-z]/gi, "").toUpperCase().slice(-4);
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

function corsHeaders(req) {
  const o = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}
function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}
