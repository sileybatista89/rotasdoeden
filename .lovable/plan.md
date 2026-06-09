# Polish da Rotas do Éden — fase 2

Objetivo: tornar o site mais bonito, real, interativo e totalmente traduzido, sem partir o que já funciona.

## 1. Logo maior e mais presente
- Aumentar o logo no navbar (de `h-11` para `h-14` desktop / `h-12` mobile).
- Aumentar também no footer e nos emails.
- Garantir que o ficheiro PNG continua nítido (já é premium transparente).

## 2. Tradução completa (PT / EN / FR / DE / ZH / KO)
Problema actual: muitas secções têm texto hard-coded em português e não passam pelo sistema `useT()`. Quando o utilizador muda de idioma, só o que está em `translations.ts` muda.

Componentes a internacionalizar (auditoria completa):
- `DescobreStpSection` (Pico Cão Grande, Praias do Sul, Roças, etc.) — actualmente 100% hard-coded em PT
- `SobreSaoTomePage` inteira
- `StatsSection`, `GuidesComingSoon`, `TrustBlock`, `HowItWorks`, `GuideCTA`
- `Footer` (links, copyright, contactos)
- `ExperiencesPage`, `GuidesPage`, `SejaParceiroPage`
- Páginas legais (manter PT como original, mas adicionar chaves para títulos de menu)
- `AuthPage`, mensagens de erro/sucesso (toasts)

Acção: extrair todos os textos para `src/i18n/translations.ts` em 6 idiomas, substituir por `t("chave")`.

## 3. Hero dinâmico com praias reais de STP
Substituir a imagem única do hero por **carrossel fluido** com 3-4 fotos reais de São Tomé e Príncipe:
- Praia Banana (Ilhéu das Rolas) — vista aérea
- Praia Bateria (Ilhéu das Rolas) — vista de cima
- Praia Jalé ou Praia Piscina — águas cristalinas
- Pico Cão Grande (manter como uma das opções)

Transições suaves (fade 1.2s, ken-burns lento), autoplay 6s, pausa em hover. Pré-load para não piscar. Imagens optimizadas (WebP, ~250kb cada).

**Nota sobre as imagens**: vou pesquisar fotos reais com licença livre (Unsplash/Wikimedia) dessas praias específicas de STP. Se não houver foto licenciada de uma praia específica, uso outra praia real de STP em vez de inventar.

## 4. Secção "Descobre STP" com fotos em vez de ícones
Trocar os 6 ícones Lucide (Mountain, Waves, etc.) por mini-fotos reais (160x160) de cada local:
- Pico Cão Grande → foto real
- Praias do sul → foto de Praia Jalé
- Roças → foto de Roça Sundy/Agostinho Neto
- Gastronomia → foto de calulu
- Biodiversidade → foto de tordo ou floresta Obô
- Cacau → foto de cacau em grão

Cards com hover-zoom subtil, overlay verde no hover.

## 5. Dicas práticas — taxa turística do governo
Adicionar à página `/sobre-sao-tome` (e como aviso visível no checkout) uma secção **"Dicas práticas"** com:
- **Taxa turística**: actualmente €25-30/pessoa, paga directamente ao governo de STP à chegada/saída (não cobrada pela Rotas do Éden)
- Visto/autorização de entrada
- Moeda (Dobra), câmbio aproximado
- Vacinas recomendadas (febre amarela obrigatória)
- Melhor altura para visitar
- Tomadas eléctricas, água, telecomunicações

Vou pesquisar o valor exacto e oficial da taxa antes de publicar.

## 6. Página de Destino enriquecida
Na `SobreSaoTomePage`, adicionar secções:
- História (descobrimento 1470, plantações, independência 1975)
- Geografia (vulcânica, 2 ilhas principais, equador)
- Cultura (crioulo forro, música, danças tchiloli/danço-congo)
- Gastronomia (calulu, blá-blá, banana frita, izaquente)
- Natureza (Obô, endemismos)

Tudo já internacionalizado.

## 7. Auditoria de links mortos
Rever todos os `<Link>` e `<a>` do site:
- Navbar, Footer, cards, CTAs, breadcrumbs
- Detectar `href="#"`, `to="#"`, handlers vazios
- Corrigir ou remover; adicionar estados `disabled` visuais quando a página ainda não existe
- Resultado: clicar em qualquer coisa leva sempre a algum lado real

## 8. Polish visual e interactividade (sem partir nada)
- Transições suaves em todos os cards (`transition-all duration-300`)
- Hover states consistentes (scale 1.02, shadow elegante)
- Scroll-reveal subtil em secções (intersection observer, fade-in-up)
- Botões com micro-interacções
- Manter paleta eden-green / eden-sand
- Mobile-first: testar navbar, hero, cards em 375px

---

## Detalhes técnicos
- **i18n**: alargar `src/i18n/translations.ts` com ~120 novas chaves × 6 idiomas. Estrutura por namespace (`descobre.*`, `sobre.*`, `footer.*`, `dicas.*`).
- **Hero carrossel**: componente novo `HeroCarousel.tsx` com `useEffect` + `setInterval`, CSS transitions (não precisa de framer-motion adicional). Imagens em `src/assets/praias/` ou externalizadas via lovable-assets se >200kb.
- **Imagens**: pesquisa via websearch por fotos com licença CC0/CC-BY de praias específicas; fallback para fotos genéricas de STP licenciadas.
- **Links mortos**: grep por `to="#"`, `href="#"`, `onClick={() => {}}` em todo o `src/`.
- **Sem mudanças de backend** — só frontend, presentation, i18n e assets.

## O que NÃO faço
- Não mexo em auth/Stripe/edge functions
- Não altero schema da BD
- Não substituo imagens por fotos não-licenciadas ou inventadas
- Não adiciono pagamento da taxa turística no checkout (é informativa — paga ao governo, não a nós)

Posso avançar?
