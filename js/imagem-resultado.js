// Imagem do resultado para compartilhar.
// ===== Imagem do resultado (para compartilhar) =====
const CH = ['#3dff7a', '#4aa3ff'];
const loadImg = s =>
  new Promise(ok => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = s;
  });
async function deckImg(nm) {
  const i = DI(nm);
  if (i < 0) return null;
  const q = DECKS[i][7];
  let u = LD[q] || (await KV.get('art:' + q)) || DECKS[i][8] || IMG[q];
  if (!u) {
    try {
      const j = await (
          await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=' + encodeURIComponent(q))
        ).json(),
        c = j.data.find(x => x.name.toLowerCase() === q.toLowerCase()) || j.data[0];
      u = c.card_images[0].image_url_cropped;
    } catch (e) {
      return null;
    }
  }
  if (!u.startsWith('data:')) {
    const d = await toData(u);
    if (!d) return null;
    KV.set('art:' + q, d);
    u = d;
  }
  return loadImg(u);
}
function atrImg(a) {
  try {
    const s = atr(a)
      .match(/<svg[\s\S]*<\/svg>/)[0]
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" ');
    return loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
  } catch (e) {
    return Promise.resolve(null);
  }
}
function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function fitTxt(c, t, w, px, min, font) {
  while (px > min) {
    c.font = `${font.replace('#', px)}`;
    if (c.measureText(t).width <= w) break;
    px -= 2;
  }
  c.font = font.replace('#', px);
  return px;
}
const IMP = '900 #px Impact,"Arial Black",sans-serif',
  SAN = '800 #px system-ui,Arial,sans-serif';
