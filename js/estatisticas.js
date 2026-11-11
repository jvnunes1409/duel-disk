// Estatísticas, conquistas, Elo e desempenho do aparelho.
// ===== Estatísticas =====
let SF = 'all',
  SO = 'pct',
  SR = [],
  SD = {};
const nf = n => Math.round(n).toLocaleString('pt-BR'),
  pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '–'),
  dt = t => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
// Reconstrói o duelo pelo registro de LP: dano causado, maior golpe, cura, quanto cada um ficou para trás
function replay(h) {
  const L = [8000, 8000],
    r = { dmg: [0, 0], big: [0, 0], heal: [0, 0], bigHeal: [0, 0], gap: [0, 0], hits: h.log.length };
  h.log.forEach(e => {
    L[e.p] = e.lp;
    if (e.d < 0) {
      r.dmg[1 - e.p] -= e.d;
      r.big[1 - e.p] = Math.max(r.big[1 - e.p], -e.d);
    } else {
      r.heal[e.p] += e.d;
      r.bigHeal[e.p] = Math.max(r.bigHeal[e.p], e.d);
    }
    for (const p of [0, 1]) r.gap[p] = Math.max(r.gap[p], L[1 - p] - L[p]);
  });
  return r;
}
function deckStats(R) {
  const S = {},
    g = n =>
      S[n] ||
      (S[n] = {
        n,
        g: 0,
        v: 0,
        d: 0,
        bp: [
          [0, 0],
          [0, 0],
        ],
        wd: 0,
        wc: 0,
        lpw: 0,
        op: {},
        dmg: 0,
        big: 0,
      });
  R.forEach(({ h, r }) => {
    if (!h.decks) return;
    [0, 1].forEach(p => {
      const s = g(h.decks[p]),
        won = h.w === p,
        o = h.decks[1 - p],
        q = s.op[o] || (s.op[o] = [0, 0]);
      s.g++;
      won ? s.v++ : s.d++;
      s.bp[p][won ? 0 : 1]++;
      q[won ? 0 : 1]++;
      s.dmg += r.dmg[p];
      s.big = Math.max(s.big, r.big[p]);
      if (won) {
        s.lpw += h.lp[p];
        if (h.dur > 0) {
          s.wd += h.dur;
          s.wc++;
        }
      }
    });
  });
  return S;
}
// ---- Conquistas (calculadas a partir do histórico inteiro)
const ACH = {
  first: { e: '🩸', n: 'Primeiro sangue', d: 'Vencer o primeiro duelo' },
  vir3: { e: '🔄', n: 'Virada', d: 'Vencer estando 3000+ LP atrás' },
  vir5: { e: '🌪️', n: 'Virada épica', d: 'Vencer estando 5000+ LP atrás' },
  perf: { e: '💎', n: 'Intocável', d: 'Vencer com os 8000 LP' },
  lim: { e: '😰', n: 'Por um fio', d: 'Vencer com 500 LP ou menos' },
  zeb: { e: '🦓', n: 'Zebra', d: 'Vencer um deck 2+ tiers acima' },
  mzeb: { e: '🦄', n: 'Zebra lendária', d: 'Vencer um Tier 1 usando um Tier 5' },
  rel: { e: '⚡', n: 'Relâmpago', d: 'Vencer em menos de 5 minutos' },
  blitz: { e: '🚀', n: 'Blitz', d: 'Vencer até o 3º turno' },
  otk: { e: '☠️', n: 'One Turn Kill', d: 'Tirar os 8000 LP do rival em um único turno' },
  big: { e: '💥', n: 'Golpe devastador', d: 'Causar 4000+ de dano de uma vez' },
  heal: { e: '💚', n: 'Curandeiro', d: 'Recuperar 3000+ LP em um duelo' },
  mar: { e: '🏃', n: 'Maratona', d: 'Vencer um duelo de 30+ minutos' },
  st3: { e: '🔥', n: 'Embalado', d: '3 vitórias seguidas' },
  st5: { e: '🌋', n: 'Imparável', d: '5 vitórias seguidas' },
  rev: { e: '⚔️', n: 'Volta por cima', d: 'Vencer uma série MD3 depois de perder o 1º duelo' },
  col10: { e: '🎴', n: 'Colecionador', d: 'Vencer com 10 decks diferentes' },
  col24: { e: '👑', n: 'Mestre de todos os decks', d: 'Vencer com todos os 24 decks' },
  champ: { e: '🏆', n: 'Campeão', d: 'Vencer a final do mata-mata' },
  vet: { e: '🎖️', n: 'Veteranos', d: '50 duelos jogados' },
};
function otk(h) {
  if (!h.tn) return false;
  const L = h.log.filter(e => e.p === 1 - h.w);
  if (!L.length || L.some(e => e.tn == null)) return false;
  const last = L[L.length - 1].tn;
  let b = 8000;
  for (const e of L) {
    if (e.tn === last) return b === 8000;
    b = e.lp;
  }
  return false;
}
function achv(H) {
  const A = [{}, {}],
    set = (p, id, t) => {
      if (!A[p][id]) A[p][id] = t;
    },
    wd = [new Set(), new Set()],
    sk = [0, 0],
    srs = {};
  H.slice()
    .sort((a, b) => a.t - b.t)
    .forEach((h, k) => {
      const w = h.w,
        l = 1 - w,
        r = replay(h),
        t = h.t;
      set(w, 'first', t);
      if (r.gap[w] >= 3000) set(w, 'vir3', t);
      if (r.gap[w] >= 5000) set(w, 'vir5', t);
      if (h.lp[w] === 8000) set(w, 'perf', t);
      if (h.lp[w] > 0 && h.lp[w] <= 500) set(w, 'lim', t);
      if (h.decks) {
        const a = tierOf(h.decks[w]),
          b = tierOf(h.decks[l]);
        if (a && b) {
          if (a - b >= 2) set(w, 'zeb', t);
          if (a === 5 && b === 1) set(w, 'mzeb', t);
        }
        wd[w].add(h.decks[w]);
        if (wd[w].size >= 10) set(w, 'col10', t);
        if (TORNNAMES.every(n => wd[w].has(n))) set(w, 'col24', t);
      }
      if (h.dur > 0 && h.dur < 3e5) set(w, 'rel', t);
      if (h.dur >= 18e5) set(w, 'mar', t);
      if (h.tn && h.tn <= 3) set(w, 'blitz', t);
      if (otk(h)) set(w, 'otk', t);
      [0, 1].forEach(p => {
        if (r.big[p] >= 4000) set(p, 'big', t);
        if (r.heal[p] >= 3000) set(p, 'heal', t);
      });
      sk[w]++;
      sk[l] = 0;
      if (sk[w] >= 3) set(w, 'st3', t);
      if (sk[w] >= 5) set(w, 'st5', t);
      if (h.tid === 'f') set(w, 'champ', t);
      if (k + 1 >= 50) {
        set(0, 'vet', t);
        set(1, 'vet', t);
      }
      if (h.sr) {
        const s = srs[h.sr] || (srs[h.sr] = []);
        s.push(h);
        const g = [0, 0];
        s.forEach(x => g[x.w]++);
        if (g[w] === 2 && s[0].w !== w) set(w, 'rev', t);
      }
    });
  return A;
}
function newAch(a, b) {
  const o = [];
  [0, 1].forEach(p =>
    Object.keys(b[p]).forEach(id => {
      if (!a[p][id]) o.push({ p, id });
    })
  );
  return o;
}
// ---- Força real (Elo): cada deck começa pelo tier original e ganha/perde pontos a cada duelo
const TE = { 1: 1700, 2: 1600, 3: 1500, 4: 1400, 5: 1300 };
// H: histórico usado na conta (o teste retroativo passa só os duelos anteriores a cada duelo)
function elo(H = hist) {
  const E = {},
    G = {};
  DECKS.forEach((d, i) => {
    E[d[0]] = TE[BT[i]] || 1500;
    G[d[0]] = 0;
  });
  H.slice()
    .sort((a, b) => a.t - b.t)
    .forEach(h => {
      if (!h.decks) return;
      const [a, b] = h.decks;
      if (E[a] == null || E[b] == null || a === b) return;
      const ea = 1 / (1 + 10 ** ((E[b] - E[a]) / 400)),
        d = 40 * ((h.w === 0 ? 1 : 0) - ea);
      E[a] += d;
      E[b] -= d;
      G[a]++;
      G[b]++;
    });
  return DECKS.map((d, i) => {
    const e = E[d[0]];
    return {
      n: d[0],
      i,
      e,
      g: G[d[0]],
      cur: d[1],
      sug: Math.min(5, Math.max(1, Math.round((1700 - e) / 100) + 1)),
    };
  });
}
// ---- Desempenho por confronto: vitórias e derrotas contra deck mais fraco / mesmo tier / mais forte
const CFX = [0.65, 0.5, 0.35],
  CFN = 5,
  CFL = 0.15;
