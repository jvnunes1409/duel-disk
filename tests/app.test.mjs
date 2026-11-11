// Testes do app no navegador (Chromium invisível). Rodam a cada push no GitHub Actions.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, fecharNavegador, esperar, PREVISAO } from './ajuda.mjs';

after(fecharNavegador);

test('o app abre sem erros e com os 28 decks e suas listas de cartas', async () => {
  const { pg, erros, fechar } = await abrirApp();
  const r = await pg.evaluate(() => ({
    decks: DECKS.length,
    semCartas: DECKS.filter(d => !(CARDS[d[0]] || []).length).map(d => d[0]),
    // nenhuma lista pode ter menos de 40 cartas contando as cópias (já aconteceu de faltar carta repetida)
    curtos: DECKS.map(d => [d[0], (CARDS[d[0]] || []).reduce((t, x) => t + (+x[3] || 1), 0)]).filter(
      ([, n]) => n < 40
    ),
    torneio: TORN,
  }));
  assert.equal(r.decks, 28);
  assert.deepEqual(r.semCartas, []);
  assert.deepEqual(r.curtos, [], 'deck com menos de 40 cartas na lista');
  assert.equal(r.torneio, 24, 'a chave do torneio tem 24 vagas');
  assert.deepEqual(erros, []);
  await fechar();
});

test('a lista de cartas conta as cópias e separa o Extra Deck (Cavaleiros Fantasmas: 17/9/14 + 10)', async () => {
  const tipo = n =>
    /Xyz|Number|Evilswarm|Leviair|Dante|Break Sword|Cursed Javelin/.test(n)
      ? 'XYZ Monster'
      : /Rusty Bardiche/.test(n)
        ? 'Link Monster'
        : /Spear|Rank-Up|Dark Hole|Monster Reborn|Foolish|Reinforcement|Dark Eruption|Twin Twisters/.test(n)
          ? 'Spell Card'
          : /Fog Blade|Sword|Wing|Shadow Veil|Brigandine|Gauntlets|Tomb Shield|Vambrace|Magnetring|Mist Claws/.test(
                n
              )
            ? 'Trap Card'
            : 'Effect Monster';
  const { pg, erros, fechar } = await abrirApp({
    cartas: nomes =>
      nomes.map((n, k) => ({
        id: k + 1,
        name: n,
        type: tipo(n),
        atk: 1000,
        def: 1000,
        level: 3,
        desc: 'x',
        card_images: [{}],
      })),
  });
  const i = await pg.evaluate(() => DI('Cavaleiros Fantasmas'));
  await pg.evaluate(i => info(i), i);
  await pg.waitForTimeout(300);
  await pg.evaluate(i => document.querySelector('#clN') || cardList(i), i);
  await esperar(pg, () => document.querySelectorAll('.cg').length >= 4);
  assert.equal(await pg.textContent('#clN'), '(40 + 10 no Extra)');
  const grupos = await pg.evaluate(() => [...document.querySelectorAll('.cg')].map(e => e.textContent));
  assert.deepEqual(grupos, ['MONSTROS · 17', 'EXTRA DECK · 10', 'MAGIAS · 9', 'ARMADILHAS · 14']);
  assert.deepEqual(erros, []);
  await fechar();
});

test('jogadas por voz: reconhece cartas em português, várias por frase, e ignora palavras genéricas', async () => {
  const falso = `window.__falas=[];class FR{start(){const t=window.__falas.shift();setTimeout(()=>{const a=t.map(x=>({transcript:x}));a.isFinal=true;this.onresult({results:[a]});this.onend()},20)}stop(){}}
window.webkitSpeechRecognition=FR;window.SpeechRecognition=FR;`;
  const { pg, erros, fechar } = await abrirApp({ antes: falso });
  await pg.evaluate(() => {
    newDuel([DI('Heróis do Destino'), DI('Cavaleiros Fantasmas')]);
    goTab('duelo');
    duel.first = 0;
  });
  await pg.evaluate(() => vPrep());
  const casos = [
    ['ativei o malicioso', ['HERÓI do Destino - Malicioso']],
    ['joão ativou véu sombrio', ['Os Cavaleiros Fantasmas do Véu Sombrio']],
    [
      'ataquei com a distopia e ele ativou a lança dos cavaleiros fantasmas',
      ['HERÓI do Destino - Distopia', 'Cavaleiros Fantasmas - Lança'],
    ],
    ['ativei d ao cubo', ['D ao Cubo']],
    ['invoquei um monstro em defesa', []],
    ['ataquei direto', []],
  ];
  for (const [fala, esperado] of casos) {
    await pg.evaluate(f => {
      __falas.push([f]);
      vOuvir();
    }, fala);
    await pg.waitForTimeout(150);
    const ev = await pg.evaluate(() => duel.ev.at(-1));
    assert.deepEqual(
      (ev.cards || []).map(c => c.pt || c.en),
      esperado,
      fala
    );
  }
  const lanca = await pg.evaluate(() => duel.ev[2].cards[1]);
  assert.equal(lanca.dono, 1, 'a Lança é do deck do João');
  assert.equal(await pg.evaluate(() => duel.ev[1].p), 1, 'dizer "joão" marca a jogada como dele');
  assert.deepEqual(erros, []);
  await fechar();
});

