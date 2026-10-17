# API "Minha conta"

Intermediário entre a página do hóspede e o HITS. Roda grátis no Cloudflare Workers.

## Como o hóspede entra

Apartamento, sobrenome (titular ou qualquer hóspede da reserva) e um PIN de 4 dígitos.
O PIN é calculado a partir da reserva, então não precisa ser cadastrado: a recepção consulta em
`GET /pin?uh=101` (com o cabeçalho `X-Admin-Key`) e imprime no envelope do cartão-chave.
O acesso vale até 2h depois do check-out. Cinco tentativas erradas bloqueiam por 15 minutos.

## Publicar

1. Crie uma conta gratuita em cloudflare.com.
2. `npm i -g wrangler` e `wrangler login`.
3. `wrangler kv namespace create RATE` e cole o id em `wrangler.toml`.
4. Segredos: `wrangler secret put PIN_SECRET`, `TOKEN_SECRET`, `ADMIN_KEY` (textos longos e aleatórios).
5. `wrangler deploy`. Opcional: rota `conta.thehotel.com.br` apontando para o Worker.
6. Em `data/hotel.json` do site, preencha `"conta": {"api": "https://<endereço do worker>"}`.

## Falta

- Implementar `reservaAtiva()` com a API do HITS. Até lá, `MOCK = "1"` usa uma reserva de exemplo
  (apartamento 101, sobrenome Silva).
- Na página, a área "Minha conta" só aparece quando `conta.api` estiver preenchido.
  Para ver a demonstração sem API: abra a página com `?demo=1` (apartamento 101, Silva, PIN 1234).
