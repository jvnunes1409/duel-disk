// Animações: tela de VS e vitória.
// ===== Animações: tela de VS e vitória =====
function fxOpen(html, ms, hook) {
  return new Promise(ok => {
    const f = $('#fx');
    f.className = 'on';
    f.innerHTML = html;
    let done = false;
    const t0 = Date.now();
    const end = () => {
      if (done) return;
      done = true;
      clearTimeout(tm);
      f.classList.add('out');
      setTimeout(() => {
        f.className = '';
        f.innerHTML = '';
        ok();
      }, 330);
    };
    const tm = setTimeout(end, ms);
    f.onclick = () => {
      if (Date.now() - t0 > 400) end();
    };
    if (hook) hook(end);
  });
}
const deckArt = di =>
  di != null && DECKS[di] ? art(di) : '<div class="art" style="--c:#556"><span>👤</span></div>';
function showVS() {
  const d = duel.decks;
  play('clash');
  const snd = !mute && (CSND.start || DEF.start);
  return fxOpen(
    `<div class="vsp">${[0, 1].map(p => `<div class="hf h${p}" style="--pc:${COR[p]}">${deckArt(d[p])}<div class="nm"><b>${NOMES[p].toUpperCase()}</b><small>${esc(dn(d[p]))}</small></div></div>`).join('')}<div class="vsx">VS</div><div class="cap">É HORA DO DUELO!</div></div>`,
    snd ? 14000 : 2700,
    end => {
      const t0 = Date.now(),
        fin = () => setTimeout(end, Math.max(0, 2700 - (Date.now() - t0)));
      setTimeout(() => {
        const a = moment('start', 'É hora do duelo!');
        if (a) {
          a.onended = end;
          a.onerror = () => {
            say('É hora do duelo!');
            fin();
          };
        } else fin();
      }, 380);
      if (snd) {
        const f = $('#fx'),
          old = f.onclick;
        f.onclick = () => {
          old();
          if (CA) CA.pause();
        };
      }
    }
  );
}
function duelStart() {
  if (duel.decks && (duel.log.length || over)) $('#players').classList.remove('lphide');
  if (!duel.decks || duel.ann || duel.log.length || over) return;
  duel.ann = 1;
  const ask0 = () => {
      if (duel.first == null && !over && $('#duelo').classList.contains('on')) quemComeca();
    },
    ask = () => revealLP().then(ask0);
  if (CFG.vs) showVS().then(ask);
  else {
    play('clash');
    const a = moment('start', 'É hora do duelo!');
    if (a) {
      a.onended = ask;
      a.onerror = ask;
    } else ask();
  }
}
// A carta sobe girando, vira mostrando a arte do deck vencedor e explode em luz. Na final do torneio: dourado, coroa e confete.
function victoryFX(di, w, fin) {
  const d = di != null ? DECKS[di] : null,
    vc = fin ? '#f2c14e' : d ? ATTR[d[2]] : '#f2c14e';
  const sp = [...Array(28)]
    .map(
      (_, k) =>
        `<i class="sp" style="--a:${((k * 360) / 28 + Math.random() * 8).toFixed(0)}deg;--ds:${(30 + Math.random() * 25).toFixed(0)}vmin;--dl:${(Math.random() * 0.12).toFixed(2)}s;--sc:${k % 3 ? vc : '#fff'}"></i>`
    )
    .join('');
  const cf = fin
    ? [...Array(46)]
        .map(
          () =>
            `<i class="cf" style="left:${(Math.random() * 100).toFixed(1)}%;--dx:${Math.round(Math.random() * 120 - 60)}px;--rt:${Math.round(Math.random() * 900)}deg;--du:${(2.4 + Math.random() * 2).toFixed(2)}s;--dl:${(1.1 + Math.random() * 2.5).toFixed(2)}s;--sc:${pick(['#f2c14e', '#3dff7a', '#4aa3ff', '#ff5a6e', '#fff', '#35e0ff'])}"></i>`
        )
        .join('')
    : '';
  play('rise');
  setTimeout(() => play('boom'), 950);
  setTimeout(() => {
    play('win');
    fin ? moment('champ', `${dn(di)} é o campeão do torneio!`) : moment('win', `${NOMES[w]} vence o duelo!`);
  }, 1300);
  return fxOpen(
    `<div class="vic shk" style="--vc:${vc};background:radial-gradient(circle at 50% 42%,${vc}55,#000000f0 62%)"><div class="rays"></div><i class="ring"></i><i class="ring r2"></i>${sp}
  <div class="stage"><div class="vc"><div class="vb"></div><div class="vf"><div class="nb">${esc(d ? d[0] : NOMES[w])}</div>${deckArt(di)}<div class="ft">${fin ? '★ CAMPEÃO ★' : 'VITÓRIA'}</div></div></div></div>
  ${fin ? '<div class="crn">👑</div>' : ''}<div class="ttl"><b>${fin ? 'CAMPEÃO!' : NOMES[w].toUpperCase() + ' VENCE!'}</b><small>${fin ? esc(dn(di)) + (w != null ? ' · ' + NOMES[w] : '') : d ? esc(d[0]) : ''}</small></div>${cf}<div class="tip">toque para continuar</div></div>`,
    fin ? 7500 : 4300
  );
}
function celebrate(di, w, fin) {
  if (CFG.vic === 'all' || (CFG.vic === 'final' && fin)) return victoryFX(di, w, fin);
  play('win');
  fin ? moment('champ', `${dn(di)} é o campeão do torneio!`) : moment('win', `${NOMES[w]} vence o duelo!`);
  return Promise.resolve();
}
function prevFX(fin) {
  const ok = [...DECKS.keys()].filter(i => LD[DECKS[i][7]]),
    i = pick(ok.length ? ok : [...DECKS.keys()]);
  victoryFX(i, Math.random() < 0.5 ? 0 : 1, fin);
}
function cfgM() {
  vMicBtn();
  const sp = (k, opts) =>
      `<div class="seg">${opts.map(([v, l]) => `<button class="${PERF[k] === v ? 'on' : ''}" onclick="PERF.${k}=${v};savePerf();applyPerf();cfgM();play('click')">${l}</button>`).join('')}</div>`,
    sg = (k, opts) =>
      `<div class="seg">${opts.map(([v, l]) => `<button class="${CFG[k] === v ? 'on' : ''}" onclick="CFG.${k}=${JSON.stringify(v).replace(/"/g, "'")};saveCfg();cfgM();wake($('#duelo').classList.contains('on'));play('click')">${l}</button>`).join('')}</div>`;
  modal(`<h2>SONS E ANIMAÇÕES</h2>
 <div class="opt"><b>🗣 Voz do narrador</b>${sg('voz', [
   [1, 'Ligada'],
   [0, 'Desligada'],
 ])}</div>
 <div class="opt"><b>⚡ Tela “É hora do duelo”</b>${sg('vs', [
   [1, 'Ligada'],
   [0, 'Desligada'],
 ])}</div>
 <div class="opt"><b>🏆 Animação de vitória</b>${sg('vic', [
   ['all', 'Todos'],
   ['final', 'Só finais'],
   ['off', 'Desligada'],
 ])}</div>
 <div class="opt"><b>🎨 Moldura na cor de quem joga</b>${sg('tfr', [
   [1, 'Ligada'],
   [0, 'Desligada'],
 ])}</div>
 <div class="opt"><b>🔔 Lembrete para passar o turno</b>${sg('tnag', [
   [1, 'Ligado'],
   [0, 'Desligado'],
 ])}<p class="cnote">Depois de 2 minutos no mesmo turno aparece uma caixa grande “Já passou o turno?” com o botão de passar, a borda pisca e o celular vibra. “Ainda não” adia: 2 minutos, depois 3, depois 4.</p><button class="btn" style="margin-top:6px" onclick="nagTest()">🔔 Testar lembrete agora</button></div>
 <div class="opt"><b>☀️ Manter a tela ligada no duelo</b>${sg('wake', [
   [1, 'Sim'],
   [0, 'Não'],
 ])}${navigator.wakeLock ? '' : '<p class="cnote">Este navegador não permite manter a tela ligada.</p>'}</div>
 <div class="clh">🔮 ORÁCULO (IA)</div>
 <div class="opt"><b>🎙️ Botão de jogadas por voz</b>${
   SRC
     ? sg('mic', [
         [1, 'Ligado'],
         [0, 'Desligado'],
       ])
     : '<p class="cnote">Este navegador não tem reconhecimento de voz (use o Chrome).</p>'
 }</div>
 <div class="opt"><b>Previsões e crônicas</b>${sg('oraOn', [
   [1, 'Ligado'],
   [0, 'Desligado'],
 ])}</div>
 <label class="dfl"><span>Endereço do Oráculo (Worker)</span><input id="oraU" value="${esc(CFG.ora || '')}" placeholder="https://oraculo.SEU-USUARIO.workers.dev" onchange="CFG.ora=this.value.trim();saveCfg();oraTeste()"></label><div id="oraM" class="cnote" style="text-align:left">${oraUrl() ? '' : 'Sem endereço: o app funciona normal, só sem IA.'}</div><button class="btn" style="padding:10px;font-size:.75rem" onclick="oraDiag()">🩺 Testar a IA agora</button>
 <div class="clh">🚀 DESEMPENHO <small style="font-size:.6rem;color:var(--mut);letter-spacing:0">só neste aparelho</small></div>
 <div class="opt"><b>⚡ Modo leve</b>${sp('lite', [
   [0, 'Desligado'],
   [1, 'Ligado'],
 ])}<p class="cnote" style="text-align:left">Tira o fundo animado (as cartas virando), os brilhos e as sombras. Ligue se o app estiver travando.</p></div>
 <div class="row" style="margin:6px 0 4px"><button class="btn" style="padding:11px;font-size:.78rem" onclick="fechar();prevFX(0)">▶ Ver vitória</button><button class="btn" style="padding:11px;font-size:.78rem" onclick="fechar();prevFX(1)">▶ Ver final</button></div>
 <div class="clh">🎵 ÁUDIOS PRÓPRIOS</div><p class="cnote" style="text-align:left;margin-top:0">Escolham um áudio do celular (mp3, m4a…) para tocar no lugar da voz do narrador. Fica salvo neste aparelho.</p>
 ${Object.entries(MOM)
   .map(
     ([k, [l, t]]) =>
       `<div class="slot"><div><b>${l}</b><small>${CSND[k] ? '🎵 Áudio próprio' : DEF[k] ? '🎵 Áudio padrão do app' : 'Narrador: ' + t}</small></div><button onclick="testM('${k}')" aria-label="Testar">▶</button><label aria-label="Escolher áudio">📁<input type="file" accept="audio/*" hidden onchange="setSnd('${k}',this)"></label>${CSND[k] ? `<button onclick="delSnd('${k}')" aria-label="Remover">✕</button>` : ''}</div>`
   )
   .join('')}
 <button class="btn" style="border-color:#2c58b8;color:var(--mut)" onclick="menu()">← Voltar</button>`);
}
function testM(k) {
  if (k === 'dmg') {
    dmgTest();
    return;
  }
  if (k === 'lps') {
    const s = mute;
    mute = false;
    lpsSnd();
    mute = s;
    return;
  }
  const s = mute;
  mute = false;
  moment(
    k,
    k === 'start'
      ? 'É hora do duelo!'
      : k === 'win'
        ? 'Douglas vence o duelo!'
        : 'Blue-Eyes é o campeão do torneio!'
  );
  mute = s;
}
function setSnd(k, inp) {
  const f = inp.files[0];
  inp.value = '';
  if (!f) return;
  if (f.size > 4e6) {
    alert('Arquivo grande demais (máximo 4 MB). Usem um trecho curto.');
    return;
  }
  const r = new FileReader();
  r.onload = () => {
    CSND[k] = r.result;
    KV.set('snd:' + k, r.result);
    cfgM();
    testM(k);
  };
  r.readAsDataURL(f);
}
function delSnd(k) {
  delete CSND[k];
  KV.set('snd:' + k, null);
  cfgM();
}
