// Artes dos decks (YGOPRODeck), guardadas no navegador.
// ===== Artes dos decks (YGOPRODeck, guardadas no navegador) =====
const KV = {
  db: null,
  open() {
    return new Promise(ok => {
      try {
        const q = indexedDB.open(DEMO ? 'ygo-demo' : 'ygo', 1);
        q.onupgradeneeded = () => q.result.createObjectStore('kv');
        q.onsuccess = () => ok(q.result);
        q.onerror = () => ok(null);
      } catch (e) {
        ok(null);
      }
    });
  },
  async get(k) {
    this.db = this.db || (await this.open());
    if (!this.db) return;
    return new Promise(ok => {
      try {
        const q = this.db.transaction('kv').objectStore('kv').get(k);
        q.onsuccess = () => ok(q.result);
        q.onerror = () => ok();
      } catch (e) {
        ok();
      }
    });
  },
  async set(k, v) {
    this.db = this.db || (await this.open());
    if (!this.db) return;
    return new Promise(ok => {
      try {
        const t = this.db.transaction('kv', 'readwrite');
        t.objectStore('kv').put(v, k);
        t.oncomplete = () => ok(1);
        t.onerror = () => ok();
      } catch (e) {
        ok();
      }
    });
  },
};
try {
  navigator.storage && navigator.storage.persist && navigator.storage.persist();
} catch (e) {}
let IMG = {},
  LD = {};
try {
  IMG = JSON.parse(localStorage.getItem('ygo_img') || '{}');
} catch (e) {}
function setImg(i, u) {
  document.querySelectorAll(`.art[data-i="${i}"]`).forEach(e => {
    e.style.backgroundImage = `url('${u}')`;
    const s = e.querySelector('span');
    if (s) s.remove();
  });
}
function pre(i, u) {
  const m = new Image();
  m.onload = () => {
    LD[DECKS[i][7]] = u;
    setImg(i, u);
  };
  m.src = u;
}
async function toData0(u) {
  try {
    const r = await fetch(u);
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise((ok, no) => {
      const f = new FileReader();
      f.onload = () => ok(f.result);
      f.onerror = no;
      f.readAsDataURL(b);
    });
  } catch (e) {
    return null;
  }
}
async function toData(u) {
  let d = await toData0(u);
  if (!d && /^https?:/.test(u))
    d = await toData0('https://wsrv.nl/?url=' + encodeURIComponent(u.replace(/^https?:\/\//, '')) + '&w=600');
  return d;
}
async function loadArt(from = 0, to = DECKS.length - 1) {
  for (let i = from; i <= to; i++) {
    const q = DECKS[i][7];
    if (DECKS[i][8]) {
      pre(i, DECKS[i][8]);
      continue;
    }
    const d = await KV.get('art:' + q);
    if (d) {
      pre(i, d);
      continue;
    }
    let u = IMG[q];
    if (!u) {
      try {
        const j = await (
            await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=' + encodeURIComponent(q))
          ).json(),
          c = j.data.find(x => x.name.toLowerCase() === q.toLowerCase()) || j.data[0];
        u = c.card_images[0].image_url_cropped;
        IMG[q] = u;
        try {
          localStorage.setItem('ygo_img', JSON.stringify(IMG));
        } catch (e) {}
      } catch (e) {
        continue;
      }
    }
    const dd = await toData(u);
    if (dd) {
      KV.set('art:' + q, dd);
      pre(i, dd);
    } else pre(i, u);
    await new Promise(r => setTimeout(r, 120));
  }
}
function art(i, c = '', x = '') {
  const d = DECKS[i];
  if (!d) return `<div class="art ${c}"><span>👤</span>${x}</div>`;
  const u = LD[d[7]];
  return `<div class="art ${c}" data-i="${i}" style="--c:${ATTR[d[2]]};${u ? `background-image:url('${u}')` : ''}">${u ? '' : `<span>${d[3]}</span>`}${x}</div>`;
}
