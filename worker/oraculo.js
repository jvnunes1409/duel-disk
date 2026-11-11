// Oráculo do Duelo — Cloudflare Worker
// Fica entre o DuelDisk (GitHub Pages) e a API do Gemini, para a chave nunca aparecer no HTML.
//
// Variáveis no painel da Cloudflare (Settings → Variables and Secrets):
//   GEMINI_KEY      (Secret)  chave criada no Google AI Studio
//   MODEL           (texto)   opcional; padrão abaixo
//   ALLOWED_ORIGIN  (texto)   opcional; padrão https://jvnunes1409.github.io
//   ALLOW_LOCAL     (texto)   opcional; '1' aceita também http://localhost (testes no computador)
//
// Rotas:
//   POST /prever   → previsão antes do duelo (quem é favorito, chance, cartas-chave, plano do azarão)
//   POST /cronica  → resumo depois do duelo, a partir do histórico de LP

const DEFAULT_MODEL = 'gemini-3.8-flash';
const VERSAO = 16;

// O que os jogadores informaram depois do duelo: a carta MVP (com efeito e dono) e um relato curto.
// Aceita o formato antigo (MVP só com o nome) e o novo (objeto).
function contextoJogadores(b, nomes) {
  const m = b.mvp,
    L = [];
  if (m && typeof m === 'object')
    L.push(
      `CARTA MVP (escolhida pelos jogadores como a carta que decidiu o duelo): ${clip(m.nome, 80)}${m.en && m.en !== m.nome ? ' (' + clip(m.en, 80) + ')' : ''}, do deck ${clip(m.deck, 60)}, usada por ${clip(m.jogador, 30)}${m.efeito ? '. Efeito: ' + clip(m.efeito, 400) : ''}`
    );
  else if (m)
    L.push('CARTA MVP (escolhida pelos jogadores como a carta que decidiu o duelo): ' + clip(m, 80));
  if (b.relato)
    L.push('RELATO DOS JOGADORES (o que aconteceu, contado por quem jogou): "' + clip(b.relato, 400) + '"');
  return L.join('\n');
}

// Freio contra abuso: o endereço do Worker é público (está no app), então cada IP tem um limite de pedidos.
// Fica na memória da instância; não é perfeito, mas impede que alguém gaste a cota grátis do Gemini em loop.
const LIMITE_PEDIDOS = 120,
  JANELA_MS = 10 * 60_000;
const VISTOS = new Map();
function freio(ip) {
  const agora = Date.now();
  const lista = (VISTOS.get(ip) || []).filter(t => agora - t < JANELA_MS);
  if (lista.length >= LIMITE_PEDIDOS) {
    VISTOS.set(ip, lista);
    return true;
  }
  lista.push(agora);
  VISTOS.set(ip, lista);
  if (VISTOS.size > 5000) VISTOS.clear();
  return false;
}

// Cartas de uma jogada falada (formato novo: várias por fala; antigo: uma só)
function cartasJ(j, nomes, comEfeito) {
  const cs =
    Array.isArray(j.cartas) && j.cartas.length
      ? j.cartas
      : j.carta
        ? [{ carta: j.carta, nome_pt: j.nome_pt, dono: j.dono, efeito: j.efeito }]
        : [];
  if (!cs.length) return ' → nenhuma carta reconhecida';
  return (
    ' → cartas: ' +
    cs
      .slice(0, 4)
      .map(
        c =>
          clip(c.nome_pt || c.carta, 80) +
          (c.nome_pt ? ' (' + clip(c.carta, 80) + ')' : '') +
          (c.dono != null ? ', do deck de ' + nomes[c.dono] : '') +
          (comEfeito && c.efeito ? ' | efeito: ' + clip(c.efeito, 300) : '')
      )
      .join(' ; ')
  );
}
const FALLBACK_MODEL = 'gemini-3.5-flash-lite'; // usado se o principal passar de LIMITE_MS
const LIMITE_MS = 45_000;
const DEFAULT_ORIGIN = 'https://jvnunes1409.github.io';
const MAX_BODY = 200_000;

