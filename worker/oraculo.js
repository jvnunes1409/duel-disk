// Oráculo do Duelo — Cloudflare Worker
// Fica entre o DuelDisk (GitHub Pages) e a API do Gemini, para a chave nunca aparecer no HTML.
//
// Variáveis no painel da Cloudflare (Settings → Variables and Secrets):
//   GEMINI_KEY      (Secret)  chave criada no Google AI Studio
//   MODEL           (texto)   opcional; padrão abaixo
//   ALLOWED_ORIGIN  (texto)   opcional; padrão https://jvnunes1409.github.io
//
// Rotas:
//   POST /prever   → previsão antes do duelo (quem é favorito, chance, cartas-chave, plano do azarão)
//   POST /cronica  → resumo depois do duelo, a partir do histórico de LP

const DEFAULT_MODEL = 'gemini-3.8-flash';
const VERSAO = 8;

// Freio contra abuso: o endereço do Worker é público (está no app), então cada IP tem um limite de pedidos.
// Fica na memória da instância; não é perfeito, mas impede que alguém gaste a cota grátis do Gemini em loop.
const LIMITE_PEDIDOS = 30, JANELA_MS = 10 * 60_000;
const VISTOS = new Map();
function freio(ip) {
  const agora = Date.now();
  const lista = (VISTOS.get(ip) || []).filter(t => agora - t < JANELA_MS);
  if (lista.length >= LIMITE_PEDIDOS) { VISTOS.set(ip, lista); return true; }
  lista.push(agora); VISTOS.set(ip, lista);
  if (VISTOS.size > 5000) VISTOS.clear();
  return false;
}

// Cartas de uma jogada falada (formato novo: várias por fala; antigo: uma só)
function cartasJ(j, nomes, comEfeito) {
  const cs = Array.isArray(j.cartas) && j.cartas.length ? j.cartas : (j.carta ? [{ carta: j.carta, nome_pt: j.nome_pt, dono: j.dono, efeito: j.efeito }] : []);
  if (!cs.length) return ' → nenhuma carta reconhecida';
  return ' → cartas: ' + cs.slice(0, 4).map(c =>
    clip(c.nome_pt || c.carta, 80) + (c.nome_pt ? ' (' + clip(c.carta, 80) + ')' : '') +
    (c.dono != null ? ', do deck de ' + nomes[c.dono] : '') +
    (comEfeito && c.efeito ? ' | efeito: ' + clip(c.efeito, 300) : '')).join(' ; ');
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
    analise: { type: 'STRING', description: 'Análise do confronto em 3 parágrafos separados por linha em branco: (1) ritmo e estilo de cada deck, (2) as interações diretas entre cartas dos dois decks que mais pesam, (3) o que costuma decidir o duelo' },
    plano_a: { type: 'STRING', description: 'Plano de jogo do deck A contra este oponente: o que buscar na mão inicial, como abrir, o que guardar para responder (4 a 6 frases)' },
    plano_b: { type: 'STRING', description: 'Plano de jogo do deck B contra este oponente (4 a 6 frases)' },
    chaves_a: { type: 'ARRAY', items: CHAVE, description: '3 ou 4 cartas do deck A que decidem o confronto' },
    chaves_b: { type: 'ARRAY', items: CHAVE, description: '3 ou 4 cartas do deck B que decidem o confronto' },
    plano_azarao: { type: 'STRING', description: 'Como o deck menos favorito pode vencer: mãos ideais, blefe, tempo, cartas que viram o jogo (3 a 5 frases)' },
    confianca: { type: 'STRING', enum: ['baixa', 'media', 'alta'] },
  },
  required: ['chance_a', 'resumo', 'analise', 'plano_a', 'plano_b', 'chaves_a', 'chaves_b', 'plano_azarao', 'confianca'],
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
    deu_logica: { type: 'STRING', enum: ['sim', 'zebra', 'equilibrado'], description: 'sim = venceu quem era favorito pelas cartas; zebra = venceu o azarão; equilibrado = não havia favorito claro' },
    titulo: { type: 'STRING', description: 'Uma frase de veredito, direta' },
    veredito: { type: 'STRING', description: '2 ou 3 parágrafos separados por linha em branco: o resultado era esperado pelas listas? Que estratégia de um deck atrapalha a do outro? O que o registro do duelo mostra?' },
    fator_decisivo: { type: 'STRING', description: 'O que provavelmente decidiu o duelo (2 a 3 frases), separando o que é certeza do registro do que é dedução' },
    licao_a: { type: 'STRING', description: 'O que o jogador do deck A pode fazer diferente ou repetir neste confronto (2 a 3 frases)' },
    licao_b: { type: 'STRING', description: 'O mesmo para o deck B (2 a 3 frases)' },
  },
  required: ['deu_logica', 'titulo', 'veredito', 'fator_decisivo', 'licao_a', 'licao_b'],
};

