// Ajuda dos testes: abre o app num Chromium invisível, com a internet simulada
// (a base de cartas e o Worker do Oráculo respondem o que cada teste definir).
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const APP = 'file://' + path.join(RAIZ, 'index.html');
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
}

// cartas(nomes) → lista de cartas falsas da base YGOPRODeck; oraculo(rota, corpo) → resposta do Worker
export async function abrirApp({ cartas, oraculo, antes, viewport = { width: 410, height: 800 } } = {}) {
  const b = await abrirNavegador();
  const ctx = await b.newContext({ viewport });
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