const CHAVE = {
  type: 'OBJECT',
  properties: {
    carta: { type: 'STRING', description: 'Nome da carta em português, como na lista' },
    motivo: { type: 'STRING', description: 'Por que essa carta decide este confronto (1 a 2 frases)' },
  },
  required: ['carta', 'motivo'],
};

const PREVER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    chance_a: { type: 'NUMBER', description: 'Probabilidade de 0 a 1 de o deck A vencer' },
    resumo: { type: 'STRING', description: 'Uma ou duas frases: quem é favorito e o motivo principal' },
    analise: {
      type: 'STRING',
      description:
        'Análise do confronto em 3 parágrafos separados por linha em branco: (1) ritmo e estilo de cada deck, (2) as interações diretas entre cartas dos dois decks que mais pesam, (3) o que costuma decidir o duelo',
    },
    plano_a: {
      type: 'STRING',
      description:
        'Plano de jogo do deck A contra este oponente: o que buscar na mão inicial, como abrir, o que guardar para responder (4 a 6 frases)',
    },
    plano_b: { type: 'STRING', description: 'Plano de jogo do deck B contra este oponente (4 a 6 frases)' },
    chaves_a: { type: 'ARRAY', items: CHAVE, description: '3 ou 4 cartas do deck A que decidem o confronto' },
    chaves_b: { type: 'ARRAY', items: CHAVE, description: '3 ou 4 cartas do deck B que decidem o confronto' },
    plano_azarao: {
      type: 'STRING',
      description:
        'Como o deck menos favorito pode vencer: mãos ideais, blefe, tempo, cartas que viram o jogo (3 a 5 frases)',
    },
    confianca: { type: 'STRING', enum: ['baixa', 'media', 'alta'] },
  },
  required: [
    'chance_a',
    'resumo',
    'analise',
    'plano_a',
    'plano_b',
    'chaves_a',
    'chaves_b',
    'plano_azarao',
    'confianca',
  ],
};

const CRONICA_SCHEMA = {
  type: 'OBJECT',
  properties: {
    titulo: { type: 'STRING', description: 'Título curto, estilo episódio de anime' },
    cronica: { type: 'STRING', description: 'Narração do duelo em 3 a 5 frases' },
    virada: { type: 'STRING', description: 'O momento decisivo, citando o turno' },
    oraculo: { type: 'STRING', description: 'Uma frase avaliando se a previsão acertou e o que ela não viu' },
  },
  required: ['titulo', 'cronica', 'virada', 'oraculo'],
};

const VEREDITO_SCHEMA = {
  type: 'OBJECT',
  properties: {
    deu_logica: {
      type: 'STRING',
      enum: ['sim', 'zebra', 'equilibrado'],
      description:
        'sim = venceu quem era favorito pelas cartas; zebra = venceu o azarão; equilibrado = não havia favorito claro',
    },
    titulo: { type: 'STRING', description: 'Uma frase de veredito, direta' },
    veredito: {
      type: 'STRING',
      description:
        '2 ou 3 parágrafos separados por linha em branco: o resultado era esperado pelas listas? Que estratégia de um deck atrapalha a do outro? O que o registro do duelo mostra?',
    },
    fator_decisivo: {
      type: 'STRING',
      description:
        'O que provavelmente decidiu o duelo (2 a 3 frases), separando o que é certeza do registro do que é dedução',
    },
    licao_a: {
      type: 'STRING',
      description: 'O que o jogador do deck A pode fazer diferente ou repetir neste confronto (2 a 3 frases)',
    },
    licao_b: { type: 'STRING', description: 'O mesmo para o deck B (2 a 3 frases)' },
  },
  required: ['deu_logica', 'titulo', 'veredito', 'fator_decisivo', 'licao_a', 'licao_b'],
};

