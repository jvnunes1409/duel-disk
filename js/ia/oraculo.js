// Oráculo (IA): previsão antes do duelo, crônica e placar de acertos contra Elo, tier e moeda.
// ===== Oráculo do Duelo (IA) =====
// Antes do duelo: a IA lê as listas de cartas e o histórico e estima a chance de cada lado.
// A previsão só vale se chegar antes do primeiro lance de LP (senão a IA "veria" o duelo começando).
// Depois do duelo: crônica a partir do registro de LP. Nas estatísticas: placar da IA contra Elo, tier e moeda.
const ORA_PAD = 'https://oraculo.coringa1401.workers.dev'; // URL do Worker; também pode ser colada em Menu → Sons e animações → Oráculo
const oraUrl = () => {
  let u = String(CFG.ora || ORA_PAD || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
};
const oraOn = () => !!oraUrl() && CFG.oraOn !== 0;
const pWin = (ra, rb) => 1 / (1 + 10 ** ((rb - ra) / 400));
function oraPost(rota, body, ms) {
  const c = new AbortController(),
    tm = setTimeout(() => c.abort(), ms || 25000);
  return fetch(oraUrl() + rota, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: c.signal,
  })
    .then(async r => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
      return j;
    })
    .finally(() => clearTimeout(tm));
}
function oraTeste() {
  const m = $('#oraM');
  if (!m) return;
  if (!oraUrl()) {
    m.textContent = 'Sem endereço: o app funciona normal, só sem IA.';
    return;
  }
  m.textContent = 'Testando…';
  fetch(oraUrl())
    .then(r => r.text())
    .then(async t => {
      let j = {};
      try {
        j = JSON.parse(t);
      } catch (e) {}
      if (j.oraculo !== 'online') {
        m.textContent =
          '⚠️ O endereço responde, mas não é o Oráculo. O código do Worker ainda é o Hello World? Cole o oraculo.js e clique em Deploy.';
        return;
      }
      const r = await fetch(oraUrl() + '/teste', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        }),
        k = await r.json().catch(() => ({}));
      m.textContent =
        r.status === 404
          ? '✅ Oráculo online e com chave. Sorteie um duelo para testar a IA.'
          : '⚠️ ' + (oraMotivo(k.error) || k.error || 'Erro ' + r.status);
    })
    .catch(e => {
      m.textContent = '❌ Não respondeu. ' + oraMotivo(e.message);
    });
}
function oraMotivo(m) {
  m = String(m || '');
  if (/abort/i.test(m))
    return 'A IA demorou demais para responder (os servidores do Google costumam ficar lentos em alguns horários). Espere um pouco e tente de novo.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m))
    return 'O celular não conseguiu falar com o Worker. Confira se o endereço está certo e se tem internet. Se o endereço estiver certo, o código do Worker pode ainda ser o Hello World (cole o oraculo.js de novo e dê Deploy).';
  if (/GEMINI_KEY/.test(m))
    return 'O Worker está no ar, mas a chave não foi encontrada. Em Settings → Variables and Secrets, confira se o nome é exatamente GEMINI_KEY, e clique em Deploy depois de salvar.';
  if (/API_KEY_INVALID|API key not valid|PERMISSION_DENIED|403/.test(m))
    return 'A chave do Gemini foi recusada. Crie uma nova no AI Studio, cole em GEMINI_KEY de novo e dê Deploy.';
  if (/503|UNAVAILABLE|high demand|overloaded|sobrecarregado/i.test(m))
    return 'Os servidores do Google (Gemini) estão sobrecarregados agora. Não é problema do app: o Oráculo já tentou de novo sozinho e com o modelo reserva. Espere alguns minutos e toque em Tentar de novo.';
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(m))
    return 'O limite grátis do Gemini acabou por agora. Espere alguns minutos e tente de novo.';
  if (/404|not found|is not supported/i.test(m) && /model/i.test(m))
    return 'O modelo da IA não existe mais. Crie a variável MODEL (texto) com gemini-3.8-flash ou outro modelo listado no AI Studio.';
  if (/origem não permitida/.test(m))
    return 'O Worker recusou o endereço do app. Crie a variável ALLOWED_ORIGIN com https://jvnunes1409.github.io';
  if (/location is not supported/i.test(m)) return 'O Gemini não aceita pedidos da região do Worker.';
  return '';
}
function oraErro() {
  const a = duel && duel.ai;
  const m = (a && a.e) || '?',
    t = oraMotivo(m);
  modal(`<h2>🔮 ORÁCULO SEM SINAL</h2>${t ? `<p style="text-align:left">${esc(t)}</p>` : ''}<p class="cnote" style="text-align:left;word-break:break-word">Erro técnico: ${esc(m)}</p><p class="cnote" style="text-align:left">Endereço: ${esc(oraUrl() || '(vazio)')}</p><p id="oraV" class="cnote" style="text-align:left">Conferindo o Worker…</p>
 <button class="btn" onclick="fechar();oraPrever()">Tentar de novo</button><button class="btn sec" onclick="oraDiag()">🩺 Testar a IA agora</button><button class="btn sec" onclick="fechar()">Fechar</button>`);
  fetch(oraUrl())
    .then(r => r.json())
    .then(j => {
      const v = $('#oraV');
      if (!v) return;
      v.innerHTML =
        (j.versao || 1) < 4
          ? '⚠️ <b>O Worker está com o código antigo</b> (versão ' +
            (j.versao || 1) +
            '). Cole o oraculo.js novo do GitHub e clique em Deploy.'
          : '✅ Worker atualizado (versão ' + j.versao + ', modelo ' + esc(j.modelo || '?') + ').';
    })
    .catch(() => {
      const v = $('#oraV');
      if (v) v.textContent = 'Não consegui conferir o Worker.';
    });
}
// Lista para a IA: nome em português (o que vocês têm na mão), nome em inglês entre parênteses, tipo/status e o efeito resumido
const oraTO = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
// Uma linha da lista: "3x Nome PT (Nome EN) [tipo, status: efeito]"
function oraLinha(x, c) {
  const pt = (typeof x[0] === 'string' && x[0]) || (c && c.pt) || '',
    en = x[1],
    nm = pt && pt !== en ? `${pt} (${en})` : en;
  let info = '';
  if (c && c.d) {
    const g = cat(c.d);
    info =
      g === 'M' || g === 'A'
        ? ctype(c.d)
        : `${g === 'E' ? 'Extra Deck, ' : ''}${lvl(c.d)}, ATK ${stat(c.d.k)}/DEF ${stat(c.d.f)}`;
    const fx = String(c.pe || c.d.e || '')
      .replace(/\s+/g, ' ')
      .slice(0, 260);
    if (fx) info += ': ' + fx;
  }
  return (x[3] > 1 ? x[3] + 'x ' : '') + nm + (info ? ' [' + info + ']' : '');
}
async function oraDeck(i) {
  const d = DECKS[i],
    L = CARDS[d[0]] || [];
  let det = null;
  try {
    det = await oraTO(getDeck(d[0]), 5000);
  } catch (e) {}
  const cartas = L.map((x, k) => oraLinha(x, det && det[k]));
  // Consistência (conta exata da mão inicial). Se a IA ainda não classificou este deck, classifica agora;
  // se não der em 30 s, a previsão segue sem ela.
  let consist = null;
  if (det && typeof consistencia === 'function') {
    const main = L.map((x, k) => ({ x, c: det[k] }))
      .filter(({ c }) => !(c && c.d && cat(c.d) === 'E'))
      .map(({ x, c }) => ({ en: x[1], q: x[3] || 1, txt: oraLinha(x, c) }));
    try {
      const r = await oraTO(consistencia(d[0], d[4], main).catch(() => null), 30000);
      if (r) consist = { cartas: r.cartas, partida: r.partida, tijolos: r.tijolos, abre5: r.abre5, abre6: r.abre6, tijolo2: r.tijolo2 };
    } catch (e) {}
  }
  return { nome: d[0], tier: d[1], estrategia: d[4], fortes: d[5], fracos: d[6], cartas, consistencia: consist };
}
// Linhas de base guardadas no início do duelo, para comparar com a IA de forma justa
function oraBase(dk) {
  const [a, b] = dk.map(i => DECKS[i][0]),
    E = elo(),
    ea = E.find(x => x.n === a),
    eb = E.find(x => x.n === b);
  let h2a = 0,
    h2b = 0;
  hist.forEach(h => {
    if (!h.decks) return;
    if (h.decks[0] === a && h.decks[1] === b) {
      h.w === 0 ? h2a++ : h2b++;
    } else if (h.decks[0] === b && h.decks[1] === a) {
      h.w === 1 ? h2a++ : h2b++;
    }
  });
  return {
    elo: [ea.e, eb.e],
    jogos: [ea.g, eb.g],
    h2h: { a: h2a, b: h2b },
    eloP: pWin(ea.e, eb.e),
    tierP: pWin(TE[DECKS[dk[0]][1]] || 1500, TE[DECKS[dk[1]][1]] || 1500),
  };
}
// A previsão começa no instante do sorteio (os dois decks já são conhecidos antes da animação)
// e só é descartada se alguém mexer no LP antes de ela chegar.
let ORAPRE = null;
function oraPedir(dk) {
  const k = dk.join('-');
  if (ORAPRE && ORAPRE.k === k && Date.now() - ORAPRE.t < 180000) return ORAPRE;
  const base = oraBase(dk);
  ORAPRE = {
    k,
    t: Date.now(),
    base,
    p: Promise.all([oraDeck(dk[0]), oraDeck(dk[1])]).then(([a, b]) =>
      oraPost('/prever', { a, b, ctx: base }, 120000)
    ),
  };
  ORAPRE.p.catch(() => {});
  return ORAPRE;
}
function oraPreAquecer(dk) {
  if (oraOn() && dk[0] !== dk[1]) oraPedir(dk);
}
function oraPrever() {
  const D = duel;
  if (!D.decks || D.decks[0] === D.decks[1]) return;
  if (!oraOn()) {
    D.base = oraBase(D.decks);
    return;
  }
  if (D.ai && D.ai.st === 'erro' && ORAPRE && ORAPRE.k === D.decks.join('-')) ORAPRE = null;
  const R = oraPedir(D.decks);
  D.base = R.base;
  D.ai = { st: 'load', t0: R.t };
  tBan();
  oraRelogio();
  R.p
    .then(r => {
      if (duel !== D) return;
      if (D.log.length || over) {
        D.ai = { st: 'tarde' };
        tBan();
        return;
      }
      D.ai = { st: 'ok', p: r.chance_a, r, t: Date.now() };
      tBan();
      if (document.body.dataset.t === 'sorteio') toast('🔮 O Oráculo fez a previsão');
    })
    .catch(e => {
      if (ORAPRE === R) ORAPRE = null;
      if (duel !== D) return;
      D.ai = { st: 'erro', e: e.message };
      tBan();
    });
}
// Contador de segundos enquanto a IA pensa: mostra que o pedido está andando
const oraSeg = t0 => (t0 ? Math.round((Date.now() - t0) / 1000) + ' s' : '');
let ORAREL = null;
function oraRelogio() {
  clearInterval(ORAREL);
  ORAREL = setInterval(() => {
    if (!duel || !duel.ai || duel.ai.st !== 'load') return clearInterval(ORAREL);
    tBan();
  }, 1000);
}
// Contador dentro de um modal (veredito e crônica): para sozinho quando o modal muda
function oraRelogioModal(t0) {
  const iv = setInterval(() => {
    const e = $('#oraT');
    if (!e) return clearInterval(iv);
    e.textContent =
      oraSeg(t0) + (Date.now() - t0 > 25000 ? ' · a IA está lenta agora, mas continua tentando' : '');
  }, 1000);
}
// Diagnóstico: o Worker testa cada modelo com um pedido mínimo e devolve o tempo e o erro de cada um
async function oraDiag() {
  modal(`<h2>🩺 TESTE DA IA</h2><p>Testando os modelos do Oráculo… <b id="oraT"></b></p>`);
  oraRelogioModal(Date.now());
  try {
    const r = await oraPost('/diagnostico', {}, 30000);
    const lin = (r.modelos || [])
      .map(
        m =>
          `<div class="vzl"><span>${m.ok ? '✅' : '❌'} <b>${esc(m.modelo)}</b><small>${m.ok ? 'respondeu em ' + (m.ms / 1000).toFixed(1) + ' s' : esc(({ 503: 'servidor do Google sobrecarregado agora (503)', 500: 'erro interno do Google (500)', 429: 'limite grátis atingido por agora (429)', 404: 'modelo não disponível para esta conta (404)', 400: 'pedido recusado (400): ' + m.erro, 403: 'chave recusada (403)', 0: m.erro }[m.status] || 'erro ' + m.status + ': ' + m.erro).slice(0, 220))}</small></span></div>`
      )
      .join('');
    const algum = (r.modelos || []).some(m => m.ok);
    modal(
      `<h2>🩺 TESTE DA IA</h2><p style="text-align:left">${algum ? 'Pelo menos um modelo está respondendo: o Oráculo deve funcionar.' : 'Nenhum modelo respondeu agora. O problema está do lado do Google (Gemini) ou da chave.'}</p>${lin}<p class="cnote">Worker versão ${esc(r.versao || '?')}</p><button class="btn sec" onclick="fechar()">Fechar</button>`
    );
  } catch (e) {
    const m = /rota não encontrada|404/.test(e.message)
      ? 'O Worker ainda não tem o teste. A atualização automática leva 1 a 2 minutos depois de cada mudança.'
      : oraMotivo(e.message);
    modal(
      `<h2>🩺 TESTE DA IA</h2><p>O teste não conseguiu falar com o Worker.</p>${m ? `<p style="text-align:left">${esc(m)}</p>` : ''}<p class="cnote">${esc(e.message)}</p><button class="btn" onclick="oraDiag()">Testar de novo</button><button class="btn sec" onclick="fechar()">Fechar</button>`
    );
  }
}
const oraFav = p => (p >= 0.5 ? 0 : 1),
  oraPct = p => Math.round(Math.max(p, 1 - p) * 100);