const SYSTEM_PREVER = `Você é o Oráculo do Duelo, analista de Yu-Gi-Oh! TCG para duelos casuais entre dois jogadores com decks físicos (Structure Decks e decks de personagem, sem side deck).
Responda em português do Brasil.
Regras para a chance:
- Baseie-se nas listas de cartas: consistência, poder das cartas, interação com o deck adversário e matchups ruins (ex.: remoção em massa contra deck que enche o campo).
- Use os dados do histórico (Elo e confronto direto) como evidência, mas com amostra pequena dê pouco peso a eles.
- Yu-Gi-Oh! tem muita variância de mão inicial: evite chances acima de 0.85 ou abaixo de 0.15, a não ser com diferença enorme de poder.
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
- Sem jogadas faladas, narre a partir do LP e não cite cartas.
- Cite cartas pelo nome em português quando houver (as cartas físicas são em português).`;

const SYSTEM_VEREDITO = `Você é o Oráculo do Duelo, analista de Yu-Gi-Oh! TCG, revendo um duelo casual que já terminou, entre dois jogadores com decks físicos.
Responda em português do Brasil, em tom de comentarista técnico, direto e honesto.
Sua tarefa: dizer se o resultado "deu a lógica" e explicar por quê, olhando as listas de cartas e efeitos dos dois decks.
- Avalie o confronto pelas listas: qual deck tinha vantagem, quais cartas de um deck anulam a estratégia do outro, que mão cada um precisava.
- Use o registro de LP e as jogadas faladas como evidência do que aconteceu. Você não viu o duelo: o que não está no registro é dedução, deixe isso claro ("provavelmente", "tudo indica").
- Se houve previsão antes do duelo, diga se ela fazia sentido e o que ela não considerou.
- Quando houver jogadas faladas, use-as nas lições: aponte jogadas que funcionaram e as que provavelmente foram erros (ex.: usou uma carta cedo demais, gastou uma resposta num alvo fraco, deixou de usar uma carta-chave), sempre citando o turno.
- Uma jogada pode citar cartas dos dois decks (uma ação e a resposta do oponente); "do deck de X" indica de quem é a carta.
- Nunca invente jogadas, cartas ou mãos que não estejam no registro.
- Cite cartas SEMPRE pelo nome em português (o que vem antes dos parênteses na lista); inglês só se não houver nome em português.
- Chame os decks pelo nome, nunca de "Deck A" ou "Deck B".`;

function promptVeredito(b) {
  const nomes = b.nomes || ['Jogador 1', 'Jogador 2'];
  const log = (b.log || []).slice(-60).map(e =>
    `T${e.tn} ${Math.round(e.s)}s: ${nomes[e.p]} ${e.d < 0 ? 'sofreu ' + -e.d : 'recuperou ' + e.d} (LP ${e.lp})`).join('\n');
  const jog = (b.jogadas || []).slice(0, 80).map(j =>
    `T${j.tn} ${j.s}s: ${j.p == null ? '?' : nomes[j.p]} disse "${clip(j.fala, 200)}"` + cartasJ(j, nomes, false)).join('\n');
  const pct = x => typeof x === 'number' ? Math.round(x * 100) + '%' : 'sem dado';
  return `${deckTxt('DECK A (' + nomes[0] + ')', b.a)}

${deckTxt('DECK B (' + nomes[1] + ')', b.b)}

RESULTADO: venceu ${nomes[b.w]} com ${b.w === 0 ? b.a?.nome : b.b?.nome}. LP final ${b.lp?.[0]} x ${b.lp?.[1]}. Duração ${Math.round((b.dur || 0) / 60000)} min, ${b.turnos || '?'} turnos.
${b.mvp ? 'Carta MVP marcada pelos jogadores: ' + clip(b.mvp, 80) : ''}
Chance de ${nomes[0]} antes do duelo: Oráculo ${b.previsao ? pct(b.previsao.chance_a) + ' (' + clip(b.previsao.resumo, 300) + ')' : 'não fez previsão'}; Elo ${pct(b.eloP)}; tier ${pct(b.tierP)}.

Registro de LP:
${log || '(vazio: o vencedor foi declarado sem registrar dano)'}

Jogadas faladas:
${jog || '(nenhuma)'}

Deu a lógica?`;
}

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGIN || DEFAULT_ORIGIN).split(',').map(s => s.trim());
  const ok = allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  return {
    ok,
    headers: {
      'Access-Control-Allow-Origin': ok ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    },
  };
}

const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });

const clip = (s, n) => String(s ?? '').slice(0, n);

