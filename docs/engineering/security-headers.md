# Cabeçalhos de segurança e CSP

## O que foi verificado (não assumido)

O Worker serve assets estáticos (`wrangler.jsonc` → `assets.directory: ./dist`,
`not_found_handling: single-page-application`). A dúvida era se um ficheiro `_headers` é aplicado
nesse modo. **É.**

Método: build real, `_headers` colocado em `public/` (o Vite copia para `dist/`), execução local com
`npx wrangler dev` (versão 4.158.0) e leitura das respostas.

Evidência:

- log do wrangler: `✨ Parsed 2 valid header rules` (as duas regras do ficheiro);
- `GET /` → `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`,
  `x-frame-options: DENY`, `permissions-policy: camera=()…`, `content-security-policy-report-only: default-src 'self'…`;
- `GET /voos` e `GET /experiences?q=…` (fallback SPA) → os mesmos cabeçalhos;
- `GET /assets/index-*.js` → `cache-control: public, max-age=31536000, immutable`.

O `_headers` do `node_modules/wrangler` que apareceu numa primeira pesquisa era falso positivo
(símbolos `UND_ERR_HEADERS_TIMEOUT` do undici). A conclusão vem do teste acima, não dessa pesquisa.

## A configuração

`public/_headers` (versionado) define:

| Cabeçalho | Valor | Porquê |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | impede interpretação de tipos errados |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | não vaza caminhos para terceiros |
| `X-Frame-Options` | `DENY` | clickjacking (complementa `frame-ancestors`) |
| `Cross-Origin-Opener-Policy` | `same-origin` | isola a janela de popups |
| `Permissions-Policy` | câmara/microfone/geolocalização desligados; `payment` só para o Stripe | reduz superfície |
| `Content-Security-Policy-Report-Only` | ver ficheiro | **não bloqueia**: só reporta violações |
| `Cache-Control` em `/assets/*` | `immutable`, 1 ano | os nomes têm hash |

A CSP permite `'self'`, `https://js.stripe.com` (script), Supabase (`https://*.supabase.co` e `wss://`
para realtime), `api.stripe.com` e `m.stripe.network` (conexão), `checkout.stripe.com`/`hooks.stripe.com`
(formulário e frames). `style-src` mantém `'unsafe-inline'` porque o Radix e o Vite injetam estilos
inline; sem nonce/SSR não há alternativa correta neste stack.

## Porque Report-Only

Uma CSP estrita pode partir checkout, realtime ou o gateway da Lovable. Em produção ainda não há
forma de validar isso sem um preview. Report-Only dá a lista de violações reais sem risco de bloquear
uma venda.

## Como promover a enforcing (exige preview e aprovação)

1. Publicar um preview (branch + Cloudflare preview) com esta configuração.
2. Percorrer: homepage, `/voos` (pesquisa), `/experiences` + detalhe, `/pacotes/*`, login, checkout
   em modo de teste (sem pagar).
3. Abrir a consola do browser e recolher os relatórios `[Report Only]` de **todas** as páginas.
4. Ajustar as origens que faltarem (esperadas: `m.stripe.com`, domínios de imagem externos).
5. Só então trocar `Content-Security-Policy-Report-Only` por `Content-Security-Policy`.

## Limites

- A CSP não substitui autorização. Não impede XSS por dados servidos pelo próprio backend; reduz o
  impacto.
- `Permissions-Policy: payment=(self "https://js.stripe.com")` não é validado por nenhum teste
  automático — é uma declaração de intenção.
- O `_headers` não permite cabeçalhos por rota com parâmetros nem lógica; se for preciso nonce por
  pedido, é necessário um Worker com `ASSETS` binding e código a envolver a resposta — outra
  arquitetura, não uma alteração de ficheiro.
- Nada disto foi publicado: o domínio continua servido pelo Lovable, que usa cabeçalhos próprios.