test('o duelo em andamento volta depois de recarregar a página', async () => {
  const { pg, erros, fechar } = await abrirApp();
  await pg.evaluate(() => {
    newDuel([3, 7]);
    goTab('duelo');
    duel.first = 0;
    duel.ann = 1;
    amt = '1500';
    apply(1, -1);
    duel.ev = [{ t: 1, tn: 1, p: 0, fala: 'teste' }];
    dSave(); // o app salva sozinho a cada 2 s; aqui força para o teste não depender do relógio
  });
  await pg.waitForTimeout(500); // deixa o navegador terminar de gravar antes de recarregar
  await pg.reload();
  // espera o app retomar o duelo (em vez de um tempo fixo)
  await esperar(pg, () => typeof duel !== 'undefined' && duel && duel.log && duel.log.length === 1);
  const r = await pg.evaluate(() => ({
    decks: duel.decks,
    lp,
    log: duel.log.length,
    ev: (duel.ev || []).length,
  }));
  assert.deepEqual(r, { decks: [3, 7], lp: [8000, 6500], log: 1, ev: 1 });
  assert.deepEqual(erros, []);
  await fechar();
});

test('lembrete de turno: 2 minutos, e cada "Ainda não" adia 2, 3 e 4 minutos', async () => {
  const relogio =
    '(()=>{let off=0;const N=Date.now.bind(Date);Date.now=()=>N()+off;window.__adv=ms=>{off+=ms}})();';
  const { pg, erros, fechar } = await abrirApp({ antes: relogio });
  await pg.evaluate(() => {
    CFG.tnag = 1;
    newDuel([0, 1]);
    goTab('duelo');
    duel.ann = 1;
    duel.first = 0;
    tnReset();
  });
  const avanca = s => pg.evaluate(ms => (__adv(ms), nagCheck(), NAG), s * 1000);
  assert.equal(await avanca(110), 0, '1min50: ainda não lembra');
  assert.equal(await avanca(15), 1, '2min05: lembra');
  for (const min of [2, 3, 4]) {
    await pg.evaluate(() => nagSnooze());
    assert.equal(await avanca(min * 60 - 10), 0, `adiamento de ${min} min ainda correndo`);
    assert.equal(await avanca(15), 1, `adiamento de ${min} min acabou`);
  }
  assert.deepEqual(erros, []);
  await fechar();
});

test('Oráculo: a previsão sai no sorteio e é descartada se o LP mudar antes de ela chegar', async () => {
  let atraso = 50;
  const { pg, erros, pedidos, fechar } = await abrirApp({
    oraculo: async rota => {
      await new Promise(r => setTimeout(r, atraso));
      return rota === '/prever' ? PREVISAO : { status: 404, json: { error: 'rota não encontrada' } };
    },
  });
  await pg.evaluate(() => {
    newDuel([0, 1]);
    goTab('duelo');
  });
  await esperar(pg, () => duel.ai && duel.ai.st === 'ok');
  const prev = pedidos.find(p => p.rota === '/prever');
  assert.ok(prev, 'a previsão foi pedida');
  assert.ok(prev.corpo.a.cartas.length > 20, 'a IA recebe a lista de cartas');
  assert.match(await pg.textContent('#tmb'), /62% DOUGLAS/);
  atraso = 1500;
  await pg.evaluate(() => {
    newDuel([2, 3]);
    duel.log.push({ t: 1, p: 0, d: -100, lp: 7900, tn: 1 });
  });
  await esperar(pg, () => duel.ai && duel.ai.st !== 'load');
  assert.equal(
    await pg.evaluate(() => duel.ai.st),
    'tarde',
    'previsão que chega depois do primeiro dano não vale'
  );
  assert.deepEqual(erros, []);
  await fechar();
});