// Consistência: a IA só CLASSIFICA as cartas (o que ela faz bem, lendo os efeitos);
// a probabilidade de abrir bem é calculada pelo app com a fórmula hipergeométrica (conta exata).
const PARTIDA_SCHEMA = {
  type: 'OBJECT',
  properties: {
    partida: {
      type: 'ARRAY',
      items: { type: 'INTEGER' },
      description: 'Números das cartas de partida (ver as instruções)',
    },
    tijolos: {
      type: 'ARRAY',
      items: { type: 'INTEGER' },
      description: 'Números das cartas que travam a mão inicial (ver as instruções)',
    },
    resumo: { type: 'STRING', description: 'Uma frase: o que este deck precisa ter na mão para começar a jogar' },
  },
  required: ['partida', 'tijolos', 'resumo'],
};
const SYSTEM_PARTIDA = `Você é um analista de Yu-Gi-Oh! TCG. Recebe o Deck Principal de um deck casual (Structure Deck ou deck de personagem), com as cartas numeradas e o efeito de cada uma.
Responda em português do Brasil e classifique as cartas pelo número:
- partida: cartas que, sozinhas na mão inicial, já colocam a estratégia do deck para andar no primeiro ou segundo turno. Exemplos: buscadores do arquétipo, monstros de Invocação-Normal que geram vantagem ou invocam outros, magias que buscam ou invocam peças-chave. NÃO inclua cartas genéricas de resposta (armadilhas de negação, remoção, Effect Veiler) nem cartas que só funcionam com outras já em campo.
- tijolos: cartas que ficam "mortas" se vierem na mão inicial sem preparo. Exemplos: monstros de nível 7 ou mais sem forma fácil de invocar, cartas que só servem no cemitério ou depois de combos, peças de vitória alternativa. Uma carta não pode ser partida e tijolo ao mesmo tempo.
Use apenas os números da lista. Seja criterioso: um deck casual costuma ter de 4 a 14 cartas de partida (contando as cópias).`;

const SYSTEM_PREVER = `Você é o Oráculo do Duelo, analista de Yu-Gi-Oh! TCG para duelos casuais entre dois jogadores com decks físicos (Structure Decks e decks de personagem, sem side deck).
Responda em português do Brasil.
Regras para a chance:
- Baseie-se nas listas de cartas: consistência, poder das cartas, interação com o deck adversário e matchups ruins (ex.: remoção em massa contra deck que enche o campo).
- Use os dados do histórico (Elo e confronto direto) como evidência, mas com amostra pequena dê pouco peso a eles.
- Yu-Gi-Oh! tem muita variância de mão inicial: evite chances acima de 0.85 ou abaixo de 0.15, a não ser com diferença enorme de poder.
- Quando vier a CONSISTÊNCIA de um deck, ela é um cálculo exato (probabilidade de a mão inicial ter pelo menos uma carta de partida e de vir com tijolos). Use-a: um deck mais forte mas pouco consistente perde vários duelos só pela mão; um deck mais fraco e muito consistente ganha chances. Mencione isso na análise quando a diferença entre os dois for relevante.
- Seja calibrado: 0.6 deve significar que o deck A vence cerca de 6 em cada 10 duelos.
Sobre a lista de cartas: cada linha traz o nome em português, o nome em inglês entre parênteses e, entre colchetes, tipo, status e o efeito resumido (quando disponível).
Os jogadores usam cartas físicas em português: cite SEMPRE o nome em português, exatamente como está antes dos parênteses. Use o nome em inglês só quando a carta não tiver nome em português na lista. Nunca escreva os dois nomes juntos.
Nos textos, chame os decks pelo nome (ex.: "Reis de Fogo"), nunca de "Deck A" ou "Deck B"; A e B servem só para os campos chance_a, plano_a, chaves_a etc.
Seja concreto: cite cartas pelo nome, explique interações específicas (qual carta responde a qual) e use os efeitos da lista em vez de suposições.`;

const SYSTEM_CRONICA = `Você é o narrador do Oráculo do Duelo, de um app de Yu-Gi-Oh! usado em duelos casuais em família.
Responda em português do Brasil, com o tom empolgado de narrador de anime, mas sem inventar jogadas.
Você recebe dois registros, ambos com turno e segundos desde o início:
- LP: cada dano ou cura, exato.
- Jogadas faladas: o que um jogador disse em voz alta durante o duelo (transcrição automática, pode ter erros), com a carta reconhecida e o texto do efeito dela.
Como narrar:
- Uma fala pode citar várias cartas, inclusive do oponente ("do deck de X"): normalmente é uma ação e a resposta a ela.
- Cruze os dois registros: se uma carta foi falada e logo depois houve dano ou cura no mesmo turno, use o efeito da carta para deduzir o que aconteceu, mas deixe claro quando é dedução ("tudo indica que", "provavelmente").
- Quando a carta é do deck do outro jogador, quem falou provavelmente reagiu a ela (destruiu, negou, sofreu o efeito).
- Se a carta tem vários efeitos, só afirme qual foi usado se a fala ou o LP deixarem claro.
- Só cite cartas que aparecem nas jogadas faladas ou na MVP. Nunca invente cartas, ataques ou mãos.
- A CARTA MVP e o RELATO DOS JOGADORES são fatos: use-os como momento central da narração.
- Sem jogadas faladas, narre a partir do LP, da MVP e do relato, sem citar outras cartas.
- Cite cartas pelo nome em português quando houver (as cartas físicas são em português).`;

