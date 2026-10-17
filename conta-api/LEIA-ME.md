# API "Minha conta"

Intermediário entre a página do hóspede e o HITS. Roda grátis no Cloudflare Workers.

## Como o hóspede entra

Apartamento + os 4 últimos caracteres do CPF ou do passaporte de qualquer hóspede da reserva.

LGPD: o documento só é comparado em memória com o que já está na ficha (FNRH) do HITS. Nada é
gravado, devolvido à página ou registrado em log. O extrato mostra apenas o primeiro nome do titular.
Cinco erros do mesmo aparelho bloqueiam por 15 minutos e dez erros no mesmo apartamento (de qualquer aparelho) bloqueiam por 1 hora; o acesso expira 2h depois do check-out.

## Publicar

1. Crie uma conta gratuita em cloudflare.com.
2. `npm i -g wrangler` e `wrangler login`.
3. `wrangler kv namespace create RATE` e cole o id em `wrangler.toml`.
4. Segredo do token: `wrangler secret put TOKEN_SECRET` (texto longo e aleatório).
5. `wrangler deploy`. Opcional: rota `conta.thehotel.com.br` apontando para o Worker.
6. Em `data/hotel.json` do site, preencha `"conta": {"api": "https://<endereço do worker>"}`.

## Falta

- Implementar `reservaAtiva()` com a API do HITS: reserva hospedada na UH, com nome e documento de
  cada hóspede, lançamentos e pagamentos. Até lá, `MOCK = "1"` usa uma reserva de exemplo.
- Na página, "Minha conta" só aparece quando `conta.api` estiver preenchido.
  Demonstração sem API: abra a página com `?demo=1` (apartamento 101, documento 1234).
