// Chaveamento visual do torneio (estilo Copa do Mundo).
// ===== Chaveamento do torneio (estilo Copa do Mundo) =====
// Preliminar (se houver) → 1ª rodada (12 jogos) → 2ª rodada (6) → Grupos A e B (3 decks cada) → Semifinais cruzadas → Final → Campeão.
// Desenhado com posições fixas e linhas em SVG; a área rola na horizontal no celular.
function chaveHTML(S) {
  return withT(S, () => {
    const M = S.M,
      BW = 146,
      BH = 52,
      GX = 28,
      U = 60,
      TOP = 26,
      // com preliminar, tudo anda uma coluna para a direita
      o = M['pre-1'] ? 1 : 0,
      X = c => (c + o) * (BW + GX);
    const cy = {};
    for (let k = 1; k <= 12; k++) cy['r1-' + k] = TOP + (k - 1) * U + BH / 2;
    for (let k = 1; k <= 6; k++) cy['r2-' + k] = (cy['r1-' + (2 * k - 1)] + cy['r1-' + 2 * k]) / 2;
    const gA = { t: cy['r2-1'] - BH / 2, b: cy['r2-3'] + BH / 2 },
      gB = { t: cy['r2-4'] - BH / 2, b: cy['r2-6'] + BH / 2 };
    gA.c = (gA.t + gA.b) / 2;
    gB.c = (gB.t + gB.b) / 2;
    cy['sf-1'] = gA.c;
    cy['sf-2'] = gB.c;
    cy.f = (gA.c + gB.c) / 2;
    const H = TOP + 12 * U,
      W = X(5) + BW + 6;
    // Preliminar: cada duelo fica na altura do duelo da 1ª rodada para onde vai o vencedor
    Object.values(M)
      .filter(m => m.st === 'pre')
      .forEach(m => {
        const alvo = Object.values(M).find(r => r.st === 'r1' && (r.a.win === m.id || r.b.win === m.id));
        if (alvo) cy[m.id] = cy[alvo.id] + (alvo.a.win === m.id ? -1 : 1) * 0.001;
      });
    let ln = '',
      bx = '';
    const L = (x1, y1, x2, y2, on) => {
      const mx = (x1 + x2) / 2;
      ln += `<path d="M${x1} ${y1}H${mx}V${y2}H${x2}" class="${on ? 'on' : ''}"/>`;
    };
    const nome = i => (i != null ? esc(dn(i)) : '<i>a definir</i>'),
      mini = (i, c = 'bk-art') => (i != null && DECKS[i] ? art(i, c) : '<b class="bk-art bk-vz"></b>');
    const caixa = (id, col) => {
      const m = M[id];
      if (!m) return;
      const i0 = side(m, 0),
        i1 = side(m, 1),
        d = m.w != null,
        y = cy[id] - BH / 2,
        clk = m.h != null && hist.some(h => h.t === m.h);
      const row = (s, i) =>
        `<div class="bk-r ${d ? (m.w === s ? 'w' : 'l') : ''}" style="--pc:${COR[s]}">${mini(i)}<span>${nome(i)}</span>${d && m.lp ? `<b>${m.lp[s]}</b>` : ''}</div>`;
      bx += `<div class="bk-m ${clk ? 'clk' : ''}" style="left:${X(col)}px;top:${y}px;width:${BW}px;height:${BH}px" ${clk ? `onclick="oraHist(${m.h})"` : ''}>${row(0, i0)}${row(1, i1)}</div>`;
    };
    const venc = id => {
      const m = M[id];
      return m && m.w != null;
    };
    Object.values(M)
      .filter(m => m.st === 'pre' && cy[m.id] != null)
      .forEach(m => {
        caixa(m.id, -1);
        ln += `<path d="M${X(-1) + BW} ${cy[m.id]}H${X(0)}" class="${venc(m.id) ? 'on' : ''}"/>`;
      });
    for (let k = 1; k <= 12; k++) {
      caixa('r1-' + k, 0);
      const r2 = 'r2-' + Math.ceil(k / 2);
      L(X(0) + BW, cy['r1-' + k], X(1), cy[r2], venc('r1-' + k));
    }
    for (let k = 1; k <= 6; k++) {
      caixa('r2-' + k, 1);
      ln += `<path d="M${X(1) + BW} ${cy['r2-' + k]}H${X(2)}" class="${venc('r2-' + k) ? 'on' : ''}"/>`;
    }
    ['A', 'B'].forEach(g => {
      const G = g === 'A' ? gA : gB,
        q = stand(g),
        dn2 = q && q.done;
      const rows = q
        ? q.rows
            .map(
              (r, k) =>
                `<div class="bk-g ${dn2 && k < 2 ? 'q' : ''}">${mini(r.i)}<span>${k + 1}º ${esc(dn(r.i))}</span><b>${r.v}V</b></div>`
            )
            .join('')
        : GRP[g]
            .map(
              id => `<div class="bk-g">${mini(res({ win: id }))}<span>${nome(res({ win: id }))}</span></div>`
            )
            .join('');
      bx += `<div class="bk-gr" style="left:${X(2)}px;top:${G.t}px;width:${BW}px;height:${G.b - G.t}px"><div class="bk-gt">GRUPO ${g}</div>${rows}</div>`;
    });
    // Semis cruzadas: 1º A x 2º B e 2º A x 1º B
    L(X(2) + BW, gA.c - 8, X(3), cy['sf-1'] - 10, venc('sf-1'));
    L(X(2) + BW, gB.c - 8, X(3), cy['sf-1'] + 10, venc('sf-1'));
    L(X(2) + BW, gA.c + 8, X(3), cy['sf-2'] - 10, venc('sf-2'));
    L(X(2) + BW, gB.c + 8, X(3), cy['sf-2'] + 10, venc('sf-2'));
    caixa('sf-1', 3);
    caixa('sf-2', 3);
    L(X(3) + BW, cy['sf-1'], X(4), cy.f, venc('sf-1'));
    L(X(3) + BW, cy['sf-2'], X(4), cy.f, venc('sf-2'));
    caixa('f', 4);
    const f = M.f,
      camp = f && f.w != null ? side(f, f.w) : null;
    ln += `<path d="M${X(4) + BW} ${cy.f}H${X(5)}" class="${camp != null ? 'on' : ''}"/>`;
    bx += `<div class="bk-c ${camp != null ? 'on' : ''}" style="left:${X(5)}px;top:${cy.f - (camp != null ? 62 : 34)}px;width:${BW}px">${camp != null ? mini(camp, 'bk-art bk-big') : ''}🏆<span>${camp != null ? esc(dn(camp)) : 'Campeão'}</span>${camp != null ? `<small>${NOMES[f.w]}</small>` : ''}</div>`;
    const hd = [...(o ? ['PRELIMINAR'] : []), '1ª RODADA', '2ª RODADA', 'GRUPOS', 'SEMIFINAIS', 'FINAL', 'CAMPEÃO']
      .map((t, c) => `<div class="bk-h" style="left:${X(c - o)}px;width:${BW}px">${t}</div>`)
      .join('');
    return `<div class="bk-wrap"><div class="chave" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}">${ln}</svg>${hd}${bx}</div></div><p class="cnote" style="margin:4px 0 8px">Arraste para o lado para ver até a final. Toque num duelo jogado para ver a análise do Oráculo.</p>`;
  });
}
