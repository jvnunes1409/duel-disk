// Testes do Worker do Oráculo, sem internet: a chamada ao Gemini é simulada.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/oraculo.js';

const ENV = { GEMINI_KEY: 'chave-teste' };
const ORIGEM = 'https://jvnunes1409.github.io';
const respostaGemini = obj =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), {
    status: 200,
  });
const PREVISAO = {
  chance_a: 0.99,
  resumo: 'r',
  analise: 'a',
  plano_a: 'p',
  plano_b: 'q',
  chaves_a: [],
  chaves_b: [],
  plano_azarao: 'z',
  confianca: 'media',
};
const pedir = (rota, corpo, origem = ORIGEM, ip = String(Math.random())) =>
  worker.fetch(
    new Request('https://oraculo.teste' + rota, {
      method: 'POST',
      headers: { Origin: origem, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
      body: JSON.stringify(corpo),
    }),
    ENV
  );
const deck = nome => ({
  nome,
  tier: 2,
  estrategia: 'e',
  fortes: 'f',
  fracos: 'w',
  cartas: ['2x Carta (Card) [Nível 4]'],
});

let chamadas;
beforeEach(() => {
  chamadas = [];
});

test('previsão: devolve JSON, limita a chance entre 5% e 95% e usa saída estruturada', async () => {
  globalThis.fetch = async (url, op) => {
    chamadas.push({ url, corpo: JSON.parse(op.body) });
    return respostaGemini(PREVISAO);
  };
  const r = await pedir('/prever', { a: deck('A'), b: deck('B'), ctx: {} });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.chance_a, 0.95, '99% vira 95%: Yu-Gi-Oh! sempre tem variância');
  assert.equal(chamadas[0].corpo.generationConfig.responseMimeType, 'application/json');
  assert.ok(chamadas[0].corpo.generationConfig.responseSchema.required.includes('chance_a'));
});

test('sobrecarga do Gemini (503): tenta de novo e depois troca para o modelo reserva', async () => {
  let n = 0;
  globalThis.fetch = async url => {
    chamadas.push(url.split('models/')[1].split(':')[0]);
    return ++n <= 3 ? new Response('{"error":{"code":503}}', { status: 503 }) : respostaGemini(PREVISAO);
  };
  const r = await pedir('/prever', { a: deck('A'), b: deck('B') });
  assert.equal(r.status, 200);
  assert.deepEqual(chamadas, [
    'gemini-3.8-flash',
    'gemini-3.8-flash',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
  ]);
});

test('recusa pedidos de outros sites', async () => {
  globalThis.fetch = async () => respostaGemini(PREVISAO);
  const r = await pedir('/prever', { a: deck('A'), b: deck('B') }, 'https://site-estranho.com');
  assert.equal(r.status, 403);
});

test('freio contra abuso: o mesmo IP não passa do limite de pedidos', async () => {
  globalThis.fetch = async () => respostaGemini({ titulo: 't', cronica: 'c', virada: 'v', oraculo: 'o' });
  let ultimo;
  for (let k = 0; k < 121; k++)
    ultimo = await pedir('/cronica', { nomes: ['A', 'B'], w: 0 }, ORIGEM, '1.2.3.4');
  assert.equal(ultimo.status, 429);
});

test('crônica e veredito mandam as jogadas faladas com as cartas e o dono de cada uma', async () => {
  globalThis.fetch = async (url, op) => {
    chamadas.push(JSON.parse(op.body).contents[0].parts[0].text);
    return respostaGemini({
      deu_logica: 'sim',
      titulo: 't',
      veredito: 'v',
      fator_decisivo: 'f',
      licao_a: 'a',
      licao_b: 'b',
    });
  };
  const jogadas = [
    {
      tn: 3,
      s: 190,
      p: 0,
      fala: 'ataquei com a distopia e ele ativou a lança',
      cartas: [
        { carta: 'Destiny HERO - Dystopia', nome_pt: 'HERÓI do Destino - Distopia' },
        { carta: "Phantom Knights' Spear", nome_pt: 'Cavaleiros Fantasmas - Lança', dono: 1 },
      ],
    },
  ];
  const r = await pedir('/veredito', {
    nomes: ['Douglas', 'João'],
    a: deck('A'),
    b: deck('B'),
    w: 0,
    lp: [100, 0],
    jogadas,
  });
  assert.equal(r.status, 200);
  assert.match(chamadas[0], /HERÓI do Destino - Distopia/);
  assert.match(chamadas[0], /Cavaleiros Fantasmas - Lança \(Phantom Knights' Spear\), do deck de João/);
});

test('segurança: localhost só é aceito quando ALLOW_LOCAL=1', async () => {
  globalThis.fetch = async () => respostaGemini(PREVISAO);
  const r = await pedir('/prever', { a: deck('A'), b: deck('B') }, 'http://localhost:8080');
  assert.equal(r.status, 403);
});
