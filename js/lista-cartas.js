// Lista de cartas de cada deck e detalhes de cada carta.
// ===== Lista de cartas do deck + detalhes (YGOPRODeck) =====
const CARDS0 = 0;
CUS.forEach(c => {
  if (c.cards) CARDS[c.n] = c.cards;
});
const API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const A_PT = {
  DARK: 'TREVAS',
  LIGHT: 'LUZ',
  FIRE: 'FOGO',
  WATER: 'ÁGUA',
  EARTH: 'TERRA',
  WIND: 'VENTO',
  DIVINE: 'DIVINO',
};
const R_PT = {
  Zombie: 'Zumbi',
  Dragon: 'Dragão',
  Spellcaster: 'Mago',
  Warrior: 'Guerreiro',
  Beast: 'Fera',
  'Beast-Warrior': 'Guerreiro-Fera',
  Fiend: 'Demônio',
  Fairy: 'Fada',
  Machine: 'Máquina',
  Aqua: 'Aqua',
  Pyro: 'Piro',
  Thunder: 'Trovão',
  Rock: 'Pedra',
  Plant: 'Planta',
  Insect: 'Inseto',
  Dinosaur: 'Dinossauro',
  Reptile: 'Réptil',
  'Winged Beast': 'Besta Alada',
  Fish: 'Peixe',
  'Sea Serpent': 'Serpente Marinha',
  Psychic: 'Psíquico',
  Wyrm: 'Wyrm',
  Cyberse: 'Ciberso',
  'Divine-Beast': 'Besta Divina',
  'Creator God': 'Deus Criador',
  Illusion: 'Ilusão',
};
const T_PT = {
  Normal: 'Normal',
  Effect: 'Efeito',
  Tuner: 'Regulador',
  Synchro: 'Sincro',
  Fusion: 'Fusão',
  XYZ: 'Xyz',
  Link: 'Link',
  Pendulum: 'Pêndulo',
  Ritual: 'Ritual',
  Spirit: 'Espírito',
  Gemini: 'Gêmeo',
  Union: 'União',
  Flip: 'Virar',
  Toon: 'Toon',
  Token: 'Token',
  Special: 'Especial',
  Summon: 'Invocação',
};
const S_PT = {
  Normal: 'Normal',
  'Quick-Play': 'Rápida',
  Continuous: 'Contínua',
  Equip: 'de Equipamento',
  Field: 'de Campo',
  Ritual: 'de Ritual',
  Counter: 'de Resposta',
};
const esc = s =>
  String(s == null ? '' : s).replace(
    /[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
function slim(x) {
  const im = (x.card_images && x.card_images[0]) || {};
  return {
    id: x.id,
    t: x.type,
    r: x.race,
    a: x.attribute,
    k: x.atk,
    f: x.def,
    l: x.level,
    lk: x.linkval,
    e: x.desc,
    im: im.image_url,
    is: im.image_url_small,
  };
}
function cat(d) {
  if (!d) return '?';
  const t = d.t;
  return /Spell/.test(t) ? 'M' : /Trap/.test(t) ? 'A' : /Fusion|Synchro|XYZ|Link/.test(t) ? 'E' : 'O';
}
function ctype(d) {
  if (/Spell/.test(d.t)) return 'Magia ' + (S_PT[d.r] || d.r);
  if (/Trap/.test(d.t)) return 'Armadilha ' + (S_PT[d.r] || d.r);
  const p = d.t
    .replace(' Monster', '')
    .split(' ')
    .map(w => T_PT[w] || w);
  return [R_PT[d.r] || d.r].concat(p).join('／');
}
function lvl(d) {
  return /XYZ/.test(d.t) ? 'Graduação ' + d.l : /Link/.test(d.t) ? 'Link-' + d.lk : 'Nível ' + d.l;
}
const stat = v => (v == null ? '—' : v);
let CUR = null,
  CT = 0;
async function getDeck(n) {
  const L = CARDS[n] || [];
  let c = await KV.get('dk:' + n);
  if (c && c.length === L.length && c.every((x, k) => x.en === L[k][1])) return c;
  const map = {};
  let net = true;
  for (let k = 0; k < L.length && net; k += 25) {
    try {
      const j = await (
        await fetch(
          API +
            '?name=' +
            encodeURIComponent(
              L.slice(k, k + 25)
                .map(x => x[1])
                .join('|')
            )
        )
      ).json();
      (j.data || []).forEach(x => (map[x.name.toLowerCase()] = slim(x)));
    } catch (e) {
      if (!Object.keys(map).length) net = false;
    }
  }
  if (!net) return null;
  for (const x of L) {
    if (map[x[1].toLowerCase()]) continue;
    try {
      const j = await (await fetch(API + '?fname=' + encodeURIComponent(x[1]))).json(),
        f = (j.data || []).find(y => y.name.toLowerCase() === x[1].toLowerCase());
      if (f) map[f.name.toLowerCase()] = slim(f);
    } catch (e) {}
  }
  const ids = [...new Set(Object.values(map).map(x => x.id))],
    pt = {};
  for (let k = 0; k < ids.length; k += 40) {
    try {
      const j = await (await fetch(API + '?id=' + ids.slice(k, k + 40).join(',') + '&language=pt')).json();
      (j.data || []).forEach(x => (pt[x.id] = { n: x.name, e: x.desc }));
    } catch (e) {}
  }
  c = L.map(x => {
    const d = map[x[1].toLowerCase()] || null,
      p = d && pt[d.id];
    return {
      pt: x[0] || (p && p.n) || x[1],
      en: x[1],
      g: x[2] || 0,
      d: d,
      pe: p && p.e && p.e !== d.e ? p.e : null,
    };
  });
  if (c.some(x => x.d)) KV.set('dk:' + n, c);
  return c;
}
function thumb(d) {
  return d ? `style="background-image:url('${d.is}')"` : '';
}
function drawCards(i, c, msg) {
  const el = $('#cl');
  if (!el) return;
  const L = CARDS[DECKS[i][0]] || [];
  // Contagem por cópias (3x D ao Cubo conta 3), separando o Deck Principal do Extra Deck quando os detalhes já chegaram
  const qt = k => +L[k][3] || 1,
    soma = ks => ks.reduce((t, k) => t + qt(k), 0),
    todos = [...L.keys()];
  if (c) {
    const ex = todos.filter(k => c[k] && cat(c[k].d) === 'E'),
      pr = todos.filter(k => !ex.includes(k));
    $('#clN').textContent = '(' + soma(pr) + (ex.length ? ' + ' + soma(ex) + ' no Extra' : '') + ')';
    // Deck Principal tem no mínimo 40 cartas: se der menos, a lista está sem alguma cópia repetida
    if (soma(pr) < 40)
      $('#clN').insertAdjacentHTML(
        'beforeend',
        `<small class="clav">⚠️ O Deck Principal precisa de pelo menos 40 cartas: falta alguma cópia repetida nesta lista.</small>`
      );
  } else $('#clN').textContent = '(' + soma(todos) + ')';
  if (!c) {
    el.innerHTML =
      (msg ? `<p class="cnote">${msg}</p>` : '') +
      L.map(
        x =>
          `<div class="cr" style="cursor:default"><div class="ph">${x[3] > 1 ? '<i class="qt">x' + x[3] + '</i>' : ''}</div><div><b>${esc(x[0] || x[1])}</b>${x[2] ? '<em> · não usada</em>' : ''}</div></div>`
      ).join('');
    return;
  }
  CUR = { i, c };
  const G = [
    ['O', 'MONSTROS'],
    ['E', 'EXTRA DECK'],
    ['M', 'MAGIAS'],
    ['A', 'ARMADILHAS'],
    ['?', 'SEM DETALHES (não achei na base)'],
  ];
  el.innerHTML = G.map(([g, t]) => {
    const rows = c.map((x, k) => [x, k]).filter(([x]) => cat(x.d) === g);
    if (!rows.length) return '';
    return (
      `<div class="cg">${t} · ${soma(rows.map(([, k]) => k))}</div>` +
      rows
        .map(([x, k]) => {
          const d = x.d,
            m = !d
              ? ''
              : g === 'M' || g === 'A'
                ? ctype(d)
                : `ATK ${stat(d.k)} / DEF ${stat(d.f)} · ${lvl(d)}`;
          return `<div class="cr" onclick="cardDet(${k})"><div class="ph" ${thumb(d)}>${L[k][3] > 1 ? '<i class="qt">x' + L[k][3] + '</i>' : ''}</div><div><b>${esc(x.pt)}</b>${x.g ? '<em> · não usada</em>' : ''}<small>${esc(m)}</small></div></div>`;
        })
        .join('')
    );
  }).join('');
}
async function cardList(i) {
  const my = ++CT;
  drawCards(i, null, 'Carregando detalhes das cartas…');
  const c = await getDeck(DECKS[i][0]);
  if (my !== CT || !$('#cl')) return;
  if (!c)
    drawCards(
      i,
      null,
      'Sem internet. Abra este deck uma vez com conexão para guardar os detalhes no celular.'
    );
  else drawCards(i, c);
}
async function cardDet(k) {
  if (!CUR) return;
  const x = CUR.c[k],
    d = x.d;
  if (!d) return;
  const i = CUR.i,
    q = (CARDS[DECKS[i][0]][k] || [])[3] || 1;
  const big = await KV.get('img:' + d.id),
    src = big || d.im,
    at = A_PT[d.a],
    isM = cat(d) !== 'M' && cat(d) !== 'A';
  const rows = isM
    ? `<tr><td class="ck">Atributo</td><td>${atr(at)}${at}</td></tr><tr><td class="ck">${/XYZ/.test(d.t) ? 'Graduação' : /Link/.test(d.t) ? 'Link' : 'Nível'}</td><td>${/Link/.test(d.t) ? d.lk : d.l}</td></tr><tr><td class="ck">ATK</td><td>${stat(d.k)}</td></tr><tr><td class="ck">DEF</td><td>${/Link/.test(d.t) ? '—' : stat(d.f)}</td></tr><tr><td class="ck">Tipo</td><td>${esc(ctype(d))}</td></tr>`
    : `<tr><td class="ck">Tipo</td><td>${esc(ctype(d))}</td></tr>`;
  modal(
    `<h2 style="font-size:1.1rem;letter-spacing:1px">${esc(x.pt)}</h2>${x.pt !== x.en ? `<div class="cnote" style="margin:-4px 0 8px">${esc(x.en)}</div>` : ''}<div class="cdv"><div class="bigw"><div class="big" style="background-image:url('${src}')"></div>${q > 1 ? '<i class="qt">x' + q + '</i>' : ''}</div><table class="ctb">${rows}</table></div><div class="ctx"><h4>Texto do Card</h4>${esc(x.pe || d.e).replace(/\n/g, '<br>')}${x.pe ? '' : '<div class="cnote">Texto em inglês (sem tradução na base).</div>'}</div><button class="btn" onclick="info(${i})">← Voltar ao deck</button>`
  );
  $('#box').scrollTop = 0;
  if (!big && d.im)
    toData(d.im).then(u => {
      if (u) KV.set('img:' + d.id, u);
    });
}
