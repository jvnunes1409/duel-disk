// Tela do duelo: LP, turnos, teclado, tela sempre ligada, fim do duelo e resultado.
// ===== Duelo =====
let lp,
  sh = [8000, 8000],
  duel,
  over = false,
  amt = '',
  run = false,
  fr = 0,
  RES = null,
  LH = null;
$('#players').innerHTML = [0, 1]
  .map(
    p =>
      `<div class="pl" id="P${p}" style="--c:${COR[p]}"><div class="g" id="g${p}">${GC.map(c => `<i style="background:${c}"></i>`).join('')}</div><div class="gold"><div class="lcd" id="v${p}">8000</div></div><div class="ptw" id="pt${p}"></div></div>`
  )
  .join('');
$('#pad').innerHTML =
  [
    ['+', 'g1', 0, 1],
    ['−', 'g1', 0, -1],
    ['+', 'b1', 1, 1],
    ['−', 'b1', 1, -1],
  ]
    .map(([t, c, p, s]) => `<button class="k ${c}" onclick="apply(${p},${s})">${t}</button>`)
    .join('') +
  [100, 500, 1000, 2000].map(v => `<button class="k sm" onclick="setAmt('${v}')">${v}</button>`).join('') +
  `<button class="k sm hf0" onclick="half(0)" aria-label="Douglas perde metade dos LP">½ LP</button><button class="k sm ud" style="grid-column:span 2" onclick="undoLP()">↶ Desfazer</button><button class="k sm hf1" onclick="half(1)" aria-label="João perde metade dos LP">½ LP</button>` +
  ['7', '8', '9', 'C', '4', '5', '6', '⌫', '1', '2', '3', '00']
    .map(k => `<button class="k" onclick="key('${k}')">${k}</button>`)
    .join('') +
  `<button class="k" style="grid-column:span 2" onclick="key('0')">0</button><button class="k" style="grid-column:span 2" onclick="key('000')">000</button>`;
function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove('on'), 1900);
}
function calc() {
  $('#amt').textContent = amt || '0';
}
function setAmt(v) {
  amt = v;
  calc();
  play('click');
}
function key(k) {
  amt = k === 'C' ? '' : k === '⌫' ? amt.slice(0, -1) : (amt + k).replace(/^0+/, '').slice(0, 6);
  calc();
  play('click');
}
function draw() {
  for (let p = 0; p < 2; p++) {
    $('#v' + p).textContent = sh[p];
    const n = Math.ceil(Math.min(1, sh[p] / 8000) * 8);
    $('#g' + p)
      .querySelectorAll('i')
      .forEach((e, k) => e.classList.toggle('off', 8 - k > n));
  }
}
function ports() {
  [0, 1].forEach(p => {
    const i = duel.decks ? duel.decks[p] : null;
    $('#pt' + p).onclick = () => {
      if (!duel.log.length && !over) escolher();
    };
    $('#pt' + p).innerHTML = art(
      i,
      '',
      `<b>${NOMES[p].toUpperCase()}${i != null ? `<small>${esc(DECKS[i][0])}</small>` : ''}</b>`
    );
  });
}
const mkSr = () => ({ id: Date.now(), g: [0, 0] });
function newDuel(decks, tm, sr) {
  duel = {
    t0: decks ? Date.now() : 0,
    decks: decks || null,
    log: [],
    tm: (decks && tm) || null,
    sr: (decks && sr) || null,
    first: null,
    tn: 1,
  };
  tnReset();
  lp = [8000, 8000];
  over = false;
  amt = '';
  $('#players').classList.remove('lpin');
  $('#players').classList.toggle('lphide', !!decks);
  calc();
  ports();
  if (decks) oraPrever();
  VZ.cand = null;
  VZ.pp = null;
  if (decks && micOn()) vPrep();
  tBan();
  rTurn();
  go();
}
// ---- Turnos e quem começa
const turnOf = () => (duel.first == null ? null : duel.tn % 2 ? duel.first : 1 - duel.first);
function rTurn() {
  const b = $('#trb');
  if (!b) return;
  const p = turnOf(),
    c = p == null ? '' : COR[p];
  b.classList.toggle('nag', !!NAG);
  b.innerHTML = NAG
    ? `<b style="color:#ffd35a">⏭ TOQUE PARA PASSAR</b><small style="color:${c}">TURNO ${duel.tn} · VEZ DE ${NOMES[p].toUpperCase()} ▸</small>`
    : `<b>TURNO ${duel.tn}</b><small style="color:${p == null ? 'var(--mut)' : c}">${p == null ? 'QUEM COMEÇA? ▸' : 'VEZ DE ' + NOMES[p].toUpperCase() + ' ▸'}</small>`;
  if (c) b.style.setProperty('border-color', c, 'important');
  else b.style.removeProperty('border-color');
  tfrUpd();
}
// ---- Moldura da cor do turno, aviso na troca e lembrete para passar o turno
// Lembrete: aparece 2 minutos depois do início do turno. Cada "Ainda não" adia mais
// (2, 3 e depois 4 minutos), para dar tempo de ler os efeitos das cartas sem o celular tocar toda hora.
const NAG_ESPERA = 120000,
  NAG_ADIA = [120000, 180000, 240000],
  NAG_REPETE = 60000;
