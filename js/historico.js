// Histórico de duelos.
// ===== Histórico =====
let hist = [];
try {
  hist = JSON.parse(localStorage.getItem('ygo_hist3') || '[]');
} catch (e) {}
function save() {
  try {
    localStorage.setItem('ygo_hist3', JSON.stringify(hist));
  } catch (e) {}
  KV.set('hist', JSON.stringify(hist));
  autoBk();
}
function mergeH(a) {
  let n = 0;
  const ts = new Set(hist.map(x => x.t));
  a.forEach(x => {
    if (
      x &&
      typeof x.t === 'number' &&
      (x.w === 0 || x.w === 1) &&
      Array.isArray(x.lp) &&
      Array.isArray(x.log) &&
      !ts.has(x.t)
    ) {
      hist.push(x);
      ts.add(x.t);
      n++;
    }
  });
  hist.sort((p, q) => q.t - p.t);
  if (n) {
    save();
    rH();
  }
  return n;
}
KV.get('hist').then(s => {
  try {
    if (s) mergeH(limpaTudo(JSON.parse(s)));
  } catch (e) {}
});
function backupTxt(lite) {
  return JSON.stringify({
    app: 'ygo-duelos',
    v: 3,
    t: Date.now(),
    hist,
    torneio: T,
    camp: CAMP,
    tarq: TARQ,
    cfg: CFG,
    tiers: TO,
    sort: SRT,
    used: USED,
    snd: lite ? {} : CSND,
    custom: CUS,
  });
}
function pad2(n) {
  return String(n).padStart(2, '0');
}
function stamp(t) {
  const d = new Date(t || Date.now());
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function txtReport() {
  const L = [],
    w = [0, 0],
    dt = t => new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    bar = '='.repeat(38),
    sep = '-'.repeat(38);
  hist.forEach(x => w[x.w]++);
  L.push(bar, 'DUEL DISK - HISTÓRICO DE DUELOS', bar, 'Exportado em ' + dt(Date.now()), '');
  L.push(
    'PLACAR GERAL: Douglas ' +
      w[0] +
      ' x ' +
      w[1] +
      ' João  (' +
      hist.length +
      ' duelo' +
      (hist.length === 1 ? '' : 's') +
      ')'
  );
  if (CAMP.length) {
    L.push('', 'CAMPEÕES DE TORNEIO', sep);
    CAMP.forEach(c =>
      L.push(
        '* ' +
          dt(c.t) +
          ' - Campeão: ' +
          c.c +
          (c.p != null ? ' (' + NOMES[c.p] + ')' : '') +
          (c.v ? ' - Vice: ' + c.v : '') +
          (c.s ? ' - Placar: ' + c.s[0] + ' x ' + c.s[1] : '') +
          (c.fmt === 'liga' ? ' [liga]' : '')
      )
    );
  }
  L.push('', '');
  hist.forEach((h, k) => {
    const n = hist.length - k,
      st = [0, 1].map(p => {
        const l = (h.log || []).filter(e => e.p === p);
        return {
          dmg: -l.filter(e => e.d < 0).reduce((a, e) => a + e.d, 0),
          heal: l.filter(e => e.d > 0).reduce((a, e) => a + e.d, 0),
        };
      });
    L.push(sep, 'DUELO #' + n + ' - ' + dt(h.t), sep, 'Douglas x João');
    if (h.decks) L.push('Decks: ' + h.decks[0] + ' (Douglas)  vs  ' + h.decks[1] + ' (João)');
    else L.push('Decks: não sorteados');
    if (h.tl) L.push('Torneio: ' + h.tl);
    L.push(
      'Vencedor: ' + NOMES[h.w],
      'Duração: ' + fmt(h.dur),
      'LP final: Douglas ' + h.lp[0] + ' x ' + h.lp[1] + ' João'
    );
    if (h.tn > 1) L.push('Turnos: ' + h.tn);
    if (h.first != null) L.push('Começou: ' + NOMES[h.first]);
    if (h.sr) L.push('Melhor de 3 - duelo ' + h.srg);
    if (h.mvp) L.push('Carta MVP: ' + h.mvp.n);
    L.push(
      'Dano sofrido: Douglas ' + st[0].dmg + ' / João ' + st[1].dmg,
      'Cura: Douglas ' + st[0].heal + ' / João ' + st[1].heal
    );
    if ((h.log || []).length) {
      L.push('', 'Histórico de dano:');
      h.log.forEach(e =>
        L.push(
          '  ' +
            fmt(e.t) +
            (e.tn ? ' T' + e.tn : '') +
            ' | ' +
            NOMES[e.p] +
            ' ' +
            (e.d < 0 ? '-' : '+') +
            Math.abs(e.d) +
            ' -> ' +
            e.lp
        )
      );
    }
    L.push('', '');
  });
  if (!hist.length) L.push('Nenhum duelo registrado ainda.');
  return L.join('\r\n');
}
let OUT = null;
function outM(title, name, mime, text, prev) {
  OUT = { name, mime, text };
  modal(
    `<h2>${title}</h2><textarea class="outx" readonly id="outx">${esc(prev || text)}</textarea><div class="row" style="margin-top:10px"><button class="btn" style="padding:12px;font-size:.8rem" onclick="outShare()">📤 Compartilhar</button><button class="btn" style="padding:12px;font-size:.8rem" onclick="outCopy()">📋 Copiar</button></div><button class="btn" onclick="outDl()">⬇ Baixar arquivo</button><button ${BTN2} onclick="fechar()">Fechar</button>`
  );
}
async function outShare() {
  const o = OUT;
  if (!o) return;
  try {
    const f = new File(['﻿' + o.text], o.name, { type: o.mime });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f], title: o.name });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  try {
    if (navigator.share && o.text.length < 60000) {
      await navigator.share({ title: o.name, text: o.text });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  outCopy();
}
async function outCopy() {
  const o = OUT;
  if (!o) return;
  try {
    await navigator.clipboard.writeText(o.text);
    toast('Copiado! Cole onde quiser.');
    return;
  } catch (e) {}
  try {
    const t = document.createElement('textarea');
    t.value = o.text;
    t.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.appendChild(t);
    t.focus();
    t.select();
    t.setSelectionRange(0, t.value.length);
    const ok = document.execCommand('copy');
    t.remove();
    if (ok) {
      toast('Copiado! Cole onde quiser.');
      return;
    }
  } catch (e) {}
  toast('Não consegui copiar. Use Baixar arquivo.');
}
function outDl() {
  const o = OUT;
  if (!o) return;
  try {
    const b = new Blob(['﻿' + o.text], { type: o.mime + ';charset=utf-8' }),
      a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = o.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Arquivo gerado - veja em Downloads');
  } catch (e) {
    toast('Não deu para baixar. Use Copiar.');
  }
}
function exportTxt() {
  outM('HISTÓRICO EM TEXTO', 'historico-duel-disk-' + stamp() + '.txt', 'text/plain', txtReport());
}
function exportH() {
  const s = backupTxt();
  try {
    localStorage.setItem('ygo_lastexp', Date.now());
    localStorage.removeItem('ygo_snooze');
  } catch (e) {}
  bkBan();
  outM(
    'BACKUP',
    'backup-duel-disk-' + stamp() + '.json',
    'application/json',
    s,
    'Backup pronto (' +
      Math.round(s.length / 1024) +
      ' KB).\nToque em Compartilhar ou Baixar arquivo e guarde onde quiser. Para restaurar, use Importar.'
  );
}
$('#bExp').onclick = exportH;
$('#bTxt').onclick = exportTxt;
$('#fImp').onchange = async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  importText(await f.text());
};
async function importText(txt) {
  try {
    const j = limpaTudo(JSON.parse(txt));
    await snapNow('Antes de importar um arquivo');
    let rl = false;
    const n = mergeH(Array.isArray(j) ? j : j.hist || []);
    let ex = '';
    if (Array.isArray(j.custom)) {
      let k = 0;
      j.custom.forEach(c => {
        if (c && c.n && !BASENAMES.includes(c.n) && !CUS.some(x => x.n === c.n)) {
          CUS.push(c);
          k++;
        }
      });
      if (k) {
        saveCus();
        rl = true;
        ex += '\n' + k + ' deck(s) cadastrado(s) adicionado(s); o app vai recarregar.';
      }
    }
    if (Array.isArray(j.tarq)) {
      const ts = new Set(TARQ.map(c => c.t)),
        na = j.tarq.filter(c => c && c.t && c.M && !ts.has(c.t));
      if (na.length) {
        TARQ = TARQ.concat(na).sort((a, b) => b.t - a.t);
        saveTarq();
        ex += '\n' + na.length + ' liga(s)/torneio(s) antigo(s) adicionado(s).';
      }
    }
    if (j.camp && Array.isArray(j.camp)) {
      const ts = new Set(CAMP.map(c => c.t));
      const nc = j.camp.filter(c => c && c.t && !ts.has(c.t));
      if (nc.length) {
        CAMP = CAMP.concat(nc).sort((a, b) => b.t - a.t);
        saveCamp();
        ex += '\n' + nc.length + ' campeão(ões) adicionado(s).';
      }
    }
    if (
      j.torneio &&
      j.torneio.M &&
      JSON.stringify(j.torneio) !== JSON.stringify(T) &&
      (!T || confirm('O arquivo tem um torneio salvo. Substituir o torneio atual por ele?'))
    ) {
      T = j.torneio;
      saveT();
      ex += '\nTorneio carregado.';
    }
    const ns = j.snd ? Object.keys(j.snd).filter(k => MOM[k] && typeof j.snd[k] === 'string').length : 0;
    if (
      (j.cfg || j.tiers || ns) &&
      confirm(
        `O backup também tem configurações e tiers${ns ? ` e ${ns} áudio(s) próprio(s)` : ''}. Restaurar isso também?`
      )
    ) {
      if (j.cfg) (Object.assign(CFG, j.cfg), saveCfg());
      if (j.tiers) {
        TO = j.tiers;
        DECKS.forEach((d, i) => (d[1] = TO[d[0]] || BT[i]));
        try {
          localStorage.setItem('ygo_tiers', JSON.stringify(TO));
        } catch (e) {}
        KV.set('tiers', JSON.stringify(TO));
        rLista();
      }
      if (j.sort) Object.assign(SRT, j.sort);
      if (Array.isArray(j.used)) USED = j.used;
      saveSort();
      rSort();
      if (ns)
        Object.keys(j.snd).forEach(k => {
          if (MOM[k] && typeof j.snd[k] === 'string') {
            CSND[k] = j.snd[k];
            KV.set('snd:' + k, j.snd[k]);
          }
        });
      ex += '\nConfigurações, tiers e áudios restaurados.';
    }
    rT();
    rS();
    alert((n ? n + ' duelo(s) adicionado(s).' : 'Nenhum duelo novo (já estavam aqui).') + ex);
    if (rl) location.reload();
  } catch (x) {
    alert('Arquivo inválido.');
  }
}
