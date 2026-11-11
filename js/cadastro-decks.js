// Cadastro e edição de decks pelo próprio app.
// ===== Cadastro e edição de decks =====
const ATRS = ['LUZ', 'TREVAS', 'TERRA', 'ÁGUA', 'FOGO', 'VENTO', 'DIVINO'];
const saveCus = () => {
  try {
    localStorage.setItem('ygo_custom', JSON.stringify(CUS));
  } catch (e) {}
};
// Aceita linhas como "3x Nome", "3 Nome", "Nome x3" ou só "Nome"; ignora linhas em branco e as que começam com # ou //
function parseList(t) {
  const m = new Map();
  String(t || '')
    .split(/\r?\n/)
    .forEach(l => {
      l = l.replace(/^[-•*]\s*/, '').trim();
      if (!l || /^(#|!|\/\/)/.test(l)) return;
      let q = 1,
        n = l,
        x;
      if ((x = l.match(/^(\d{1,2})\s*[x×]?\s+(.+)$/i))) {
        q = +x[1];
        n = x[2];
      } else if ((x = l.match(/^(.+?)\s*[x×]\s*(\d{1,2})$/i))) {
        n = x[1];
        q = +x[2];
      }
      n = n.trim();
      if (!n) return;
      const k = n.toLowerCase(),
        o = m.get(k);
      if (o) o[2] += q;
      else m.set(k, [0, n, q]);
    });
  return [...m.values()].map(([a, n, q]) => (q > 1 ? [0, n, 0, q] : [0, n]));
}
const listTxt = c => (c || []).map(x => (x[3] > 1 ? x[3] + 'x ' : '') + x[1]).join('\n');
function deckForm(i, keep) {
  const ed = i >= BASEN ? CUS.find(c => c.n === DECKS[i][0]) : null,
    v =
      keep ||
      (ed
        ? {
            n: ed.n,
            a: ed.a,
            t: DECKS[i][1],
            q: ed.q || '',
            s: ed.s || '',
            f: ed.f || '',
            w: ed.w || '',
            l: listTxt(ed.cards),
          }
        : { n: '', a: 'LUZ', t: 3, q: '', s: '', f: '', w: '', l: '' });
  const fl = (id, lb, x, ph) => `<label class="dfl"><span>${lb}</span>${x}</label>`;
  modal(`<h2>${ed ? 'EDITAR DECK' : 'NOVO DECK'}</h2>
 <label class="dfl"><span>Nome do deck</span><input id="dfN" maxlength="40" value="${esc(v.n)}" ${ed ? 'readonly' : ''} placeholder="Ex.: Guerreiros Elementais"></label>${ed ? '<p class="cnote" style="margin:-4px 0 6px;text-align:left">O nome não muda depois de criado, para não perder o histórico.</p>' : ''}
 <div class="row" style="gap:8px"><label class="dfl"><span>Atributo</span><select id="dfA">${ATRS.map(a => `<option ${v.a === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label><label class="dfl"><span>Tier</span><select id="dfT">${[1, 2, 3, 4, 5].map(t => `<option value="${t}" ${+v.t === t ? 'selected' : ''}>Tier ${t}</option>`).join('')}</select></label></div>
 <label class="dfl"><span>Carta para a arte (nome em inglês, opcional)</span><input id="dfQ" value="${esc(v.q)}" placeholder="Ex.: Dark Magician — se vazio, usa a 1ª da lista"></label>
 <label class="dfl"><span>Estratégia (opcional)</span><textarea id="dfS" rows="2">${esc(v.s)}</textarea></label>
 <label class="dfl"><span>Pontos fortes (opcional)</span><input id="dfF" value="${esc(v.f)}"></label><label class="dfl"><span>Pontos fracos (opcional)</span><input id="dfW" value="${esc(v.w)}"></label>
 <label class="dfl"><span>Lista de cartas (nomes em inglês, uma por linha)</span><textarea id="dfL" rows="7" placeholder="3x Dark Magician&#10;2x Magician's Rod&#10;Monster Reborn">${esc(v.l)}</textarea></label>
 <div class="row" style="gap:8px"><label class="btn" style="padding:10px;font-size:.72rem;text-align:center;cursor:pointer">📥 Importar .ydk<input type="file" accept=".ydk,text/plain" hidden onchange="ydkLoad(this)"></label><button class="btn" style="padding:10px;font-size:.72rem" onclick="verifyList()">🔍 Verificar cartas</button></div>
 <div id="dfMsg" class="cnote" style="text-align:left;min-height:1.2em"></div>
 <button class="btn" onclick="deckSave(${i})">💾 Salvar deck</button>${ed ? `<button class="btn red" onclick="deckDel(${i})">🗑 Excluir deck</button>` : ''}<button class="btn sec" onclick="${ed ? `info(${i})` : 'fechar()'}">Cancelar</button>`);
  $('#box').scrollTop = 0;
}
const dfv = () => ({
  n: $('#dfN').value.trim(),
  a: $('#dfA').value,
  t: +$('#dfT').value,
  q: $('#dfQ').value.trim(),
  s: $('#dfS').value.trim(),
  f: $('#dfF').value.trim(),
  w: $('#dfW').value.trim(),
  l: $('#dfL').value,
});
const dfm = t => {
  const e = $('#dfMsg');
  if (e) e.innerHTML = t;
};
async function verifyList() {
  const rows = parseList($('#dfL').value);
  if (!rows.length) {
    dfm('Cole a lista de cartas primeiro.');
    return;
  }
  dfm('Verificando… (precisa de internet)');
  const found = new Map();
  try {
    for (let k = 0; k < rows.length; k += 25) {
      const j = await (
        await fetch(
          API +
            '?name=' +
            encodeURIComponent(
              rows
                .slice(k, k + 25)
                .map(x => x[1])
                .join('|')
            )
        )
      ).json();
      (j.data || []).forEach(x => found.set(x.name.toLowerCase(), x.name));
    }
    const miss = rows.filter(x => !found.has(x[1].toLowerCase()));
    for (const x of miss) {
      try {
        const j = await (await fetch(API + '?fname=' + encodeURIComponent(x[1]))).json(),
          f = (j.data || []).find(y => y.name.toLowerCase() === x[1].toLowerCase());
        if (f) found.set(x[1].toLowerCase(), f.name);
      } catch (e) {}
    }
    const bad = rows.filter(x => !found.has(x[1].toLowerCase()));
    $('#dfL').value = listTxt(
      rows.map(x => {
        const n = found.get(x[1].toLowerCase());
        return n ? [0, n, 0, x[3] || 1] : x;
      })
    );
    dfm(
      `${bad.length ? '⚠️' : '✅'} ${rows.length - bad.length} de ${rows.length} cartas encontradas.${bad.length ? '<br>Não encontradas (confira a grafia em inglês): <b>' + bad.map(x => esc(x[1])).join(', ') + '</b>' : ''}`
    );
  } catch (e) {
    dfm('Não consegui verificar agora (sem internet?). Dá para salvar assim mesmo e verificar depois.');
  }
}
async function ydkLoad(inp) {
  const f = inp.files[0];
  inp.value = '';
  if (!f) return;
  const cur = dfv();
  const ids = new Map();
  let side = false;
  (await f.text()).split(/\r?\n/).forEach(l => {
    l = l.trim();
    if (l.startsWith('!side')) side = true;
    else if (l.startsWith('#')) side = false;
    if (side) return;
    if (/^\d{3,9}$/.test(l)) ids.set(l, (ids.get(l) || 0) + 1);
  });
  if (!ids.size) {
    dfm('Não encontrei códigos de carta nesse arquivo.');
    return;
  }
  dfm('Lendo o .ydk e buscando os nomes… (precisa de internet)');
  const names = new Map(),
    L = [...ids.keys()];
  try {
    for (let k = 0; k < L.length; k += 40) {
      const j = await (await fetch(API + '?id=' + L.slice(k, k + 40).join(','))).json();
      (j.data || []).forEach(x => names.set(String(x.id), x.name));
    }
  } catch (e) {
    dfm('Sem internet: não consegui buscar os nomes das cartas.');
    return;
  }
  const rows = L.filter(id => names.has(id)).map(id => [0, names.get(id), 0, ids.get(id)]),
    miss = L.length - rows.length;
  deckForm(-1, { ...cur, n: cur.n || f.name.replace(/\.ydk$/i, ''), l: listTxt(rows) });
  dfm(
    `📥 ${rows.length} cartas importadas${miss ? ` (${miss} código(s) não reconhecido(s))` : ''}. Confira e salve.`
  );
}
function deckSave(i) {
  const v = limpaTudo(dfv()),
    ed = i >= BASEN ? CUS.find(c => c.n === DECKS[i][0]) : null;
  if (!v.n) {
    dfm('⚠️ Dê um nome ao deck.');
    return;
  }
  if (!ed && DECKS.some(d => d[0].toLowerCase() === v.n.toLowerCase())) {
    dfm('⚠️ Já existe um deck com esse nome.');
    return;
  }
  const cards = parseList(v.l),
    q = v.q || (cards[0] && cards[0][1]) || v.n,
    rec = { n: v.n, a: v.a, t: v.t, e: EMO[v.a] || '🃏', s: v.s, f: v.f, w: v.w, q, cards };
  if (ed) {
    Object.assign(ed, rec);
    const d = DECKS[i];
    d[2] = rec.a;
    d[3] = rec.e;
    d[4] = rec.s || 'Deck cadastrado por vocês.';
    d[5] = rec.f || '—';
    d[6] = rec.w || '—';
    d[7] = q;
    if (d[1] !== v.t) setTier(i, v.t);
    CARDS[v.n] = cards;
    KV.set('dk:' + v.n, null);
    saveCus();
    loadArt(i, i);
  } else {
    CUS.push(rec);
    saveCus();
    DECKS.push([v.n, v.t, v.a, rec.e, v.s || 'Deck cadastrado por vocês.', v.f || '—', v.w || '—', q]);
    BT.push(v.t);
    CARDS[v.n] = cards;
    loadArt(DECKS.length - 1);
  }
  rLista();
  rFiltro();
  rSort();
  fechar();
  toast(ed ? 'Deck atualizado' : 'Deck criado');
  play('win');
  if (!ed) setTimeout(() => info(DECKS.length - 1), 250);
}
function deckDel(i) {
  const n = DECKS[i][0];
  if (
    !confirm(
      `Excluir o deck "${n}"? Os duelos antigos com ele continuam no histórico, mas ele sai do sorteio e das estatísticas por deck.`
    )
  )
    return;
  CUS = CUS.filter(c => c.n !== n);
  saveCus();
  delete TO[n];
  try {
    localStorage.setItem('ygo_tiers', JSON.stringify(TO));
  } catch (e) {}
  KV.set('dk:' + n, null);
  fechar();
  toast('Deck excluído');
  setTimeout(() => location.reload(), 500);
}
