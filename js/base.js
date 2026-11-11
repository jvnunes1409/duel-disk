// Configuração básica: decks do torneio, decks cadastrados no aparelho, tiers, atributos, jogadores e utilitários.
// Versão do app (a mesma do cache do service worker): aparece no menu para saber qual versão o celular está rodando
const APPV = 'v55';
const TORN = 24,
  TORNNAMES = DECKS.slice(0, TORN).map(d => d[0]),
  BASEN = DECKS.length,
  BASENAMES = DECKS.map(d => d[0]),
  EMO = { FOGO: '🔥', ÁGUA: '💧', TERRA: '⛰️', VENTO: '🌪️', LUZ: '✨', TREVAS: '🌑', DIVINO: '⚡' };
// Segurança: texto que vem de fora do código (deck cadastrado no app, arquivo de backup) nunca pode virar HTML.
// limpaTudo tira < e > de todas as strings, em qualquer profundidade do objeto.
const limpaTudo = o =>
  typeof o === 'string'
    ? o.replace(/[<>]/g, '')
    : Array.isArray(o)
      ? o.map(limpaTudo)
      : o && typeof o === 'object'
        ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, limpaTudo(v)]))
        : o;
let CUS = [];
try {
  CUS = limpaTudo(JSON.parse(localStorage.getItem('ygo_custom') || '[]'));
} catch (e) {}
CUS = CUS.filter(c => c && c.n && !BASENAMES.includes(c.n));
CUS.forEach(c => {
  if (!DECKS.some(d => d[0] === c.n))
    DECKS.push([
      c.n,
      c.t || 3,
      c.a || 'LUZ',
      c.e || EMO[c.a] || '🃏',
      c.s || 'Deck cadastrado por vocês.',
      c.f || '—',
      c.w || '—',
      c.q || (c.cards && c.cards[0] && c.cards[0][1]) || c.n,
    ]);
});
const BT = DECKS.map(d => d[1]);
let TO = {};
try {
  TO = JSON.parse(localStorage.getItem('ygo_tiers') || '{}');
} catch (e) {}
DECKS.forEach(d => {
  if (TO[d[0]]) d[1] = TO[d[0]];
});
const GL = {
  FOGO: '<path d="M16 5c1 5 7 8 7 14a7 7 0 0 1-14 0c0-3 2-5 3-7 0 3 2 4 3 4 0-4-1-7 1-11z"/>',
  ÁGUA: '<path d="M16 5c4 6 8 9 8 14a8 8 0 0 1-16 0c0-5 4-8 8-14z"/>',
  VENTO:
    '<g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M7 12h11a3 3 0 1 0-3-3"/><path d="M7 17h16a3 3 0 1 1-3 3"/><path d="M7 22h7"/></g>',
  TERRA: '<path d="M4 24l8-13 5 8 3-4 8 9z"/>',
  LUZ: '<circle cx="16" cy="16" r="5"/><g stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M16 4v4M16 24v4M4 16h4M24 16h4M7.5 7.5l2.8 2.8M21.7 21.7l2.8 2.8M24.5 7.5l-2.8 2.8M10.3 21.7l-2.8 2.8"/></g>',
  TREVAS: '<path d="M20 5a11 11 0 1 0 7 19 9 9 0 0 1-7-19z"/>',
  DIVINO: '<path d="M16 5l11 20H5z"/><circle cx="16" cy="18" r="3" fill="#8a6a10"/>',
};
function atr(a) {
  const c = ATTR[a] || '#888';
  return `<i class="atr" title="${a}"><svg viewBox="0 0 32 32" fill="#fff"><circle cx="16" cy="16" r="15" fill="${c}" stroke="#0a1230" stroke-width="1.6"/><circle cx="16" cy="16" r="13" fill="none" stroke="#fff" stroke-opacity=".5"/>${GL[a] || ''}</svg></i>`;
}
const ATTR = {
  LUZ: '#f5d76e',
  TREVAS: '#8b5cf6',
  FOGO: '#ff6a3d',
  ÁGUA: '#3aa8ff',
  TERRA: '#b9833f',
  VENTO: '#4fd1a1',
  DIVINO: '#e8b94a',
};
const NOMES = ['Douglas', 'João'],
  COR = ['var(--g)', 'var(--b)'],
  GC = ['#3a8cff', '#2ad6c8', '#35d86a', '#8be83a', '#e8f030', '#ffc02e', '#ff7a2e', '#ff3b3b'];
const $ = s => document.querySelector(s),
  pick = a => a[(Math.random() * a.length) | 0];
const fmt = ms => {
  const s = Math.round(ms / 1000);
  return Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's';
};
