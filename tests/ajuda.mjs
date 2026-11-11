// Ajuda dos testes: abre o app num Chromium invisível, com a internet simulada
// (a base de cartas e o Worker do Oráculo respondem o que cada teste definir).
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import { readFile } from 'node:fs/promises';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// O app é servido por HTTP, como no GitHub Pages (abrir como arquivo local faz o Chromium perder
// o localStorage em alguns recarregamentos, o que deixava o teste de "duelo retomado" instável).
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
let servidor;
export let APP;
async function abrirServidor() {
  if (servidor) return;
  servidor = http.createServer(async (req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const arq = path.join(RAIZ, rel);
    if (!arq.startsWith(RAIZ)) return res.writeHead(403).end();
    try {
      const dado = await readFile(arq);
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(dado);
    } catch (e) {
      res.writeHead(404).end();
    }
  });
  await new Promise(ok => servidor.listen(0, '127.0.0.1', ok));
  APP = `http://127.0.0.1:${servidor.address().port}/index.html`;
}
export const WORKER = 'https://oraculo.coringa1401.workers.dev/**';

let navegador;
export async function abrirNavegador() {
  navegador ??= await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}
  );
  return navegador;
}
export async function fecharNavegador() {
  await navegador?.close();
  navegador = undefined;
  await new Promise(ok => (servidor ? servidor.close(ok) : ok()));
  servidor = undefined;
}

// cartas(nomes) → lista de cartas falsas da base YGOPRODeck; oraculo(rota, corpo) → resposta do Worker
export async function abrirApp({ cartas, oraculo, antes, viewport = { width: 410, height: 800 } } = {}) {
  const b = await abrirNavegador();
  await abrirServidor();
  // sem service worker nos testes: cada teste vê os arquivos atuais e a internet simulada
  const ctx = await b.newContext({ viewport, serviceWorkers: 'block' });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on('pageerror', e => erros.push(String(e)));
  // sem a tela de boas-vindas da primeira visita (ela abriria por cima do que o teste estiver fazendo)
  await pg.addInitScript(() => {
    try {
      localStorage.setItem('ygo_bemvindo', '1');
    } catch (e) {}
  });
  if (antes) await pg.addInitScript(antes);
  await pg.route('https://db.ygoprodeck.com/**', async r => {
    const u = decodeURIComponent(r.request().url());
    const nomes = /name=([^&]+)/.test(u) && !/language=/.test(u) ? u.match(/name=([^&]+)/)[1].split('|') : [];
    await r.fulfill({ json: { data: cartas ? cartas(nomes) : [] } });
  });
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
  const pedidos = [];
  await pg.route(WORKER, async r => {
    const req = r.request();
    if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    if (req.method() === 'GET')
      return r.fulfill({ json: { ok: true, oraculo: 'online', versao: 99 }, headers: cors });
    const rota = new URL(req.url()).pathname,
      corpo = JSON.parse(req.postData() || '{}');
    pedidos.push({ rota, corpo });
    const resp = oraculo
      ? await oraculo(rota, corpo)
      : { status: 503, json: { error: 'sem Oráculo neste teste' } };
    await r.fulfill({ status: resp.status || 200, json: resp.json ?? resp, headers: cors });
  });
  await pg.goto(APP);
  await pg.waitForTimeout(600);
  await pg.evaluate(() => {
    CFG.vs = 0;
    saveCfg();
  });
  return { pg, ctx, erros, pedidos, fechar: () => ctx.close() };
}

export const PREVISAO = {
  chance_a: 0.62,
  resumo: 'Favorito pela consistência.',
  analise: 'Parágrafo um.\n\nParágrafo dois.',
  plano_a: 'Plano A.',
  plano_b: 'Plano B.',
  chaves_a: [{ carta: 'Carta A', motivo: 'Motivo.' }],
  chaves_b: [{ carta: 'Carta B', motivo: 'Motivo.' }],
  plano_azarao: 'Blefar.',
  confianca: 'media',
  model: 'modelo-teste',
  ms: 900,
};

// Espera uma condição dentro da página. Não usa page.waitForFunction porque ela depende de eval,
// que a política de conteúdo (CSP) do app bloqueia de propósito; aqui os testes rodam com a CSP real ligada.
export async function esperar(pg, fn, { timeout = 15000 } = {}) {
  const fim = Date.now() + timeout;
  let ultimo;
  for (;;) {
    try {
      // a página pode estar no meio de um recarregamento: cada tentativa tem prazo curto
      ultimo = await Promise.race([
        pg.evaluate(fn).then(v => !!v),
        new Promise((_, n) => setTimeout(() => n(new Error('página ocupada')), 2000)),
      ]);
      if (ultimo) return;
    } catch (e) {
      ultimo = e.message.split('\n')[0];
    }
    if (Date.now() > fim) throw new Error(`tempo esgotado esperando: ${fn} (último resultado: ${ultimo})`);
    await new Promise(r => setTimeout(r, 100));
  }
}
