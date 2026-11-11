// Teste retroativo do Oráculo: para cada duelo antigo sem previsão, pede uma previsão "às cegas".
// A IA recebe só o que existia ANTES daquele duelo (Elo e confronto direto calculados com os duelos anteriores)
// e nunca o resultado. Assim o placar ganha muitos pontos de comparação sem esperar novos duelos.
// As previsões ficam em h.rt, separadas das previsões ao vivo (h.ai), e o placar mostra as duas.
const RT = { rodando: false, parar: false };

function retroCands() {
  return hist
    .filter(
      h =>
        h.decks &&
        !h.ai &&
        !h.rt &&
        h.w != null &&
        h.decks.every(n => DI(n) >= 0) &&
        h.decks[0] !== h.decks[1]
    )
    .sort((a, b) => a.t - b.t);
}

// Contexto "da época": só os duelos anteriores a h entram no Elo e no confronto direto
function retroCtx(h) {
  const antes = hist.filter(x => x.t < h.t),
    [a, b] = h.decks,
    E = elo(antes),
    ea = E.find(x => x.n === a),
    eb = E.find(x => x.n === b);
  let h2a = 0,
    h2b = 0;
  antes.forEach(x => {
    if (!x.decks) return;
    if (x.decks[0] === a && x.decks[1] === b) x.w === 0 ? h2a++ : h2b++;
    else if (x.decks[0] === b && x.decks[1] === a) x.w === 1 ? h2a++ : h2b++;
  });
  const ia = DI(a),
    ib = DI(b);
  return {
    elo: [ea.e, eb.e],
    jogos: [ea.g, eb.g],
    h2h: { a: h2a, b: h2b },
    eloP: pWin(ea.e, eb.e),
    tierP: pWin(TE[DECKS[ia][1]] || 1500, TE[DECKS[ib][1]] || 1500),
  };
}

function retroInicio() {
  const n = retroCands().length;
  if (!n) return toast('Não há duelos antigos sem previsão');
  modal(`<h2>🔁 TESTE RETROATIVO</h2>
 <p style="text-align:left">O Oráculo vai prever <b>${n} duelo${n > 1 ? 's' : ''} antigo${n > 1 ? 's' : ''}</b>, um por um, <b>sem saber quem venceu</b>. Para ser justo, cada previsão usa só o Elo e o confronto direto de antes daquele duelo.</p>
 <p style="text-align:left">Depois o placar compara essas previsões com os resultados reais, junto com o Elo, o tier e a moeda da mesma época.</p>
 <p class="cnote" style="text-align:left">Leva uns ${Math.max(1, Math.round((n * 9) / 60))} min. Pode parar no meio: o que já foi previsto fica salvo e dá para continuar depois.</p>
 <button class="btn" onclick="retroRodar()">▶️ Começar</button><button class="btn sec" onclick="fechar()">Cancelar</button>`);
}

async function retroRodar() {
  if (RT.rodando) return;
  RT.rodando = true;
  RT.parar = false;
  const L = retroCands(),
    tot = L.length;
  let ok = 0,
    falhas = 0,
    ultimoErro = '';
  const tela = (k, txt) =>
    modal(`<h2>🔁 TESTE RETROATIVO</h2><div class="orabar"><i style="width:${Math.round((k / tot) * 100)}%;background:var(--gd)"></i></div>
 <p>${k} de ${tot} · ${ok} previsões feitas</p><p class="cnote" style="text-align:left">${txt}</p>
 <button class="btn sec" onclick="RT.parar=true;this.textContent='Parando…'">⏹ Parar</button>`);
  for (let k = 0; k < tot && !RT.parar; k++) {
    const h = L[k];
    tela(
      k,
      `Prevendo ${esc(h.decks[0])} × ${esc(h.decks[1])} (${new Date(h.t).toLocaleDateString('pt-BR')})…`
    );
    const ctx = retroCtx(h);
    let tent = 0;
    while (!RT.parar) {
      try {
        const [a, b] = await Promise.all([oraDeck(DI(h.decks[0])), oraDeck(DI(h.decks[1]))]);
        const r = await oraPost('/prever', { a, b, ctx }, 120000);
        h.rt = {
          p: +r.chance_a.toFixed(4),
          m: r.model,
          at: Date.now(),
          eloP: +ctx.eloP.toFixed(4),
          tierP: +ctx.tierP.toFixed(4),
          r: {
            resumo: r.resumo,
            analise: r.analise,
            plano_a: r.plano_a,
            plano_b: r.plano_b,
            chaves_a: r.chaves_a,
            chaves_b: r.chaves_b,
            plano_azarao: r.plano_azarao,
            confianca: r.confianca,
            model: r.model,
            ms: r.ms,
          },
        };
        save();
        ok++;
        falhas = 0;
        break;
      } catch (e) {
        ultimoErro = e.message;
        // Limite de pedidos: espera um minuto e tenta de novo
        if (/429|muitos pedidos|RESOURCE_EXHAUSTED/i.test(e.message) && tent < 3) {
          tent++;
          tela(
            k,
            `⏳ Limite de pedidos atingido. Esperando 1 minuto para continuar (tentativa ${tent} de 3)…`
          );
          await new Promise(res => setTimeout(res, 60000));
          continue;
        }
        falhas++;
        break;
      }
    }
    if (falhas >= 3) break;
    await new Promise(res => setTimeout(res, 2500));
  }
  RT.rodando = false;
  const resto = retroCands().length;
  modal(`<h2>🔁 TESTE RETROATIVO</h2><p><b>${ok}</b> previs${ok === 1 ? 'ão feita' : 'ões feitas'}.</p>
 ${resto ? `<p class="cnote" style="text-align:left">Faltam ${resto}. ${falhas >= 3 ? 'Parou depois de 3 erros seguidos: ' + esc(oraMotivo(ultimoErro) || ultimoErro) : 'Dá para continuar quando quiser.'}</p>` : '<p class="cnote">Todos os duelos antigos já têm previsão.</p>'}
 ${resto ? '<button class="btn" onclick="retroRodar()">▶️ Continuar</button>' : ''}<button class="btn" onclick="fechar();goTab(\'stats\');rS()">📊 Ver o placar</button>`);
  if (document.body.dataset.t === 'stats') rS();
}