function deckTxt(rotulo, d) {
  const cartas = (d.cartas || []).slice(0, 80).map(c => '- ' + clip(c, 420)).join('\n');
  return `${rotulo}: ${clip(d.nome, 60)} (Tier ${d.tier} de 1 a 5, 1 = mais forte, segundo os jogadores)
Estratégia: ${clip(d.estrategia, 400)}
Pontos fortes: ${clip(d.fortes, 300)}
Pontos fracos: ${clip(d.fracos, 300)}
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
  const log = (b.log || []).slice(-60).map(e =>
    `T${e.tn} ${Math.round(e.s)}s: ${nomes[e.p]} ${e.d < 0 ? 'sofreu ' + -e.d : 'recuperou ' + e.d} (LP ${e.lp})`).join('\n');
  const jog = (b.jogadas || []).slice(0, 80).map(j =>
    `T${j.tn} ${j.s}s: ${j.p == null ? '?' : nomes[j.p]} disse "${clip(j.fala, 200)}"` + cartasJ(j, nomes, true)).join('\n');
  const prev = b.previsao
    ? `Previsão do Oráculo antes do duelo: ${Math.round(b.previsao.chance_a * 100)}% para ${nomes[0]} (${clip(b.previsao.resumo, 300)})`
    : 'O Oráculo não fez previsão para este duelo.';
  return `${nomes[0]} jogou com ${clip(b.decks?.[0], 60)} e ${nomes[1]} com ${clip(b.decks?.[1], 60)}.
Vencedor: ${nomes[b.w]}. Duração: ${Math.round((b.dur || 0) / 60000)} min, ${b.turnos || '?'} turnos. LP final: ${b.lp?.[0]} x ${b.lp?.[1]}.
${b.mvp ? 'Carta MVP marcada pelos jogadores: ' + clip(b.mvp, 80) : ''}
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

async function gemini(env, system, prompt, schema, temperature) {
  const principal = env.MODEL || DEFAULT_MODEL;
  const reserva = env.FALLBACK_MODEL || FALLBACK_MODEL;
  const t0 = Date.now();
  try {
    return await geminiModel(env, principal, system, prompt, schema, temperature, LIMITE_MS, t0);
  } catch (e) {
    // Lento demais (ou modelo indisponível): tenta o modelo leve uma vez
    if (reserva && reserva !== principal && (e.lento || e.status === 502)) {
      return await geminiModel(env, reserva, system, prompt, schema, temperature, LIMITE_MS, t0);
    }
    throw e;
  }
}

async function geminiModel(env, model, system, prompt, schema, temperature, limite, t0) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), limite);
  const call = (comThinking) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature, responseMimeType: 'application/json', responseSchema: schema,
        ...(comThinking ? { thinkingConfig: thinking(model) } : {}),
      },
    }),
    signal: ctrl.signal,
  });
  try {
  let r;
  try { r = await call(true); } catch (e) {
    const err = new Error(`${model} passou de ${Math.round(limite / 1000)}s sem responder`);
    err.lento = true; err.status = 504; throw err;
  }
  if (r.status === 400) {
    const t = await r.clone().text();
    if (/thinking/i.test(t)) {
      try { r = await call(false); } catch (e) {
        const err = new Error(`${model} passou de ${Math.round(limite / 1000)}s sem responder`);
        err.lento = true; err.status = 504; throw err;
      }
    }
  }
  if (!r.ok) {
    const t = await r.text();
    const err = new Error(`Gemini ${r.status}: ${t.slice(0, 300)}`);
    err.status = r.status === 429 ? 429 : 502;
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
  } finally { clearTimeout(timer); }
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const { ok, headers } = cors(origin, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return json({ ok: true, oraculo: 'online', versao: VERSAO, modelo: env.MODEL || DEFAULT_MODEL }, 200, headers);
    if (!ok) return json({ error: 'origem não permitida' }, 403, headers);
    if (!env.GEMINI_KEY) return json({ error: 'GEMINI_KEY não configurada no Worker' }, 500, headers);

    if (freio(req.headers.get('CF-Connecting-IP') || 'x')) return json({ error: 'muitos pedidos seguidos (429); espere alguns minutos' }, 429, headers);
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: 'pedido grande demais' }, 413, headers);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'JSON inválido' }, 400, headers); }

    const path = new URL(req.url).pathname;
    try {
      if (path === '/prever') {
        if (!body.a || !body.b) return json({ error: 'faltam os decks' }, 400, headers);
        const { data, model, ms } = await gemini(env, SYSTEM_PREVER, promptPrever(body), PREVER_SCHEMA, 0.3);
        const chance = Math.min(0.95, Math.max(0.05, Number(data.chance_a) || 0.5));
        return json({ ...data, chance_a: chance, model, ms }, 200, headers);
      }
      if (path === '/veredito') {
        if (!body.a || !body.b) return json({ error: 'faltam os decks' }, 400, headers);
        const { data, model, ms } = await gemini(env, SYSTEM_VEREDITO, promptVeredito(body), VEREDITO_SCHEMA, 0.4);
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
