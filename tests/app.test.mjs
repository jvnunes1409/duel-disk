// Testes do app no navegador (Chromium invisível). Rodam a cada push no GitHub Actions.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, fecharNavegador, PREVISAO } from './ajuda.mjs';

after(fecharNavegador);

test('o app abre sem erros e com os 28 decks e suas listas de cartas', async () => {
  const { pg, erros, fechar } = await abrirApp();
  const r = await pg.evaluate(() => ({
    decks: DECKS.length,
    semCartas: DECKS.filter(d => !(CARDS[d[0]] || []).length).map(d => d[0]),
    torneio: TORN,
  }));
  assert.equal(r.decks, 28);
  assert.deepEqual(r.semCartas, []);
  assert.equal(r.torneio, 24, 'o torneio usa só os 24 decks originais');
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
  await pg.waitForFunction(() => document.querySelectorAll('.cg').length >= 4, null, { timeout: 10000 });
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
  });
  await pg.waitForTimeout(2300);
  await pg.reload();
  await pg.waitForTimeout(1200);
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
  await pg.waitForFunction(() => duel.ai && duel.ai.st === 'ok', null, { timeout: 10000 });
  assert.equal(pedidos[0].rota, '/prever');
  assert.ok(pedidos[0].corpo.a.cartas.length > 20, 'a IA recebe a lista de cartas');
  assert.match(await pg.textContent('#tmb'), /62% DOUGLAS/);
  atraso = 1500;
  await pg.evaluate(() => {
    newDuel([2, 3]);
    duel.log.push({ t: 1, p: 0, d: -100, lp: 7900, tn: 1 });
  });
  await pg.waitForFunction(() => duel.ai && duel.ai.st !== 'load', null, { timeout: 10000 });
  assert.equal(
    await pg.evaluate(() => duel.ai.st),
    'tarde',
    'previsão que chega depois do primeiro dano não vale'
  );
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
  assert.equal(pedidos.length, 5);
  for (const p of pedidos) {
    const txt = JSON.stringify(p.corpo);
    assert.ok(!/"w":|"lp":|venc/.test(txt), 'o resultado não pode ir para a IA');
  }
  assert.deepEqual(
    pedidos.map(p => p.corpo.ctx.jogos[0]),
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
