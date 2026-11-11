// Sons do app, narrador e liberação do áudio no primeiro toque.
// ===== Sons: gerados em arquivos WAV e tocados por <audio> (funciona no celular) =====
const TAU = Math.PI * 2,
  sn = (f, t) => Math.sin(TAU * f * t),
  sq = (f, t) => (sn(f, t) > 0 ? 1 : -1),
  ch = (a, b, D, t) => Math.sin(TAU * (a * t + ((b - a) * t * t) / (2 * D))),
  nz = () => Math.random() * 2 - 1,
  ex = (t, k) => Math.exp(-t * k);
function wav(fn, dur, sr = 22050) {
  const n = (sr * dur) | 0,
    b = new ArrayBuffer(44 + n * 2),
    v = new DataView(b),
    w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  w(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, fn(i / sr))) * 32767, true);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}
const SFX = {};
let mute = false;
function reg(n, fn, d, k = 3) {
  const u = wav(fn, d);
  SFX[n] = {
    i: 0,
    a: Array.from({ length: k }, () => {
      const a = new Audio(u);
      a.preload = 'auto';
      return a;
    }),
  };
}
function play(n, rate) {
  if (mute) return;
  const s = SFX[n];
  if (!s) return;
  const a = s.a[s.i++ % s.a.length];
  try {
    a.currentTime = 0;
    if (rate) {
      a.preservesPitch = false;
      a.webkitPreservesPitch = false;
      a.playbackRate = rate;
    } else a.playbackRate = 1;
    a.play().catch(() => {});
  } catch (e) {}
}
reg('click', t => 0.3 * sn(800, t) * ex(t, 60), 0.07);
reg('tickU', t => 0.3 * sq(2000, t) * ex(t, 80), 0.05, 6);
reg('tickD', t => 0.3 * sq(1200, t) * ex(t, 80), 0.05, 6);
reg('hit', t => 0.6 * ch(260, 40, 0.5, t) * ex(t, 5) + 0.35 * nz() * ex(t, 35), 0.55);
reg(
  'heal',
  t =>
    [523, 659, 784, 1047].reduce(
      (a, f, i) => (t > i * 0.09 ? a + 0.25 * sn(f, t) * ex(t - i * 0.09, 7) : a),
      0
    ),
  0.6
);
reg(
  'coin',
  t => 0.25 * (sn(2600, t) + 0.6 * sn(3900, t) + 0.35 * sn(5400, t)) * ex(t, 4) * (1 + 0.3 * sn(14, t)),
  1.1,
  2
);
reg(
  'dice',
  t =>
    [0, 0.06, 0.13, 0.22, 0.34, 0.5, 0.7].reduce((a, c) => (t > c ? a + 0.5 * nz() * ex(t - c, 70) : a), 0),
  0.9,
  2
);
reg('sweep', t => 0.2 * ch(200, 1400, 0.7, t) * (t < 0.6 ? 1 : ex(t - 0.6, 30)), 0.7, 2);
reg(
  'win',
  t =>
    [523, 659, 784, 1047, 784, 1047, 1319].reduce(
      (a, f, i) => (t > i * 0.12 ? a + 0.2 * (sn(f, t) + 0.4 * sn(2 * f, t)) * ex(t - i * 0.12, 3) : a),
      0
    ),
  1.4,
  2
);
reg('boom', t => 0.75 * ch(130, 28, 0.9, t) * ex(t, 3.5) + 0.45 * nz() * ex(t, 10), 1, 2);
reg(
  'rise',
  t => 0.16 * ch(140, 1100, 0.95, t) * Math.min(1, t * 3) * (t < 0.9 ? 1 : ex(t - 0.9, 40)) + 0.07 * nz() * t,
  0.95,
  2
);
reg('lpt', t => 0.22 * (sn(1500, t) + 0.5 * sn(3000, t)) * ex(t, 70), 0.06, 8);
reg('lpend', t => [1319, 1976, 2637].reduce((a, f, i) => a + 0.14 * sn(f, t) * ex(t, 5 + i * 2), 0), 0.8, 2);
reg(
  'clash',
  t =>
    0.45 * nz() * ex(t, 16) +
    0.25 * sn(1760, t) * ex(t, 7) +
    0.2 * sn(2350, t) * ex(t, 9) +
    0.3 * ch(300, 90, 0.6, t) * ex(t, 6),
  0.7,
  2
);

