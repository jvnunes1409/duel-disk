// Backup automático e por arquivo.
// ===== Backup automático =====
let BK = [],
  bkT = null;
document.getElementById('bkd') && document.getElementById('bkd').addEventListener('toggle', () => bkList());
async function bkLoad() {
  try {
    const r = await KV.get('autobk');
    BK = r ? JSON.parse(r) : [];
  } catch (e) {
    BK = [];
  }
}
async function bkSave() {
  await KV.set('autobk', JSON.stringify(BK));
}
const dayK = t => new Date(t).toLocaleDateString('sv');
async function snapNow(why) {
  await bkLoad();
  if (!hist.length && !CAMP.length && !T) return;
  BK.unshift({ t: Date.now(), why, n: hist.length, s: backupTxt(true) });
  BK = BK.slice(0, 12);
  await bkSave();
}
function autoBk() {
  clearTimeout(bkT);
  bkT = setTimeout(async () => {
    await bkLoad();
    if (!hist.length) return;
    const d = dayK(Date.now()),
      i = BK.findIndex(b => !b.why && dayK(b.t) === d),
      e = { t: Date.now(), why: '', n: hist.length, s: backupTxt(true) };
    if (i >= 0) BK[i] = e;
    else BK.unshift(e);
    const au = BK.filter(b => !b.why).slice(0, 7),
      sp = BK.filter(b => b.why).slice(0, 5);
    BK = au.concat(sp).sort((a, b) => b.t - a.t);
    await bkSave();
    bkList();
  }, 1500);
}
async function bkList() {
  await bkLoad();
  const el = $('#bkl');
  if (!el) return;
  el.innerHTML =
    '<p>O app guarda sozinho uma cópia por dia (últimos 7 dias) e uma antes de limpar ou importar. Elas ficam só neste celular, dentro do app: protegem contra apagão sem querer ou erro, mas <b>não</b> se você limpar os dados do navegador ou desinstalar. Para isso, use o botão Backup e guarde o arquivo.</p>' +
    (BK.length
      ? BK.map(
          (b, i) =>
            `<div class="bki"><span><b>${new Date(b.t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</b><small>${b.why || 'Cópia automática'} · ${b.n} duelo${b.n === 1 ? '' : 's'}</small></span><button class="btn" onclick="bkRestore(${i})">Restaurar</button></div>`
        ).join('')
      : '<p><em>Nenhuma cópia ainda. A primeira aparece depois do próximo duelo.</em></p>');
}
async function bkRestore(i) {
  const b = BK[i];
  if (!b) return;
  if (
    !confirm(
      'Restaurar a cópia de ' +
        new Date(b.t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) +
        ' (' +
        b.n +
        ' duelos)?\nO histórico atual será substituído (e uma cópia dele fica guardada).'
    )
  )
    return;
  try {
    const j = limpaTudo(JSON.parse(b.s));
    await snapNow('Antes de restaurar uma cópia');
    hist = Array.isArray(j.hist) ? j.hist : [];
    save();
    if (j.camp) {
      CAMP = j.camp;
      saveCamp();
    }
    if (Array.isArray(j.tarq)) {
      TARQ = j.tarq;
      saveTarq();
    }
    if (j.torneio !== undefined) {
      T = j.torneio;
      saveT();
    }
    rH();
    rT && rT();
    rS && rS();
    bkList();
    toast('Cópia restaurada');
  } catch (e) {
    toast('Cópia danificada');
  }
}
function bkBan() {
  const el = $('#bkban');
  if (!el) return;
  let h = '';
  try {
    const le = +localStorage.getItem('ygo_lastexp') || 0,
      sn = +localStorage.getItem('ygo_snooze') || 0,
      now = Date.now();
    if (hist.length >= 3 && now - le > 7 * 864e5 && now > sn)
      h = `<div class="card bkb"><b>💾 Hora de guardar um backup</b><small>${le ? 'Seu último arquivo de backup foi há ' + Math.floor((now - le) / 864e5) + ' dias.' : 'Você ainda não gerou nenhum arquivo de backup.'} Guarde o arquivo no Drive ou mande no WhatsApp para você mesmo.</small><div class="row"><button class="btn" onclick="exportH()">Fazer backup agora</button><button class="btn" onclick="try{localStorage.setItem('ygo_snooze',Date.now()+2*864e5)}catch(e){}bkBan()">Depois</button></div></div>`;
  } catch (e) {}
  el.innerHTML = h;
}
