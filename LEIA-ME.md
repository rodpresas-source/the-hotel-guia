# The Hotel · Guia do hóspede

Página de destino depois da conexão ao Wi-Fi (Hotspot do UniFi).

## Arquivos

- `index.html`: a página. Funciona sozinha: os dados já estão dentro dela.
- `data/hotel.json`: horários, serviços, contatos e cardápio do room service.
- `data/eventos.json`: agenda da cidade.
- `data/guia.json`: bairros, praias, restaurantes, noite, LGBTQIA+ e dicas.

Publicada num servidor (GitHub Pages), a página carrega os arquivos da pasta `data/`.
Para atualizar horários, cardápio ou agenda, basta editar o JSON correspondente e enviar ao repositório; o `index.html` não precisa ser alterado.

## Antes de publicar

1. Em `data/hotel.json`:
   - Troque o `whatsapp` (formato 5571XXXXXXXXX) e o `telefone`.
   - Confirme os horários de check-in, check-out, café da manhã e room service.
   - Substitua o cardápio de exemplo e mude `"exemplo": true` para `false`. Isso tira o aviso da página.
2. Revise os itens marcados em `data/guia.json` (chave `nao_incluidos` lista o que ficou de fora).

## GitHub Pages

1. Crie um repositório público (ex.: `thehotel-guia`) e envie o conteúdo desta pasta.
2. Settings → Pages → Branch `main`, pasta `/ (root)` → Save.
3. O endereço fica `https://SEU-USUARIO.github.io/thehotel-guia/`.

## UniFi (Hotspot)

1. No Hotspot / Guest Portal, use autenticação sem senha com termos de uso.
2. Em redirecionamento após autenticação, informe o endereço HTTPS do GitHub Pages.
3. Em Pre-Authorization Access, inclua `SEU-USUARIO.github.io`.

## Agenda

Eventos passados somem sozinhos pela data. Para manter a agenda viva, o `data/eventos.json` precisa ser renovado. O ideal é uma vez por semana.
Campos de cada evento: `titulo`, `categoria` (show, teatro, exposicao, museu, festa, convencao, esporte, gratuito, infantil, gastronomia), `data_inicio`, `data_fim`, `horario`, `local`, `bairro`, `preco`, `descricao`, `descricao_en`, `link`.
Museus e programas fixos levam o campo `recorrente` (ex.: "Terça a domingo") e aparecem em "Sempre abertos".
