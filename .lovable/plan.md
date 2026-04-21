
# Plano — Páginas Legais e Políticas + Rodapé Actualizado

Vou criar a estrutura legal completa do Rota do Éden com 20+ políticas, organizadas em páginas dedicadas, e actualizar o rodapé para servir como índice navegável.

## 1. Estrutura de páginas

Em vez de criar 20 páginas separadas (que ficaria pesado de manter), vou agrupar as políticas por afinidade temática em **7 páginas legais**, cada uma com várias secções ancoradas para navegação directa.

### Páginas a criar

| Rota | Conteúdo |
|------|----------|
| `/legal/termos` | Termos de Serviço + Termos e Condições de Utilização + Aviso Legal |
| `/legal/privacidade` | Política de Privacidade + RGPD/GDPR + Retenção de Dados + Cookies |
| `/legal/reservas` | Política de Reservas + Cancelamentos e Reembolsos + Pagamentos + Comissões + Chargeback/Disputas |
| `/legal/antifraude` | Política Antifraude (versão pública) + Segurança da Plataforma + Suspensão de Contas |
| `/legal/guias` | Política para Guias Parceiros + Contrato de Parceria + Código de Conduta |
| `/legal/comunidade` | Política de Avaliações + Conteúdo + Comunicações + Proteção do Cliente |
| `/legal/parcerias` | Propriedade Intelectual + Cláusula para Investidores/Entidades + Termos Institucionais |

Cada página usará a mesma layout shell (Navbar + container legível + Footer + índice lateral em desktop com scroll-spy nas secções).

## 2. Componentes novos

- `src/pages/legal/LegalLayout.tsx` — shell partilhado com índice lateral, breadcrumb e tipografia legível (max-width prose, headings com âncoras)
- `src/pages/legal/TermosPage.tsx`
- `src/pages/legal/PrivacidadePage.tsx`
- `src/pages/legal/ReservasPage.tsx`
- `src/pages/legal/AntifraudePage.tsx`
- `src/pages/legal/GuiasPage.tsx`
- `src/pages/legal/ComunidadePage.tsx`
- `src/pages/legal/ParceriasPage.tsx`
- `src/data/legalContent.ts` — conteúdo estruturado (título, secções, parágrafos, listas) para alimentar as páginas; mantém edição centralizada

## 3. Rodapé reorganizado

`Footer.tsx` passa a ter 4 colunas em vez das actuais 3, com links reais (deixam de ser "em breve"):

- **Plataforma**: Encontrar Guias, Como Funciona, Contacto
- **Legal**: Termos, Privacidade, Cookies, Cancelamentos
- **Para Guias**: Seja Parceiro, Comissões, Código de Conduta
- **Segurança**: Proteção Antifraude, Proteção do Cliente, Disputas

Texto curto no fundo: "© {ano} Rota do Éden. Todos os direitos reservados. Marketplace independente de experiências turísticas em São Tomé e Príncipe."

## 4. Tom e linguagem

Todas as páginas seguem as regras do briefing:
- Linguagem profissional, neutra, sem ameaças ("reservamo-nos o direito de…" em vez de "vamos processar")
- Português europeu (consistente com o resto do site)
- Data de "Última actualização" no topo
- Email de contacto: `info@rotasdoeden.st` (já existe no rodapé)
- Aviso "Esta plataforma é uma intermediária digital" onde aplicável

## 5. Regras invisíveis (backend)

A secção "Regras invisíveis" do briefing **não vai para o site público** — fica como referência interna para reforço futuro do filtro antifraude. Já temos a base implementada (`filter-message` edge function detecta números, emails, links, palavras-chave). O que falta para fechar essa lista (multi-conta por IP, reviews suspeitas, chargebacks repetidos) fica para uma fase posterior porque depende de pagamentos reais e tracking de IP — não faz parte deste pedido.

## 6. Rotas

`App.tsx` ganha 7 rotas novas debaixo de `/legal/*`, todas públicas (sem `ProtectedRoute`).

## 7. Ficheiros alterados

**Novos (10):**
- `src/pages/legal/LegalLayout.tsx`
- `src/pages/legal/TermosPage.tsx`
- `src/pages/legal/PrivacidadePage.tsx`
- `src/pages/legal/ReservasPage.tsx`
- `src/pages/legal/AntifraudePage.tsx`
- `src/pages/legal/GuiasPage.tsx`
- `src/pages/legal/ComunidadePage.tsx`
- `src/pages/legal/ParceriasPage.tsx`
- `src/data/legalContent.ts`

**Editados (2):**
- `src/components/layout/Footer.tsx` — 4 colunas, links reais
- `src/App.tsx` — 7 rotas legais

## Resultado esperado

- Rodapé deixa de ter "em breve" e passa a ser um índice funcional para todas as políticas
- 7 páginas legais navegáveis, com índice lateral, conteúdo bem formatado e linguagem profissional
- Cobertura das 20 políticas pedidas, agrupadas de forma coerente em vez de espalhadas
- Base sólida para mostrar a investidores/parceiros e cumprir requisitos básicos de transparência
