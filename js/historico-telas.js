// Telas do histórico: lista de duelos, visão de ligas e de torneios (com o chaveamento) e o placar geral.
let HV = 'geral',
  HO = 1;
const kindOf = h => (h.tid ? (String(h.tid)[0] === 'l' ? 'liga' : 'torneio') : null);
function setHV(v) {
  HV = v;
  rH();
}
function withT(S, f) {
  const o = T;
  T = S;
  try {
    return f();
  } finally {
    T = o;
  }
}
const dtf = t => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
function mLine(m) {
  const i0 = side(m, 0),
    i1 = side(m, 1),
    nm = (i, r) => (i != null ? esc(dn(i)) : `<i style="opacity:.7">${esc(srcTxt(r))}</i>`),
    d = m.w != null;
  return `<div class="ml ${d ? '' : 'p'}"><span class="mr">${m.st === 'lg' ? 'R' + m.r + '·J' + m.n : m.st === 'g' ? 'G' + m.id[1] + '·' + m.n : m.st === 'f' ? 'FINAL' : m.st === 'sf' ? 'SF' + m.n : m.st.toUpperCase() + '·' + m.n}</span><div class="x"><span class="${d && m.w === 0 ? 'w' : ''}" style="color:${COR[0]}">${nm(i0, m.a)}${d && m.w === 0 ? ' ✓' : ''}</span><span class="${d && m.w === 1 ? 'w' : ''}" style="color:${COR[1]}">${d && m.w === 1 ? '✓ ' : ''}${nm(i1, m.b)}</span></div><em>${d && m.lp ? m.lp[0] + ' × ' + m.lp[1] : '—'}</em></div>`;
}
function arqHead(S, cur, tot, pl, done) {
  const lg = S.fmt === 'liga';
  return `<div class="ah"><b>${lg ? '📋 LIGA' : '🏟️ TORNEIO'} · ${dtf(S.t)}</b><span class="ast ${done ? 'ok' : cur ? 'run' : ''}">${done ? 'CONCLUÍDO' : cur ? 'EM ANDAMENTO · ' + pl + '/' + tot : 'INTERROMPIDO · ' + pl + '/' + tot}</span></div>`;
}
function ligaCard(S, cur) {
  return withT(S, () => {
    const ms = Object.values(S.M),
      pl = ms.filter(m => m.w != null).length,
      done = pl === ms.length,
      st = ligaStand(),
      rs = {};
    ms.forEach(m => (rs[m.r] = rs[m.r] || []).push(m));
    return `<div class="card arq" style="border-top:3px solid #a56bff">${arqHead(S, cur, ms.length, pl, done)}${done ? `<div class="ch">🏆 Campeão: ${esc(st[0].n)}</div>` : ''}
 <table><tr><th>#</th><th style="text-align:left">Deck</th><th>J</th><th>V</th><th>D</th><th>Saldo LP</th></tr>${st.map((r, k) => `<tr class="${k === 0 && done ? 'top' : ''}"><td>${k + 1}º</td><td class="dn">${esc(r.n)}</td><td>${r.j}</td><td>${r.v}</td><td>${r.d}</td><td>${r.lp}</td></tr>`).join('')}</table>
 <details><summary>Todos os jogos</summary>${Object.keys(rs)
   .map(
     r =>
       `<h4>RODADA ${r}</h4>${rs[r]
         .sort((a, b) => a.n - b.n)
         .map(mLine)
         .join('')}`
   )
   .join('')}</details></div>`;
  });
}
function torneioCard(S, cur) {
  return withT(S, () => {
    const ms = Object.values(S.M),
      pl = ms.filter(m => m.w != null).length,
      f = S.M.f,
      done = !!(f && f.w != null),
      STG = [
        ['pre', 'PRELIMINAR'],
        ['r1', '1ª RODADA'],
        ['r2', '2ª RODADA'],
        ['g', 'FASE DE GRUPOS'],
        ['sf', 'SEMIFINAIS'],
        ['f', 'FINAL'],
      ];
    return `<div class="card arq" style="border-top:3px solid var(--gd)">${arqHead(S, cur, ms.length, pl, done)}${done ? `<div class="ch">🏆 Campeão: ${esc(dn(side(f, f.w)))} · ${NOMES[f.w]}<br><small style="color:var(--mut)">Vice: ${esc(dn(side(f, 1 - f.w)))}</small></div>` : ''}
 ${S.M['r1-1'] && S.M['sf-1'] ? chaveHTML(S) : ''}<details class="orad"><summary>Lista de todos os duelos</summary>${STG.map(
   ([k, t]) => {
     const L = ms.filter(m => m.st === k).sort((a, b) => a.id.length - b.id.length || (a.id > b.id ? 1 : -1));
     if (!L.length || !L.some(m => m.w != null || side(m, 0) != null)) return '';
     let tb = '';
     if (k === 'g')
       tb = ['A', 'B']
         .map(g => {
           const q = stand(g);
           return q
             ? `<table><tr><th colspan="5" style="text-align:left;color:var(--gd)">GRUPO ${g}</th></tr>${q.rows.map((r, i) => `<tr class="${q.done && i < 2 ? 'top' : ''}"><td>${i + 1}º</td><td class="dn">${esc(dn(r.i))}</td><td>${r.v}V</td><td>${r.d}D</td><td>${r.lp}</td></tr>`).join('')}</table>`
             : '';
         })
         .join('');
     return `<h4>${t}</h4>${tb}${L.map(mLine).join('')}`;
   }
 ).join('')}</details></div>`;
  });
}
function ligasView() {
  const L = [];
  if (T && T.fmt === 'liga' && allM().some(m => m.w != null)) L.push([T, 1]);
  TARQ.filter(x => x.fmt === 'liga' && !(T && x.t === T.t)).forEach(x => L.push([x, 0]));
  L.sort((a, b) => b[0].t - a[0].t);
  return L.length
    ? L.map(([S, c]) => ligaCard(S, c)).join('')
    : '<p style="color:var(--mut);text-align:center">Nenhuma liga jogada ainda.</p>';
}
function torneiosView() {
  const L = [];
  if (T && T.fmt !== 'liga' && allM().some(m => m.w != null)) L.push([T, 1]);
  TARQ.filter(x => x.fmt !== 'liga' && !(T && x.t === T.t)).forEach(x => L.push([x, 0]));
  L.sort((a, b) => b[0].t - a[0].t);
  return L.length
    ? `<div class="cnote" style="margin:0 0 6px">Mostrando o último torneio jogado.</div>` +
        torneioCard(L[0][0], L[0][1])
    : '<p style="color:var(--mut);text-align:center">Nenhum torneio jogado ainda.</p>';
}
function rH() {
  bkBan();
  $('#hseg').innerHTML = [
    ['geral', 'GERAL'],
    ['ligas', 'LIGAS'],
    ['torneios', 'TORNEIOS'],
  ]
    .map(([k, t]) => `<button class="${HV === k ? 'on' : ''}" onclick="setHV('${k}')">${t}</button>`)
    .join('');
  const w = [0, 0];
  hist.forEach(h => w[h.w]++);
  $('#score').innerHTML =
    `<span style="color:var(--g)">Douglas ${w[0]}</span> × <span style="color:var(--b)">${w[1]} João</span>`;
  if (HV === 'ligas') {
    $('#hl').innerHTML = ligasView();
    return;
  }
  if (HV === 'torneios') {
    $('#hl').innerHTML = torneiosView();
    return;
  }
  $('#hl').innerHTML =
    (hist.length > 1
      ? `<button class="hord" onclick="HO=!HO;rH()">↕ ${HO ? 'Mais antigos primeiro' : 'Mais recentes primeiro'} (trocar)</button>`
      : '') +
    (hist.length
      ? (HO ? [...hist].reverse() : hist)
          .map(h => {
            const st = [0, 1].map(p => {
              const l = h.log.filter(e => e.p === p);
              return {
                dmg: -l.filter(e => e.d < 0).reduce((a, e) => a + e.d, 0),
                heal: l.filter(e => e.d > 0).reduce((a, e) => a + e.d, 0),
              };
            });
            const kd = kindOf(h);
            return `<div class="card ${kd === 'liga' ? 'kl' : kd ? 'kt' : ''}" style="border-left:5px solid ${COR[h.w]}"><div class="hh"><b><span style="color:var(--g)">Douglas</span> × <span style="color:var(--b)">João</span></b><small>${new Date(h.t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></div>
 <div class="hd">${h.decks ? `${esc(h.decks[0])} <em>vs</em> ${esc(h.decks[1])}` : '<em>Decks não sorteados</em>'}${kd ? `<div class="htl k-${kd}">${kd === 'liga' ? '📋 LIGA' : '🏟️ TORNEIO'} · ${esc(h.tl || '')}</div>` : '<div class="htl k-av">⚔️ DUELO AVULSO</div>'}</div>
 <div class="hs"><span>🏆 ${NOMES[h.w]}</span><span>⏱ ${fmt(h.dur)}</span><span>❤️ ${h.lp[0]} × ${h.lp[1]}</span>${h.tn > 1 ? `<span>🔄 ${h.tn} turnos</span>` : ''}${h.first != null ? `<span>🪙 ${NOMES[h.first]} começou</span>` : ''}${h.sr ? `<span>🎯 MD3 · duelo ${h.srg}</span>` : ''}${h.mvp ? `<span>⭐ ${esc(h.mvp.n)}</span>` : ''}</div>
 ${h.decks ? `<button class="horab" onclick="oraHist(${h.t})">🔮 Oráculo${h.ai ? (oraFav(h.ai.p) === h.w ? ' · ✅ acertou' : ' · ❌ errou') : h.rt ? (oraFav(h.rt.p) === h.w ? ' · 🔁 ✅ acertou' : ' · 🔁 ❌ errou') : ''}${h.vd ? ' · ' + (VDL[h.vd.deu_logica] || VDL.equilibrado)[1].toLowerCase() : ''}<span>›</span></button>` : ''}
 <details><summary>Detalhes</summary><div class="row" style="margin:8px 0;font-size:.85rem">${[0, 1].map(p => `<div><b style="color:${COR[p]}">${NOMES[p]}</b><br>Dano sofrido: ${st[p].dmg}<br>Cura: ${st[p].heal}</div>`).join('')}</div>
 ${h.decks ? `<button class="tund" style="margin:2px 0 8px" onclick="mvpPick(${h.t})">⭐ ${h.mvp ? 'Trocar' : 'Escolher'} carta MVP</button>` : ''}<button class="tund" style="margin:2px 0 8px" onclick="shareRes(${h.t})">📷 Compartilhar imagem</button>
 ${h.log.length ? h.log.map(e => `<div class="lg" style="color:${COR[e.p]}">${fmt(e.t)}${e.tn ? ' · T' + e.tn : ''} · ${NOMES[e.p]} ${e.d < 0 ? '−' : '+'}${Math.abs(e.d)} → ${e.lp}</div>`).join('') : '<small>Sem registros.</small>'}</details></div>`;
          })
          .join('')
      : '<p style="color:var(--mut);text-align:center">Nenhum duelo registrado ainda.</p>');
}