test('consistência: a IA marca as cartas de partida, o app faz a conta exata e a previsão recebe os números', async () => {
  const { pg, erros, pedidos, fechar } = await abrirApp({
    cartas: nomes =>
      nomes.map((n, k) => ({ id: k + 1, name: n, type: 'Effect Monster', atk: 1000, def: 1000, level: 4, desc: 'x', card_images: [{}] })),
    oraculo: (rota, corpo) =>
      rota === '/partida'
        ? { partida: [0, 1, 2], tijolos: [3], resumo: 'Precisa de um buscador.' }
        : rota === '/prever'
          ? PREVISAO
          : { status: 404, json: { error: 'rota não encontrada' } },
  });
  const r = await pg.evaluate(async () => {
    const conta = [hiper(40, 8, 5), hiper(40, 8, 6), hiper(40, 4, 5)].map(x => Math.round(x * 1000) / 1000);
    newDuel([0, 1]);
    goTab('duelo');
    return conta;
  });
  assert.deepEqual(r, [0.694, 0.764, 0.427], 'fórmula hipergeométrica');
  await esperar(pg, () => duel.ai && duel.ai.st === 'ok', { timeout: 20000 });
  const prev = pedidos.find(p => p.rota === '/prever').corpo;
  const c = prev.a.consistencia;
  assert.ok(c && c.abre5 > 0 && c.abre5 < 1 && c.abre6 > c.abre5, 'a previsão recebe a consistência calculada');
  assert.equal(pedidos.filter(p => p.rota === '/partida').length, 2, 'uma classificação por deck');
  // a classificação fica guardada: a próxima previsão com os mesmos decks não pergunta de novo
  await pg.evaluate(() => {
    ORAPRE = null;
    newDuel([0, 1]);
  });
  await esperar(pg, () => duel.ai && duel.ai.st === 'ok', { timeout: 20000 });
  assert.equal(pedidos.filter(p => p.rota === '/partida').length, 2);
  // detalhes do deck mostram os números
  await pg.evaluate(() => info(0));
  assert.match(await pg.textContent('#consD'), /abre jogando/);
  assert.deepEqual(erros, []);
  await fechar();
});

test('teste retroativo: nunca envia o resultado e usa só os duelos anteriores no Elo', async () => {
  const { pg, erros, pedidos, fechar } = await abrirApp({ oraculo: () => PREVISAO });
  await pg.evaluate(() => {
    hist = [];
    const t0 = Date.now() - 10 * 864e5;
    for (let k = 0; k < 5; k++)
      hist.unshift({
        t: t0 + k * 864e5,
        w: k % 2,
        dur: 1,
        decks: [DECKS[0][0], DECKS[1][0]],
        lp: [1, 0],
        log: [],
        tn: 3,
      });
    save();
    const st = window.setTimeout;
    window.setTimeout = (f, ms, ...a) => st(f, ms === 2500 ? 0 : ms, ...a);
  });
  await pg.evaluate(() => retroRodar());
  // além das previsões, cada deck pode ter um pedido de classificação de cartas (consistência)
  const prevs = pedidos.filter(p => p.rota !== '/partida');
  assert.equal(prevs.length, 5);
  for (const p of pedidos) {
    const txt = JSON.stringify(p.corpo);
    assert.ok(!/"w":|"lp":|venc/.test(txt), 'o resultado não pode ir para a IA');
  }
  assert.deepEqual(
    prevs.map(p => p.corpo.ctx.jogos[0]),
    [0, 1, 2, 3, 4],
    'cada previsão só conhece os duelos anteriores'
  );
  assert.equal(await pg.evaluate(() => hist.filter(h => h.rt).length), 5);
  assert.deepEqual(erros, []);
  await fechar();
});