function conf() {
  const S = {};
  DECKS.forEach(
    (d, i) =>
      (S[d[0]] = {
        i,
        g: 0,
        w: 0,
        exp: 0,
        b: [
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      })
  );
  hist.forEach(h => {
    if (!h.decks) return;
    const [a, b] = h.decks;
    if (a === b || !S[a] || !S[b]) return;
    [
      [a, b, 0],
      [b, a, 1],
    ].forEach(([me, op, p]) => {
      const x = S[me],
        t1 = DECKS[x.i][1],
        t2 = DECKS[S[op].i][1],
        k = t2 > t1 ? 0 : t2 === t1 ? 1 : 2,
        win = h.w === p ? 1 : 0;
      x.g++;
      x.w += win;
      x.exp += CFX[k];
      x.b[k][win ? 0 : 1]++;
    });
  });
  return DECKS.map(d => {
    const x = S[d[0]],
      cur = d[1],
      sc = x.g ? (x.w - x.exp) / x.g : 0,
      sug = x.g < CFN ? cur : sc >= CFL ? Math.max(1, cur - 1) : sc <= -CFL ? Math.min(5, cur + 1) : cur;
    return Object.assign({ n: d[0], cur, sc, sug }, x);
  });
}
function applyTier(i, t) {
  if (!confirm(`Mudar ${DECKS[i][0]} para o Tier ${t}?`)) return;
  setTier(i, t);
  rS();
  toast(`${DECKS[i][0]} agora é Tier ${t}`);
}
const tierOf = n => {
  const i = DI(n);
  return i < 0 ? null : DECKS[i][1];
};
function rS() {
  const el = $('#stx');
  if (!el) return;
  const H = hist
      .filter(h => SF === 'all' || (SF === 't' ? h.tid : !h.tid))
      .slice()
      .sort((a, b) => a.t - b.t),
    R = (SR = H.map(h => ({ h, r: replay(h) })));
  let o = `<div class="chips">${[
    ['all', 'Tudo'],
    ['t', 'Torneio'],
    ['a', 'Amistosos'],
  ]
    .map(
      ([k, t]) =>
        `<button class="${SF === k ? 'on' : ''}" onclick="SF='${k}';rS();play('click')">${t}</button>`
    )
    .join('')}</div>`;
  if (!R.length) {
    el.innerHTML =
      o +
      `<div class="card" style="text-align:center;color:var(--mut)">Nenhum duelo ${SF === 't' ? 'de torneio ' : SF === 'a' ? 'amistoso ' : ''}registrado ainda.<br>Joguem um duelo e as estatísticas aparecem aqui.</div>`;
    return;
  }
  // --- Jogadores
  const P = [0, 1].map(p => {
    const W = R.filter(x => x.h.w === p),
      Wt = W.filter(x => x.h.dur > 0);
    return {
      v: W.length,
      lpw: W.length ? W.reduce((a, x) => a + x.h.lp[p], 0) / W.length : null,
      fast: Wt.length ? Math.min(...Wt.map(x => x.h.dur)) : null,
      dmg: R.reduce((a, x) => a + x.r.dmg[p], 0),
      big: Math.max(0, ...R.map(x => x.r.big[p])),
      heal: R.reduce((a, x) => a + x.r.heal[p], 0),
      vir: W.filter(x => x.r.gap[p] >= 2000).length,
      perf: W.filter(x => x.h.lp[p] === 8000).length,
      suf: W.filter(x => x.h.lp[p] > 0 && x.h.lp[p] <= 1000).length,
      tit: CAMP.filter(c => c.p === p).length,
      best: 0,
      st: R.filter(x => x.h.first === p).length,
      sw: R.filter(x => x.h.first === p && x.h.w === p).length,
      mt: (a => (a.length ? Math.min(...a) : null))(
        W.filter(x => x.h.first != null && x.h.tn).map(x => x.h.tn)
      ),
    };
  });
  let cw = null,
    cn = 0;
  R.forEach(x => {
    cw === x.h.w ? cn++ : ((cw = x.h.w), (cn = 1));
    P[cw].best = Math.max(P[cw].best, cn);
  });
  const n = R.length,
    row = (lab, a, b, f, lo) => {
      const ok = a != null && b != null && a !== b,
        bA = ok && (lo ? a < b : a > b),
        bB = ok && !bA;
      return `<div class="sv"><b class="${bA ? 'best' : ''}">${a == null ? '–' : f(a)}</b><span>${lab}</span><b class="${bB ? 'best' : ''}">${b == null ? '–' : f(b)}</b></div>`;
    },
    id = x => x;
  o += `<div class="sh">⚔️ DOUGLAS × JOÃO</div><div class="card"><div class="vsh"><div><b style="color:var(--g)">DOUGLAS</b><span class="bn">${P[0].v}</span></div><span class="x">×</span><div><b style="color:var(--b)">JOÃO</b><span class="bn">${P[1].v}</span></div></div>
  <div class="sbar">${P[0].v ? `<i style="width:${(P[0].v / n) * 100}%;background:var(--g)"></i>` : ''}${P[1].v ? `<i style="width:${(P[1].v / n) * 100}%;background:var(--b)"></i>` : ''}</div>
  <div class="sbl"><span>${pct(P[0].v, n)} das vitórias</span><span>${n} duelo${n > 1 ? 's' : ''}</span><span>${pct(P[1].v, n)} das vitórias</span></div>
  <div class="mini" style="margin-bottom:6px">${cn > 1 ? `🔥 ${NOMES[cw]} está numa sequência de ${cn} vitórias` : `Última vitória: ${NOMES[cw]}`}</div>
  ${row('Maior sequência de vitórias', P[0].best, P[1].best, id)}${row('Títulos de torneio', P[0].tit, P[1].tit, id)}
  ${row('Vitória mais rápida', P[0].fast, P[1].fast, fmt, 1)}${row('LP médio ao vencer', P[0].lpw, P[1].lpw, nf)}
  ${row('Dano causado', P[0].dmg, P[1].dmg, nf)}${row('Maior dano em uma BP', P[0].big, P[1].big, nf)}${row('LP recuperado', P[0].heal, P[1].heal, nf)}
  ${row('Viradas (venceu estando 2000+ LP atrás)', P[0].vir, P[1].vir, id)}${row('Vitórias perfeitas (8000 LP)', P[0].perf, P[1].perf, id)}${row('Vitórias no sufoco (≤1000 LP)', P[0].suf, P[1].suf, id)}
  ${row('Aproveitamento quando começa', P[0].st ? Math.round((P[0].sw / P[0].st) * 100) : null, P[1].st ? Math.round((P[1].sw / P[1].st) * 100) : null, x => x + '%')}${row('Vitória em menos turnos', P[0].mt, P[1].mt, x => x + ' turno' + (x > 1 ? 's' : ''), 1)}</div>`;
  // --- Corrida do placar
  o += `<div class="sh">📈 CORRIDA DO PLACAR</div><div class="card">${n < 2 ? '<div class="mini">Aparece a partir de 2 duelos.</div>' : raceSVG(R) + '<div class="mini">Saldo de vitórias ao longo dos duelos · toque no gráfico para ver cada duelo</div>'}</div>`;
  // --- Tempo
  const T2 = R.filter(x => x.h.dur > 0),
    tot = T2.reduce((a, x) => a + x.h.dur, 0),
    lg = T2.slice().sort((a, b) => b.h.dur - a.h.dur)[0],
    sh = T2.slice().sort((a, b) => a.h.dur - b.h.dur)[0];
  const days = {};
  R.forEach(x => {
    const k = new Date(x.h.t).toLocaleDateString('pt-BR');
    days[k] = (days[k] || 0) + 1;
  });
  const bd = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
  const vs = x => (x && x.h.decks ? `${esc(x.h.decks[0])} × ${esc(x.h.decks[1])}` : 'decks não sorteados');
  o += `<div class="sh">⏱ TEMPO</div><div class="tiles">
  <div class="tile"><small>Tempo total de duelo</small><b>${T2.length ? (tot >= 36e5 ? Math.floor(tot / 36e5) + 'h ' + String(Math.floor((tot % 36e5) / 6e4)).padStart(2, '0') + 'm' : fmt(tot)) : '–'}</b><span>${T2.length} duelo${T2.length === 1 ? '' : 's'} cronometrado${T2.length === 1 ? '' : 's'}</span></div>
  <div class="tile"><small>Duração média</small><b>${T2.length ? fmt(tot / T2.length) : '–'}</b><span>por duelo</span></div>
  <div class="tile"><small>Duelo mais longo</small><b>${lg ? fmt(lg.h.dur) : '–'}</b><span>${lg ? vs(lg) : ''}</span></div>
  <div class="tile"><small>Duelo mais rápido</small><b>${sh ? fmt(sh.h.dur) : '–'}</b><span>${sh ? vs(sh) : ''}</span></div>
  ${(() => {
    const F = R.filter(x => x.h.first != null),
      Tn = F.filter(x => x.h.tn);
    return `<div class="tile"><small>Turnos por duelo</small><b>${Tn.length ? (Tn.reduce((a, x) => a + x.h.tn, 0) / Tn.length).toFixed(1).replace('.', ',') : '–'}</b><span>média${Tn.length ? ' de ' + Tn.length + ' duelo' + (Tn.length > 1 ? 's' : '') : ' (usem o contador de turnos)'}</span></div>
  <div class="tile"><small>Quem começa vence</small><b>${F.length ? pct(F.filter(x => x.h.w === x.h.first).length, F.length) : '–'}</b><span>${F.length ? 'em ' + F.length + ' duelo' + (F.length > 1 ? 's' : '') + ' com registro' : 'registrem quem começa'}</span></div>`;
  })()}
  <div class="tile" style="grid-column:span 2"><small>Dia com mais duelos</small><b class="nm">${bd[0]} · ${bd[1]} duelo${bd[1] > 1 ? 's' : ''}</b></div></div>`;
  // --- Recordes
  const mx = f => {
    let b = null;
    R.forEach(x =>
      [0, 1].forEach(p => {
        const v = f(x, p);
        if (v > 0 && (!b || v > b.v)) b = { x, p, v };
      })
    );
    return b;
  };
  const rb = mx((x, p) => x.r.big[p]),
    rh = mx((x, p) => x.r.bigHeal[p]),
    rv = mx((x, p) => (x.h.w === p ? x.r.gap[p] : 0)),
    rs = mx((x, p) => (x.h.w === p && x.h.lp[p] > 0 ? 8001 - x.h.lp[p] : 0)),
    rm = R.slice().sort((a, b) => b.r.hits - a.r.hits)[0];
  const dk = (x, p) => (x.h.decks ? ' com ' + esc(x.h.decks[p]) : '');
  o += `<div class="sh">🏅 RECORDES</div><div class="card">
  ${rb ? `<div class="rec"><i>💥</i><div><b>Maior dano em uma BP</b><small>${NOMES[rb.p]}${dk(rb.x, rb.p)} · ${dt(rb.x.h.t)}</small></div><em>${nf(rb.v)}</em></div>` : ''}
  ${rv ? `<div class="rec"><i>🔄</i><div><b>Maior virada</b><small>${NOMES[rv.p]}${dk(rv.x, rv.p)} estava ${nf(rv.v)} LP atrás e venceu · ${dt(rv.x.h.t)}</small></div><em>${nf(rv.v)}</em></div>` : ''}
  ${rs ? `<div class="rec"><i>😰</i><div><b>Vitória mais no sufoco</b><small>${NOMES[rs.p]}${dk(rs.x, rs.p)} venceu com ${nf(8001 - rs.v)} LP · ${dt(rs.x.h.t)}</small></div><em>${nf(8001 - rs.v)}</em></div>` : ''}
  ${rh ? `<div class="rec"><i>💚</i><div><b>Maior cura</b><small>${NOMES[rh.p]}${dk(rh.x, rh.p)} · ${dt(rh.x.h.t)}</small></div><em>+${nf(rh.v)}</em></div>` : ''}
  ${(x => (x ? `<div class="rec"><i>🔁</i><div><b>Duelo com mais turnos</b><small>${vs(x)} · venceu ${NOMES[x.h.w]} · ${dt(x.h.t)}</small></div><em>${x.h.tn} <small>turnos</small></em></div>` : ''))(R.filter(x => x.h.first != null && x.h.tn > 1).sort((a, b) => b.h.tn - a.h.tn)[0])}
  ${rm && rm.r.hits ? `<div class="rec"><i>🎢</i><div><b>Duelo mais movimentado</b><small>${vs(rm)} · ${dt(rm.h.t)}</small></div><em>${rm.r.hits} <small>mudanças</small></em></div>` : ''}</div>`;
  const mvm = {};
  R.forEach(({ h }) => {
    if (!h.mvp || !h.decks) return;
    const k = h.mvp.en + '|' + h.decks[h.w],
      q = mvm[k] || (mvm[k] = { ...h.mvp, dk: h.decks[h.w], c: 0 });
    q.c++;
  });
  const mvl = Object.values(mvm)
    .sort((a, b) => b.c - a.c)
    .slice(0, 10);
  o += `<div class="sh">⭐ CARTAS MVP</div><div class="card">${mvl.length ? mvl.map((x, k) => `<div class="rk" style="cursor:default"><span class="no">${k + 1}</span><div class="ph" ${x.is ? `style="background-image:url('${x.is}')"` : ''}></div><div class="mid"><b>${esc(x.n)}</b><small>${esc(x.dk)}</small></div><div class="vd">${x.c}×<small>MVP</small></div></div>`).join('') : '<div class="mini">Escolham a carta MVP no fim de cada duelo para montar este ranking.</div>'}</div>`;
  // --- Decks
  const S = (SD = deckStats(R)),
    L = Object.values(S);
  if (L.length) {
    const by = (f, min = 1) => L.filter(s => s.g >= min).sort(f)[0],
      t = (lab, s, v, sub) =>
        `<div class="tile" ${s ? `onclick="dStat('${s.n.replace(/'/g, "\\'")}')" style="cursor:pointer"` : ''}><small>${lab}</small><b class="nm">${s ? esc(s.n) : '–'}</b><span>${s ? v : sub || ''}</span></div>`;
    const mv = by((a, b) => b.v - a.v || a.d - b.d),
      bp = by((a, b) => b.v / b.g - a.v / a.g || b.g - a.g, 3),
      ml = by((a, b) => b.d - a.d || a.v - b.v),
      fs = L.filter(s => s.wc).sort((a, b) => a.wd / a.wc - b.wd / b.wc)[0],
      mu = by((a, b) => b.g - a.g),
      bd2 = by((a, b) => b.dmg / b.g - a.dmg / a.g, 2);
    o += `<div class="sh">🃏 DECKS</div><div class="tiles">${t('Mais vitórias', mv, mv.v + ' vitória' + (mv.v > 1 ? 's' : ''))}${t('Melhor aproveitamento', bp, bp && pct(bp.v, bp.g) + ' em ' + bp.g + ' jogos', 'mínimo de 3 jogos')}
   ${t('Mais rápido para vencer', fs, fs && 'média de ' + fmt(fs.wd / fs.wc))}${t('Mais destrutivo', bd2, bd2 && nf(bd2.dmg / bd2.g) + ' de dano por duelo', 'mínimo de 2 jogos')}
   ${t('Mais jogado', mu, mu.g + ' duelos')}${t('Mais derrotas', ml, ml.d + ' derrota' + (ml.d > 1 ? 's' : ''))}</div>`;
    const sorts = {
      pct: (a, b) => b.v / b.g - a.v / a.g || b.g - a.g,
      v: (a, b) => b.v - a.v || b.g - a.g,
      g: (a, b) => b.g - a.g || b.v - a.v,
    };
    const un = DECKS.map(d => d[0]).filter(x => !S[x]);
    o +=
      `<div class="card" style="margin-top:12px"><div class="clh" style="margin-top:0">RANKING DE DECKS</div><div class="chips" style="margin-bottom:4px">${[
        ['pct', 'Aproveitamento'],
        ['v', 'Vitórias'],
        ['g', 'Jogos'],
      ]
        .map(([k, l]) => `<button class="${SO === k ? 'on' : ''}" onclick="SO='${k}';rS()">${l}</button>`)
        .join('')}</div>` +
      L.sort(sorts[SO])
        .map((s, k) => {
          const i = DI(s.n);
          return `<div class="rk" onclick="dStat('${s.n.replace(/'/g, "\\'")}')"><span class="no">${k + 1}</span>${art(i < 0 ? null : i)}<div class="mid"><b>${esc(s.n)}</b><div class="pb"><i style="width:${(s.v / s.g) * 100}%"></i></div></div><div class="vd">${s.v}V · ${s.d}D<small>${pct(s.v, s.g)}</small></div></div>`;
        })
        .join('') +
      (un.length
        ? `<details><summary>Ainda sem duelos (${un.length})</summary><div class="cnote" style="font-size:.8rem;line-height:1.5">${un.map(esc).join(' · ')}</div></details>`
        : '') +
      `</div>`;
    const CF = conf()
      .filter(x => x.g > 0)
      .sort((a, b) => b.sc - a.sc || b.g - a.g);
    o +=
      `<div class="sh">📊 DESEMPENHO POR CONFRONTO</div><div class="card"><div class="cnote" style="margin:0 0 6px">Para cada deck, vitórias e derrotas contra um deck <b>mais fraco</b>, do <b>mesmo tier</b> e <b>mais forte</b>. Contra um mais fraco, o esperado é vencer 65%; contra o mesmo tier, 50%; contra um mais forte, 35%. Vencer um deck forte rende bastante e perder para um fraco pesa bastante. O saldo é a média de (resultado − esperado) por duelo. Com ${CFN} duelos ou mais, saldo de +${CFL * 100} pontos ou mais sugere subir um tier e −${CFL * 100} ou menos sugere descer. Conta todos os duelos.</div>` +
      (CF.length
        ? CF.map(
            x =>
              `<div class="rk" onclick="info(${x.i})">${art(x.i)}<div class="mid"><b>${esc(x.n)}</b><span class="tier t${x.cur}">T${x.cur}</span> <small style="display:inline">${x.g} jogo${x.g > 1 ? 's' : ''} · ${x.w}V ${x.g - x.w}D</small><div class="cf3">${[
                ['↓ fraco', 0],
                ['= igual', 1],
                ['↑ forte', 2],
              ]
                .map(([l, k]) => `<span>${l} <b>${x.b[k][0]}-${x.b[k][1]}</b></span>`)
                .join(
                  ''
                )}</div></div><div class="cfr"><b class="${x.sc > 0 ? 'pos' : x.sc < 0 ? 'neg' : ''}">${x.sc > 0 ? '+' : ''}${Math.round(x.sc * 100)}</b><small>pts vs esperado</small>${x.g < CFN ? `<span class="sug">poucos jogos (${x.g}/${CFN})</span>` : x.sug === x.cur ? '<span class="sug">✓ tier certo</span>' : `<button class="sug ${x.sug < x.cur ? 'up' : 'dn'}" onclick="event.stopPropagation();applyTier(${x.i},${x.sug})">${x.sug < x.cur ? '↑' : '↓'} Tier ${x.sug}</button>`}</div></div>`
          ).join('')
        : '<div class="mini" style="text-align:left">Ainda sem duelos com decks sorteados.</div>') +
      `<div class="cnote">Legenda: ↓ fraco = deck de tier pior que o seu · ↑ forte = deck de tier melhor. Tier 1 é o mais forte.</div></div>`;
    const EL = elo()
      .filter(x => x.g > 0)
      .sort((a, b) => b.e - a.e);
    o +=
      `<div class="sh">⚖️ FORÇA REAL · TIER SUGERIDO</div><div class="card"><div class="cnote" style="margin:0 0 6px">Cada deck começa com a pontuação do tier original e ganha ou perde pontos a cada duelo; vencer um deck mais forte vale mais. Com 4 jogos ou mais, o app sugere o tier que os resultados indicam. Conta todos os duelos.</div>` +
      EL.map(
        (x, k) =>
          `<div class="rk" onclick="info(${x.i})"><span class="no">${k + 1}</span>${art(x.i)}<div class="mid"><b>${esc(x.n)}</b><span class="tier t${x.cur}">T${x.cur}</span> <small style="display:inline">${x.g} jogo${x.g > 1 ? 's' : ''}</small></div><span class="elo">${Math.round(x.e)}</span>${x.g < 4 ? '<span class="sug">poucos jogos</span>' : x.sug === x.cur ? '<span class="sug">✓ tier certo</span>' : `<button class="sug ${x.sug < x.cur ? 'up' : 'dn'}" onclick="event.stopPropagation();applyTier(${x.i},${x.sug})">${x.sug < x.cur ? '↑' : '↓'} Tier ${x.sug}</button>`}</div>`
      ).join('') +
      `</div>`;
    // --- Tiers e zebras
    const tg = {},
      zb = [];
    R.forEach(({ h }) => {
      if (!h.decks) return;
      const tt = h.decks.map(tierOf);
      if (tt.some(x => x == null)) return;
      [0, 1].forEach(p => {
        const q = tg[tt[p]] || (tg[tt[p]] = [0, 0]);
        q[0] += h.w === p ? 1 : 0;
        q[1]++;
      });
      const d = tt[h.w] - tt[1 - h.w];
      if (d > 0) zb.push({ h, d, tt });
    });
    o +=
      `<div class="sh">🎯 TIERS</div><div class="card">` +
      [1, 2, 3, 4, 5]
        .map(k => {
          const q = tg[k];
          return `<div class="hb"><span class="tier t${k}" style="text-align:center">TIER ${k}</span><div class="pb"><i style="width:${q ? (q[0] / q[1]) * 100 : 0}%"></i></div><span>${q ? `<b>${pct(q[0], q[1])}</b> · ${q[1]} jogo${q[1] > 1 ? 's' : ''}` : 'sem jogos'}</span></div>`;
        })
        .join('') +
      `<div class="cnote">Aproveitamento dos decks de cada tier. Tier 1 é o mais forte.</div>
   <div class="clh">🦓 ZEBRAS · ${zb.length}</div><div class="cnote" style="margin-top:-2px">Vitórias de um deck de tier mais fraco sobre um mais forte.</div>` +
      (zb.length
        ? zb
            .sort((a, b) => b.d - a.d || b.h.t - a.h.t)
            .slice(0, 5)
            .map(
              ({ h, tt }) =>
                `<div class="rec"><i>🦓</i><div><b>${esc(h.decks[h.w])} <span class="tier t${tt[h.w]}">T${tt[h.w]}</span></b><small>venceu ${esc(h.decks[1 - h.w])} (T${tt[1 - h.w]}) · ${NOMES[h.w]} · ${dt(h.t)}</small></div></div>`
            )
            .join('')
        : '<div class="mini" style="text-align:left">Nenhuma zebra ainda.</div>') +
      `</div>`;
    // --- Atributos
    const ag = {};
    R.forEach(({ h }) => {
      if (!h.decks) return;
      [0, 1].forEach(p => {
        const i = DI(h.decks[p]);
        if (i < 0) return;
        const a = DECKS[i][2],
          q = ag[a] || (ag[a] = [0, 0]);
        q[0] += h.w === p ? 1 : 0;
        q[1]++;
      });
    });
    o +=
      `<div class="sh">🌗 ATRIBUTOS</div><div class="card">` +
      Object.entries(ag)
        .sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1])
        .map(
          ([a, q]) =>
            `<div class="hb"><span style="display:flex;align-items:center;gap:5px;font-weight:800;font-size:.72rem">${atr(a).replace('class="atr"', 'class="atr" style="position:static;width:18px;height:18px;display:inline-block"')}${a}</span><div class="pb"><i style="width:${(q[0] / q[1]) * 100}%"></i></div><span><b>${pct(q[0], q[1])}</b> · ${q[1]} jogo${q[1] > 1 ? 's' : ''}</span></div>`
        )
        .join('') +
      `</div>`;
  } else
    o += `<div class="sh">🃏 DECKS</div><div class="card mini">Os duelos registrados não têm decks sorteados. Usem o Sorteio ou o Torneio para ter estatísticas por deck.</div>`;
  o += oraPlacar(H);
  const A = achv(hist),
    ids = Object.keys(ACH),
    cnt = [0, 1].map(p => Object.keys(A[p]).length);
  o +=
    `<div class="sh">🏅 CONQUISTAS</div><div class="card"><div class="sbl" style="margin:0 0 4px;font-size:.85rem"><span style="color:var(--g)">Douglas ${cnt[0]}/${ids.length}</span><span style="color:var(--b)">João ${cnt[1]}/${ids.length}</span></div>` +
    ids
      .map(id => {
        const a = ACH[id],
          y = [0, 1].map(p => A[p][id]),
          any = y[0] || y[1];
        return `<div class="ach ${any ? 'on' : ''}"><i>${a.e}</i><div><b>${a.n}</b><small>${a.d}${
          any
            ? ' · ' +
              [0, 1]
                .filter(p => y[p])
                .map(p => NOMES[p] + ' em ' + dt(y[p]))
                .join(', ')
            : ''
        }</small></div><span class="who">${[0, 1].map(p => `<em class="${y[p] ? 'y' : ''}" style="--pc:${COR[p]}" aria-label="${NOMES[p]}${y[p] ? ' desbloqueou' : ''}">${NOMES[p][0]}</em>`).join('')}</span></div>`;
      })
      .join('') +
    `<div class="cnote">Contam todos os duelos, sem filtro.</div></div>`;
  el.innerHTML = o;
  const sv = $('#race');
  if (sv) raceHover(sv, R);
}
// Gráfico: saldo de vitórias (Douglas − João) duelo a duelo
const RW = 340,
  RH = 150,
  RPL = 26,
  RPR = 8,
  RPT = 12,
  RPB = 12;
