// Jogadas por voz: reconhecimento da carta falada entre as cartas dos dois decks (sem IA externa).
// ===== Jogadas por voz =====
// Um toque no 🎙️, fala a jogada ("invoquei Stardust Dragon"), e o app procura a carta só entre as cartas dos dois decks do duelo.
// O deck onde a carta está diz de quem foi a jogada; se estiver nos dois (ou em nenhum), vale o nome falado ou o dono do turno.
const SRC = window.SpeechRecognition || window.webkitSpeechRecognition;
const micOn = () => !!SRC && CFG.mic !== 0;
const vNorm = s =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const VSTOP = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'o',
  'a',
  'os',
  'as',
  'e',
  'the',
  'of',
  'um',
  'uma',
  'no',
  'na',
  'em',
  'com',
]);
const vTok = s =>
  vNorm(s)
    .split(' ')
    .filter(w => w.length > 1 && !VSTOP.has(w));
function vLev(a, b) {
  if (a === b) return 0;
  const m = a.length,
    n = b.length;
  if (!m || !n) return m || n;
  let p = [...Array(n + 1).keys()];
  for (let i = 1; i <= m; i++) {
    const c = [i];
    for (let j = 1; j <= n; j++)
      c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[n];
}
const vSim = (a, b) => 1 - vLev(a, b) / Math.max(a.length, b.length);
// Quanto do nome da carta aparece na fala: cada palavra do nome procura a palavra mais parecida da fala
function vScore(fala, nome) {
  const N = vTok(nome),
    F0 = vTok(fala);
  if (!N.length || !F0.length) return 0;
  const F = F0.concat(F0.slice(1).map((w, k) => F0[k] + w));
  // Peso por raridade: palavras do arquétipo ("Cavaleiros Fantasmas", "HERÓI do Destino") valem pouco; a parte que distingue a carta vale muito
  const DF = VZ.df || {},
    wt = w => 1 / Math.sqrt(DF[w] || 1);
  let s = 0,
    tot = 0;
  N.forEach(w => {
    let b = 0;
    F.forEach(f => {
      const x = vSim(w, f);
      if (x > b) b = x;
    });
    tot += wt(w);
    s += b >= 0.72 ? b * wt(w) : 0;
  });
  const cob = s / tot;
  return N.length === 1 && N[0].length < 5 ? cob * 0.85 : cob;
}
let VZ = { cand: null, rec: null, ouvindo: false };
// Monta a lista de candidatas: nomes em inglês e em português (do cache de cartas, quando já carregado)
function vPrep() {
  if (VZ.pp && VZ.ppd === duel) return VZ.pp;
  VZ.ppd = duel;
  return (VZ.pp = vPrep0());
}
async function vPrep0() {
  const D = duel;
  if (!D || !D.decks) return;
  const C = [];
  for (const [p, i] of D.decks.map((i, p) => [p, i])) {
    const n = DECKS[i][0],
      L = CARDS[n] || [];
    let det = null;
    try {
      det = await getDeck(n);
    } catch (e) {}
    L.forEach((x, k) => {
      const d = det && det[k],
        pt = (d && d.pt) || x[0] || '',
        en = x[1];
      C.push({
        p,
        en,
        pt: pt && pt !== en ? pt : '',
        fx: d && d.d ? String(d.pe || d.d.e || '').slice(0, 400) : '',
      });
    });
  }
  const fr = {};
  C.forEach(c =>
    new Set([...vTok(c.en), ...vTok(c.pt)]).forEach(w => {
      (fr[w] = fr[w] || new Set()).add(c.en);
    })
  );
  const df = {};
  C.forEach(c => {
    new Set(vTok(c.en)).forEach(w => (df[w] = (df[w] || 0) + 1));
    new Set(vTok(c.pt)).forEach(w => (df[w] = (df[w] || 0) + 1));
  });
  C.forEach(
    c =>
      (c.uni = [...new Set([...vTok(c.en), ...vTok(c.pt)])].filter(
        w => w.length >= 5 && fr[w].size === 1 && !VGEN.has(w)
      ))
  );
  if (duel === D) {
    VZ.df = df;
    VZ.cand = C;
  }
}
function vMatch(alts) {
  const C = VZ.cand || [];
  let best = null;
  alts.forEach(fala =>
    C.forEach(c => {
      const s = Math.max(vScore(fala, c.en), c.pt ? vScore(fala, c.pt) : 0);
      if (!best || s > best.s) best = { s, c, fala };
    })
  );
  if (best && best.s >= 0.62) return best;
  const hit = new Map();
  alts.forEach(fala => {
    const F = vTok(fala);
    C.forEach(c =>
      (c.uni || []).forEach(w => {
        const x = Math.max(0, ...F.map(f => vSim(w, f)));
        if (x >= 0.85) {
          const o = hit.get(c.en);
          if (!o || x > o.x) hit.set(c.en, { s: 0.62, c, fala, x });
        }
      })
    );
  });
  const H = [...hit.values()].sort((a, b) => b.x - a.x);
  if (H.length === 1 || (H.length > 1 && H[0].x - H[1].x >= 0.1)) return H[0];
  // Apelido que serve para mais de uma carta: fica com a carta-símbolo do deck (Stardust → Stardust Dragon), se ela estiver entre as opções
  const sig = [];
  alts.forEach(fala => {
    const F = vTok(fala);
    C.forEach(c => {
      if (
        duel.decks.some(i => DECKS[i][7] === c.en) &&
        !sig.some(x => x.c.en === c.en) &&
        [...vTok(c.en), ...vTok(c.pt)].some(w => w.length >= 5 && F.some(f => vSim(w, f) >= 0.85))
      )
        sig.push({ s: 0.6, c, fala });
    });
  });
  return sig.length === 1 ? sig[0] : null;
}
function vQuem(fala, c) {
  const f = vNorm(fala),
    dono = [0, 1].filter(p => (VZ.cand || []).some(x => x.p === p && c && x.en === c.en));
  const dito = [0, 1].find(p => f.includes(vNorm(NOMES[p])));
  if (dito != null) return dito;
  if (dono.length === 1) return dono[0];
  const t = turnOf();
  return t == null ? null : t;
}
function vBar(html, ms) {
  const e = $('#vzb');
  if (!e) return;
  clearTimeout(VZ.tb);
  e.innerHTML = html;
  e.classList.toggle('on', !!html);
  if (ms) VZ.tb = setTimeout(() => e.classList.remove('on'), ms);
}
function vOuvir(quem) {
  if (!SRC || over || !duel.decks) {
    toast(duel.decks ? 'Duelo encerrado' : 'Sorteie os decks primeiro');
    return;
  }
  if (VZ.ouvindo) {
    VZ.rec && VZ.rec.stop();
    return;
  }
  if (!VZ.cand) vPrep();
  const r = new SRC();
  r.lang = 'pt-BR';
  r.interimResults = true;
  r.maxAlternatives = 5;
  r.continuous = false;
  VZ.rec = r;
  VZ.ouvindo = true;
  const b = $('#bMic');
  b && b.classList.add('rec');
  vBar('🎙️ ' + (quem != null && quem >= 0 ? NOMES[quem] + ', pode falar…' : 'Pode falar…'));
  let fin = null;
  r.onresult = ev => {
    const res = ev.results[ev.results.length - 1];
    if (res.isFinal) fin = [...res].map(a => a.transcript);
    else vBar('🎙️ ' + esc(res[0].transcript));
  };
  r.onerror = ev => {
    fin = null;
    vBar(
      ev.error === 'not-allowed'
        ? '🎙️ Microfone bloqueado: libere nas permissões do navegador'
        : ev.error === 'no-speech'
          ? '🎙️ Não ouvi nada'
          : '🎙️ Erro no microfone (' + esc(ev.error) + ')',
      3500
    );
  };
  r.onend = () => {
    VZ.ouvindo = false;
    b && b.classList.remove('rec');
    if (fin && fin.length) vRegistrar(fin, quem);
  };
  try {
    r.start();
    play('click');
  } catch (e) {
    VZ.ouvindo = false;
    b && b.classList.remove('rec');
    vBar('🎙️ Não consegui abrir o microfone', 3000);
  }
}
// Uma fala pode citar várias cartas ("ataquei com o Dragão Negro e ele ativou Força Espelho"):
// quebra nos conectores e procura uma carta em cada pedaço; se nada aparecer, tenta a fala inteira e as alternativas.
// Palavras do jogo que aparecem na fala o tempo todo: nunca bastam sozinhas para identificar uma carta
const VGEN = new Set([
  'monstro',
  'monstros',
  'magia',
  'magias',
  'armadilha',
  'armadilhas',
  'carta',
  'cartas',
  'campo',
  'cemiterio',
  'ataque',
  'ataquei',
  'atacou',
  'defesa',
  'efeito',
  'invocacao',
  'invoquei',
  'invocou',
  'turno',
  'pontos',
  'vida',
  'dano',
  'destrui',
  'destruiu',
  'monster',
  'spell',
  'trap',
  'card',
  'attack',
  'defense',
  'summon',
]);
const VSEP = /,|;|\b(?:e|depois|entao|ai|mas|enquanto|quando|respondi|respondeu|em resposta|contra)\b/;
function vCartas(alts) {
  const out = [],
    add = m => {
      if (m && !out.some(x => x.en === m.c.en)) out.push(m.c);
    };
  vNorm(alts[0])
    .split(VSEP)
    .map(x => (x || '').trim())
    .filter(x => x && x.length > 2)
    .forEach(seg => add(vMatch([seg])));
  if (!out.length) add(vMatch(alts));
  return out;
}
async function vRegistrar(alts, quem) {
  if (!VZ.cand) {
    vBar('🎙️ Preparando a lista de cartas…');
    try {
      await oraTO(vPrep(), 6000);
    } catch (e) {}
  }
  const cs = vCartas(alts),
    fala = String(alts[0] || '').trim(),
    p = quem != null && quem >= 0 ? quem : vQuem(fala, cs[0]);
  const ev = { t: duel.t0 ? Date.now() - duel.t0 : 0, tn: duel.tn, p, fala };
  if (cs.length) {
    ev.cards = cs.map(c => {
      const o = { en: c.en };
      if (c.pt) o.pt = c.pt;
      const d = vQuem('', c);
      if (d != null && d !== p) o.dono = d;
      return o;
    });
    ev.en = cs[0].en;
    if (cs[0].pt) ev.pt = cs[0].pt;
    if (ev.cards[0].dono != null) ev.dono = ev.cards[0].dono;
  }
  (duel.ev = duel.ev || []).push(ev);
  const k = duel.ev.length - 1;
  const nm = c =>
    esc(c.pt || c.en) +
    (c.dono != null ? ` <small style="color:${COR[c.dono]}">(de ${NOMES[c.dono]})</small>` : '');
  vBar(
    `<span>${p != null ? `<b style="color:${COR[p]}">${NOMES[p]}</b> · ` : ''}T${ev.tn} · ${cs.length ? '🃏 <b>' + ev.cards.map(nm).join(' + ') + '</b>' : '📝 ' + esc(fala)}</span><button onclick="vDesfazer(${k})">Desfazer</button>`,
    cs.length > 1 ? 7000 : 5000
  );
  play(cs.length ? 'heal' : 'click');
}
function vDesfazer(k) {
  if (!duel.ev || !duel.ev[k]) return;
  duel.ev.splice(k, 1);
  vBar('Jogada removida', 1500);
}
const vEvCards = e => e.cards || (e.en ? [{ en: e.en, pt: e.pt, dono: e.dono }] : []);
const vEvTxt = e => {
  const c = vEvCards(e);
  return c.length
    ? '🃏 ' +
        c
          .map(
            x =>
              esc(x.pt || x.en) +
              (x.dono != null
                ? ` <small style="display:inline;color:${COR[x.dono]}">(de ${NOMES[x.dono]})</small>`
                : '')
          )
          .join(' + ')
    : '📝 ' + esc(e.fala);
};
function vLista() {
  const E = duel.ev || [];
  modal(
    `<h2>🎙️ JOGADAS FALADAS</h2>${E.length ? E.map((e, k) => `<div class="vzl"><span>T${e.tn} ${e.p != null ? `<b style="color:${COR[e.p]}">${NOMES[e.p]}</b>` : ''}<br>${vEvTxt(e)}<small>“${esc(e.fala)}”</small></span><button onclick="duel.ev.splice(${k},1);vLista()" aria-label="Remover">✖</button></div>`).join('') : '<p>Nenhuma jogada falada neste duelo.<br>Toque no 🎙️ e diga a carta, por exemplo: “ativei Raigeki”.</p>'}<button class="btn sec" onclick="menu()">← Voltar</button>`
  );
}
// Para a crônica: jogadas com o texto da carta (a IA deduz o efeito usado cruzando com o dano do mesmo turno)
async function vParaIA(h) {
  const fx = {};
  for (const n of h.decks || []) {
    let det = null;
    try {
      det = await oraTO(getDeck(n), 5000);
    } catch (e) {}
    (det || []).forEach(d => {
      if (d.d) fx[d.en] = String(d.pe || d.d.e || '').slice(0, 400);
    });
  }
  return (h.ev || []).map(e => {
    const cs = vEvCards(e).map(c => ({
      carta: c.en,
      nome_pt: c.pt || null,
      dono: c.dono != null ? c.dono : null,
      efeito: fx[c.en] || '',
    }));
    return {
      tn: e.tn,
      s: Math.round(e.t / 1000),
      p: e.p,
      fala: e.fala,
      cartas: cs,
      carta: cs[0] ? cs[0].carta : null,
      nome_pt: cs[0] ? cs[0].nome_pt : null,
      dono: cs[0] ? cs[0].dono : null,
      efeito: cs[0] ? cs[0].efeito : '',
    };
  });
}
function vMicBtn() {
  const b = $('#bMic');
  if (b) b.style.display = micOn() ? '' : 'none';
}
