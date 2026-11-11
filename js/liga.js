// Liga de pontos corridos.
// ===== Liga de pontos corridos =====
// Todos contra todos uma vez (tabela de rodízio). Lado 0 = Douglas; os lados alternam para cada deck ser usado pelos dois.
let LN = 6,
  LPK = [];
function mkLiga(ix, pk) {
  const n = ix.length,
    M = {},
    a = [...ix];
  for (let r = 0; r < n - 1; r++) {
    for (let k = 0; k < n / 2; k++) {
      let x = a[k],
        y = a[n - 1 - k];
      if (k === 0 ? r % 2 : (r + k) % 2) [x, y] = [y, x];
      const id = 'l' + (r + 1) + '-' + (k + 1);
      M[id] = {
        id,
        st: 'lg',
        r: r + 1,
        n: k + 1,
        a: { d: DECKS[x][0] },
        b: { d: DECKS[y][0] },
        w: null,
        lp: null,
        h: null,
      };
    }
    a.splice(1, 0, a.pop());
  }
  // Equilibra os lados: troca quem usa cada deck até que cada deck fique o mais dividido possível entre Douglas e João
  const ms = Object.values(M),
    bal = () => {
      const c = {};
      ms.forEach(m => {
        c[m.a.d] = (c[m.a.d] || 0) + 1;
        c[m.b.d] = (c[m.b.d] || 0) - 1;
      });
      return c;
    };
  for (let it = 0, ch = true; ch && it < 200; it++) {
    ch = false;
    const c = bal();
    for (const m of ms) {
      if (c[m.a.d] - c[m.b.d] >= 3) {
        [m.a, m.b] = [m.b, m.a];
        ch = true;
        break;
      }
    }
  }
  const tb = {};
  ix.forEach(i => (tb[DECKS[i][0]] = Math.random()));
  return { fmt: 'liga', v: 1, t: Date.now(), M, tb, ds: ix.map(i => DECKS[i][0]), pk: !!pk };
}
function ligaStand() {
  const rows = T.ds.map(n => ({ n, i: DI(n) < 0 ? null : DI(n), j: 0, v: 0, d: 0, lp: 0 })),
    R = n => rows.find(r => r.n === n);
  allM().forEach(m => {
    if (m.w == null) return;
    const W = R(m.w ? m.b.d : m.a.d),
      L = R(m.w ? m.a.d : m.b.d);
    if (!W || !L) return;
    W.j++;
    L.j++;
    W.v++;
    L.d++;
    W.lp += m.lp ? m.lp[m.w] : 0;
  });
  rows.sort((x, y) => y.v - x.v || y.lp - x.lp || (T.tb[y.n] || 0) - (T.tb[x.n] || 0));
  return rows;
}
function ligaIntro() {
  return `<div class="card thd" style="margin-top:12px"><h2 style="margin:4px 0;color:var(--gd);font:900 1.15rem Impact,sans-serif;letter-spacing:2px">📋 LIGA DE PONTOS CORRIDOS</h2>
 <details class="tinfo"><summary>ℹ️ Como funciona</summary><div class="trule"><p>Todos contra todos, uma vez. Quem somar mais vitórias é o campeão; empate decide pelo saldo de LP restante nas vitórias. Cada deck é usado mais ou menos metade das vezes por cada um de vocês.</p></div></details>
 <div class="opt"><b>Quantos decks?</b><div class="seg">${[
   [4, 6],
   [6, 15],
   [8, 28],
 ]
   .map(
     ([n, j]) =>
       `<button class="${LN === n ? 'on' : ''}" onclick="LN=${n};rT();play('click')">${n} decks<br><small>${j} duelos</small></button>`
   )
   .join('')}</div></div>
 <div class="row"><button class="btn" style="padding:13px;font-size:.85rem" onclick="ligaRand()">🎲 Sortear decks</button><button class="btn" style="padding:13px;font-size:.85rem" onclick="ligaPick()">✋ Escolher</button></div></div>`;
}
function ligaAnim(ix, pk) {
  tBusy = true;
  play('sweep');
  let n = 0;
  const all = [...DECKS.keys()];
  const iv = setInterval(() => {
    T = mkLiga(pk ? shuffle(ix) : shuffle(all).slice(0, ix.length), pk);
    TV = '1';
    rT('shuf');
    play('tickU');
    if (++n > 12) {
      clearInterval(iv);
      T = mkLiga(pk ? shuffle(ix) : shuffle(all).slice(0, ix.length), pk);
      TV = '1';
      saveT();
      tBusy = false;
      rT('pop');
      play('win');
      scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, 100);
}
function ligaRand() {
  if (!tBusy) ligaAnim([...Array(LN).keys()], false);
}
function ligaPick() {
  LPK = [];
  rPick();
}
function rPick() {
  const y = $('#box').scrollTop;
  modal(
    `<h2>ESCOLHER ${LN} DECKS</h2><p class="cnote" style="text-align:center">${LPK.length} de ${LN} escolhidos</p>` +
      [...DECKS.keys()]
        .sort((a, b) => DECKS[a][1] - DECKS[b][1])
        .map(
          i =>
            `<div class="rk ${LPK.includes(i) ? 'sel' : ''}" onclick="pk(${i})">${art(i)}<div class="mid"><b>${esc(DECKS[i][0])}</b><span class="tier t${DECKS[i][1]}">T${DECKS[i][1]}</span></div><div class="vd">${LPK.includes(i) ? '✓' : ''}</div></div>`
        )
        .join('') +
      `<button class="btn" ${LPK.length === LN ? '' : 'disabled style="opacity:.4"'} onclick="if(LPK.length===LN){fechar();ligaAnim(LPK,true)}">Montar a liga</button><button ${BTN2} onclick="fechar()">Cancelar</button>`
  );
  $('#box').scrollTop = y;
}
function pk(i) {
  const k = LPK.indexOf(i);
  if (k >= 0) LPK.splice(k, 1);
  else if (LPK.length < LN) LPK.push(i);
  else {
    toast('Já escolheram ' + LN + ' decks');
    return;
  }
  play('click');
  rPick();
}
function ligaRedo() {
  if (tBusy || allM().some(m => m.w != null)) return;
  if (!confirm(T.pk ? 'Sortear a ordem dos jogos de novo?' : 'Sortear outros decks para a liga?')) return;
  const ix = T.ds.map(DI).filter(i => i >= 0);
  LN = ix.length;
  ligaAnim(ix, T.pk);
}
function rLiga(an) {
  const el = $('#tour'),
    M = allM(),
    done = M.filter(m => m.w != null).length,
    W = [0, 1].map(p => M.filter(m => m.w === p).length),
    nx = nextM(),
    fin = done === M.length,
    st = ligaStand(),
    R = Math.max(...M.map(m => m.r));
  if (!TV || !(+TV >= 1 && +TV <= R)) TV = curSt();
  let h = `<div class="card thd"><div class="cnote" style="margin:0 0 4px;letter-spacing:2px;font-weight:800">📋 LIGA DE ${T.ds.length} DECKS</div><div class="tsc"><span style="color:var(--g)">Douglas ${W[0]}</span> × <span style="color:var(--b)">${W[1]} João</span></div><div class="tbar"><i style="width:${(done / M.length) * 100}%"></i></div><small>${done} de ${M.length} duelos · Rodada ${curSt()} de ${R}</small>
  ${tBusy ? '' : nx ? `<button class="btn" onclick="playM('${nx.id}')">⚔️ Próximo: ${mlab(nx)}</button>` : ''}</div>`;
  if (fin && !tBusy)
    h += `<div class="card champ">${art(st[0].i)}<h2>CAMPEÃO</h2><h3>${esc(st[0].n)}</h3><p>${st[0].v} vitórias em ${st[0].j} jogos · vice: ${esc(st[1].n)}</p>${st[1].v === st[0].v && st[1].lp === st[0].lp ? '<p>🎲 Empate em vitórias e saldo de LP, decidido no sorteio</p>' : ''}</div>`;
  h +=
    `<div class="card"><div class="clh" style="margin-top:0">CLASSIFICAÇÃO</div><table class="gt lgt"><tr><th>#</th><th style="text-align:left">Deck</th><th>J</th><th>V</th><th>D</th><th>Saldo LP</th></tr>` +
    st
      .map(
        (r, k) =>
          `<tr class="${fin ? (k === 0 ? 'q' : '') : ''}"><td>${k + 1}º</td><td class="dn" onclick="${r.i != null ? `info(${r.i})` : ''}" style="cursor:pointer"><div class="lgn">${art(r.i)}<span>${esc(r.n)}</span></div></td><td>${r.j}</td><td>${r.v}</td><td>${r.d}</td><td>${r.lp}</td></tr>`
      )
      .join('') +
    `</table><div class="cnote">Ordem: vitórias, depois saldo de LP restante nas vitórias.</div></div>`;
  h +=
    `<div class="tstp" style="flex-wrap:wrap">` +
    [...Array(R).keys()]
      .map(k => {
        const r = k + 1,
          ms = M.filter(m => m.r === r),
          d = ms.filter(m => m.w != null).length;
        return `<button style="min-width:40px" class="${TV === String(r) ? 'on' : ''} ${d === ms.length ? 'ok' : ''}" onclick="TV='${r}';rT();play('click')">R${r}<small>${d === ms.length ? '✓' : d + '/' + ms.length}</small></button>`;
      })
      .join('') +
    `</div>`;
  h += M.filter(m => String(m.r) === TV)
    .map(m => mCard(m, an))
    .join('');
  h +=
    `<div class="row" style="margin-top:4px">${done ? '' : `<button class="btn" style="padding:12px;font-size:.85rem" onclick="ligaRedo()">🔀 Sortear de novo</button>`}<button class="btn" style="padding:12px;font-size:.85rem;border-color:#2c58b8;color:var(--mut)" onclick="novoT()">${fin ? '🏁 Nova competição' : '🗑 Encerrar liga'}</button></div>` +
    campHTML();
  el.innerHTML = h;
}
// Títulos de cada deck (campeão e vice de torneios e ligas já encerrados)
function titulos(nome) {
  return {
    c: CAMP.filter(x => x.c === nome).length,
    v: CAMP.filter(x => x.v === nome).length,
  };
}
// Selo ao lado do nome do deck: 🏆 (ou 🏆×2, 🏆×3…)
function selo(nome) {
  const t = titulos(nome);
  return t.c ? `<span class="tit" title="Campeão de ${t.c} torneio${t.c > 1 ? 's' : ''}">🏆${t.c > 1 ? '×' + t.c : ''}</span>` : '';
}
// Stats → Decks: hall dos campeões
function campeoesHTML() {
  const ds = {};
  CAMP.forEach(x => {
    [
      [x.c, 'c'],
      [x.v, 'v'],
    ].forEach(([n, k]) => {
      if (!n) return;
      const q = ds[n] || (ds[n] = { n, c: 0, v: 0, ult: 0 });
      q[k]++;
      if (k === 'c') q.ult = Math.max(q.ult, x.t);
    });
  });
  const L = Object.values(ds).sort((a, b) => b.c - a.c || b.v - a.v || b.ult - a.ult);
  return `<div class="sh">🏆 CAMPEÕES DE TORNEIO</div><div class="card">${
    L.length
      ? L.map(q => {
          const i = DI(q.n);
          return `<div class="rk ${q.c ? 'camp' : ''}" ${i >= 0 ? `onclick="info(${i})"` : ''}>${art(i < 0 ? null : i)}<div class="mid"><b>${esc(q.n)}</b><small>${q.c ? `🏆 ${q.c} título${q.c > 1 ? 's' : ''}` : ''}${q.c && q.v ? ' · ' : ''}${q.v ? `🥈 ${q.v} vice${q.v > 1 ? 's' : ''}` : ''}${q.ult ? ` · último em ${new Date(q.ult).toLocaleDateString('pt-BR')}` : ''}</small></div><div class="vd">${q.c ? '🏆'.repeat(Math.min(q.c, 3)) : '🥈'}</div></div>`;
        }).join('')
      : '<div class="mini">Quando um torneio ou liga terminar, o campeão aparece aqui e ganha um 🏆 na aba Decks.</div>'
  }</div>`;
}
function campHTML() {
  if (!CAMP.length) return '';
  return (
    `<div class="card" style="margin-top:12px"><div class="clh" style="margin-top:0">🏅 GALERIA DE CAMPEÕES</div>` +
    CAMP.map(c => {
      const i = DI(c.c);
      return `<div class="cmp">${art(i < 0 ? null : i)}<div><b>${esc(c.c)}</b><small>${new Date(c.t).toLocaleDateString('pt-BR')} · ${c.fmt === 'liga' ? `📋 Liga de ${c.n || '?'} decks · vice: ${esc(c.v)}` : `🏟️ Mata-mata · final com ${NOMES[c.p]} contra ${esc(c.v)}`} · placar ${c.s[0]} × ${c.s[1]}</small></div></div>`;
    }).join('') +
    `</div>`
  );
}