const SYSTEM_VEREDITO = `Você é o Oráculo do Duelo, analista de Yu-Gi-Oh! TCG, revendo um duelo casual que já terminou, entre dois jogadores com decks físicos.
Responda em português do Brasil, em tom de comentarista técnico, direto e honesto.
Sua tarefa: dizer se o resultado "deu a lógica" e explicar por quê, olhando as listas de cartas e efeitos dos dois decks.
- Avalie o confronto pelas listas: qual deck tinha vantagem, quais cartas de um deck anulam a estratégia do outro, que mão cada um precisava.
- Use o registro de LP e as jogadas faladas como evidência do que aconteceu. Você não viu o duelo: o que não está no registro é dedução, deixe isso claro ("provavelmente", "tudo indica").
- Se houve previsão antes do duelo, diga se ela fazia sentido e o que ela não considerou.
- Quando houver jogadas faladas, use-as nas lições: aponte jogadas que funcionaram e as que provavelmente foram erros (ex.: usou uma carta cedo demais, gastou uma resposta num alvo fraco, deixou de usar uma carta-chave), sempre citando o turno.
- Uma jogada pode citar cartas dos dois decks (uma ação e a resposta do oponente); "do deck de X" indica de quem é a carta.
- A CARTA MVP e o RELATO DOS JOGADORES são fatos contados por quem jogou: têm prioridade sobre qualquer dedução. Quando existirem, o veredito precisa explicar como essa carta (pelo efeito dela) e esse momento decidiram o duelo, ligando ao registro de LP, e as lições devem dizer como o outro jogador poderia ter evitado ou respondido.
- Nunca invente jogadas, cartas ou mãos que não estejam no registro, na MVP ou no relato.
- Cite cartas SEMPRE pelo nome em português (o que vem antes dos parênteses na lista); inglês só se não houver nome em português.
- Chame os decks pelo nome, nunca de "Deck A" ou "Deck B".`;

function promptVeredito(b) {
  const nomes = b.nomes || ['Jogador 1', 'Jogador 2'];
  const log = (b.log || [])
    .slice(-60)
    .map(
      e =>
        `T${e.tn} ${Math.round(e.s)}s: ${nomes[e.p]} ${e.d < 0 ? 'sofreu ' + -e.d : 'recuperou ' + e.d} (LP ${e.lp})`
    )
    .join('\n');
  const jog = (b.jogadas || [])
    .slice(0, 80)
    .map(
      j =>
        `T${j.tn} ${j.s}s: ${j.p == null ? '?' : nomes[j.p]} disse "${clip(j.fala, 200)}"` +
        cartasJ(j, nomes, false)
    )
    .join('\n');
  const pct = x => (typeof x === 'number' ? Math.round(x * 100) + '%' : 'sem dado');
  return `${deckTxt('DECK A (' + nomes[0] + ')', b.a)}

${deckTxt('DECK B (' + nomes[1] + ')', b.b)}

RESULTADO: venceu ${nomes[b.w]} com ${b.w === 0 ? b.a?.nome : b.b?.nome}. LP final ${b.lp?.[0]} x ${b.lp?.[1]}. Duração ${Math.round((b.dur || 0) / 60000)} min, ${b.turnos || '?'} turnos.
${contextoJogadores(b, nomes)}
Chance de ${nomes[0]} antes do duelo: Oráculo ${b.previsao ? pct(b.previsao.chance_a) + ' (' + clip(b.previsao.resumo, 300) + ')' : 'não fez previsão'}; Elo ${pct(b.eloP)}; tier ${pct(b.tierP)}.

Registro de LP:
${log || '(vazio: o vencedor foi declarado sem registrar dano)'}

Jogadas faladas:
${jog || '(nenhuma)'}

Deu a lógica?`;
}

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGIN || DEFAULT_ORIGIN).split(',').map(s => s.trim());
  // localhost só é aceito se a variável ALLOW_LOCAL=1 estiver no Worker (para testar o app no computador)
  const ok =
    allowed.includes(origin) ||
    (env.ALLOW_LOCAL === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || ''));
  return {
    ok,
    headers: {
      'Access-Control-Allow-Origin': ok ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  };
}

