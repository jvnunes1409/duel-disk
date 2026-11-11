// Inicialização: mede a barra de navegação, desenha as telas, retoma o duelo salvo e registra o service worker.
(() => {
  const nv = document.querySelector('nav');
  if (!nv) return;
  const f = () =>
    document.documentElement.style.setProperty(
      '--navh',
      Math.ceil(innerHeight - nv.getBoundingClientRect().top) + 'px'
    );
  f();
  try {
    new ResizeObserver(f).observe(nv);
  } catch (e) {}
  addEventListener('resize', f);
})();
vMicBtn();
if (CFG.vf) addEventListener('pointerdown', () => vFone(1), { once: true }); // ===== Duelo em andamento salvo no aparelho =====
rFiltro();
rLista();
rSort();
rH();
rT();
newDuel();
dRestore();
draw();
wake(true);
loadArt().then(() => {
  window.ART_READY = 1;
  if (PERF.bg && !BGL) {
    BGL = true;
    loadBg();
  }
});
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