let NAG = 0,
  NAGT = 0,
  TNL = 0,
  LPL = 0,
  NAGW = NAG_ESPERA,
  NAGS = 0;
function tfrUpd() {
  const f = $('#tfr');
  if (!f) return;
  const p = duel && !over && duel.first != null ? turnOf() : null,
    on = CFG.tfr && p != null && document.body.dataset.t === 'duelo';
  f.classList.toggle('on', !!on);
  f.classList.toggle('nag', !!(on && NAG));
  if (on) f.style.setProperty('--tc', COR[p]);
  const b = $('#trb');
  if (b && p != null) b.style.setProperty('--tc', COR[p]);
}
function tnReset() {
  TNL = Date.now();
  LPL = 0;
  NAG = 0;
  NAGT = 0;
  NAGW = NAG_ESPERA;
  NAGS = 0;
  const t = $('#tnp');
  if (t) t.classList.remove('on');
}
function tnFx() {
  const t = $('#tbn'),
    p = turnOf();
  if (!t || p == null) return;
  t.style.color = COR[p];
  t.innerHTML = `TURNO ${duel.tn}<small>VEZ DE ${NOMES[p].toUpperCase()}</small>`;
  t.classList.remove('on');
  void t.offsetWidth;
  t.classList.add('on');
  try {
    navigator.vibrate && navigator.vibrate(60);
  } catch (e) {}
}
function nagBuzz() {
  try {
    navigator.vibrate && navigator.vibrate([220, 110, 220, 110, 320]);
  } catch (e) {}
  try {
    play('lpend');
  } catch (e) {}
}
function nagUI() {
  const t = $('#tnp'),
    p = turnOf();
  if (!t) return;
  if (!NAG || p == null || over) {
    t.classList.remove('on');
    return;
  }
  t.style.setProperty('--tc', COR[p]);
  t.innerHTML = `<b>⏭ JÁ PASSOU O TURNO?</b><div class="row"><button onclick="turn(1)">PASSAR · VEZ DE ${NOMES[1 - p].toUpperCase()}</button><button class="no" onclick="nagSnooze()">AINDA NÃO</button></div>`;
  t.classList.add('on');
}
function nagSnooze() {
  NAG = 0;
  TNL = Date.now();
  LPL = 0;
  NAGW = NAG_ADIA[Math.min(NAGS, NAG_ADIA.length - 1)];
  NAGS++;
  toast(`⏳ Lembro de novo em ${NAGW / 60000} minutos`);
  rTurn();
  nagUI();
}
function nagOn() {
  NAG = 1;
  NAGT = Date.now();
  rTurn();
  nagUI();
  nagBuzz();
}
function nagCheck() {
  try {
    if (
      typeof duel === 'undefined' ||
      !duel ||
      over ||
      duel.first == null ||
      document.hidden ||
      document.body.dataset.t !== 'duelo'
    ) {
      tfrUpd();
      if (NAG && (over || document.body.dataset.t !== 'duelo')) $('#tnp').classList.remove('on');
      return;
    }
    if ($('#modal').classList.contains('on')) {
      tfrUpd();
      return;
    }
    const n = Date.now();
    if (CFG.tnag && !RV && !$('#fx').classList.contains('on')) {
      const due = n - TNL >= NAGW;
      if (due && !NAG) nagOn();
      else if (NAG && n - NAGT >= NAG_REPETE) {
        NAGT = n;
        nagBuzz();
      }
    }
    tfrUpd();
  } catch (e) {
    console.error('nag', e);
  }
}
setInterval(nagCheck, 1000);
['touchstart', 'pointerdown', 'visibilitychange'].forEach(ev =>
  document.addEventListener(ev, nagCheck, { passive: true })
);
function nagTest() {
  fechar();
  goTab('duelo');
  if (!duel || duel.first == null) {
    toast('Comece um duelo (escolha quem começa) para testar');
    return;
  }
  nagOn();
}
function turn(s) {
  if (over) return;
  if (duel.first == null) {
    quemComeca();
    return;
  }
  if (s < 0 && duel.tn === 1) return;
  duel.tn += s;
  if (!duel.t0) duel.t0 = Date.now();
  tnReset();
  rTurn();
  play(s > 0 ? 'tickU' : 'click');
  tnFx();
}
const COIN_H = `<div><svg viewBox="0 0 100 100" fill="none" stroke="#5a3d00" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 50Q50 12 94 50Q50 88 6 50Z"/><circle cx="50" cy="50" r="14" fill="#5a3d00"/><circle cx="50" cy="50" r="5" fill="#ffe9a0" stroke="none"/><path d="M20 30Q50 8 80 30"/><path d="M54 66Q58 82 74 82Q90 82 90 68"/></svg></div><div class="bk"><svg viewBox="0 0 100 100" fill="none" stroke="#5a3d00" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 24H88L50 90Z"/><circle cx="50" cy="13" r="7"/><path d="M33 44Q50 32 67 44Q50 56 33 44Z"/><circle cx="50" cy="44" r="5" fill="#5a3d00"/><path d="M38 28H62"/></svg></div>`;
function quemComeca() {
  if (over) return;
  const pv = duel.prevW;
  modal(`<h2>QUEM COMEÇA?</h2><div class="st" style="height:130px"><div id="tw"><div class="coin" id="coin">${COIN_H}</div></div></div><div class="res" id="rs">&nbsp;</div>
 <button class="btn" onclick="sortFirst()">🪙 Sortear na moeda</button><p class="cnote" style="margin:4px 0 8px">Cara = Douglas · Coroa = João</p>
 <div class="row"><button class="btn" style="border-color:var(--g);color:var(--g)" onclick="setFirst(0)">Douglas</button><button class="btn" style="border-color:var(--b);color:var(--b)" onclick="setFirst(1)">João</button></div>
 <button class="lnk" onclick="cancelDuel()">Cancelar duelo</button>${pv != null ? `<p class="cnote">Pela regra, quem perdeu o duelo anterior (${NOMES[1 - pv]}) escolhe quem começa.</p>` : ''}`);
}
function sortFirst() {
  if (bt) return;
  bt = true;
  const k = Math.random() < 0.5;
  cr = Math.ceil(cr / 360) * 360 + 1800 + (k ? 180 : 0);
  $('#coin').style.transform = `rotateY(${cr}deg)`;
  toss();
  play('coin');
  setTimeout(() => {
    const r = $('#rs');
    if (r) r.textContent = (k ? 'COROA' : 'CARA') + ' · ' + NOMES[k ? 1 : 0].toUpperCase() + ' COMEÇA';
    play('coin');
    bt = false;
    setTimeout(() => setFirst(k ? 1 : 0), 1000);
  }, 1450);
}
function setFirst(p) {
  if (over) return;
  duel.first = p;
  tnReset();
  rTurn();
  setTimeout(tnFx, 350);
  fechar();
  play('click');
  say(NOMES[p] + ' começa!');
}
// ---- LP
function apply(p, s) {
  if (over || RV) return;
  const v = parseInt(amt || '0', 10);
  if (!v) return;
  if (!duel.t0) duel.t0 = Date.now();
  const b = lp[p];
  lp[p] = Math.max(0, b + s * v);
  const d = lp[p] - b;
  if (!d) return;
  LPL = Date.now();
  duel.log.push({ t: Date.now() - duel.t0, p, d, lp: lp[p], tn: duel.tn });
  amt = '';
  calc();
  play(d < 0 ? (dmgU() ? '' : 'hit') : 'heal');
  const e = $('#P' + p),
    c = d < 0 ? 'hit' : 'heal';
  e.classList.remove('hit', 'heal');
  void e.offsetWidth;
  e.classList.add(c);
  setTimeout(() => e.classList.remove(c), 450);
  go();
}
function half(p) {
  if (over) return;
  const v = Math.floor(lp[p] / 2);
  if (!v) return;
  amt = String(v);
  apply(p, -1);
}
function undoLP() {
  if (over || !duel.log.length) {
    toast(over ? 'O duelo já terminou' : 'Nada para desfazer');
    return;
  }
  const e = duel.log.pop();
  lp[e.p] = e.lp - e.d;
  play('tickU');
  go();
  toast(`Desfeito: ${NOMES[e.p]} ${e.d < 0 ? '−' : '+'}${Math.abs(e.d)}`);
}
// Dano: o áudio toca inteiro e a contagem dos LP dura o mesmo tempo. Dano grande = áudio na velocidade normal (~2,5 s);
// dano pequeno = áudio acelerado (sem mudar o tom) e contagem curta (~1 s).
const AN = [null, null],
  DA = [new Audio(), new Audio()];