// Cabeçalhos de segurança em toda resposta: sem cache, sem "adivinhar" o tipo do conteúdo
const SEG = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
};
const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, ...SEG, 'Content-Type': 'application/json; charset=utf-8' },
  });

const clip = (s, n) => String(s ?? '').slice(0, n);

const pctN = x => (Number.isFinite(+x) ? Math.round(Math.min(1, Math.max(0, +x)) * 100) + '%' : '?');
function consistenciaTxt(c) {
  if (!c || !Number.isFinite(+c.abre5)) return '';
  const n = k => Math.max(0, Math.min(99, Math.round(+c[k] || 0)));
  return `
Consistência (cálculo exato, Deck Principal de ${n('cartas')} cartas, ${n('partida')} cartas de partida e ${n('tijolos')} tijolos contando as cópias): abre com pelo menos uma carta de partida ${pctN(c.abre5)} das vezes com 5 cartas na mão (quem começa) e ${pctN(c.abre6)} com 6; chance de 2 ou mais tijolos na mão inicial: ${pctN(c.tijolo2)}.`;
}
function promptPartida(b) {
  const cartas = (b.cartas || [])
    .slice(0, 60)
    .map((c, i) => `${i + 1}. ${clip(c, 420)}`)
    .join('\n');
  return `Deck: ${clip(b.nome, 60)}
Estratégia: ${clip(b.estrategia, 400)}
Deck Principal (o número antes do ponto identifica a carta; "3x" = três cópias):
${cartas}`;
}
function deckTxt(rotulo, d) {
  const cartas = (d.cartas || [])
    .slice(0, 80)
    .map(c => '- ' + clip(c, 420))
    .join('\n');
  return `${rotulo}: ${clip(d.nome, 60)} (Tier ${d.tier} de 1 a 5, 1 = mais forte, segundo os jogadores)
Estratégia: ${clip(d.estrategia, 400)}
Pontos fortes: ${clip(d.fortes, 300)}
Pontos fracos: ${clip(d.fracos, 300)}${consistenciaTxt(d.consistencia)}
Lista:
${cartas || 'não informada'}`;
}

function promptPrever(b) {
  const c = b.ctx || {};
  const h2h = c.h2h || { a: 0, b: 0 };
  return `${deckTxt('DECK A', b.a)}

${deckTxt('DECK B', b.b)}

Histórico dos dois jogadores com estes decks:
- Elo atual: A ${Math.round(c.elo?.[0] ?? 1500)}, B ${Math.round(c.elo?.[1] ?? 1500)} (${c.jogos?.[0] ?? 0} e ${c.jogos?.[1] ?? 0} duelos registrados)
- Confronto direto A x B: ${h2h.a} x ${h2h.b}

Qual a chance de o DECK A vencer este duelo?`;
}

