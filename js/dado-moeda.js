// Dado e moeda.
// ===== Dado e moeda =====
const PIPS = [0, [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]],
  ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
const face = n =>
  `<div class="f f${n}">${[...Array(9)].map((_, k) => `<u class="${PIPS[n].includes(k) ? 'p' : ''}"></u>`).join('')}</div>`;
let sp = 0,
  cr = 0,
  bt = false;
function toss() {
  const t = $('#tw');
  t.classList.remove('toss');
  void t.offsetWidth;
  t.classList.add('toss');
}
function dado() {
  modal(
    `<h2>DADO</h2><div class="st"><div id="tw"><div class="cube" id="cube">${[1, 2, 3, 4, 5, 6].map(face).join('')}</div></div></div><div class="res" id="rs">&nbsp;</div><button class="btn" onclick="rolar()">Rolar de novo</button><button class="btn" style="border-color:#2c58b8;color:var(--mut)" onclick="fechar()">Fechar</button>`
  );
  setTimeout(rolar, 150);
}
function rolar() {
  if (bt) return;
  bt = true;
  const n = (1 + Math.random() * 6) | 0,
    [x, y] = ROT[n];
  sp++;
  $('#cube').style.transform = `rotateX(${x + 720 * sp}deg) rotateY(${y + 720 * sp}deg)`;
  $('#rs').innerHTML = '&nbsp;';
  toss();
  play('dice');
  setTimeout(() => {
    const r = $('#rs');
    if (r) r.textContent = n;
    bt = false;
  }, 1450);
}
function moeda() {
  modal(
    `<h2>MOEDA</h2><div class="st"><div id="tw"><div class="coin" id="coin"><div><svg viewBox="0 0 100 100" fill="none" stroke="#5a3d00" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 50Q50 12 94 50Q50 88 6 50Z"/><circle cx="50" cy="50" r="14" fill="#5a3d00"/><circle cx="50" cy="50" r="5" fill="#ffe9a0" stroke="none"/><path d="M20 30Q50 8 80 30"/><path d="M54 66Q58 82 74 82Q90 82 90 68"/></svg></div><div class="bk"><svg viewBox="0 0 100 100" fill="none" stroke="#5a3d00" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 24H88L50 90Z"/><circle cx="50" cy="13" r="7"/><path d="M33 44Q50 32 67 44Q50 56 33 44Z"/><circle cx="50" cy="44" r="5" fill="#5a3d00"/><path d="M38 28H62"/></svg></div></div></div></div><div class="res" id="rs">&nbsp;</div><button class="btn" onclick="girar()">Girar de novo</button><button class="btn" style="border-color:#2c58b8;color:var(--mut)" onclick="fechar()">Fechar</button>`
  );
  setTimeout(girar, 150);
}
function girar() {
  if (bt) return;
  bt = true;
  const k = Math.random() < 0.5;
  cr = Math.ceil(cr / 360) * 360 + 1800 + (k ? 180 : 0);
  $('#coin').style.transform = `rotateY(${cr}deg)`;
  $('#rs').innerHTML = '&nbsp;';
  toss();
  play('coin');
  setTimeout(() => {
    const r = $('#rs');
    if (r) r.textContent = k ? 'COROA' : 'CARA';
    play('coin');
    bt = false;
  }, 1450);
}
