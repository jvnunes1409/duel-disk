// Oráculo no histórico: previsão guardada e veredito depois do duelo.
// ===== Oráculo no histórico: a previsão guardada + o veredito depois do duelo =====
const VDL = {
  sim: ['✅', 'DEU A LÓGICA'],
  zebra: ['🦓', 'DEU ZEBRA'],
  equilibrado: ['⚖️', 'DUELO EQUILIBRADO'],
};
function oraHist(t) {
  const h = hist.find(x => x.t === t);
  if (!h || !h.decks) return;
  const dk = h.decks.map(DI);
  if (dk.some(i => i < 0))
    return modal(
      `<h2>🔮 ORÁCULO</h2><p>Um dos decks deste duelo não existe mais no app.</p><button class="btn sec" onclick="fechar()">Fechar</button>`
    );
  const par = x =>
    String(x || '')
      .split(/\n+/)
      .filter(Boolean)
      .map(y => `<p style="text-align:left">${esc(y)}</p>`)
      .join('');
  const prev = h.ai
    ? `<div class="clh" style="text-align:left">🔮 ANTES DO DUELO</div><p style="text-align:left">O Oráculo deu <b style="color:${COR[oraFav(h.ai.p)]}">${oraPct(h.ai.p)}% para ${NOMES[oraFav(h.ai.p)]}</b> (${esc(h.decks[oraFav(h.ai.p)])}). ${oraFav(h.ai.p) === h.w ? '✅ Acertou.' : '❌ Errou.'}</p>
  ${h.ai.r ? `<details class="orad"><summary>Ver a previsão completa</summary>${oraBox({ ...h.ai.r, chance_a: h.ai.p, model: h.ai.r.model || h.ai.m }, dk)}</details>` : ''}`
    : `<p class="cnote" style="text-align:left">Este duelo foi jogado sem previsão do Oráculo.</p>`;
  const v = h.vd,
    vl = v && (VDL[v.deu_logica] || VDL.equilibrado);
  const ver = v
    ? `<div class="clh" style="text-align:left">⚖️ O VEREDITO</div><div class="vdl">${vl[0]} ${vl[1]}</div><p style="text-align:left;font-weight:800">${esc(v.titulo)}</p>${par(v.veredito)}
  <div class="clh" style="text-align:left">🎯 O QUE DECIDIU</div>${par(v.fator_decisivo)}
  <div class="clh" style="text-align:left;color:${COR[0]}">📘 LIÇÃO · ${esc(h.decks[0])}</div>${par(v.licao_a)}
  <div class="clh" style="text-align:left;color:${COR[1]}">📘 LIÇÃO · ${esc(h.decks[1])}</div>${par(v.licao_b)}`
    : oraOn()
      ? `<button class="btn" onclick="oraVeredito(${t})">⚖️ Pedir o veredito do Oráculo<small>deu a lógica ou foi zebra? por quê?</small></button>`
      : '';
  modal(`<h2>🔮 ORÁCULO</h2><p style="margin:-4px 0 6px"><b style="color:${COR[0]}">${esc(h.decks[0])}</b> <em>vs</em> <b style="color:${COR[1]}">${esc(h.decks[1])}</b><br><small style="color:var(--mut)">Vitória do ${NOMES[h.w]} · ${h.lp[0]} × ${h.lp[1]} · ${new Date(h.t).toLocaleDateString('pt-BR')}</small></p>
 ${prev}${(h.ev || []).length ? `<details class="orad"><summary>🎙️ Jogadas faladas (${h.ev.length})</summary>${h.ev.map(e => `<div class="vzl"><span>T${e.tn} ${e.p != null ? `<b style="color:${COR[e.p]}">${NOMES[e.p]}</b>` : ''}<br>${vEvTxt(e)}<small>“${esc(e.fala)}”</small></span></div>`).join('')}</details>` : ''}${ver}${oraOn() || h.cr ? `<button class="btn sec" onclick="oraCronica(${t})">📜 ${h.cr ? 'Ver' : 'Gerar'} a crônica do duelo</button>` : ''}<button class="btn sec" onclick="fechar()">Fechar</button>`);
}
async function oraVeredito(t) {
  const h = hist.find(x => x.t === t);
  if (!h) return;
  const dk = h.decks.map(DI);
  modal(`<h2>⚖️ VEREDITO</h2><p>O Oráculo está revendo o duelo… <b id="oraT"></b></p>`);
  oraRelogioModal(Date.now());
  try {
    const [a, b] = await Promise.all(dk.map(oraDeck));
    const r = await oraPost(
      '/veredito',
      {
        nomes: NOMES,
        a,
        b,
        w: h.w,
        lp: h.lp,
        dur: h.dur,
        turnos: h.tn,
        mvp: h.mvp && h.mvp.n,
        previsao: h.ai ? { chance_a: h.ai.p, resumo: h.ai.r && h.ai.r.resumo } : null,
        eloP: h.eloP,
        tierP: h.tierP,
        jogadas: await vParaIA(h),
        log: (h.log || []).map(e => ({ tn: e.tn, s: e.t / 1000, p: e.p, d: e.d, lp: e.lp })),
      },
      120000
    );
    h.vd = {
      deu_logica: r.deu_logica,
      titulo: r.titulo,
      veredito: r.veredito,
      fator_decisivo: r.fator_decisivo,
      licao_a: r.licao_a,
      licao_b: r.licao_b,
      model: r.model,
    };
    save();
    rH();
    oraHist(t);
  } catch (e) {
    const m = /rota não encontrada|404/.test(e.message)
      ? 'O Worker ainda não tem o veredito. A atualização automática leva 1 a 2 minutos depois de cada mudança; tente de novo daqui a pouco.'
      : oraMotivo(e.message);
    modal(
      `<h2>⚖️ VEREDITO</h2><p>Não consegui falar com o Oráculo agora.</p>${m ? `<p style="text-align:left">${esc(m)}</p>` : ''}<p class="cnote">${esc(e.message)}</p><button class="btn" onclick="oraVeredito(${t})">Tentar de novo</button><button class="btn sec" onclick="oraDiag()">🩺 Testar a IA agora</button><button class="btn sec" onclick="oraHist(${t})">Voltar</button>`
    );
  }
}