function promptCronica(b) {
  const nomes = b.nomes || ['Jogador 1', 'Jogador 2'];
  const log = (b.log || [])
    .slice(-60)
    .map(
      e =>
        `T${e.tn} ${Math.round(e.s)}s: ${nomes[e.p]} ${e.d < 0 ? 'sofreu ' + -e.d : 'recuperou ' + e.d} (LP ${e.lp})`
    )
    .join('\n');
  const jog = (b.jogadas || [])
    .slice(0, 80)
    .map(
      j =>
        `T${j.tn} ${j.s}s: ${j.p == null ? '?' : nomes[j.p]} disse "${clip(j.fala, 200)}"` +
        cartasJ(j, nomes, true)
    )
    .join('\n');
  const prev = b.previsao
    ? `Previsão do Oráculo antes do duelo: ${Math.round(b.previsao.chance_a * 100)}% para ${nomes[0]} (${clip(b.previsao.resumo, 300)})`
    : 'O Oráculo não fez previsão para este duelo.';
  return `${nomes[0]} jogou com ${clip(b.decks?.[0], 60)} e ${nomes[1]} com ${clip(b.decks?.[1], 60)}.
Vencedor: ${nomes[b.w]}. Duração: ${Math.round((b.dur || 0) / 60000)} min, ${b.turnos || '?'} turnos. LP final: ${b.lp?.[0]} x ${b.lp?.[1]}.
${contextoJogadores(b, nomes)}
${prev}

Registro de LP:
${log || '(vazio: o vencedor foi declarado sem registrar dano)'}

Jogadas faladas:
${jog || '(nenhuma)'}`;
}

// Pensamento curto: o Oráculo precisa responder em segundos, não em minutos.
// Modelos 2.x usam thinkingBudget, os 3.x usam thinkingLevel; se o modelo recusar, tenta sem.
function thinking(model) {
  if (/^gemini-2\./.test(model)) return { thinkingBudget: 0 };
  return { thinkingLevel: 'low' };
}

// leve = tarefa simples (ex.: classificar cartas): começa pelo modelo rápido e usa o principal só de reserva
async function gemini(env, system, prompt, schema, temperature, leve) {
  let principal = env.MODEL || DEFAULT_MODEL;
  let reserva = env.FALLBACK_MODEL || FALLBACK_MODEL;
  if (leve && reserva) [principal, reserva] = [reserva, principal];
  const t0 = Date.now();
  try {
    return await geminiModel(env, principal, system, prompt, schema, temperature, LIMITE_MS, t0);
  } catch (e) {
    // Lento demais (ou modelo indisponível): tenta o modelo leve uma vez
    if (reserva && reserva !== principal && (e.lento || e.status === 502 || e.sobrecarga)) {
      try {
        return await geminiModel(env, reserva, system, prompt, schema, temperature, LIMITE_MS, Date.now());
      } catch (e2) {
        if (e.sobrecarga || e2.sobrecarga) {
          e2.message = 'Gemini sobrecarregado (503) nos dois modelos: ' + e2.message;
          e2.status = 503;
        }
        throw e2;
      }
    }
    throw e;
  }
}

