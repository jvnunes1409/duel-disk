// Navegação entre abas, modal e avisos.
// ===== Navegação e modal =====
function goTab(t) {
  document.body.dataset.t = t;
  setTimeout(tfrUpd, 0);
  sbar(t === 'sorteio' && !!document.querySelector('#resultado .pop'));
  document.querySelectorAll('nav button,section').forEach(e => e.classList.remove('on'));
  $('#' + t).classList.add('on');
  document.querySelector(`nav [data-t=${t}]`).classList.add('on');
  wake(t === 'duelo');
  if (t === 'duelo') setTimeout(duelStart, 60);
}
document.querySelectorAll('nav button').forEach(
  b =>
    (b.onclick = () => {
      if (b.dataset.t === 'torneio') {
        TV = null;
        rT();
      }
      if (b.dataset.t === 'stats') rS();
      goTab(b.dataset.t);
      play('click');
    })
);
function modal(h) {
  $('#box').innerHTML = h;
  $('#modal').classList.add('on');
}
function fechar() {
  $('#modal').classList.remove('on');
}
$('#modal').onclick = e => {
  if (e.target.id === 'modal') fechar();
};
function info(i) {
  const d = DECKS[i];
  modal(`<h2>${d[0]}</h2><span class="tier t${d[1]}">TIER ${d[1]}</span>
 <div class="tset">${[1, 2, 3, 4, 5].map(t => `<button class="${d[1] === t ? 'on t' + t : ''}" onclick="setTier(${i},${t});info(${i})" aria-label="Mudar para tier ${t}">T${t}</button>`).join('')}</div>
 <div class="cnote" style="text-align:center">${d[1] !== BT[i] ? `Ajustado no app (original: Tier ${BT[i]}) · <a onclick="setTier(${i},${BT[i]});info(${i})">restaurar</a>` : 'Toque num tier para mudar a classificação deste deck'}</div>${art(i)}<div class="inf"><p><b>Estratégia</b><br>${d[4]}</p><p><b>✅ Pontos fortes</b><br>${d[5]}</p><p><b>⚠️ Pontos fracos</b><br>${d[6]}</p></div><div class="clh">CARTAS DO DECK <span id="clN"></span></div><div id="cl"></div>${i >= BASEN ? `<button class="btn" onclick="deckForm(${i})">✏️ Editar este deck</button>` : ''}<button class="btn" onclick="fechar()">Fechar</button>`);
  $('#box').scrollTop = 0;
  cardList(i);
}