function raceSVG(R) {
  let s = 0;
  const pts = [0].concat(R.map(x => (s += x.h.w === 0 ? 1 : -1))),
    n = R.length,
    m = Math.max(1, ...pts.map(Math.abs));
  const X = i => RPL + (i * (RW - RPL - RPR)) / n,
    Y = v => RPT + ((m - v) * (RH - RPT - RPB)) / (2 * m),
    z = Y(0),
    d = pts.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(''),
    ar = d + `L${X(n)} ${z}L${X(0)} ${z}Z`;
  return `<div class="chw"><svg viewBox="0 0 ${RW} ${RH}" id="race" role="img" aria-label="Saldo de vitórias ao longo dos duelos"><defs><clipPath id="rcu"><rect width="${RW}" height="${z}"/></clipPath><clipPath id="rcd"><rect y="${z}" width="${RW}" height="${RH}"/></clipPath></defs>
  <line x1="${RPL}" x2="${RW - RPR}" y1="${z}" y2="${z}" stroke="#8fb0d8" stroke-opacity=".55" stroke-dasharray="3 3"/>
  <g font-size="9" fill="#8fb0d8" text-anchor="end"><text x="${RPL - 5}" y="${Y(m) + 3}">+${m}</text><text x="${RPL - 5}" y="${z + 3}">0</text><text x="${RPL - 5}" y="${Y(-m) + 3}">+${m}</text></g>
  <path d="${ar}" fill="#3dff7a" fill-opacity=".2" clip-path="url(#rcu)"/><path d="${ar}" fill="#4aa3ff" fill-opacity=".2" clip-path="url(#rcd)"/>
  <path d="${d}" fill="none" stroke="#e6f4ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <g font-size="9" font-weight="700"><text x="${RPL + 5}" y="${RPT + 2}" fill="#e6f4ff"><tspan fill="#3dff7a">▲</tspan> Douglas na frente</text><text x="${RPL + 5}" y="${RH - 3}" fill="#e6f4ff"><tspan fill="#4aa3ff">▼</tspan> João na frente</text></g>
  <line id="rcx" y1="${RPT - 4}" y2="${RH - RPB + 4}" stroke="#35e0ff" stroke-width="1" opacity="0"/><circle id="rcd2" r="4.5" fill="#35e0ff" stroke="#07122f" stroke-width="2" opacity="0"/>
  <rect id="rhit" x="${RPL - 6}" y="0" width="${RW - RPL - RPR + 12}" height="${RH}" fill="transparent"/></svg><div class="ctt" id="rtt"></div></div>`;
}
function raceHover(sv, R) {
  let s = 0;
  const pts = [0].concat(R.map(x => (s += x.h.w === 0 ? 1 : -1))),
    n = R.length,
    m = Math.max(1, ...pts.map(Math.abs)),
    X = i => RPL + (i * (RW - RPL - RPR)) / n,
    Y = v => RPT + ((m - v) * (RH - RPT - RPB)) / (2 * m);
  const tt = $('#rtt'),
    cx = $('#rcx'),
    dt2 = $('#rcd2');
  const show = ev => {
    const b = sv.getBoundingClientRect(),
      xs = ((ev.clientX - b.left) * RW) / b.width,
      i = Math.max(0, Math.min(n, Math.round((xs - RPL) / ((RW - RPL - RPR) / n)))),
      v = pts[i];
    cx.setAttribute('x1', X(i));
    cx.setAttribute('x2', X(i));
    cx.setAttribute('opacity', 1);
    dt2.setAttribute('cx', X(i));
    dt2.setAttribute('cy', Y(v));
    dt2.setAttribute('opacity', 1);
    const h = i ? R[i - 1].h : null;
    tt.innerHTML = i
      ? `<b>Duelo ${i}</b> · ${dt(h.t)}<br>Venceu: ${NOMES[h.w]}${h.decks ? ' (' + esc(h.decks[h.w]) + ')' : ''}<br>${v > 0 ? 'Douglas +' + v : v < 0 ? 'João +' + -v : 'Empate'}`
      : '<b>Início</b>';
    tt.style.display = 'block';
    const px = (X(i) * b.width) / RW;
    tt.style.left = Math.max(70, Math.min(b.width - 70, px)) + 'px';
    tt.style.top = ((Y(v) * b.height) / RH > b.height / 2 ? 4 : b.height - tt.offsetHeight - 4) + 'px';
  };
  const hide = () => {
    tt.style.display = 'none';
    cx.setAttribute('opacity', 0);
    dt2.setAttribute('opacity', 0);
  };
  const hit = $('#rhit');
  hit.addEventListener('pointermove', show);
  hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointerleave', hide);
}
function dStat(nm) {
  const s = SD[nm];
  if (!s) return;
  const i = DI(nm),
    d = DECKS[i],
    tit = CAMP.filter(c => c.c === nm).length;
  const op = Object.entries(s.op).sort((a, b) => b[1][0] + b[1][1] - a[1][0] - a[1][1]);
  modal(`<h2>${esc(nm)}</h2>${d ? `<span class="tier t${d[1]}">TIER ${d[1]}</span>` : ''}${art(i < 0 ? null : i)}
  <div class="tiles" style="text-align:left"><div class="tile"><small>Aproveitamento</small><b>${pct(s.v, s.g)}</b><span>${s.v} vitória${s.v === 1 ? '' : 's'} · ${s.d} derrota${s.d === 1 ? '' : 's'}</span></div>
  <div class="tile"><small>Títulos de torneio</small><b>${tit}</b><span>${tit ? '🏆'.repeat(Math.min(tit, 5)) : 'nenhum ainda'}</span></div>
  <div class="tile"><small>Tempo médio p/ vencer</small><b>${s.wc ? fmt(s.wd / s.wc) : '–'}</b></div><div class="tile"><small>LP médio ao vencer</small><b>${s.v ? nf(s.lpw / s.v) : '–'}</b></div>
  ${(x => (x ? `<div class="tile"><small>Força real (Elo)</small><b>${Math.round(x.e)}</b><span>${x.g < 4 ? 'poucos jogos para sugerir' : x.sug === x.cur ? 'tier atual confere' : 'sugere Tier ' + x.sug}</span></div>` : ''))(elo().find(x => x.n === nm))}<div class="tile"><small>Dano por duelo</small><b>${nf(s.dmg / s.g)}</b></div><div class="tile"><small>Maior golpe</small><b>${s.big ? nf(s.big) : '–'}</b></div></div>
  <div class="clh">COM CADA JOGADOR</div>${[0, 1].map(p => `<div class="hb"><span style="color:${COR[p]};font-weight:800">${NOMES[p]}</span><div class="pb"><i style="width:${s.bp[p][0] + s.bp[p][1] ? (s.bp[p][0] / (s.bp[p][0] + s.bp[p][1])) * 100 : 0}%"></i></div><span><b>${s.bp[p][0]}V · ${s.bp[p][1]}D</b></span></div>`).join('')}
  <div class="clh">CONFRONTOS</div>${op.map(([o, q]) => `<div class="rk" style="cursor:default"><div class="mid"><b>${esc(o)}</b></div><div class="vd" style="color:${q[0] > q[1] ? 'var(--g)' : q[0] < q[1] ? '#ff8a8a' : 'var(--mut)'}">${q[0]}V · ${q[1]}D</div></div>`).join('')}
  ${i >= 0 ? `<button class="btn" onclick="info(${i})">📚 Ver estratégia e cartas</button>` : ''}<button class="btn" style="border-color:#2c58b8;color:var(--mut)" onclick="fechar()">Fechar</button>`);
  $('#box').scrollTop = 0;
}