let DT = 2.56,
  RV = null,
  RD = 700;
const RC = 2000,
  RP = 900;
// Os LP só aparecem depois do 'É hora do duelo!': os painéis entram pelos lados e os números sobem de 0 até 8000, no tempo do efeito sonoro.
const LA = new Audio();
LA.addEventListener('loadedmetadata', () => {
  if (isFinite(LA.duration) && LA.duration > 0.2) RD = LA.duration * 1000;
});
LA.addEventListener('error', () => {
  if (!mute) play('boom');
});
function lpsSnd() {
  const u = CSND.lps || DEF.lps;
  if (!u || (LA.dataset.u === u && 0)) return;
  if (LA.dataset.u !== u) {
    LA.dataset.u = u;
    LA.src = u;
  }
  if (mute) return;
  try {
    LA.pause();
    LA.currentTime = 0;
    LA.play().catch(() => {
      if (!mute) play('boom');
    });
  } catch (e) {}
}
function revealLP() {
  const el = $('#players');
  if (!el.classList.contains('lphide')) return Promise.resolve();
  return new Promise(ok => {
    sh[0] = sh[1] = 0;
    draw();
    el.classList.add('lpin');
    el.classList.remove('lphide');
    lpsSnd();
    RV = { t0: performance.now(), D: RC, ls: 0 };
    go();
    setTimeout(() => el.classList.remove('lpin'), 1000);
    setTimeout(ok, RC + RP);
  });
}
const dmgU = () => CSND.dmg || DEF.dmg,
  dmgRate = d => 1 + 1.4 * (1 - Math.min(1, d / 6000));
