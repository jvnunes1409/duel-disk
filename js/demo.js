// Modo demonstração (link com ?demo): abre o app com o histórico real dos nossos duelos, só na memória.
// Nada é lido nem gravado no armazenamento de quem está visitando, então a demonstração nunca mistura
// com dados de verdade. Este arquivo precisa ser o PRIMEIRO script carregado.
const DEMO = new URLSearchParams(location.search).has('demo');
// Resumo do que tem na demonstração (null = ainda não há dados de demonstração publicados)
const DEMO_RESUMO = { duelos: 14, desde: 1793141524651 };
// Preenchido quando js/dados/demo-dados.js carrega
let DEMO_INFO = null;

if (DEMO) {
  // Armazenamento falso, só na memória desta aba
  const mem = {};
  const falso = {
    getItem: k => (k in mem ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    },
    removeItem: k => {
      delete mem[k];
    },
    clear: () => Object.keys(mem).forEach(k => delete mem[k]),
    key: i => Object.keys(mem)[i] ?? null,
    get length() {
      return Object.keys(mem).length;
    },
  };
  try {
    Object.defineProperty(window, 'localStorage', { value: falso, configurable: true });
  } catch (e) {}
  // Os dados da demonstração entram antes de qualquer outro script ler o armazenamento
  document.write('<script src="js/dados/demo-dados.js"><\/script>');
}

// Chamado por js/dados/demo-dados.js com o conteúdo de um backup do app
function demoCarregar(b) {
  const n = (b.hist || []).length;
  DEMO_INFO = { duelos: n, desde: n ? Math.min(...b.hist.map(h => h.t)) : null };
  if (!DEMO) return;
  const put = (k, v) => v != null && localStorage.setItem(k, JSON.stringify(v));
  put('ygo_hist3', b.hist);
  put('ygo_torneio', b.torneio);
  put('ygo_camp', b.camp);
  put('ygo_tarq', b.tarq);
  put('ygo_tiers', b.tiers);
  put('ygo_custom', b.custom);
  put('ygo_part', b.part);
  // Visitante não vê a tela de VS a cada sorteio e começa com o fundo animado leve
  put('ygo_cfg', { ...(b.cfg || {}), vs: 0 });
}
