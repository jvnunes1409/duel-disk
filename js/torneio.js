// Torneio de 24 decks: mata-mata, grupos, semifinais e final.
// ===== Torneio: 24 decks, chave fixa =====
// Caminho: R1 (12 duelos) → R2 (6) → Grupos A e B (3 decks, todos contra todos) → Semifinais → Final.
// Lado 0 de cada duelo = Douglas, lado 1 = João.
const STN = { r1: '1ª Rodada', r2: '2ª Rodada', g: 'Grupos', sf: 'Semifinal', f: 'Final' },
  STC = { r1: 'R1', r2: 'R2', g: 'Grupos', sf: 'Semi', f: 'Final' };
const GRP = { A: ['r2-1', 'r2-2', 'r2-3'], B: ['r2-4', 'r2-5', 'r2-6'] };
let T = null,
  TV = null,
  CAMP = [],
  tBusy = false;
try {
  T = JSON.parse(localStorage.getItem('ygo_torneio') || 'null');
} catch (e) {}
try {
  CAMP = JSON.parse(localStorage.getItem('ygo_camp') || '[]');
} catch (e) {}
function saveT() {
  const s = JSON.stringify(T);
  try {
    localStorage.setItem('ygo_torneio', s);
  } catch (e) {}
  KV.set('torneio', s);
}
function saveCamp() {
  const s = JSON.stringify(CAMP);
  try {
    localStorage.setItem('ygo_camp', s);
  } catch (e) {}
  KV.set('camp', s);
}
KV.get('torneio').then(s => {
  if (T || !s) return;
  try {
    const x = JSON.parse(s);
    if (x && x.M) {
      T = x;
      rT();
      tBan();
      rH();
    }
  } catch (e) {}
});
let TARQ = [];
try {
  TARQ = JSON.parse(localStorage.getItem('ygo_tarq') || '[]');
} catch (e) {}
function saveTarq() {
  const s = JSON.stringify(TARQ);
  try {
    localStorage.setItem('ygo_tarq', s);
  } catch (e) {}
  KV.set('tarq', s);
}
KV.get('tarq').then(s => {
  if (TARQ.length || !s) return;
  try {
    const x = JSON.parse(s);
    if (Array.isArray(x) && x.length) {
      TARQ = x;
      rH();
    }
  } catch (e) {}
});
function archT() {
  if (!T || !allM().some(m => m.w != null)) return;
  const done = T.fmt === 'liga' ? allM().every(m => m.w != null) : !!(T.M.f && T.M.f.w != null),
    i = TARQ.findIndex(x => x.t === T.t),
    S = JSON.parse(JSON.stringify(T));
  S.end = Date.now();
  S.done = done;
  if (i >= 0) TARQ[i] = S;
  else TARQ.unshift(S);
  saveTarq();
}
KV.get('camp').then(s => {
  if (CAMP.length || !s) return;
  try {
    const x = JSON.parse(s);
    if (Array.isArray(x) && x.length) {
      CAMP = x;
      rT();
    }
  } catch (e) {}
});

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function mkT(perm) {
  const M = {},
    add = (id, st, n, a, b) => (M[id] = { id, st, n, a, b, w: null, lp: null, h: null });
  for (let k = 1; k <= 12; k++)
    add('r1-' + k, 'r1', k, { d: DECKS[perm[2 * k - 2]][0] }, { d: DECKS[perm[2 * k - 1]][0] });
  for (let k = 1; k <= 6; k++) add('r2-' + k, 'r2', k, { win: 'r1-' + (2 * k - 1) }, { win: 'r1-' + 2 * k });
  ['A', 'B'].forEach(g =>
    [
      [0, 1],
      [1, 2],
      [2, 0],
    ].forEach(([x, y], j) => add('g' + g + '-' + (j + 1), 'g', j + 1, { grp: g, k: x }, { grp: g, k: y }))
  );
  add('sf-1', 'sf', 1, { pos: 'A', p: 1 }, { pos: 'B', p: 2 });
  add('sf-2', 'sf', 2, { pos: 'A', p: 2 }, { pos: 'B', p: 1 });
  add('f', 'f', 1, { win: 'sf-1' }, { win: 'sf-2' });
  const tb = {};
  DECKS.forEach(d => (tb[d[0]] = Math.random()));
  return { v: 1, t: Date.now(), M, tb };
}
const DI = n => DECKS.findIndex(d => d[0] === n),
  dn = i => (i != null && DECKS[i] ? DECKS[i][0] : '?');
