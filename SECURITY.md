# Segurança

## Como o projeto se protege

- **Nenhuma chave no código.** A chave da API do Gemini existe só como *Secret* no Cloudflare Worker; o app no navegador nunca a vê. O histórico do repositório é verificado para garantir que nenhuma chave foi publicada.
- **Worker do Oráculo:** aceita só pedidos vindos do app publicado (CORS), limita o tamanho dos pedidos, limita a quantidade de pedidos por IP e usa prompts fixos no servidor, com saída em JSON validado por schema.
- **App:** política de segurança de conteúdo (CSP) que só permite scripts do próprio site e conexões com os serviços usados; texto que vem de fora (arquivos de backup, decks cadastrados) é limpo na entrada e escapado na saída.
- **Automação:** testes de segurança rodam a cada mudança, o GitHub CodeQL analisa o código e o Dependabot avisa sobre dependências vulneráveis. As automações rodam com permissão só de leitura.

## Encontrou uma falha?

Por favor, **não abra uma issue pública**. Use a aba **Security → Report a vulnerability** deste repositório para avisar de forma privada.