async function resultImg(h) {
  const W = 1080,
    H = 1350,
    cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  const dk = h.decks || [null, null],
    ix = dk.map(n => (n ? DI(n) : -1)),
    [im0, im1] = await Promise.all(dk.map(n => (n ? deckImg(n) : null))),
    [ia0, ia1] = await Promise.all(ix.map(i => (i >= 0 ? atrImg(DECKS[i][2]) : null))),
    IMGS = [im0, im1],
    ATI = [ia0, ia1];
  // fundo
  let g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b2a9a');
  g.addColorStop(0.45, '#08186a');
  g.addColorStop(1, '#030a2a');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  g = c.createRadialGradient(W / 2, 260, 40, W / 2, 260, 700);
  g.addColorStop(0, 'rgba(80,140,255,.45)');
  g.addColorStop(1, 'rgba(80,140,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(130,190,255,.12)';
  c.lineWidth = 2;
  for (let x = -W; x < W * 2; x += 90) {
    c.beginPath();
    c.moveTo(W / 2 + (x - W / 2) * 0.2, 820);
    c.lineTo(x, H);
    c.stroke();
  }
  for (let y = 840, k = 1; y < H; y += k * 14, k += 0.35) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  // cabeçalho
  c.fillStyle = '#f2c14e';
  c.shadowColor = '#f2c14e88';
  c.shadowBlur = 24;
  c.font = IMP.replace('#', 64);
  c.fillText('⚡ DUEL DISK ⚡', W / 2, 86);
  c.shadowBlur = 0;
  const sub = [
    new Date(h.t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    h.tl ? 'Torneio · ' + h.tl : h.sr ? 'Melhor de 3 · duelo ' + h.srg : '',
  ]
    .filter(Boolean)
    .join('  ·  ');
  c.fillStyle = '#8fb0d8';
  c.font = SAN.replace('#', 30);
  c.fillText(sub, W / 2, 132);
  // vencedor
  const w = h.w,
    wn = NOMES[w].toUpperCase();
  c.fillStyle = CH[w];
  c.shadowColor = CH[w];
  c.shadowBlur = 30;
  c.font = IMP.replace('#', 78);
  c.fillText(`VITÓRIA ${w ? 'DO' : 'DO'} ${wn}`, W / 2, 238);
  c.shadowBlur = 0;
  // cartas dos decks
  const cw = 470,
    ch = 610,
    cy = 290,
    xs = [50, 560];
  for (let p = 0; p < 2; p++) {
    const x = xs[p],
      win = p === w;
    c.save();
    c.globalAlpha = win ? 1 : 0.82;
    rrect(c, x, cy, cw, ch, 28);
    c.fillStyle = '#0a1740';
    c.fill();
    c.lineWidth = win ? 10 : 5;
    c.strokeStyle = win ? '#f2c14e' : CH[p];
    c.shadowColor = win ? '#f2c14e' : CH[p];
    c.shadowBlur = win ? 36 : 14;
    c.stroke();
    c.shadowBlur = 0;
    const ax = x + 22,
      ay = cy + 22,
      as = cw - 44;
    c.save();
    rrect(c, ax, ay, as, as, 18);
    c.clip();
    const col = ix[p] >= 0 ? ATTR[DECKS[ix[p]][2]] || '#556' : '#445';
    g = c.createLinearGradient(ax, ay, ax + as, ay + as);
    g.addColorStop(0, col);
    g.addColorStop(1, '#050b20');
    c.fillStyle = g;
    c.fillRect(ax, ay, as, as);
    const im = IMGS[p];
    if (im) {
      const s = Math.max(as / im.width, as / im.height),
        dw = im.width * s,
        dh = im.height * s;
      c.drawImage(im, ax + (as - dw) / 2, ay + (as - dh) / 2, dw, dh);
    } else {
      c.font = '200px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      c.fillStyle = '#fff';
      c.textBaseline = 'middle';
      c.fillText(ix[p] >= 0 ? DECKS[ix[p]][3] : '🃏', ax + as / 2, ay + as / 2 + 10);
      c.textBaseline = 'alphabetic';
    }
    c.restore();
    rrect(c, ax, ay, as, as, 18);
    c.lineWidth = 4;
    c.strokeStyle = '#cfe7ff';
    c.stroke();
    c.fillStyle = CH[p];
    c.font = IMP.replace('#', 34);
    c.fillText(NOMES[p].toUpperCase(), x + cw / 2, cy + as + 70);
    const nm = dk[p] || 'Deck não sorteado';
    c.fillStyle = '#fff';
    fitTxt(c, nm, cw - 40, 40, 24, SAN);
    c.fillText(nm, x + cw / 2, cy + as + 110);
    if (ix[p] >= 0) {
      const t = DECKS[ix[p]][1],
        tc = ['', '#ff5a6e', '#ffc83d', '#5fd39a', '#4fb8ff', '#9aa6c4'][t];
      rrect(c, ax + 14, ay + as - 54, 120, 38, 19);
      c.fillStyle = tc;
      c.fill();
      c.fillStyle = '#111';
      c.font = IMP.replace('#', 24);
      c.fillText('TIER ' + t, ax + 74, ay + as - 26);
    }
    const lpv = h.lp[p],
      ls = 'LP FINAL',
      vs = String(lpv);
    c.font = SAN.replace('#', 24);
    const w1 = c.measureText(ls).width;
    c.font = IMP.replace('#', 46);
    const w2 = c.measureText(vs).width,
      sx = x + cw / 2 - (w1 + 16 + w2) / 2;
    c.textAlign = 'left';
    c.fillStyle = '#8fb0d8';
    c.font = SAN.replace('#', 24);
    c.fillText(ls, sx, cy + ch - 20);
    c.fillStyle = lpv > 0 ? '#fff' : '#ff6b6b';
    c.font = IMP.replace('#', 46);
    c.fillText(vs, sx + w1 + 16, cy + ch - 20);
    c.textAlign = 'center';
    if (win) {
      rrect(c, x + cw / 2 - 125, cy - 24, 250, 48, 24);
      c.fillStyle = '#f2c14e';
      c.fill();
      c.fillStyle = '#2a1a00';
      c.font = IMP.replace('#', 28);
      c.fillText('VENCEDOR', x + cw / 2, cy + 10);
    }
    c.restore();
  }
  c.beginPath();
  c.arc(W / 2, cy + 250, 48, 0, 7);
  c.fillStyle = '#0a1740';
  c.fill();
  c.lineWidth = 5;
  c.strokeStyle = '#f2c14e';
  c.stroke();
  c.fillStyle = '#f2c14e';
  c.font = IMP.replace('#', 44);
  c.fillText('VS', W / 2, cy + 266);
  // estatísticas
  let big = null;
  h.log.forEach(e => {
    if (e.d < 0 && (!big || -e.d > -big.d)) big = e;
  });
  const tot = hist.reduce(
    (a, x) => {
      a[x.w]++;
      return a;
    },
    [0, 0]
  );
  const T = [['DURAÇÃO', fmt(h.dur), '#fff']];
  if (h.tn > 1) T.push(['TURNOS', String(h.tn), '#fff']);
  if (h.first != null) T.push(['QUEM COMEÇOU', NOMES[h.first], '#fff']);
  if (big) T.push(['MAIOR DANO EM UMA BP', String(-big.d), '#f2c14e', 'tirado por ' + NOMES[1 - big.p]]);
  T.push(['PLACAR GERAL', `${tot[0]} × ${tot[1]}`, '#f2c14e', 'Douglas × João']);
  const tw = 316,
    th = 138,
    gx = 16,
    x0 = (W - (3 * tw + 2 * gx)) / 2;
  T.forEach(([lb, val, col, sb], k) => {
    const rw = Math.floor(k / 3),
      inRow = Math.min(3, T.length - rw * 3),
      xo = (W - (inRow * tw + (inRow - 1) * gx)) / 2,
      x = xo + (k % 3) * (tw + gx),
      y = 940 + rw * (th + gx);
    rrect(c, x, y, tw, th, 20);
    c.fillStyle = 'rgba(10,23,64,.9)';
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = '#2c58b8';
    c.stroke();
    const L = lb.split('\n'),
      two = L.length > 1;
    c.fillStyle = '#8fb0d8';
    c.font = SAN.replace('#', two ? 19 : 22);
    L.forEach((t, j) => c.fillText(t, x + tw / 2, y + (two ? 30 : 36) + j * 23));
    c.fillStyle = col;
    fitTxt(c, val, tw - 24, two ? 54 : 58, 30, IMP);
    c.fillText(val, x + tw / 2, y + (two ? 102 : 92));
    if (sb) {
      c.fillStyle = '#8fb0d8';
      c.font = SAN.replace('#', two ? 19 : 20);
      c.fillText(sb, x + tw / 2, y + (two ? 128 : 122));
    }
  });
  if (h.mvp) {
    const y = 1236;
    rrect(c, x0, y, 3 * tw + 2 * gx, 66, 20);
    c.fillStyle = 'rgba(60,40,0,.85)';
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = '#f2c14e';
    c.stroke();
    c.fillStyle = '#f2c14e';
    const t = '⭐ MVP: ' + h.mvp.n;
    fitTxt(c, t, 3 * tw + 2 * gx - 40, 32, 20, SAN);
    c.fillText(t, W / 2, y + 43);
  }
  c.fillStyle = '#5d7aa8';
  c.font = SAN.replace('#', 24);
  c.fillText('Duel Disk · Douglas × João', W / 2, 1326);
  return new Promise(ok => cv.toBlob(ok, 'image/png'));
}
let SHR = null;
async function shareRes(t) {
  const h = hist.find(x => x.t === t);
  if (!h) return;
  modal('<h2>📷 IMAGEM DO RESULTADO</h2><p class="cnote">Gerando…</p>');
  try {
    const b = await resultImg(h);
    if (!b) throw 0;
    if (SHR) URL.revokeObjectURL(SHR.u);
    SHR = { b, u: URL.createObjectURL(b), n: 'duelo-' + stamp() + '.png' };
    const can =
      navigator.canShare && navigator.canShare({ files: [new File([b], SHR.n, { type: 'image/png' })] });
    modal(
      `<h2>📷 IMAGEM DO RESULTADO</h2><img src="${SHR.u}" alt="Resultado do duelo" style="width:100%;border-radius:12px;border:2px solid var(--gd);margin-bottom:6px;-webkit-user-select:auto;user-select:auto">${can ? '<button class="btn" onclick="shareSend()">📤 Compartilhar</button>' : ''}<button class="btn" onclick="shareDl()">⬇ Baixar imagem</button><button class="btn sec" onclick="fechar()">Fechar</button>`
    );
  } catch (e) {
    modal(
      '<h2>📷 IMAGEM DO RESULTADO</h2><p class="cnote">Não consegui gerar a imagem.</p><button class="btn sec" onclick="fechar()">Fechar</button>'
    );
  }
}
async function shareSend() {
  if (!SHR) return;
  try {
    await navigator.share({ files: [new File([SHR.b], SHR.n, { type: 'image/png' })], title: 'Duel Disk' });
  } catch (e) {}
}
function shareDl() {
  if (!SHR) return;
  const a = document.createElement('a');
  a.href = SHR.u;
  a.download = SHR.n;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
