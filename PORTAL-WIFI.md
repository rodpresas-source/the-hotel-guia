# Portal do Wi-Fi (UniFi External Portal) com o guia

O hóspede conecta no "The Hotel Free WiFi" → o UniFi abre o portal externo → o guia aparece com a faixa
**"Conectar à internet"** (aceite dos termos) → `POST https://the-hotel-rds.vercel.app/api/wifi-auth {id:<mac>, aceite:true}`
→ o endpoint libera o aparelho no UniFi pelo **Cloud Connector** do Site Manager (`api.ui.com`, ação `AUTHORIZE_GUEST_ACCESS`).

- A faixa só aparece quando a URL traz `?id=<MAC>` (parâmetro que o UniFi manda). Sem isso, o guia é o de sempre.
- `guest/s/default/index.html` repassa os parâmetros para `/?portal=1&...` (caminho que o UniFi usa no portal externo).

## Servidor do portal (o UniFi exige um IP)
No Caddy do VPS `216.238.104.234`, um bloco HTTP só para o IP:

```
http://216.238.104.234 {
	redir https://guia.thehotel.com.br/?portal=1&{query} 302
}
```
(`sudo systemctl reload caddy`). O relay do HITS continua no host sslip.io, sem mudança.

## Env no projeto the-hotel-rds (Vercel → Production, depois redeploy)
- `UNIFI_API_KEY` — unifi.ui.com → API (Site Manager) → Create API Key
- `UNIFI_CONSOLE_ID` — opcional (padrão: a console DMP The Hotel)
- `WIFI_MINUTOS` — opcional (padrão 2880 = 2 dias)
Teste: `https://the-hotel-rds.vercel.app/api/wifi-auth?diag=1&token=<HITS_CRON_TOKEN>` → lista o site.

## UniFi (Hotspot → Landing Page)
1. Pre-Authorization Allowances: `guia.thehotel.com.br`, `the-hotel-rds.vercel.app` (opcional: `fonts.googleapis.com`, `fonts.gstatic.com`, `upload.wikimedia.org`).
2. Authentication → **External Portal Server** = `216.238.104.234`.
3. Voltar atrás: desmarcar External Portal Server (o portal nativo volta como estava).