// Desempenho (guardado só neste aparelho, não vai no backup): fundo animado e modo leve
const PERF = { bg: 1, lite: 0 };
try {
  Object.assign(PERF, JSON.parse(localStorage.getItem('ygo_perf') || '{}'));
} catch (e) {}
const savePerf = () => {
  try {
    localStorage.setItem('ygo_perf', JSON.stringify(PERF));
  } catch (e) {}
};
let BGT = null,
  BGL = false;
function applyPerf() {
  document.body.classList.toggle('lite', !!PERF.lite);
  const w = $('#bgart');
  if (PERF.bg) {
    if (!w.querySelector('.bc')) {
      w.innerHTML = '<div class="gr"></div>';
      mkBg();
    }
    if (!BGT) BGT = setInterval(flipTick, 1300);
    if (!BGL && window.ART_READY) {
      BGL = true;
      loadBg();
    }
  } else {
    clearInterval(BGT);
    BGT = null;
    w.innerHTML = '';
  }
}
applyPerf();
// Celular fraco: se o app rodar a menos de 20 quadros/s (medido uma única vez, alguns segundos depois de abrir), pergunta se quer desligar o fundo animado.
setTimeout(() => {
  if (!PERF.bg || PERF.probe) return;
  let n = 0,
    t0 = 0;
  const f = t => {
    if (!t0) t0 = t;
    n++;
    if (t - t0 < 2000) requestAnimationFrame(f);
    else {
      PERF.probe = 1;
      const fps = n / ((t - t0) / 1000);
      if (
        fps < 20 &&
        document.visibilityState === 'visible' &&
        confirm(
          'O app parece estar pesado neste celular. Desligar o fundo animado (as cartas virando) para ele ficar mais leve?\n\nDá para religar depois em ☰ → Sons e animações.'
        )
      ) {
        PERF.bg = 0;
        applyPerf();
      }
      savePerf();
    }
  };
  requestAnimationFrame(f);
}, 9000);
Object.keys(MOM).forEach(k =>
  KV.get('snd:' + k).then(u => {
    if (u) CSND[k] = u;
  })
);
