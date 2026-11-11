// Vitrine para quem visita: faixa do modo demonstração, boas-vindas na primeira visita,
// painel lateral no PC (o que é o projeto e como testar em 1 minuto) e atalhos de teclado no contador.

// ---- Faixa do modo demonstração
if (DEMO) {
  const f = document.createElement('div');
  f.id = 'demob';
  f.innerHTML = `<span>🎬 <b>Demonstração</b> · duelos reais · nada é salvo</span><a href="${location.pathname}">Sair</a>`;
  document.body.appendChild(f);
  document.body.classList.add('demo');
}

// ---- Boas-vindas na primeira visita (só quando o aparelho ainda não tem duelos)
function boasVindas() {
  modal(`<h2>🔮 DUELDISK</h2>
 <p style="text-align:left">Companheiro de mesa para duelos de Yu-Gi-Oh! com cartas físicas, com um <b>Oráculo de IA</b> que prevê cada duelo, ouve as jogadas faladas e explica o resultado no fim.</p>
 ${DEMO_RESUMO ? `<a class="btn" href="?demo" style="text-decoration:none;display:block">🎬 Ver a demonstração<small>${DEMO_RESUMO.duelos} duelos reais · nada fica salvo no seu navegador</small></a>` : ''}
 <button class="btn sec" onclick="fechar()">Começar do zero</button>`);
}
try {
  if (!DEMO && !hist.length && !localStorage.getItem('ygo_bemvindo')) {
    localStorage.setItem('ygo_bemvindo', '1');
    setTimeout(boasVindas, 700);
  }
} catch (e) {}

// ---- Painel lateral no PC
function painelPC() {
  const el = $('#pcp');
  if (!el) return;
  const R = typeof oraLinhas === 'function' ? oraLinhas(hist, 'tudo') : [],
    ac = R.filter(h => oraFav(h.p) === h.w).length;
  const passo = (n, t, d, js) =>
    `<li${js ? ` onclick="${js}" class="clk"` : ''}><b>${n}</b><span><strong>${t}</strong>${d}</span></li>`;
  el.innerHTML = `<div class="pcp-in">
 <h1>🔮 DuelDisk</h1>
 <p class="pcp-sub">Companheiro de mesa com IA para duelos de Yu-Gi-Oh! com cartas físicas. Feito para usar no celular, na mesa, entre um duelo e outro.</p>
 ${
   DEMO
     ? `<div class="pcp-box">🎬 <b>Você está na demonstração</b> com o histórico real de ${hist.length} duelos. Pode mexer à vontade: nada é salvo.</div>`
     : DEMO_RESUMO
       ? `<a class="pcp-cta" href="?demo">🎬 Abrir a demonstração com ${DEMO_RESUMO.duelos} duelos reais</a>`
       : ''
 }
 <h2>Teste em 1 minuto</h2>
 <ol class="pcp-passos">
  ${passo(1, 'Sorteie um duelo', 'Aba Sorteio → Sortear. No mesmo instante, o Oráculo começa a prever quem vence, lendo as listas e os efeitos das cartas.', "goTab('sorteio')")}
  ${passo(2, 'Veja a previsão', 'Na aba Duelo, toque na faixa 🔮 no topo: chance de cada lado, plano de jogo e cartas-chave.', "goTab('duelo')")}
  ${passo(3, 'Confira se a IA presta', 'Stats → 🔮 Oráculo: a IA comparada com o Elo, com a nossa lista de tiers e com cara ou coroa.', "goTab('stats');STAB='ora';rS();setTimeout(()=>document.querySelector('.pl-v')?.scrollIntoView({block:'center'}),100)")}
  ${passo(4, 'Peça um veredito', 'Histórico → 🔮 Oráculo em qualquer duelo → Pedir o veredito: deu a lógica ou foi zebra? Por quê?', "goTab('hist');HV='geral';rH()")}
  ${passo(5, 'Fale uma jogada', 'No duelo, 🎙️ e diga, por exemplo, "ativei Polimerização" (Chrome, com microfone).', "goTab('duelo')")}
 </ol>
 ${R.length ? `<div class="pcp-num"><div><b>${hist.length}</b><small>duelos no histórico</small></div><div><b>${R.length}</b><small>previsões da IA</small></div><div><b>${Math.round((ac / R.length) * 100)}%</b><small>de acerto</small></div></div>` : ''}
 <h2>Teclado do PC</h2>
 <p class="pcp-sub"><kbd>0</kbd>–<kbd>9</kbd> digitam o valor · <kbd>D</kbd> / <kbd>J</kbd> tiram do Douglas / João · <kbd>Shift</kbd>+<kbd>D</kbd> / <kbd>J</kbd> somam · <kbd>⌫</kbd> apaga · <kbd>Esc</kbd> limpa</p>
 <h2>Por dentro</h2>
 <p class="pcp-sub">App em HTML/JS puro (PWA) no GitHub Pages · IA via Cloudflare Worker + Google Gemini com saída em JSON estruturado · reconhecimento de cartas por voz com algoritmo próprio · 26 testes automáticos a cada mudança.</p>
 <div class="pcp-links"><a href="https://github.com/jvnunes1409/duel-disk" target="_blank" rel="noopener">💻 Código e README</a><a href="https://github.com/jvnunes1409/duel-disk/actions" target="_blank" rel="noopener">✅ Testes automáticos</a></div>
 <p class="pcp-sub" style="margin-top:14px">📱 No celular: <b>jvnunes1409.github.io/duel-disk</b></p>
 <p class="pcp-sub" style="margin-top:10px;font-size:.78rem;color:var(--mut)">© 2026 <a href="https://github.com/jvnunes1409" target="_blank" rel="noopener" style="color:inherit">jvnunes1409</a> · todos os direitos reservados · projeto de fãs, Yu-Gi-Oh! pertence à Konami</p>
 </div>`;
}
(() => {
  const p = document.createElement('aside');
  p.id = 'pcp';
  document.body.appendChild(p);
  painelPC();
  // atualiza os números quando o histórico muda
  const s0 = save;
  save = function () {
    s0.apply(this, arguments);
    painelPC();
  };
})();

// ---- Teclado no contador de LP (PC)
addEventListener('keydown', e => {
  if (document.body.dataset.t !== 'duelo' || $('#modal').classList.contains('on')) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  if (/^[0-9]$/.test(k)) key(k);
  else if (k === 'Backspace') key('⌫');
  else if (k === 'Escape' || k === 'Delete') key('C');
  else if (/^[dD]$/.test(k)) apply(0, e.shiftKey ? 1 : -1);
  else if (/^[jJ]$/.test(k)) apply(1, e.shiftKey ? 1 : -1);
  else return;
  e.preventDefault();
});