test('chaveamento do torneio: 12 + 6 + 2 + 1 duelos, grupos e campeão', async () => {
  const { pg, erros, fechar } = await abrirApp();
  await pg.evaluate(() => {
    T = mkT([...Array(24).keys()]);
    let k = 0;
    const win = (id, w) => {
      const m = T.M[id];
      m.w = w;
      m.lp = w ? [0, 2300] : [1800, 0];
      m.h = Date.now() - ++k * 1000;
      hist.unshift({ t: m.h, w, dur: 1, decks: [dn(side(m, 0)), dn(side(m, 1))], lp: m.lp, log: [] });
    };
    for (let i = 1; i <= 12; i++) win('r1-' + i, i % 2);
    for (let i = 1; i <= 6; i++) win('r2-' + i, i % 2);
    ['A', 'B'].forEach(g => [1, 2, 3].forEach(j => win('g' + g + '-' + j, j % 2)));
    win('sf-1', 0);
    win('sf-2', 1);
    win('f', 0);
    save();
    saveT();
    HV = 'torneios';
    goTab('hist');
    rH();
  });
  const r = await pg.evaluate(() => ({
    caixas: document.querySelectorAll('.chave .bk-m').length,
    grupos: document.querySelectorAll('.chave .bk-gr').length,
    campeao: document.querySelector('.chave .bk-c.on') !== null,
  }));
  assert.deepEqual(r, { caixas: 21, grupos: 2, campeao: true });
  assert.deepEqual(erros, []);
  await fechar();
});

test('torneio novo inclui os 28 decks (preliminar de 4 duelos) sem mexer num torneio antigo de 24', async () => {
  const { pg, erros, fechar } = await abrirApp();
  const r = await pg.evaluate(() => {
    // torneio antigo, de 24 decks, em andamento
    const antigo = mkT([...Array(24).keys()]);
    const nAntigo = Object.keys(antigo.M).length;
    // torneio novo, como o botão Sortear monta
    T = mkT(shuffle([...Array(BASEN).keys()]));
    const M = Object.values(T.M),
      pre = M.filter(m => m.st === 'pre'),
      nomes = new Set(),
      junta = r => r.d && nomes.add(r.d);
    M.forEach(m => (junta(m.a), junta(m.b)));
    // o vencedor da preliminar 1 aparece no duelo certo da 1ª rodada
    const m = T.M['pre-1'];
    m.w = 1;
    const alvo = M.find(x => x.st === 'r1' && (x.a.win === 'pre-1' || x.b.win === 'pre-1'));
    const chega = side(alvo, alvo.a.win === 'pre-1' ? 0 : 1) === side(m, 1);
    TV = null;
    rT();
    return {
      nAntigo,
      preAntigo: Object.keys(antigo.M).filter(k => k.startsWith('pre')).length,
      pre: pre.length,
      total: M.length,
      decks: nomes.size,
      chega,
      destino: destTxt(m),
      abaPrelim: [...document.querySelectorAll('.tstp button')].some(b => b.textContent.includes('Prelim')),
      chave: (() => {
        const d = document.createElement('div');
        d.innerHTML = chaveHTML(T);
        return d.querySelectorAll('.bk-m').length;
      })(),
    };
  });
  assert.equal(r.nAntigo, 27, 'o formato antigo continua com 27 duelos');
  assert.equal(r.preAntigo, 0);
  assert.equal(r.pre, 4);
  assert.equal(r.total, 31);
  assert.equal(r.decks, 28, 'todos os 28 decks entram, sem repetir');
  assert.ok(r.chega, 'o vencedor da preliminar entra na 1ª rodada');
  assert.match(r.destino, /^1ª Rodada · C\d+ com (Douglas|João)$/);
  assert.ok(r.abaPrelim);
  assert.equal(r.chave, 25, 'a chave visual desenha a preliminar');
  assert.deepEqual(erros, []);
  await fechar();
});