function oraChip() {
  const a = duel && duel.ai;
  if (!a || !duel.decks) return '';
  if (a.st === 'load')
    return `<div class="tmb ora" style="cursor:default"><span>🔮 O ORÁCULO ESTÁ ANALISANDO… ${oraSeg(a.t0)}</span>${Date.now() - a.t0 > 25000 ? '<small>a IA está lenta agora</small>' : ''}</div>`;
  if (a.st === 'erro')
    return `<div class="tmb ora" onclick="oraErro()"><span>🔮 ORÁCULO SEM SINAL</span><small>ver motivo ›</small></div>`;
  if (a.st === 'tarde') return '';
  const f = oraFav(a.p);
  return `<div class="tmb ora" onclick="oraVer()"><span>🔮 ORÁCULO: <b style="color:${COR[f]}">${oraPct(a.p)}% ${NOMES[f].toUpperCase()}</b></span><small>ver análise ›</small></div>`;
}
function oraBox(r, dk) {
  const p = r.chance_a,
    nm = c => (typeof c === 'string' ? { carta: c, motivo: '' } : c || {});
  const lst = (k, a) =>
    (a || []).length
      ? `<div class="clh" style="text-align:left;color:${COR[k]}">🗝️ CARTAS-CHAVE · ${esc(dn(dk[k]))}</div>${a
          .slice(0, 4)
          .map(nm)
          .map(
            c =>
              `<p style="margin:4px 0;text-align:left"><b>${esc(c.carta)}</b>${c.motivo ? ' — ' + esc(c.motivo) : ''}</p>`
          )
          .join('')}`
      : '';
  const par = t =>
    String(t || '')
      .split(/\n+/)
      .filter(Boolean)
      .map(x => `<p style="text-align:left">${esc(x)}</p>`)
      .join('');
  const pl = (k, t) =>
    t
      ? `<div class="clh" style="text-align:left;color:${COR[k]}">🧭 PLANO DE JOGO · ${esc(dn(dk[k]))}</div>${par(t)}`
      : '';
  return `<div class="orabar"><i style="width:${Math.round(p * 100)}%;background:${COR[0]}"></i><i style="width:${100 - Math.round(p * 100)}%;background:${COR[1]}"></i></div>
 <div class="sbl" style="font-size:.85rem;margin:4px 0 10px"><span style="color:${COR[0]}">${NOMES[0]} ${Math.round(p * 100)}%</span><span style="color:${COR[1]}">${100 - Math.round(p * 100)}% ${NOMES[1]}</span></div>
 <p style="text-align:left;font-weight:800">${esc(r.resumo)}</p>
 ${r.analise ? `<div class="clh" style="text-align:left">⚔️ O CONFRONTO</div>${par(r.analise)}` : ''}
 ${pl(0, r.plano_a)}${lst(0, r.chaves_a)}${pl(1, r.plano_b)}${lst(1, r.chaves_b)}
 <div class="clh" style="text-align:left">🃏 COMO O AZARÃO VIRA</div>${par(r.plano_azarao)}
 <p class="cnote">Confiança ${esc({ media: 'média' }[r.confianca] || r.confianca || '?')} · ${esc(r.model || 'IA')}${r.ms ? ' · ' + Math.round(r.ms / 1000) + ' s' : ''}</p>`;
}
function oraVer() {
  const a = duel && duel.ai;
  if (!a || a.st !== 'ok') return;
  const b = duel.base;
  modal(`<h2>🔮 PREVISÃO DO ORÁCULO</h2>${oraBox(a.r, duel.decks)}
 <p class="cnote">Para comparar: Elo diz ${Math.round(b.eloP * 100)}% e o tier diz ${Math.round(b.tierP * 100)}% para ${NOMES[0]}.</p>
 <button class="btn sec" onclick="fechar()">Fechar</button>`);
}
// Grava no histórico só o essencial (a análise completa fica junto, para rever depois)
function oraSave(h) {
  const D = duel;
  if (D.base) {
    h.eloP = +D.base.eloP.toFixed(4);
    h.tierP = +D.base.tierP.toFixed(4);
  }
  if (D.ev && D.ev.length) h.ev = D.ev.map(e => ({ ...e }));
  if (D.ai && D.ai.st === 'ok')
    h.ai = {
      p: +D.ai.p.toFixed(4),
      m: D.ai.r.model,
      r: {
        resumo: D.ai.r.resumo,
        analise: D.ai.r.analise,
        plano_a: D.ai.r.plano_a,
        plano_b: D.ai.r.plano_b,
        chaves_a: D.ai.r.chaves_a,
        chaves_b: D.ai.r.chaves_b,
        plano_azarao: D.ai.r.plano_azarao,
        confianca: D.ai.r.confianca,
        model: D.ai.r.model,
        ms: D.ai.r.ms,
      },
    };
}
function oraResBtn(h) {
  if (!h.decks) return '';
  const ok = h.ai ? (oraFav(h.ai.p) === h.w ? '✅ O Oráculo acertou' : '❌ O Oráculo errou') : '';
  return `${ok ? `<p style="margin:6px 0 0;font-weight:800">${ok} (${oraPct(h.ai.p)}% ${NOMES[oraFav(h.ai.p)]})</p>` : ''}${oraOn() || h.cr ? `<button class="mvpb" style="margin-top:6px" onclick="oraCronica(${h.t})">📜 ${h.cr ? 'Ver' : 'Gerar'} a crônica do duelo</button>` : ''}`;
}
async function oraCronica(t) {
  const h = hist.find(x => x.t === t);
  if (!h) return;
  const show = () =>
    modal(
      `<h2>📜 ${esc(h.cr.titulo).toUpperCase()}</h2><p style="text-align:left">${esc(h.cr.cronica)}</p><div class="clh" style="text-align:left">⚡ A VIRADA</div><p style="text-align:left">${esc(h.cr.virada)}</p><div class="clh" style="text-align:left">🔮 E O ORÁCULO?</div><p style="text-align:left">${esc(h.cr.oraculo)}</p><button class="btn sec" onclick="${RES && RES.h === h ? 'showRes()' : 'fechar()'}">Voltar</button>`
    );
  if (h.cr) {
    show();
    return;
  }
  modal(`<h2>📜 CRÔNICA</h2><p>O narrador está assistindo ao replay… <b id="oraT"></b></p>`);
  oraRelogioModal(Date.now());
  try {
    const r = await oraPost(
      '/cronica',
      {
        nomes: NOMES,
        decks: h.decks,
        w: h.w,
        dur: h.dur,
        turnos: h.tn,
        lp: h.lp,
        mvp: await oraMvp(h),
        relato: h.nota || '',
        previsao: h.ai ? { chance_a: h.ai.p, resumo: h.ai.r && h.ai.r.resumo } : null,
        jogadas: await vParaIA(h),
        log: (h.log || []).map(e => ({ tn: e.tn, s: e.t / 1000, p: e.p, d: e.d, lp: e.lp })),
      },
      40000
    );
    h.cr = { titulo: r.titulo, cronica: r.cronica, virada: r.virada, oraculo: r.oraculo };
    save();
    show();
  } catch (e) {
    const mo = oraMotivo(e.message);
    modal(
      `<h2>📜 CRÔNICA</h2><p>Não consegui falar com o Oráculo agora.</p>${mo ? `<p style="text-align:left">${esc(mo)}</p>` : ''}<p class="cnote">${esc(e.message)}</p><button class="btn" onclick="oraCronica(${t})">Tentar de novo</button><button class="btn sec" onclick="fechar()">Fechar</button>`
    );
  }
}
// Placar: acerto (quem tinha mais de 50% venceu) e Brier (erro quadrático da chance; menor é melhor, 0,25 = chutar 50%)
// Placar: cada previsão vira uma linha {p, eloP, tierP, w}. "Ao vivo" = feita antes do primeiro dano;
// "retroativo" = feita depois, para duelos antigos, sem saber o resultado e com o Elo de antes daquele duelo.
let PLV = 'tudo';
function oraLinhas(H, fonte) {
  const L = [];
  H.forEach(h => {
    if (!h.decks) return;
    if (h.ai && fonte !== 'retro') L.push({ p: h.ai.p, eloP: h.eloP, tierP: h.tierP, w: h.w });
    if (h.rt && fonte !== 'vivo') L.push({ p: h.rt.p, eloP: h.rt.eloP, tierP: h.rt.tierP, w: h.w });
  });
  return L;
}
function oraPlacar(H) {
  const nV = oraLinhas(H, 'vivo').length,
    nR = oraLinhas(H, 'retro').length,
    cand = typeof retroCands === 'function' ? retroCands().length : 0;
  const btnRetro =
    oraOn() && cand
      ? `<button class="btn" style="margin-top:10px" onclick="retroInicio()">🔁 Teste retroativo<small>prever às cegas ${cand} duelo${cand > 1 ? 's' : ''} antigo${cand > 1 ? 's' : ''}</small></button>`
      : '';
  if (!nV && !nR)
    return oraOn()
      ? `<div class="sh">🔮 PLACAR DO ORÁCULO</div><div class="card mini">Ainda não há duelos com previsão. Cada duelo sorteado com internet ganha uma previsão antes de começar, e ela é conferida aqui no fim.${btnRetro}</div>`
      : '';
  if (PLV === 'vivo' && !nV) PLV = 'tudo';
  if (PLV === 'retro' && !nR) PLV = 'tudo';
  const R = oraLinhas(H, PLV),
    n = R.length,
    y = h => (h.w === 0 ? 1 : 0);
  // Acerto = quem recebeu mais de 50% venceu. Nota = Brier convertido para 0–100:
  // 0 = igual a chutar 50% sempre (moeda), 100 = cravou 100% no vencedor todas as vezes.
  const M = [
    ['🔮', 'Oráculo (IA)', h => h.p],
    ['📈', 'Elo (resultados)', h => h.eloP],
    ['🏷️', 'Tier (sua lista)', h => h.tierP],
  ].map(([ic, nome, f]) => {
    const v = R.filter(h => typeof f(h) === 'number'),
      br = v.length ? v.reduce((s, h) => s + (f(h) - y(h)) ** 2, 0) / v.length : null;
    return {
      ic,
      nome,
      k: v.length,
      ac: v.filter(h => f(h) !== 0.5 && (f(h) > 0.5 ? 1 : 0) === y(h)).length,
      br,
      nota: br == null ? null : Math.round((1 - br / 0.25) * 100),
    };
  });
  const ora = M[0],
    outros = M.slice(1).filter(m => m.k),
    melhorOutro = outros.reduce((a, m) => (m.nota > a.nota ? m : a), outros[0] || { nota: -999 });
  // Frase-resumo em português claro
  const dif = ora.nota - melhorOutro.nota,
    poucos = n < 15;
  const nomeOutro = { '📈': 'Elo', '🏷️': 'seu tier' }[melhorOutro.ic],
    mesmoAcerto = ora.ac === melhorOutro.ac;
  // Com o mesmo número de acertos, quem decide é a nota: ela olha QUANTA chance cada um deu a quem venceu
  const veredito =
    Math.abs(dif) <= 5
      ? `Até agora o Oráculo está <b>empatado</b> com o ${nomeOutro}.`
      : mesmoAcerto
        ? `Os dois acertaram ${ora.ac}, mas ${dif > 0 ? 'o Oráculo' : 'o ' + nomeOutro} fica <b>na frente pela nota</b>, que mede quanta chance cada um deu a quem venceu, e não só se acertou.`
        : dif > 0
          ? `Até agora o Oráculo está <b>na frente</b> dos métodos simples.`
          : `Até agora o ${nomeOutro} está <b>na frente</b> do Oráculo.`;
  // Vezes em que o Oráculo apostou contra a lista de tiers (achou que o deck de tier pior venceria)
  const contra = R.filter(
      h => typeof h.tierP === 'number' && h.tierP !== 0.5 && h.p !== 0.5 && h.p > 0.5 !== h.tierP > 0.5
    ),
    contraAc = contra.filter(h => oraFav(h.p) === h.w).length,
    contraTxt = contra.length
      ? `<p class="pl-ct">🔀 Contrariou a lista de tiers em <b>${contra.length} duelo${contra.length > 1 ? 's' : ''}</b> (apostou no deck de tier pior) e acertou <b>${contraAc}</b>.</p>`
      : '';
  const barra = (m, melhor) =>
    `<div class="pl-m${melhor ? ' on' : ''}"><div class="pl-t"><span>${m.ic} ${m.nome}</span><b>${m.k ? Math.round((m.ac / m.k) * 100) + '%' : '—'}</b></div>
 <div class="pl-b"><i style="width:${m.k ? Math.round((m.ac / m.k) * 100) : 0}%"></i></div>
 <small>acertou ${m.ac} de ${m.k} · nota da porcentagem: <b>${m.nota == null ? '—' : m.nota}</b></small></div>`;
  const melhorNota = Math.max(...M.filter(m => m.nota != null).map(m => m.nota));
  // Calibragem em faixas de confiança, com nomes em vez de números
  const faixas = [
    [0, 0.6, 'Em dúvida', 'deu entre 50% e 59%'],
    [0.6, 0.75, 'Inclinado', 'deu entre 60% e 74%'],
    [0.75, 1.01, 'Confiante', 'deu 75% ou mais'],
  ]
    .map(([lo, hi, nome, txt]) => {
      const v = R.filter(h => {
        const c = Math.max(h.p, 1 - h.p);
        return c >= lo && c < hi;
      });
      if (!v.length) return '';
      const ac = v.filter(h => oraFav(h.p) === h.w).length;
      return `<div class="pl-f"><span><b>${nome}</b><small>${txt}</small></span><span>acertou <b>${ac} de ${v.length}</b> (${Math.round((ac / v.length) * 100)}%)</span></div>`;
    })
    .join('');
  const seg =
    nV && nR
      ? `<div class="seg" style="margin:0 0 10px">${[
          ['tudo', `Tudo (${nV + nR})`],
          ['vivo', `Ao vivo (${nV})`],
          ['retro', `Retroativo (${nR})`],
        ]
          .map(([k, t]) => `<button class="${PLV === k ? 'on' : ''}" onclick="PLV='${k}';rS()">${t}</button>`)
          .join('')}</div>`
      : '';
  const fonte = {
    vivo: 'previsões feitas antes do primeiro dano',
    retro: 'previsões feitas depois, às cegas, para duelos antigos',
    tudo:
      nV && nR
        ? 'previsões ao vivo e retroativas'
        : nR
          ? 'previsões retroativas (às cegas)'
          : 'previsões feitas antes do primeiro dano',
  }[PLV];
  return `<div class="sh">🔮 PLACAR DO ORÁCULO</div><div class="card">${seg}
 <p class="pl-v">Em <b>${n} duelo${n > 1 ? 's' : ''}</b> (${fonte}), o Oráculo apontou o vencedor certo em <b>${ora.ac}</b>. ${veredito}${poucos ? ' <span>Com menos de 15 duelos, diferenças pequenas ainda são sorte.</span>' : ''}</p>${contraTxt}
 <div class="clh" style="text-align:left">🏁 QUEM PREVÊ MELHOR</div>
 ${M.map(m => barra(m, m.nota === melhorNota)).join('')}
 <p class="cnote" style="text-align:left;margin:6px 0 0">🪙 Chutar no cara ou coroa acertaria cerca de metade e teria nota 0. A <b>nota da porcentagem</b> vai de 0 a 100: premia quem dá chance alta para quem vence e pune quem diz "90%" e erra.</p>
 ${faixas ? `<div class="clh" style="text-align:left">🎯 A CONFIANÇA DO ORÁCULO FAZ SENTIDO?</div><p class="cnote" style="text-align:left;margin:0 0 6px">Se ele for bem calibrado, acerta mais quando está mais confiante.</p>${faixas}` : ''}
 <details class="orad"><summary>Números técnicos</summary><p class="cnote" style="text-align:left">Brier (erro quadrático médio da probabilidade; menor é melhor, 0,25 = moeda): ${M.map(m => `${m.nome.split(' ')[0]} ${m.br == null ? '—' : m.br.toFixed(3).replace('.', ',')}`).join(' · ')}. Nota = (1 − Brier ÷ 0,25) × 100.</p></details>
 ${btnRetro}</div>`;
}