DA[0].addEventListener('loadedmetadata', () => {
  if (isFinite(DA[0].duration) && DA[0].duration > 0.2) DT = DA[0].duration;
});
function dmgInit() {
  const u = dmgU();
  DA.forEach(a => {
    if (a.dataset.u !== u) {
      a.dataset.u = u;
      a.preload = 'auto';
      a.src = u;
      try {
        a.preservesPitch = true;
        a.webkitPreservesPitch = true;
      } catch (e) {}
    }
  });
}
function dmgSnd(p, r) {
  if (mute || !dmgU()) return;
  dmgInit();
  const a = DA[p];
  try {
    a.pause();
    a.currentTime = 0;
    a.defaultPlaybackRate = r;
    a.playbackRate = r;
    a.play().catch(() => {});
  } catch (e) {}
}
function dmgTest() {
  const s = mute;
  mute = false;
  dmgSnd(0, dmgRate(3000));
  mute = s;
}
function loop() {
  const now = performance.now();
  let mv = false;
  dmgInit();
  if (RV) {
    const u = Math.min(1, (now - RV.t0) / RV.D),
      e = 1 - (1 - u) ** 1.5;
    for (let p = 0; p < 2; p++) sh[p] = u >= 1 ? lp[p] : Math.round(lp[p] * e);
    const st = Math.floor(sh[0] / 320);
    if (st > RV.ls) {
      RV.ls = st;
      play('lpt', 0.8 + 0.9 * u);
    }
    if (u >= 1) {
      RV = null;
      play('lpend');
    }
    draw();
    requestAnimationFrame(loop);
    return;
  }
  for (let p = 0; p < 2; p++) {
    const d = lp[p] - sh[p];
    if (!d) {
      AN[p] = null;
      continue;
    }
    mv = true;
    if (d < 0) {
      let a = AN[p];
      if (!a || a.to !== lp[p]) {
        const r = dmgRate(-d);
        a = AN[p] = { f: sh[p], to: lp[p], t0: now, D: (DT / r) * 1000 };
        dmgSnd(p, r);
      }
      const u = Math.min(1, (now - a.t0) / a.D);
      sh[p] = u >= 1 ? lp[p] : Math.round(a.f + (a.to - a.f) * u);
      if (u >= 1) AN[p] = null;
      if (!dmgU() && fr++ % 3 == 0) play('tickD');
    } else {
      AN[p] = null;
      const s = Math.max(10, Math.ceil(Math.abs(d) / 18));
      sh[p] = Math.abs(d) <= s ? lp[p] : sh[p] + Math.sign(d) * s;
      if (fr++ % 3 == 0) play('tickU');
    }
  }
  draw();
  if (mv) requestAnimationFrame(loop);
  else {
    run = false;
    for (let p = 0; p < 2; p++) if (lp[p] === 0 && !over) finish(1 - p);
  }
}
function go() {
  if (!run) {
    run = true;
    requestAnimationFrame(loop);
  }
}
// ---- Tela sempre ligada durante o duelo
let WL = null;
async function wake(on) {
  try {
    if (on && CFG.wake && !WL && navigator.wakeLock && document.visibilityState === 'visible') {
      WL = await navigator.wakeLock.request('screen');
      WL.addEventListener('release', () => {
        WL = null;
      });
    } else if (!on && WL) {
      const w = WL;
      WL = null;
      await w.release();
    }
  } catch (e) {
    WL = null;
  }
}
document.addEventListener('visibilitychange', () =>
  wake(document.visibilityState === 'visible' && $('#duelo').classList.contains('on'))
);
function menu() {
  modal(
    `<h2>MENU</h2><button class="btn" onclick="escolher()">📚 Escolher decks</button><button class="btn" onclick="endM()">🔄 Reiniciar / cancelar</button><button class="btn" onclick="cfgM()">⚙️ Sons e animações</button>${micOn() && duel.decks ? `<button class="btn" onclick="vLista()">🎙️ Jogadas faladas (${(duel.ev || []).length})</button>` : ''}<div class="mlb">Declarar vencedor</div><div class="row"><button class="btn" style="border-color:var(--g);color:var(--g);letter-spacing:1px;padding:15px 4px" onclick="fechar();finish(0)">🏆 Douglas</button><button class="btn" style="border-color:var(--b);color:var(--b);letter-spacing:1px;padding:15px 4px" onclick="fechar();finish(1)">🏆 João</button></div><button class="btn sec" onclick="sobre()">ℹ️ Sobre o DuelDisk</button><p class="cnote" style="margin:6px 0 0">Versão ${APPV} · ${DECKS.length} decks</p><button class="btn sec" onclick="fechar()">Fechar</button>`
  );
}
function sobre() {
  const R = hist.filter(h => h.ai && h.decks),
    ac = R.filter(h => oraFav(h.ai.p) === h.w).length;
  modal(`<h2>ℹ️ DUELDISK</h2><p style="text-align:left">Companheiro de mesa para duelos de Yu-Gi-Oh! com cartas físicas: sorteio justo de decks, contador de LP, torneio e histórico, com um <b>Oráculo de IA</b> que prevê cada duelo, registra jogadas por voz e explica o resultado depois.</p>
 <div class="clh" style="text-align:left">🔮 COMO A IA É USADA</div>
 <p style="text-align:left">• <b>Previsão</b> antes do primeiro dano, a partir das listas e efeitos das cartas e do histórico.<br>• <b>Avaliação honesta</b>: cada previsão é comparada com o resultado real e com métodos simples (Elo, tier, moeda).<br>• <b>Jogadas por voz</b> reconhecidas entre as cartas dos dois decks, sem IA externa.<br>• <b>Crônica e veredito</b> depois do duelo, sem inventar jogadas que não foram registradas.</p>
 ${R.length ? `<p class="cnote" style="text-align:left">Até agora: ${R.length} duelo${R.length > 1 ? 's' : ''} previstos, ${ac} acertos (${Math.round((ac / R.length) * 100)}%). Detalhes em Stats → Placar do Oráculo.</p>` : ''}
 <div class="clh" style="text-align:left">🧩 ARQUITETURA</div><p style="text-align:left">App em um único HTML (PWA) no GitHub Pages · Cloudflare Worker guarda a chave e os prompts · Google Gemini com saída em JSON estruturado · deploy automático a cada commit.</p>
 <a class="btn" href="https://github.com/jvnunes1409/duel-disk" target="_blank" rel="noopener" style="text-decoration:none;display:block">💻 Código no GitHub</a><button class="btn sec" onclick="menu()">← Voltar</button>`);
}
function endM() {
  modal(
    `<h2>ENCERRAR DUELO</h2><button class="btn" onclick="resetDuel()">🔄 Reiniciar<small>mesmos decks, LP volta a 8000</small></button><button class="btn red" onclick="cancelDuel(1)">✖ Cancelar<small>descarta o duelo, nada vai para o histórico</small></button><button class="btn sec" onclick="menu()">Voltar</button>`
  );
}
function resetDuel() {
  if (duel.log.length && !confirm('Reiniciar? Os lances deste duelo serão perdidos.')) return;
  fechar();
  newDuel(duel.decks, duel.tm, duel.sr);
  duelStart();
}
// ---- Escolher os decks manualmente (sem sorteio)
let PK = [null, null];
function escolher() {
  PK = duel.decks ? [...duel.decks] : [null, null];
  pickM();
}
function pickM() {
  const opt = p =>
    `<select id="pk${p}" onchange="PK[${p}]=this.value===''?null:+this.value;pickM()" style="width:100%;padding:11px;border-radius:10px;border:2px solid ${COR[p]};background:#0a1740;color:#fff;font-size:.95rem"><option value="">— escolher —</option>${[
      1, 2, 3, 4, 5,
    ]
      .map(
        t =>
          `<optgroup label="Tier ${t}">${[...DECKS.keys()]
            .filter(i => DECKS[i][1] === t)
            .sort((a, b) => DECKS[a][0].localeCompare(DECKS[b][0]))
            .map(i => `<option value="${i}"${PK[p] === i ? ' selected' : ''}>${esc(DECKS[i][0])}</option>`)
            .join('')}</optgroup>`
      )
      .join('')}</select>`;
  const ok = PK[0] != null && PK[1] != null,
    pv = p =>
      PK[p] != null
        ? `<div style="text-align:center;margin-top:6px">${art(PK[p])}<span class="tier t${DECKS[PK[p]][1]}">T${DECKS[PK[p]][1]}</span></div>`
        : '';
  modal(`<h2>ESCOLHER DECKS</h2><div class="mini" style="margin-bottom:8px;text-align:left">Para usar um deck novo sem sortear. Começa um duelo novo com os LP zerados em 8000.</div>
 <div class="row" style="gap:10px;align-items:flex-start"><div style="flex:1"><b style="color:var(--g)">DOUGLAS</b>${opt(0)}${pv(0)}</div><div style="flex:1"><b style="color:var(--b)">JOÃO</b>${opt(1)}${pv(1)}</div></div>
 <button class="btn" ${ok ? '' : 'disabled style="opacity:.4;margin-top:10px"'} ${ok ? 'style="margin-top:10px"' : ''} onclick="pickGo()">⚔️ Começar duelo</button><button class="btn" style="border-color:#2c58b8;color:var(--mut)" onclick="fechar()">Cancelar</button>`);
}
function pickGo() {
  if (PK[0] == null || PK[1] == null) return;
  const prog = duel && (duel.log.length || lp[0] !== 8000 || lp[1] !== 8000) && !over;
  if (prog && !confirm('Há um duelo em andamento. Descartar e começar com os decks escolhidos?')) return;
  fechar();
  useDecks(PK);
  newDuel([...PK], null, SRT.md3 ? mkSr() : null);
  duelStart();
  play('click');
}
// Cancela o duelo atual sem salvar nada no histórico e volta ao estado inicial (decks não escolhidos)
function cancelDuel(q) {
  if (!q && !confirm('Cancelar este duelo? Nada será salvo no histórico.')) return;
  if (
    q &&
    duel.log.length &&
    !confirm('Cancelar? Os lances deste duelo serão perdidos e nada vai para o histórico.')
  )
    return;
  if (CA) CA.pause();
  try {
    speechSynthesis.cancel();
  } catch (e) {}
  fechar();
  const f = $('#fx');
  if (f) {
    f.className = '';
    f.innerHTML = '';
  }
  newDuel(null);
  toast('Duelo cancelado');
  play('click');
}
function rematch() {
  fechar();
  const pw = LH ? LH.w : null;
  newDuel(duel.decks, null, duel.sr ? mkSr() : null);
  duel.prevW = pw;
  duelStart();
}
function nextSerie() {
  fechar();
  const sr = duel.sr,
    pw = LH ? LH.w : null;
  newDuel(duel.decks, null, sr);
  duel.prevW = pw;
  duelStart();
}
const BTN2 = 'class="btn" style="border-color:#2c58b8;color:var(--mut)"';
function finish(w) {
  if (over) return;
  over = true;
  const dur = duel.t0 ? Date.now() - duel.t0 : 0,
    ht = Date.now(),
    m = tmValid(),
    sr = !m && duel.sr,
    before = achv(hist);
  const h = {
    t: ht,
    w,
    dur,
    decks: duel.decks ? duel.decks.map(i => DECKS[i][0]) : null,
    lp: [...lp],
    log: duel.log,
    tn: duel.tn,
  };
  if (duel.first != null) h.first = duel.first;
  oraSave(h);
  if (m) {
    h.tid = m.id;
    h.tl = mlab(m);
  }
  if (sr) {
    sr.g[w]++;
    h.sr = sr.id;
    h.srg = sr.g[0] + sr.g[1];
  }
  hist.unshift(h);
  save();
  rH();
  LH = h;
  tBan();
  const nw = newAch(before, achv(hist)),
    di = duel.decks ? duel.decks[w] : null,
    dk = duel.decks ? dn(di) : '',
    W = `<h2>🏆 ${NOMES[w].toUpperCase()} VENCE!</h2><p>⏱ ${fmt(dur)}${h.tn > 1 ? ' · ' + h.tn + ' turnos' : ''}</p>`;
  let fin = false,
    fdi = di,
    fw = w,
    top,
    btns;
  if (m) {
    m.w = w;
    m.lp = [...lp];
    m.h = ht;
    saveT();
    TV = curSt();
    rT();
    const nx = nextM(),
      nxb = nx
        ? `<button class="btn" onclick="fechar();playM('${nx.id}')">⚔️ Próximo: ${mlab(nx)}</button>`
        : '';
    if (T.fmt === 'liga') {
      const st = ligaStand();
      if (!nx) {
        fin = true;
        fdi = st[0].i;
        fw = null;
        top = `<h2>🏆 FIM DA LIGA!</h2>${art(fdi)}<h3 style="margin:6px 0">${esc(st[0].n)}</h3><p style="color:var(--gd);font-weight:800">é o campeão da liga!</p>`;
        btns = `<button class="btn" onclick="fechar();goT('${m.id}')">🏟️ Ver tabela final</button>`;
      } else {
        const pos = st.findIndex(r => r.n === dk) + 1;
        top = W + `<p><b>${esc(dk)}</b> soma mais uma vitória e está em <b>${pos}º</b> na liga</p>`;
        btns = nxb + `<button ${BTN2} onclick="fechar();goT('${m.id}')">🏟️ Ver tabela</button>`;
      }
    } else if (m.st === 'f') {
      fin = true;
      top = `<h2>🏆 ${NOMES[w].toUpperCase()} VENCE A FINAL!</h2>${art(di)}<h3 style="margin:6px 0">${esc(dk)}</h3><p style="color:var(--gd);font-weight:800">é o campeão do torneio!</p><p>⏱ ${fmt(dur)}</p>`;
      btns = `<button class="btn" onclick="fechar();goT('f')">🏟️ Ver o campeão</button>`;
    } else {
      top =
        W + `<p><b>${esc(dk)}</b> avança${m.st === 'g' ? ' no Grupo ' + m.id[1] : ' ➜ ' + destTxt(m)}</p>`;
      btns = nxb + `<button ${BTN2} onclick="fechar();goT('${m.id}')">🏟️ Ver chave</button>`;
    }
  } else if (sr) {
    const sw = sr.g[0] === 2 ? 0 : sr.g[1] === 2 ? 1 : null;
    if (sw != null) {
      top = `<h2>🏆 ${NOMES[sw].toUpperCase()} VENCE A SÉRIE!</h2><div class="srs"><span style="color:var(--g)">Douglas ${sr.g[0]}</span> × <span style="color:var(--b)">${sr.g[1]} João</span></div><p>⏱ ${fmt(dur)}</p>`;
      btns = `<button class="btn" onclick="rematch()">🎯 Nova série (mesmos decks)</button><button ${BTN2} onclick="fechar();newDuel()">Novo duelo</button>`;
    } else {
      top = `<h2>🏆 ${NOMES[w].toUpperCase()} VENCE O DUELO ${h.srg}!</h2><div class="srs">🎯 <span style="color:var(--g)">Douglas ${sr.g[0]}</span> × <span style="color:var(--b)">${sr.g[1]} João</span></div><p>⏱ ${fmt(dur)}</p>`;
      btns = `<button class="btn" onclick="nextSerie()">⚔️ Duelo ${h.srg + 1} da série</button><button ${BTN2} onclick="fechar()">Fechar</button>`;
    }
  } else {
    top = W;
    btns = `<button class="btn" onclick="rematch()">Revanche (mesmos decks)</button><button ${BTN2} onclick="fechar();newDuel()">Novo duelo</button>`;
  }
  RES = { h, top, btns, nw };
  celebrate(fdi, fw, fin).then(showRes);
}
// Resultado: texto + conquistas novas + carta MVP + botões
function showRes() {
  if (!RES) return;
  const { h, top, btns, nw } = RES;
  const ach = nw.length
    ? `<div class="clh">🏅 CONQUISTA${nw.length > 1 ? 'S' : ''} DESBLOQUEADA${nw.length > 1 ? 'S' : ''}!</div><div class="achn">${nw.map(a => `<div class="ach on"><i>${ACH[a.id].e}</i><div><b>${ACH[a.id].n}</b><small>${NOMES[a.p]} · ${ACH[a.id].d}</small></div></div>`).join('')}</div>`
    : '';
  const mv = h.decks
    ? `<button class="mvpb" onclick="mvpPick(${h.t},1)">${h.mvp ? `⭐ MVP: <b>${esc(h.mvp.n)}</b><small>trocar</small>` : '⭐ Escolher a carta MVP do duelo'}</button>`
    : '';
  const sh = `<button class="mvpb" style="margin-top:6px" onclick="shareRes(${h.t})">📷 Compartilhar resultado (imagem)</button>`;
  modal(top + oraResBtn(h) + ach + mv + sh + btns);
  if (nw.length) setTimeout(() => play('heal'), 150);
}