test('Stats em abas e 🏆 para os decks campeões', async () => {
  const { pg, erros, fechar } = await abrirApp();
  const r = await pg.evaluate(() => {
    const d0 = DECKS[0][0];
    hist.unshift({ t: Date.now(), w: 0, dur: 60000, decks: [d0, DECKS[1][0]], lp: [8000, 0], log: [] });
    CAMP = [{ t: Date.now(), c: d0, v: DECKS[1][0], p: 0, s: [12, 9] }];
    rLista();
    goTab('stats');
    const secoes = k => {
      STAB = k;
      rS();
      return [...document.querySelectorAll('#stx .sh')].map(e => e.textContent);
    };
    const card = [...document.querySelectorAll('#lista .dk')].find(e => e.querySelector('b').textContent === d0);
    return {
      jog: secoes('jog'),
      deck: secoes('deck'),
      ora: secoes('ora'),
      selo: card.querySelector('.tit')?.textContent,
      dourado: card.classList.contains('camp'),
    };
  });
  assert.ok(r.jog.some(t => t.includes('DOUGLAS × JOÃO')) && !r.jog.some(t => t.includes('RANKING')));
  assert.ok(r.deck.some(t => t.includes('CAMPEÕES DE TORNEIO')) && !r.deck.some(t => t.includes('DOUGLAS')));
  assert.ok(!r.ora.some(t => t.includes('DECKS')));
  assert.equal(r.selo, '🏆');
  assert.ok(r.dourado);
  assert.deepEqual(erros, []);
  await fechar();
});

test('a moeda não herda o estilo do chaveamento (a coroa continua marrom e centralizada)', async () => {
  const { pg, erros, fechar } = await abrirApp();
  await pg.evaluate(() => moeda());
  await pg.waitForTimeout(200);
  const traco = await pg.evaluate(
    () => getComputedStyle(document.querySelector('.coin .bk svg path')).stroke
  );
  assert.equal(traco, 'rgb(90, 61, 0)');
  assert.deepEqual(erros, []);
  await fechar();
});

test('segurança: texto malicioso em deck cadastrado ou backup não injeta HTML no app', async () => {
  // 1) deck cadastrado com nome malicioso já guardado no aparelho (é lido ao abrir o app)
  const ruim = `<img src=x onerror="localStorage.setItem('xss',1)">`;
  const { pg, erros, fechar } = await abrirApp({
    antes: `localStorage.setItem('ygo_custom', JSON.stringify([{ n: 'Deck ' + ${JSON.stringify(ruim)}, t: 3, a: 'LUZ', s: ${JSON.stringify(ruim)}, l: '' }]));`,
  });
  // 2) arquivo de backup com duelo malicioso (sem decks novos, então não recarrega)
  await pg.evaluate(async r => {
    await importText(
      JSON.stringify({
        hist: [{ t: Date.now() - 5000, w: 0, dur: 1, decks: [r, DECKS[1][0]], lp: [1, 0], log: [] }],
      })
    );
    goTab('hist');
    rH();
    goTab('decks');
    rLista();
    info(DECKS.findIndex(d => d[0].startsWith('Deck ')));
  }, ruim);
  await pg.waitForTimeout(500);
  const r = await pg.evaluate(() => ({
    deck: DECKS.some(d => d[0].startsWith('Deck ')),
    duelo: hist.length,
    xss: localStorage.getItem('xss'),
    imgs: document.querySelectorAll('img[src="x"]').length,
  }));
  assert.equal(r.deck, true, 'o deck cadastrado aparece');
  assert.equal(r.duelo, 1, 'o duelo do arquivo foi importado');
  assert.equal(r.xss, null, 'nenhum código de fora rodou');
  assert.equal(r.imgs, 0);
  assert.deepEqual(erros, []);
  await fechar();
});

test('modo demonstração: mostra os dados da demonstração e não toca nos dados de quem visita', async () => {
  const fs = await import('node:fs');
  const arq = new URL('../js/dados/demo-dados.js', import.meta.url);
  const antes = fs.existsSync(arq) ? fs.readFileSync(arq, 'utf8') : null;
  const H = Array.from({ length: 5 }, (_, k) => ({
    t: 1790000000000 + k * 864e5,
    w: k % 2,
    dur: 1,
    decks: ['Yusei Fudo', 'Crow Hogan'],
    lp: [1, 0],
    log: [],
  }));
  fs.writeFileSync(arq, `demoCarregar(${JSON.stringify({ hist: H, cfg: {} })});\n`);
  try {
    const { pg, erros, fechar } = await abrirApp();
    await pg.evaluate(() => {
      hist = [{ t: 1700000000000, w: 0, dur: 1, decks: [DECKS[0][0], DECKS[1][0]], lp: [1, 0], log: [] }];
      save();
    });
    await pg.goto(pg.url() + '?demo');
    await pg.waitForTimeout(1200);
    assert.equal(await pg.evaluate(() => hist.length), 5, 'a demonstração usa os seus próprios dados');
    assert.ok(await pg.evaluate(() => !!document.querySelector('#demob')));
    await pg.evaluate(() => {
      hist = [];
      save();
    });
    await pg.goto(pg.url().replace('?demo', ''));
    await pg.waitForTimeout(1000);
    assert.equal(
      await pg.evaluate(() => hist.length + ':' + hist[0].t),
      '1:1700000000000',
      'dados reais intactos'
    );
    assert.deepEqual(erros, []);
    await fechar();
  } finally {
    if (antes == null) fs.unlinkSync(arq);
    else fs.writeFileSync(arq, antes);
  }
});