async function geminiModel(env, model, system, prompt, schema, temperature, limite, t0) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), limite);
  const call = comThinking =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
          responseSchema: schema,
          ...(comThinking ? { thinkingConfig: thinking(model) } : {}),
        },
      }),
      signal: ctrl.signal,
    });
  try {
    let r;
    const sobrecarga = st => st === 503 || st === 500 || st === 429;
    try {
      r = await call(true);
      // Servidor do Gemini sobrecarregado: espera um pouco e tenta de novo (até 2 vezes) antes de desistir deste modelo
      for (const espera of [1500, 4000]) {
        if (!sobrecarga(r.status) || Date.now() - t0 + espera > limite) break;
        await new Promise(ok => setTimeout(ok, espera));
        r = await call(true);
      }
    } catch (e) {
      const err = new Error(`${model} passou de ${Math.round(limite / 1000)}s sem responder`);
      err.lento = true;
      err.status = 504;
      throw err;
    }
    if (r.status === 400) {
      const t = await r.clone().text();
      if (/thinking/i.test(t)) {
        try {
          r = await call(false);
        } catch (e) {
          const err = new Error(`${model} passou de ${Math.round(limite / 1000)}s sem responder`);
          err.lento = true;
          err.status = 504;
          throw err;
        }
      }
    }
    if (!r.ok) {
      const t = await r.text();
      const err = new Error(`Gemini ${r.status}: ${t.slice(0, 300)}`);
      err.status = r.status === 429 ? 429 : 502;
      err.sobrecarga = sobrecarga(r.status);
      throw err;
    }
    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    try {
      return { data: JSON.parse(text), model, ms: Date.now() - t0 };
    } catch {
      const err = new Error('Resposta da IA veio fora do formato JSON');
      err.status = 502;
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const { ok, headers } = cors(origin, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST')
      return json(
        { ok: true, oraculo: 'online', versao: VERSAO, modelo: env.MODEL || DEFAULT_MODEL },
        200,
        headers
      );
    if (!ok) return json({ error: 'origem não permitida' }, 403, headers);
    if (!env.GEMINI_KEY) return json({ error: 'GEMINI_KEY não configurada no Worker' }, 500, headers);

    if (new URL(req.url).pathname !== '/diagnostico' && freio(req.headers.get('CF-Connecting-IP') || 'x'))
      return json({ error: 'muitos pedidos seguidos (429); espere alguns minutos' }, 429, headers);
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: 'pedido grande demais' }, 413, headers);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: 'JSON inválido' }, 400, headers);
    }

    const path = new URL(req.url).pathname;
    try {
      if (path === '/prever') {
        if (!body.a || !body.b) return json({ error: 'faltam os decks' }, 400, headers);
        const { data, model, ms } = await gemini(env, SYSTEM_PREVER, promptPrever(body), PREVER_SCHEMA, 0.3);
        const chance = Math.min(0.95, Math.max(0.05, Number(data.chance_a) || 0.5));
        return json({ ...data, chance_a: chance, model, ms }, 200, headers);
      }
      if (path === '/partida') {
        const n = Array.isArray(body.cartas) ? Math.min(60, body.cartas.length) : 0;
        if (!n) return json({ error: 'faltam as cartas' }, 400, headers);
        const { data, model } = await gemini(env, SYSTEM_PARTIDA, promptPartida(body), PARTIDA_SCHEMA, 0.1, true);
        // só números válidos, sem repetir, e nunca a mesma carta nas duas listas (números de 1 a n viram 0 a n-1)
        const limpa = a => [...new Set((Array.isArray(a) ? a : []).map(Number))].filter(x => Number.isInteger(x) && x >= 1 && x <= n).map(x => x - 1);
        const partida = limpa(data.partida),
          tijolos = limpa(data.tijolos).filter(x => !partida.includes(x));
        return json({ partida, tijolos, resumo: clip(data.resumo, 300), model }, 200, headers);
      }
      if (path === '/diagnostico') {
        // Testa cada modelo com um pedido mínimo e mede o tempo: mostra no app o que está funcionando agora
        const modelos = [...new Set([env.MODEL || DEFAULT_MODEL, env.FALLBACK_MODEL || FALLBACK_MODEL])];
        const res = await Promise.all(
          modelos.map(async m => {
            const t = Date.now(),
              c = new AbortController(),
              tm = setTimeout(() => c.abort(), 20_000);
            try {
              const r = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
                {
                  method: 'POST',
                  signal: c.signal,
                  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
                  body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: 'Responda só: ok' }] }],
                    generationConfig: { thinkingConfig: thinking(m) },
                  }),
                }
              );
              const txt = await r.text();
              return {
                modelo: m,
                ok: r.ok,
                status: r.status,
                ms: Date.now() - t,
                erro: r.ok ? '' : txt.slice(0, 200),
              };
            } catch (e) {
              return {
                modelo: m,
                ok: false,
                status: 0,
                ms: Date.now() - t,
                erro: e.name === 'AbortError' ? 'sem resposta em 20 s' : String(e.message || e),
              };
            } finally {
              clearTimeout(tm);
            }
          })
        );
        return json({ versao: VERSAO, modelos: res }, 200, headers);
      }
      if (path === '/veredito') {
        if (!body.a || !body.b) return json({ error: 'faltam os decks' }, 400, headers);
        const { data, model, ms } = await gemini(
          env,
          SYSTEM_VEREDITO,
          promptVeredito(body),
          VEREDITO_SCHEMA,
          0.4
        );
        return json({ ...data, model, ms }, 200, headers);
      }
      if (path === '/cronica') {
        const { data, model } = await gemini(env, SYSTEM_CRONICA, promptCronica(body), CRONICA_SCHEMA, 0.8);
        return json({ ...data, model }, 200, headers);
      }
      return json({ error: 'rota não encontrada' }, 404, headers);
    } catch (e) {
      return json({ error: e.message }, e.status || 500, headers);
    }
  },
};
