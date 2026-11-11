// Duelo em andamento salvo no aparelho (volta de onde parou se a aba recarregar).
// Se o Chrome recarregar a aba (celular com pouca memória, tela bloqueada, app trocado), o duelo volta de onde parou:
// decks, LP, turno, registro de dano, jogadas faladas e a previsão do Oráculo.
const DKEY = 'ygo_live';
function dSave() {
  try {
    if (duel && duel.decks && !over) {
      const d = { ...duel };
      if (d.ai && d.ai.st !== 'ok') delete d.ai;
      d.dn = duel.decks.map(i => DECKS[i][0]);
      localStorage.setItem(DKEY, JSON.stringify({ v: 1, at: Date.now(), duel: d, lp }));
    } else localStorage.removeItem(DKEY);
  } catch (e) {}
}
function dRestore() {
  let S = null;
  try {
    S = JSON.parse(localStorage.getItem(DKEY) || 'null');
  } catch (e) {}
  if (!S || !S.duel || !S.duel.decks || Date.now() - S.at > 12 * 3600e3) return false;
  if (S.duel.decks.some((i, k) => !DECKS[i] || DECKS[i][0] !== (S.duel.dn || [])[k])) return false;
  duel = S.duel;
  lp = S.lp;
  sh = [...lp];
  over = false;
  amt = '';
  tnReset();
  calc();
  ports();
  const pl = $('#players');
  pl.classList.remove('lpin');
  pl.classList.toggle('lphide', !duel.log.length);
  VZ.cand = null;
  VZ.pp = null;
  if (micOn()) vPrep();
  if (!duel.ai && !duel.log.length) oraPrever();
  tBan();
  rTurn();
  go();
  if (duel.log.length || (duel.ev || []).length)
    setTimeout(() => {
      goTab('duelo');
      toast('⏯️ Duelo retomado de onde parou');
    }, 300);
  return true;
}
setInterval(dSave, 2000);
addEventListener('pagehide', dSave);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) dSave();
});