test('no PC, o teclado controla o contador de LP', async () => {
  const { pg, erros, fechar } = await abrirApp({ viewport: { width: 1440, height: 860 } });
  await pg.evaluate(() => {
    newDuel([0, 1]);
    goTab('duelo');
    duel.ann = 1;
    duel.first = 0;
  });
  for (const k of ['1', '5', '0', '0', 'j']) await pg.keyboard.press(k);
  for (const k of ['3', '0', '0', 'Shift+D']) await pg.keyboard.press(k);
  assert.deepEqual(await pg.evaluate(() => lp), [8300, 6500]);
  assert.equal(await pg.evaluate(() => getComputedStyle(document.querySelector('#pcp')).display), 'block');
  assert.deepEqual(erros, []);
  await fechar();
});

test('veredito no histórico envia a MVP com o efeito e o relato escrito pelos jogadores', async () => {
  const { pg, erros, pedidos, fechar } = await abrirApp({
    oraculo: rota =>
      rota === '/veredito'
        ? {
            deu_logica: 'sim',
            titulo: 'Roubo decisivo',
            veredito: 'v',
            fator_decisivo: 'f',
            licao_a: 'a',
            licao_b: 'b',
            model: 'm',
          }
        : { status: 404, json: { error: 'rota não encontrada' } },
  });
  const t = await pg.evaluate(() => {
    const t = Date.now() - 9000;
    hist = [
      {
        t,
        w: 0,
        dur: 1,
        decks: ['Rugido do Dragão', 'Yusei Fudo'],
        lp: [8000, 0],
        log: [],
        mvp: { n: 'Roubo Precipitado', en: 'Snatch Steal' },
      },
    ];
    save();
    oraHist(t);
    return t;
  });
  await pg.fill('#oraRel', 'Douglas roubou meu monstro de 4200 de ATK.');
  await pg.evaluate(t => (oraRelSalvar(t, $('#oraRel').value), oraVeredito(t)), t);
  await esperar(pg, () => hist[0].vd);
  const c = pedidos.find(p => p.rota === '/veredito').corpo;
  assert.equal(c.mvp.nome, 'Roubo Precipitado');
  assert.equal(c.mvp.jogador, 'Douglas');
  assert.equal(c.relato, 'Douglas roubou meu monstro de 4200 de ATK.');
  assert.equal(await pg.evaluate(() => hist[0].nota), 'Douglas roubou meu monstro de 4200 de ATK.');
  assert.match(await pg.textContent('#box'), /Refazer o veredito/);
  assert.deepEqual(erros, []);
  await fechar();
});

test('segurança: a política de conteúdo (CSP) bloqueia scripts de outros sites', async () => {
  const { pg, erros, fechar } = await abrirApp();
  const r = await pg.evaluate(
    () =>
      new Promise(ok => {
        // prova que quem barrou foi a CSP (e não só um endereço inexistente)
        document.addEventListener('securitypolicyviolation', e => ok('bloqueado pela CSP: ' + e.violatedDirective));
        const s = document.createElement('script');
        s.src = 'https://site-malicioso.example/roubo.js';
        s.onload = () => ok('carregou');
        document.head.appendChild(s);
        setTimeout(() => ok('sem resposta'), 4000);
      })
  );
  assert.match(r, /^bloqueado pela CSP: script-src/);
  const csp = await pg.getAttribute('meta[http-equiv="Content-Security-Policy"]', 'content');
  assert.match(csp, /object-src 'none'/);
  assert.deepEqual(erros, []);
  await fechar();
});
