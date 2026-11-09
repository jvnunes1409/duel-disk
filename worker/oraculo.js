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

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_ORIGIN = 'https://jvnunes1409.github.io';
const MAX_BODY = 60_000;

const PREVER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    chance_a: { type: 'NUMBER', description: 'Probabilidade de 0 a 1 de o deck A vencer' },
    resumo: { type: 'STRING', description: 'Uma frase dizendo quem é favorito e por quê' },
    chaves_a: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Até 3 cartas do deck A que decidem o confronto' },
    chaves_b: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Até 3 cartas do deck B que decidem o confronto' },
    plano_azarao: { type: 'STRING', description: 'Como o deck menos favorito pode vencer (sorte, blefe, tempo)' },
    confianca: { type: 'STRING', enum: ['baixa', 'media', 'alta'] },
  },
  required: ['chance_a', 'resumo', 'chaves_a', 'chaves_b', 'plano_azarao', 'confianca'],
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

const SYSTEM_PREVER = `Você é o Oráculo do Duelo, analista de Yu-Gi-Oh! TCG para duelos casuais entre dois jogadores com decks físicos (Structure Decks e decks de personagem, sem side deck).
Responda em português do Brasil.
Regras para a chance:
- Baseie-se nas listas de cartas: consistência, poder das cartas, interação com o deck adversário e matchups ruins (ex.: remoção em massa contra deck que enche o campo).
- Use os dados do histórico (Elo e confronto direto) como evidência, mas com amostra pequena dê pouco peso a eles.
- Yu-Gi-Oh! tem muita variância de mão inicial: evite chances acima de 0.85 ou abaixo de 0.15, a não ser com diferença enorme de poder.
- Seja calibrado: 0.6 deve significar que o deck A vence cerca de 6 em cada 10 duelos.
Cite cartas usando o nome exatamente como aparece na lista.`;

const SYSTEM_CRONICA = `Você é o narrador do Oráculo do Duelo, de um app de Yu-Gi-Oh! usado em duelos casuais em família.
Responda em português do Brasil, com o tom empolgado de narrador de anime, mas sem inventar jogadas: você só sabe o que está no registro de LP (dano, cura, turno e tempo).
Não cite cartas específicas como se tivessem sido jogadas, a não ser que o usuário tenha marcado a carta MVP.`;

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
  const cartas = (d.cartas || []).slice(0, 80).map(c => clip(c, 80)).join('; ');
  return `${rotulo}: ${clip(d.nome, 60)} (Tier ${d.tier} de 1 a 5, 1 = mais forte, segundo os jogadores)
Estratégia: ${clip(d.estrategia, 400)}
Pontos fortes: ${clip(d.fortes, 300)}
Pontos fracos: ${clip(d.fracos, 300)}
Lista: ${cartas || 'não informada'}`;
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
  const prev = b.previsao
    ? `Previsão do Oráculo antes do duelo: ${Math.round(b.previsao.chance_a * 100)}% para ${nomes[0]} (${clip(b.previsao.resumo, 300)})`
    : 'O Oráculo não fez previsão para este duelo.';
  return `${nomes[0]} jogou com ${clip(b.decks?.[0], 60)} e ${nomes[1]} com ${clip(b.decks?.[1], 60)}.
Vencedor: ${nomes[b.w]}. Duração: ${Math.round((b.dur || 0) / 60000)} min, ${b.turnos || '?'} turnos. LP final: ${b.lp?.[0]} x ${b.lp?.[1]}.
${b.mvp ? 'Carta MVP marcada pelos jogadores: ' + clip(b.mvp, 80) : ''}
${prev}

Registro de LP:
${log || '(vazio: o vencedor foi declarado sem registrar dano)'}`;
}

async function gemini(env, system, prompt, schema, temperature) {
  const model = env.MODEL || DEFAULT_MODEL;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    const err = new Error(`Gemini ${r.status}: ${t.slice(0, 300)}`);
    err.status = r.status === 429 ? 429 : 502;
    throw err;
  }
  const j = await r.json();
  const text = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  try {
    return { data: JSON.parse(text), model };
  } catch {
    const err = new Error('Resposta da IA veio fora do formato JSON');
    err.status = 502;
    throw err;
  }
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const { ok, headers } = cors(origin, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return json({ ok: true, oraculo: 'online' }, 200, headers);
    if (!ok) return json({ error: 'origem não permitida' }, 403, headers);
    if (!env.GEMINI_KEY) return json({ error: 'GEMINI_KEY não configurada no Worker' }, 500, headers);

    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: 'pedido grande demais' }, 413, headers);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'JSON inválido' }, 400, headers); }

    const path = new URL(req.url).pathname;
    try {
      if (path === '/prever') {
        if (!body.a || !body.b) return json({ error: 'faltam os decks' }, 400, headers);
        const { data, model } = await gemini(env, SYSTEM_PREVER, promptPrever(body), PREVER_SCHEMA, 0.3);
        const chance = Math.min(0.95, Math.max(0.05, Number(data.chance_a) || 0.5));
        return json({ ...data, chance_a: chance, model }, 200, headers);
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
