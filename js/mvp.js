// Carta MVP do duelo.
// ===== Carta MVP: escolhida da lista de cartas do deck vencedor =====
let MVPL = null;
function mvpItems(nm, c) {
  return (CARDS[nm] || [])
    .map((x, k) => ({
      k,
      pt: (c && c[k] && c[k].pt) || x[0] || x[1],
      en: x[1],
      is: c && c[k] && c[k].d ? c[k].d.is : null,
      u: x[2],
    }))
    .filter(x => !x.u);
}
async function mvpPick(t, fromRes) {
  const h = hist.find(x => x.t === t);
  if (!h || !h.decks) return;
  const nm = h.decks[h.w];
  let c = await KV.get('dk:' + nm);
  MVPL = { t, nm, items: mvpItems(nm, c), fromRes: !!fromRes, q: '' };
  modal(
    `<h2>⭐ CARTA MVP</h2><p class="cnote" style="margin-top:-4px">${esc(nm)} · qual carta decidiu o duelo?</p><input class="srch" placeholder="Buscar carta…" oninput="MVPL.q=this.value;mvpList()" aria-label="Buscar carta"><div id="mvl"></div>${h.mvp ? `<button ${BTN2} onclick="mvpSet(-1)">Tirar a carta MVP</button>` : ''}<button ${BTN2} onclick="${fromRes ? 'showRes()' : 'fechar()'}">Voltar</button>`
  );
  mvpList();
  if (!c)
    getDeck(nm).then(c2 => {
      if (c2 && MVPL && MVPL.t === t) {
        MVPL.items = mvpItems(nm, c2);
        mvpList();
      }
    });
}
function mvpList() {
  const el = $('#mvl');
  if (!el || !MVPL) return;
  const q = MVPL.q.toLowerCase(),
    it = MVPL.items.filter(x => !q || x.pt.toLowerCase().includes(q) || x.en.toLowerCase().includes(q));
  el.innerHTML =
    it
      .map(
        x =>
          `<div class="cr" onclick="mvpSet(${x.k})"><div class="ph" ${x.is ? `style="background-image:url('${x.is}')"` : ''}></div><div><b>${esc(x.pt)}</b>${x.pt !== x.en ? `<small>${esc(x.en)}</small>` : ''}</div></div>`
      )
      .join('') || '<p class="cnote">Nenhuma carta encontrada.</p>';
}
function mvpSet(k) {
  const h = hist.find(x => x.t === MVPL.t);
  if (!h) return;
  if (k < 0) delete h.mvp;
  else {
    const x = MVPL.items.find(y => y.k === k);
    if (!x) return;
    h.mvp = { n: x.pt, en: x.en, is: x.is };
    play('heal');
    toast('⭐ MVP: ' + x.pt);
  }
  save();
  rH();
  if (MVPL.fromRes && RES && RES.h.t === h.t) showRes();
  else fechar();
}
$('#bClear').onclick = async () => {
  if (
    confirm(
      'Apagar todo o histórico?\n(O app guarda uma cópia automática para você poder desfazer em "Cópias automáticas".)'
    )
  ) {
    await snapNow('Antes de limpar o histórico');
    hist = [];
    save();
    rH();
    bkList();
  }
};