const allM = () => (T ? Object.values(T.M) : []);
function side(m, s) {
  return res(s ? m.b : m.a);
}
function res(r) {
  if (r.d != null) {
    const i = DI(r.d);
    return i < 0 ? null : i;
  }
  if (r.win) {
    const m = T.M[r.win];
    return m && m.w != null ? side(m, m.w) : null;
  }
  if (r.grp) return res({ win: GRP[r.grp][r.k] });
  if (r.pos) {
    const s = stand(r.pos);
    return s && s.done ? s.rows[r.p - 1].i : null;
  }
  return null;
}
// Classificação do grupo: vitórias → soma de LP restante nas vitórias → sorteio guardado no início do torneio
function stand(g) {
  const ids = GRP[g].map(id => res({ win: id }));
  if (ids.some(x => x == null)) return null;
  const ms = [1, 2, 3].map(j => T.M['g' + g + '-' + j]),
    rows = ids.map(i => ({ i, v: 0, d: 0, lp: 0 })),
    R = i => rows.find(r => r.i === i);
  ms.forEach(m => {
    if (m.w == null) return;
    const W = R(side(m, m.w)),
      L = R(side(m, 1 - m.w));
    if (!W || !L) return;
    W.v++;
    W.lp += m.lp ? m.lp[m.w] : 0;
    L.d++;
  });
  const done = ms.every(m => m.w != null),
    tb = i => T.tb[dn(i)] || 0;
  rows.sort((x, y) => y.v - x.v || y.lp - x.lp || tb(y.i) - tb(x.i));
  if (done)
    rows.forEach((r, k) => {
      const n = rows[k + 1];
      if (n && n.v === r.v && n.lp === r.lp) r.sor = n.sor = 1;
    });
  return { rows, done };
}
function dir(r) {
  return r.win ? [r.win] : r.grp ? [GRP[r.grp][r.k]] : r.pos ? [1, 2, 3].map(j => 'g' + r.pos + '-' + j) : [];
}
function deps(id, S = new Set()) {
  const m = T.M[id];
  [...dir(m.a), ...dir(m.b)].forEach(x => {
    if (!S.has(x)) {
      S.add(x);
      deps(x, S);
    }
  });
  return S;
}
const locked = id => allM().some(x => x.w != null && x.id !== id && deps(x.id).has(id));
function mlab(m) {
  return m.st === 'lg'
    ? `Rodada ${m.r} · Jogo ${m.n}`
    : m.st === 'g'
      ? `Grupo ${m.id[1]} · Duelo ${m.n}`
      : m.st === 'f'
        ? 'Final'
        : m.st === 'sf'
          ? 'Semifinal ' + m.n
          : STN[m.st] + ' · C' + m.n;
}
function srcTxt(r) {
  if (r.d) return r.d;
  if (r.grp) r = { win: GRP[r.grp][r.k] };
  if (r.win) {
    const [s, n] = r.win.split('-');
    return s === 'sf' ? 'Vencedor da Semi ' + n : 'Vencedor ' + s.toUpperCase() + ' · C' + n;
  }
  return r.pos ? `${r.p}º do Grupo ${r.pos}` : '?';
}
function destTxt(m) {
  if (m.st === 'r1') return `2ª Rodada · C${Math.ceil(m.n / 2)} com ${NOMES[m.n % 2 ? 0 : 1]}`;
  if (m.st === 'r2') return 'Grupo ' + (m.n <= 3 ? 'A' : 'B');
  if (m.st === 'sf') return 'Final com ' + NOMES[m.n - 1];
  return 'Campeão do torneio';
}
const nextM = () => allM().find(m => m.w == null && side(m, 0) != null && side(m, 1) != null);
function curSt() {
  const M = allM(),
    m = M.find(x => x.w == null);
  if (T && T.fmt === 'liga') return String((m || M[M.length - 1]).r);
  return m ? m.st : 'f';
}
function tmValid() {
  const m = duel.tm && T && T.M[duel.tm];
  return m && m.w == null && duel.decks && side(m, 0) === duel.decks[0] && side(m, 1) === duel.decks[1]
    ? m
    : null;
}
function tBan() {
  const el = $('#tmb');
  if (!el) return;
  const m = tmValid(),
    s = duel && duel.sr;
  el.innerHTML = m
    ? `<div class="tmb" onclick="goT('${m.id}')"><span>🏟️ ${T.fmt === 'liga' ? 'LIGA' : 'TORNEIO'} · ${mlab(m).toUpperCase()}</span><small>ver ${T.fmt === 'liga' ? 'tabela' : 'chave'} ›</small></div>`
    : s
      ? `<div class="tmb" style="cursor:default"><span>🎯 MELHOR DE 3 · DUELO ${Math.min(3, s.g[0] + s.g[1] + (over ? 0 : 1))}</span><small><b style="color:var(--g)">${s.g[0]}</b> × <b style="color:var(--b)">${s.g[1]}</b></small></div>`
      : '';
  el.insertAdjacentHTML('beforeend', oraChip());
}
function playM(id) {
  const m = T && T.M[id];
  if (!m || m.w != null) return;
  const a = side(m, 0),
    b = side(m, 1);
  if (a == null || b == null) return;
  if (duel.tm === id && !over) {
    goTab('duelo');
    return;
  }
  if (
    duel.log.length &&
    !over &&
    !confirm('O contador tem um duelo em andamento. Começar ' + mlab(m) + ' mesmo assim?')
  )
    return;
  newDuel([a, b], id);
  goTab('duelo');
  play('sweep');
}
function goT(id) {
  if (!T) return;
  const m = T.M[id];
  TV = m ? (T.fmt === 'liga' ? String(m.r) : m.st) : null;
  rT();
  goTab('torneio');
  setTimeout(() => {
    const e = document.getElementById('tm-' + id);
    if (e) {
      e.scrollIntoView({ block: 'center', behavior: 'smooth' });
      e.classList.add('flash');
      setTimeout(() => e.classList.remove('flash'), 1500);
    }
  }, 60);
}
function undoM(id) {
  const m = T && T.M[id];
  if (!m || m.w == null || locked(id)) return;
  if (!confirm(`Desfazer o resultado de ${mlab(m)}? Esse duelo também sai do Histórico e do placar.`)) return;
  if (m.h != null) {
    hist = hist.filter(h => h.t !== m.h);
    save();
    rH();
  }
  m.w = m.lp = m.h = null;
  saveT();
  tBan();
  rT();
  play('click');
}
function sortT() {
  if (tBusy) return;
  if (T && allM().some(m => m.w != null)) return;
  if (T && !confirm('Sortear o chaveamento de novo?')) return;

  tBusy = true;
  TV = 'r1';
  play('sweep');
  const ix = [...Array(TORN).keys()];
  let n = 0;
  const iv = setInterval(() => {
    T = mkT(shuffle(ix));
    rT('shuf');
    play('tickU');
    if (++n > 14) {
      clearInterval(iv);
      T = mkT(shuffle(ix));
      saveT();
      tBusy = false;
      rT('pop');
      play('win');
      scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, 100);
}
function novoT() {
  const lg = T && T.fmt === 'liga',
    f = T && (lg ? null : T.M.f),
    fin = T && (lg ? allM().every(m => m.w != null) : f && f.w != null);
  if (
    T &&
    !confirm(
      fin
        ? 'Guardar o campeão na galeria e começar outro torneio?'
        : 'O torneio ainda não terminou. Apagar a chave e começar outro? (Os duelos já jogados continuam no Histórico.)'
    )
  )
    return;
  if (fin) {
    const W = [0, 1].map(p => allM().filter(m => m.w === p).length);
    if (lg) {
      const st = ligaStand();
      CAMP.unshift({ t: Date.now(), c: st[0].n, v: st[1].n, p: null, s: W, fmt: 'liga', n: T.ds.length });
    } else CAMP.unshift({ t: Date.now(), c: dn(side(f, f.w)), v: dn(side(f, 1 - f.w)), p: f.w, s: W });
    saveCamp();
  }
  archT();
  T = null;
  TV = null;
  saveT();
  if (duel.tm) {
    duel.tm = null;
    tBan();
  }
  rT();
  rH();
  play('click');
}

function mCard(m, an) {
  const ii = [side(m, 0), side(m, 1)],
    done = m.w != null,
    ready = !done && ii[0] != null && ii[1] != null;
  const row = s => {
    const i = ii[s],
      r = s ? m.b : m.a;
    return `<div class="ts ${done ? (m.w === s ? 'win' : 'lose') : ''}" style="--pc:${COR[s]}" ${i != null ? `onclick="info(${i})"` : ''}>${i != null ? art(i) : '<div class="art ph0"><span>?</span></div>'}<div class="tn"><small>${NOMES[s].toUpperCase()}${done && m.w === s ? ' · VENCEU' : ''}</small>${i != null ? `<b>${esc(DECKS[i][0])}</b><span class="tier t${DECKS[i][1]}">TIER ${DECKS[i][1]}</span>` : `<b class="src">${srcTxt(r)}</b>`}</div>${done && m.lp ? `<div class="tlp"><small>LP</small>${m.lp[s]}</div>` : ''}</div>`;
  };
  const ft = `${ready && !tBusy ? `<button class="tplay" onclick="playM('${m.id}')">⚔️ Jogar</button>` : ''}${done && !locked(m.id) ? `<button class="tund" onclick="undoM('${m.id}')">↩ Desfazer</button>` : ''}`;
  return `<div class="card tm ${done ? 'done' : ready ? 'ready' : ''} ${an || ''}" id="tm-${m.id}"><div class="tmh"><b>${mlab(m).toUpperCase()}</b><span>${done ? '✓ Concluído' : ready ? 'Pronto para jogar' : 'Aguardando'}</span></div>${row(0)}<div class="tvs">VS</div>${row(1)}
 ${(m.st !== 'g' && m.st !== 'lg') || ft ? `<div class="tmf"><span>${m.st !== 'g' && m.st !== 'lg' ? (m.st === 'f' ? '🏆 ' : 'Vencedor ➜ ') + destTxt(m) : ''}</span>${ft}</div>` : ''}</div>`;
}
function gTable(g) {
  const s = stand(g),
    ids = GRP[g].map(id => res({ win: id }));
  const rows = s ? s.rows : ids.map((i, k) => ({ i, v: 0, d: 0, lp: 0, src: srcTxt({ grp: g, k }) }));
  return (
    `<div class="card"><div class="clh">GRUPO ${g}</div><table class="gt"><tr><th>#</th><th style="text-align:left">Deck</th><th>V</th><th>D</th><th>Saldo LP</th></tr>` +
    rows
      .map(
        (r, k) =>
          `<tr class="${s && s.done ? (k < 2 ? 'q' : 'out') : ''}"><td>${s ? k + 1 + 'º' : '–'}</td><td class="dn">${r.i != null ? esc(dn(r.i)) : `<span style="color:var(--mut);font-weight:600;font-style:italic">${r.src}</span>`}${s && s.done ? `<em>${k < 2 ? '➜ Semifinal' : 'Eliminado'}${r.sor ? ' · 🎲 decidido no sorteio' : ''}</em>` : ''}</td><td>${r.v}</td><td>${r.d}</td><td>${r.lp}</td></tr>`
      )
      .join('') +
    `</table><div class="cnote">Passam os 2 com mais vitórias. Se os três vencerem uma vez, fica na frente quem somou mais LP restante nas vitórias.</div></div>`
  );
}
function rT(an) {
  const el = $('#tour');
  if (!el) return;
  if (!T) {
    el.innerHTML = `<div class="card thd"><h2 style="margin:4px 0;color:var(--gd);font:900 1.05rem Impact,sans-serif;letter-spacing:1.5px">🏟️ MATA-MATA DOS 24 DECKS</h2>
  <details class="tinfo"><summary>ℹ️ Como funciona</summary><ul class="tfl"><li><b>1ª RODADA</b><span>12 duelos sorteados, quem perde sai</span></li><li><b>2ª RODADA</b><span>6 duelos entre os vencedores</span></li><li><b>GRUPOS</b><span>2 grupos de 3, todos contra todos; passam 2 de cada</span></li><li><b>SEMIFINAL</b><span>1º do A × 2º do B · 2º do A × 1º do B</span></li><li><b>FINAL</b><span>1 duelo valendo o título</span></li></ul>
  <div class="trule"><p><b>Quem usa cada deck:</b> na 1ª rodada o sorteio define. Na 2ª, Douglas usa o vencedor do confronto ímpar e João o do par (C1 × C2, C3 × C4…). Nos grupos, cada um usa cada deck uma vez. Na semi, cada um fica com um 1º colocado. Na final, Douglas usa o vencedor da Semi 1 e João o da Semi 2.</p></div></details>
  <button class="btn" onclick="sortT()">🎲 Sortear chaveamento</button></div>${ligaIntro()}${campHTML()}`;
    return;
  }
  if (T.fmt === 'liga') return rLiga(an);
  const M = allM(),
    done = M.filter(m => m.w != null).length,
    W = [0, 1].map(p => M.filter(m => m.w === p).length),
    nx = nextM(),
    f = T.M.f;
  if (!TV) TV = curSt();
  let h = `<div class="card thd"><div class="tsc"><span style="color:var(--g)">Douglas ${W[0]}</span> × <span style="color:var(--b)">${W[1]} João</span></div><div class="tbar"><i style="width:${(done / M.length) * 100}%"></i></div><small>${done} de ${M.length} duelos · ${STN[curSt()]}</small>
  ${tBusy ? '' : nx ? `<button class="btn" onclick="playM('${nx.id}')">⚔️ Próximo: ${mlab(nx)}</button>` : f.w != null ? `<p style="margin:10px 0 0;color:var(--gd);font-weight:800">🏆 ${esc(dn(side(f, f.w)))} é o campeão!</p>` : ''}</div>`;
  h +=
    `<div class="tstp">` +
    Object.keys(STN)
      .map(s => {
        const ms = M.filter(m => m.st === s),
          d = ms.filter(m => m.w != null).length;
        return `<button class="${TV === s ? 'on' : ''} ${d === ms.length ? 'ok' : ''}" onclick="TV='${s}';rT();play('click')">${STC[s]}<small>${d === ms.length ? '✓' : d + '/' + ms.length}</small></button>`;
      })
      .join('') +
    `</div>`;
  const ms = M.filter(m => m.st === TV);
  if (TV === 'g')
    h += ['A', 'B']
      .map(
        g =>
          gTable(g) +
          ms
            .filter(m => m.id[1] === g)
            .map(m => mCard(m, an))
            .join('')
      )
      .join('');
  else {
    if (TV === 'f' && f.w != null) {
      const ci = side(f, f.w);
      h += `<div class="card champ">${art(ci)}<h2>CAMPEÃO</h2><h3>${esc(dn(ci))}</h3><p>Usado por ${NOMES[f.w]} na final contra ${esc(dn(side(f, 1 - f.w)))}</p></div>`;
    }
    h += ms.map(m => mCard(m, an)).join('');
  }
  h +=
    `<div class="row" style="margin-top:4px">${done ? '' : `<button class="btn" style="padding:12px;font-size:.85rem" onclick="sortT()">🔀 Sortear de novo</button>`}<button class="btn" style="padding:12px;font-size:.85rem;border-color:#2c58b8;color:var(--mut)" onclick="novoT()">${f.w != null ? '🏁 Novo torneio' : '🗑 Encerrar torneio'}</button></div>` +
    campHTML();
  el.innerHTML = h;
}
