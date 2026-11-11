// Consistência de cada deck: a chance de a mão inicial já "abrir jogando".
// Divisão de trabalho: a IA lê os efeitos e marca as cartas de partida e os tijolos (uma vez por deck,
// fica guardado no aparelho); o app faz a conta exata com a distribuição hipergeométrica.
// O resultado vai junto na previsão do Oráculo e aparece nos detalhes de cada deck.

// Combinação C(n, k) com números reais (os valores de um deck de 40 cartas cabem com folga)
function comb(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}
// Chance de tirar pelo menos `min` cartas de um grupo de K, comprando `mao` cartas de um deck de N
function hiper(N, K, mao, min = 1) {
  let p = 0;
  for (let x = 0; x < min; x++) p += (comb(K, x) * comb(N - K, mao - x)) / comb(N, mao);
  return Math.max(0, Math.min(1, 1 - p));
}
// Números de consistência a partir das quantidades (cópias) do Deck Principal
function consNumeros(N, S, B) {
  return {
    cartas: N,
    partida: S,
    tijolos: B,
    abre5: hiper(N, S, 5),
    abre6: hiper(N, S, 6),
    tijolo2: hiper(N, B, 5, 2),
  };
}

// Classificação guardada no aparelho: { nomeDoDeck: { sig, p: [inglês], t: [inglês], r: resumo } }
let PART = {};
try {
  PART = JSON.parse(localStorage.getItem('ygo_part') || '{}') || {};
} catch (e) {}
const savePart = () => {
  try {
    localStorage.setItem('ygo_part', JSON.stringify(PART));
  } catch (e) {}
};
// Assinatura da lista: se a lista do deck mudar, a classificação é refeita
const consSig = main => main.map(c => c.q + 'x' + c.en).join('|');

// main: cartas do Deck Principal [{ en, pt, q, txt }]. Devolve os números, ou null se não der para calcular.
async function consistencia(nome, estrategia, main) {
  if (!main.length) return null;
  const sig = consSig(main);
  let c = PART[nome];
  if (!c || c.sig !== sig) {
    if (!oraOn()) return null;
    const r = await oraPost('/partida', { nome, estrategia, cartas: main.map(x => x.txt) }, 30000);
    c = PART[nome] = {
      sig,
      p: (r.partida || []).map(i => main[i] && main[i].en).filter(Boolean),
      t: (r.tijolos || []).map(i => main[i] && main[i].en).filter(Boolean),
      r: limpaTudo(String(r.resumo || '')),
    };
    savePart();
  }
  const q = L => main.filter(x => L.includes(x.en)).reduce((s, x) => s + x.q, 0),
    N = main.reduce((s, x) => s + x.q, 0);
  if (c.n !== N) {
    c.n = N;
    savePart();
  }
  return { ...consNumeros(N, q(c.p), q(c.t)), lista: c };
}

// Deck Principal de um deck do app, com o texto que a IA lê (o mesmo formato da previsão)
async function consMain(i) {
  const d = DECKS[i],
    L = CARDS[d[0]] || [];
  let det = null;
  try {
    det = await oraTO(getDeck(d[0]), 8000);
  } catch (e) {}
  if (!det) return null;
  return L.map((x, k) => ({ x, c: det[k] }))
    .filter(({ c }) => !(c && c.d && cat(c.d) === 'E'))
    .map(({ x, c }) => ({ en: x[1], q: x[3] || 1, txt: oraLinha(x, c) }));
}

// Detalhes do deck: bloco de consistência (calcula com a IA se ainda não tiver)
const pc = x => Math.round(x * 100) + '%';
function consHTML(i) {
  const nome = DECKS[i][0],
    c = PART[nome];
  if (!c)
    return `<div class="clh">🎴 CONSISTÊNCIA</div><div class="cnote" style="text-align:left">Chance de a mão inicial já começar a jogar. A IA marca as cartas de partida lendo os efeitos e o app faz a conta.</div>${oraOn() ? `<button class="btn sec" onclick="consCalcular(${i})">🎴 Calcular consistência</button>` : ''}`;
  const L = CARDS[nome] || [],
    nm = en => {
      const x = L.find(y => y[1] === en);
      return esc((x && typeof x[0] === 'string' && x[0]) || en);
    },
    q = en => (L.find(y => y[1] === en) || [])[3] || 1,
    N = c.n || 40,
    S = c.p.reduce((s, en) => s + q(en), 0),
    B = c.t.reduce((s, en) => s + q(en), 0),
    k = consNumeros(N, S, B);
  return `<div class="clh">🎴 CONSISTÊNCIA</div>
 <div class="cons"><div><b>${pc(k.abre5)}</b><small>abre jogando<br>com 5 cartas</small></div><div><b>${pc(k.abre6)}</b><small>abre jogando<br>com 6 cartas</small></div><div><b>${pc(k.tijolo2)}</b><small>chance de 2+<br>tijolos na mão</small></div></div>
 ${c.r ? `<p class="cnote" style="text-align:left">${esc(c.r)}</p>` : ''}
 <details class="orad"><summary>Cartas de partida (${S}) e tijolos (${B})</summary><p class="cnote" style="text-align:left">▶️ ${c.p.map(en => nm(en) + (q(en) > 1 ? ' ×' + q(en) : '')).join(' · ') || '—'}</p><p class="cnote" style="text-align:left">🧱 ${c.t.map(en => nm(en) + (q(en) > 1 ? ' ×' + q(en) : '')).join(' · ') || '—'}</p><p class="cnote" style="text-align:left">Conta exata (distribuição hipergeométrica) num Deck Principal de ${N} cartas.</p></details>`;
}
async function consCalcular(i) {
  const el = $('#consD');
  if (el) el.innerHTML = '<div class="clh">🎴 CONSISTÊNCIA</div><p class="cnote">A IA está lendo os efeitos das cartas…</p>';
  try {
    const main = await consMain(i);
    if (!main) throw new Error('sem a lista de efeitos (precisa de internet)');
    await consistencia(DECKS[i][0], DECKS[i][4], main);
  } catch (e) {
    if (el) el.innerHTML = `<div class="clh">🎴 CONSISTÊNCIA</div><p class="cnote">Não deu para calcular agora: ${esc(oraMotivo(e.message) || e.message)}</p>`;
    return;
  }
  const e2 = $('#consD');
  if (e2) e2.innerHTML = consHTML(i);
}