// ===== Narrador e áudios próprios =====
let CFG = { voz: 1, vs: 1, vic: 'all', wake: 1, tnag: 1, tfr: 1 };
try {
  Object.assign(CFG, JSON.parse(localStorage.getItem('ygo_cfg') || '{}'));
} catch (e) {}
const saveCfg = () => {
  try {
    localStorage.setItem('ygo_cfg', JSON.stringify(CFG));
  } catch (e) {}
};
const MOM = {
    start: ['Início do duelo', 'É hora do duelo!'],
    dmg: ['Dano nos LP', 'efeito sonoro'],
    lps: ['LP aparecendo no início', 'efeito sonoro'],
    win: ['Vitória', '“[nome] vence o duelo!”'],
    champ: ['Campeão do torneio', '“[deck] é o campeão do torneio!”'],
  },
  CSND = {},
  DEF = { start: 'sons/inicio.mp3', dmg: 'sons/dano.mp3', lps: 'sons/lps.mp3' };
let VOZ = null;
function pickVoz() {
  try {
    const v = speechSynthesis.getVoices();
    VOZ = v.find(x => /^pt[-_]BR/i.test(x.lang)) || v.find(x => /^pt/i.test(x.lang)) || null;
  } catch (e) {}
}
try {
  pickVoz();
  speechSynthesis.onvoiceschanged = pickVoz;
} catch (e) {}
function say(t) {
  if (mute || !CFG.voz || !window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'pt-BR';
    if (VOZ) u.voice = VOZ;
    u.rate = 1.02;
    u.pitch = 0.8;
    speechSynthesis.speak(u);
  } catch (e) {}
}
let CA = null;
const MA = {};
const mEl = (k, u) => {
  const a = MA[k] || (MA[k] = new Audio());
  if (a.dataset.u !== u) {
    a.dataset.u = u;
    a.src = u;
  }
  return a;
};
function moment(k, txt) {
  if (mute) return null;
  const u = CSND[k] || DEF[k];
  if (u) {
    try {
      if (CA && CA !== MA[k]) CA.pause();
      const a = (CA = mEl(k, u));
      a.onended = a.onerror = null;
      try {
        a.currentTime = 0;
      } catch (e) {}
      a.play().catch(() => a.dispatchEvent(new Event('error')));
      return a;
    } catch (e) {}
  } else say(txt);
  return null;
}
// Celulares só liberam o som depois de um toque: no primeiro toque 'destravamos' todos os áudios do app (mudos e por um instante).
let UNL = false;
function unlock() {
  if (UNL) return;
  UNL = true;
  try {
    dmgInit();
    const u = CSND.lps || DEF.lps;
    if (u && LA.dataset.u !== u) {
      LA.dataset.u = u;
      LA.src = u;
    }
    const L = [LA, DA[0], DA[1]];
    Object.keys(DEF).forEach(k => {
      if (k !== 'dmg' && k !== 'lps') L.push(mEl(k, CSND[k] || DEF[k]));
    });
    L.forEach(a => {
      a.muted = true;
      const q = a.play();
      if (q && q.then)
        q.then(() => {
          a.pause();
          try {
            a.currentTime = 0;
          } catch (e) {}
          a.muted = false;
        }).catch(() => {
          a.muted = false;
        });
      else a.muted = false;
    });
  } catch (e) {}
}
['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
  addEventListener(ev, unlock, { once: false, passive: true })
);
let un = false;
addEventListener(
  'pointerdown',
  () => {
    if (un) return;
    un = true;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch (e) {}
    Object.values(SFX).forEach(s =>
      s.a.forEach(a => {
        a.muted = true;
        a.play()
          .then(() => {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
          })
          .catch(() => {
            a.muted = false;
          });
      })
    );
  },
  { passive: true }
);
$('#bMute').onclick = e => {
  mute = !mute;
  e.currentTarget.textContent = mute ? '🔇' : '🔊';
  if (mute) {
    try {
      speechSynthesis.cancel();
      if (CA) CA.pause();
    } catch (x) {}
  }
  play('click');
};
