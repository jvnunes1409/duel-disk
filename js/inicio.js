// Inicialização: mede a barra de navegação, desenha as telas, retoma o duelo salvo e registra o service worker.
// Altura real da barra de baixo (muda com a barra de gestos do Android e o tamanho da fonte do sistema).
// A tela do duelo e a moldura da vez usam essa medida para nunca ficarem por baixo da barra.
(() => {
  const nv = document.querySelector('nav');
  if (!nv) return;
  const f = () =>
    document.documentElement.style.setProperty('--navh', Math.ceil(nv.getBoundingClientRect().height) + 'px');
  f();
  try {
    new ResizeObserver(f).observe(nv, { box: 'border-box' });
  } catch (e) {}
  addEventListener('resize', f);
  addEventListener('load', f);
  addEventListener('orientationchange', () => setTimeout(f, 300));
  if (window.visualViewport) visualViewport.addEventListener('resize', f);
  [300, 1000, 3000].forEach(ms => setTimeout(f, ms));
})();
vMicBtn();
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
