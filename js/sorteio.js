// Sorteio de decks: modo justo, sorteio total, draft e animação de roleta.
// ===== Decks e sorteio =====
let filtro = 0,
  busy = false,
  SRT = { modo: 'justo', rep: false, md3: false },
  USED = [],
  DR = null;
try {
  Object.assign(SRT, JSON.parse(localStorage.getItem('ygo_sort') || '{}'));
} catch (e) {}
try {
  USED = JSON.parse(localStorage.getItem('ygo_used') || '[]');
} catch (e) {}
function saveSort() {
  try {
    localStorage.setItem('ygo_sort', JSON.stringify(SRT));
    localStorage.setItem('ygo_used', JSON.stringify(USED));
  } catch (e) {}
}
function rFiltro() {
  $('#filtro').innerHTML = [0, 1, 2, 3, 4, 5]
    .map(
      t =>
        `<button class="${filtro === t ? 'on' : ''}" onclick="filtro=${t};rFiltro();rLista()">${t ? 'Tier ' + t : 'Todos'}</button>`
    )
    .join('');
}
function rLista() {
  $('#lista').innerHTML = [...DECKS.keys()]
    .sort((a, b) => DECKS[a][1] - DECKS[b][1])
    .map(i => {
      const d = DECKS[i];
      return filtro && d[1] !== filtro
        ? ''
        : `<div class="card dk ${titulos(d[0]).c ? 'camp' : ''}" onclick="info(${i})">${art(i)}<div><b>${esc(d[0])}</b> <span class="tier t${d[1]}">T${d[1]}</span>${selo(d[0])}<small>${esc(d[4])}</small></div></div>`;
    })
    .join('');
}
function setTier(i, t) {
  const n = DECKS[i][0];
  DECKS[i][1] = t;
  if (t === BT[i]) delete TO[n];
  else TO[n] = t;
  try {
    localStorage.setItem('ygo_tiers', JSON.stringify(TO));
  } catch (e) {}
  KV.set('tiers', JSON.stringify(TO));
  rLista();
  play('click');
}
function setMode(m) {
  SRT.modo = m;
  saveSort();
  rSort();
  play('click');
}
// Decks ainda não usados nesta "volta" (opção Não repetir)
const avail = () => [...DECKS.keys()].filter(i => !SRT.rep || !USED.includes(DECKS[i][0]));
function useDecks(ds) {
  if (!SRT.rep) return;
  ds.forEach(i => {
    const n = DECKS[i][0];
    if (!USED.includes(n)) USED.push(n);
  });
  if (!avail().length) USED = [];
  saveSort();
  rSort();
}
function resetUsed() {
  USED = [];
  saveSort();
  rSort();
  play('click');
}
function drawPool(need) {
  let a = shuffle(avail());
  if (a.length < need)
    a = a.concat(shuffle([...DECKS.keys()].filter(i => !a.includes(i))).slice(0, need - a.length));
  return a;
}
function rSort() {
  ['justo', 'total', 'draft'].forEach(m => $('#m_' + m).classList.toggle('on', SRT.modo === m));
  $('#oRep').checked = !!SRT.rep;
  $('#oMd3').checked = !!SRT.md3;
  const n = avail().length;
  $('#pool').innerHTML = SRT.rep
    ? `🔁 ${n} de ${DECKS.length} decks ainda não usados nesta volta${USED.length ? ` · <a onclick="resetUsed()">recomeçar volta</a>` : ''}`
    : '';
  $('#bSort').textContent = SRT.modo === 'draft' ? 'Sortear opções do draft' : 'Sortear decks';
}
function rcHTML(i, k, s) {
  return `<b style="color:${COR[k]};font-family:Impact;letter-spacing:2px">${NOMES[k].toUpperCase()}</b>${art(i)}<h3>${esc(DECKS[i][0])} <span class="tier t${DECKS[i][1]}">TIER ${DECKS[i][1]}</span></h3>${s ? '' : `<button class="info" onclick="info(${i})">Ver Info</button>`}`;
}
function setRC(k, i, s, pop) {
  const e = $('#rc' + k);
  if (!e) return;
  e.className = 'card rc ' + (s ? 'spin' : pop ? 'pop' : '');
  e.style.borderColor = COR[k];
  e.innerHTML = rcHTML(i, k, s);
}
function showR(p, s) {
  $('#resultado').innerHTML =
    p.map((i, k) => `<div id="rc${k}"></div>`).join('') +
    (s
      ? ''
      : SRT.md3
        ? '<div class="mini" style="margin-bottom:4px">🎯 Melhor de 3: vence quem ganhar 2 duelos</div>'
        : '');
  p.forEach((i, k) => setRC(k, i, !!s, !s));
  sbar(!s);
}
// Barra flutuante dividida: sortear de novo | ir para o duelo (sempre visível, sem rolar)
function sbar(on) {
  const e = $('#sbar');
  if (e) e.classList.toggle('on', !!on && document.body.dataset.t === 'sorteio');
}
function sortear() {
  if (busy) return;
  if (SRT.modo === 'draft') return draftStart();
  busy = true;
  play('sweep');
  const ix = [...DECKS.keys()];
  let A = avail();
  if (A.length < 2) {
    USED = [];
    A = ix;
  }
  const a = pick(A),
    near = i => i !== a && Math.abs(DECKS[i][1] - DECKS[a][1]) <= 1;
  let pool = SRT.modo === 'justo' ? A.filter(near) : A.filter(i => i !== a);
  if (!pool.length && SRT.modo === 'justo') pool = ix.filter(near);
  if (!pool.length) pool = ix.filter(i => i !== a);
  const b = pick(pool);
  let n = 0;
  oraPreAquecer([a, b]);
  spinDraw([a, b], ix, () => {
    useDecks([a, b]);
    newDuel([a, b], null, SRT.md3 ? mkSr() : null);
    busy = false;
  });
}
// Efeito de roleta: os ícones dos decks se alternam e vão desacelerando; o do Douglas trava primeiro e depois o do João.
function spinDraw(fin, ix, done) {
  const N = [10, 15];
  let i = 0,
    last = [-1, -1];
  showR(fin, 1);
  const rs = $('#resultado');
  if (rs) rs.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const step = () => {
    i++;
    let tk = 0;
    for (let k = 0; k < 2; k++) {
      if (i <= N[k]) {
        let x;
        do {
          x = pick(ix);
        } while (x === last[k] || (x === fin[k] && i < N[k]));
        last[k] = x;
        setRC(k, x, 1);
        tk = 1;
      } else if (i === N[k] + 1) {
        setRC(k, fin[k], 0, 1);
        play(k ? 'boom' : 'click');
      }
    }
    if (tk) play('tickU');
    if (i > N[1]) {
      done();
      play('win');
      sbar(1);
      setTimeout(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }), 350);
      return;
    }
    setTimeout(step, 65 + i * 13);
  };
  setTimeout(step, 80);
}
// Draft: cada um recebe 3 decks sorteados e escolhe 1 (Douglas primeiro, João vê a escolha dele)
function draftAnim() {
  busy = true;
  play('sweep');
  setTimeout(() => {
    const r = $('#resultado');
    r && scrollTo({ top: r.getBoundingClientRect().top + scrollY - 8, behavior: 'smooth' });
  }, 60);
  let n = 0;
  const N = 12;
  const st = () => {
    rDraft(1);
    play('tickU');
    if (++n > N) {
      busy = false;
      rDraft();
      play('win');
      return;
    }
    setTimeout(st, 70 + n * 14);
  };
  st();
}
function draftStart() {
  const P = drawPool(6);
  DR = { o: [P.slice(0, 3), P.slice(3, 6)], c: [null, null], k: 0 };
  draftAnim();
}
function rDraft(sh) {
  sbar(0);
  const k = DR.k,
    o = sh ? [0, 1, 2].map(() => pick([...DECKS.keys()])) : DR.o[k];
  $('#resultado').innerHTML =
    (k
      ? `<div class="mini" style="margin-bottom:8px">Douglas escolheu <b style="color:var(--g)">${esc(dn(DR.c[0]))}</b></div>`
      : '') +
    `<div class="card dcard" style="border-color:${COR[k]};text-align:center"><b style="color:${COR[k]};font:900 1rem Impact,sans-serif;letter-spacing:2px">${NOMES[k].toUpperCase()}, ESCOLHA SEU DECK</b><div class="cnote">Toque em um dos três · ⓘ mostra a estratégia</div>
 <div class="drf">${o.map(i => `<div class="dro ${sh ? 'shuf' : 'pop'}" ${sh ? '' : `onclick="draftPick(${i})"`}>${sh ? '' : `<button class="ii" onclick="event.stopPropagation();info(${i})" aria-label="Ver estratégia">i</button>`}${art(i)}<div class="dn"><b>${esc(DECKS[i][0])}</b><span class="tier t${DECKS[i][1]}">TIER ${DECKS[i][1]}</span></div></div>`).join('')}</div></div>`;
}
function draftPick(i) {
  if (!DR || busy) return;
  DR.c[DR.k] = i;
  play('click');
  if (DR.k === 0) {
    DR.k = 1;
    draftAnim();
    return;
  }
  const ds = DR.c;
  DR = null;
  useDecks(ds);
  newDuel(ds, null, SRT.md3 ? mkSr() : null);
  showR(ds);
  play('win');
}
