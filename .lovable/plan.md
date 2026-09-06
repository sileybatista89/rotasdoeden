# Fase 1 — Auditoria Técnica e Arquitetura dos Agentes IA

Auditoria feita sobre o código e a base de dados reais. Nenhum ficheiro do projeto foi alterado.

## 1. ESTADO ATUAL DO PROJETO
Plataforma funcional em produção (rotasdoeden.com). Dados reais atuais: 6 perfis de utilizador, 5 perfis profissionais (2 verificados), 7 distritos, 29 localidades, 6 notificações, 1 administrador, **0 serviços** e **0 reservas**. Não existe qualquer estrutura de IA, pacotes, leads ou campanhas.

## 2. STACK ATUAL
React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui; React Router (rotas em `src/App.tsx`), React Query, react-helmet-async (SEO), i18n próprio em `src/i18n`. STATUS: existe e funciona.

## 3. BACKEND
Lovable Cloud (Supabase). 4 funções servidor: `create-checkout` e `payments-webhook` (Stripe, funcionam), `auth-email-hook` (emails de autenticação com domínio verificado, funciona), `filter-message` (existe mas não é usada — a filtragem acontece por trigger na base de dados). Não há Railway/AWS nem servidor paralelo. STATUS: reutilizável para os agentes.

## 4. BANCO DE DADOS
19 tabelas: perfis, papéis, guias profissionais, pedidos de verificação, pedidos de documentos, serviços (com moderação), reservas, conversas/mensagens, suporte, notificações, distritos/localidades, KYC, mensagens sinalizadas, registo de auditoria admin. ~25 funções de base de dados e ~20 triggers já cobrem lógica de negócio. Não existem tabelas de conteúdo, SEO, leads, campanhas, pacotes, custos ou execuções de agentes.
Extensões instaladas: `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`. **Não existe `pg_cron` nem `pg_net`** — este é o facto mais determinante para o agendamento.

## 5. AUTENTICAÇÃO E SEGURANÇA
Autenticação por email/palavra-passe; papéis em tabela separada (`user_roles`) com funções `has_role`/`is_admin`; rotas protegidas por papel; RLS ativa com políticas por dono e por administrador; triggers que impedem escalada de privilégios (banimento, estado de verificação, moderação). Documentos ficam em bucket privado. STATUS: sólido; nada a alterar nesta fase.

## 6. APIs E INTEGRAÇÕES EXISTENTES
Stripe (checkout + webhook), email transacional Lovable (chave `LOVABLE_API_KEY` já presente), Google Search Console (conector já ligado), Supabase Storage (3 buckets), Realtime (notificações e chat). Não existe OpenAI, Gemini nem Google Ads.

## 7. FUNCIONALIDADES REUTILIZÁVEIS PELOS AGENTES
- Papéis/RLS → política de permissões dos agentes.
- `admin_audit_log` → padrão já existente para registo de execuções.
- `notifications` + Realtime → avisos e pedidos de aprovação ao administrador.
- Consola de administração modular (`AdminSidebar` + `AdminPage`) → o AI Control Center entra como mais uma secção, sem redesenho.
- Padrão de moderação de serviços (rascunho → aprovação) → reutilizável tal e qual para conteúdo gerado por IA.
- Funções servidor com segredos → local seguro para as chaves de IA.

## 8. COMPONENTES QUE FALTAM
Registo de execuções e custos de IA; fila de tarefas; agendador; tabelas de conteúdo/SEO/leads/campanhas/pacotes; política de permissões por agente; fila de aprovações; chaves OpenAI/Gemini/Google Ads; interface do AI Control Center.

## 9. RISCOS TÉCNICOS
1. Sem `pg_cron`/`pg_net`, não há agendamento nativo — exige agendador do Cron do Supabase Edge ou um serviço externo mínimo de disparo.
2. Custo descontrolado de chamadas de IA sem limites por dia/agente.
3. Risco de conteúdo inventado — mitigado por obrigar fonte em cada facto e por moderação humana.
4. Base de dados quase vazia: os agentes não têm ainda oferta real para vender ou indexar.
5. Gasto financeiro real em campanhas — exige aprovação humana obrigatória.
6. Avisos antigos do analisador de segurança sobre funções `SECURITY DEFINER` continuam por resolver.

## 10. ARQUITETURA RECOMENDADA
Tudo dentro da infraestrutura atual: base de dados única, funções servidor do Cloud, consola de administração existente. Um cérebro (função `ai-orchestrator`) + uma função por agente + tabelas de tarefas/execuções/custos/aprovações. Sem segunda aplicação, sem segunda base de dados, sem infraestrutura externa.

## 11. ARQUITETURA DOS 4 AGENTES
Cada agente é uma função servidor sem estado que recebe uma tarefa, usa apenas ferramentas declaradas e devolve um resultado gravado na base de dados: Conteúdo (rascunhos, sempre por aprovar), Discovery/SEO (procura internacional por mercado), Aquisição (canais, custo por aquisição, campanhas por aprovar), Conversão (assistente no site, identifica-se sempre como IA, gera leads).

## 12. PAPEL DO ORQUESTRADOR
Componente técnico, não comercial: cria e prioriza tarefas, aplica permissões, impede repetições e ciclos infinitos, controla tentativas e erros, encaminha aprovações, regista custo e duração de cada execução.

## 13. OPENAI VS GOOGLE/GEMINI
OpenAI: raciocínio, planeamento, redação, conversa e uso de ferramentas. Google/Gemini: pesquisa com fundamentação em resultados reais, tendências, análise de procura e ligação a serviços Google (Search Console já ligado; Ads mais tarde). Sem duplicação: a Google traz factos, a OpenAI decide e escreve.

## 14. SISTEMA DE PACOTES
Não existe nada no projeto que suporte pacotes. Proposta futura: componentes (voo, alojamento, transporte, guia, experiências, alimentação, seguro) com custo por fornecedor e datas, margem definida por política comercial, preço calculado por origem/data/pessoas, versões e estado de aprovação. Nada é apresentado sem fonte real.

## 15. AI CONTROL CENTER
Entra como nova secção no menu da consola já existente, ao lado de "Moderar serviços", com separadores para agentes, tarefas, execuções, aprovações, leads, pacotes, custos e definições. Sem alterar o design atual.

## 16. SCHEDULER / JOBS / BACKGROUND
Hoje: inexistente (confirmado — sem `pg_cron`, sem filas, sem jobs). Recomendação: fila de tarefas em tabela + agendador de Edge Functions do Supabase a chamar o orquestrador de X em X minutos. Funciona sem navegador aberto e sem servidor externo.

## 17. PERMISSÕES DOS AGENTES
Tabela de política por agente com três níveis: livre (pesquisar, analisar, rascunhar, calcular, guardar), com aprovação (publicar, campanhas, preços, gastos), proibido (apagar dados críticos, mexer em credenciais ou políticas, dar privilégios, pagar). Aplicado no servidor, nunca no navegador.

## 18. CONTROLE DE CUSTOS
Registo por execução: agente, modelo, tokens, custo estimado, duração. Limites por dia/mês e por agente, reutilização de resultados em cache e paragem automática ao atingir o limite.

## 19. SEGURANÇA E CONFORMIDADE
Chaves OpenAI/Gemini/Google Ads guardadas apenas como segredos do backend, usadas só dentro das funções servidor; nunca no frontend nem em variáveis `VITE_`. O assistente identifica-se sempre como IA. Dados de turistas nunca entram em prompts sem necessidade. Registo de auditoria de todas as ações automáticas.

## 20. PLANO DE IMPLEMENTAÇÃO FASEADA
Fase 1 auditoria (esta) → 2 infraestrutura mínima → 3 orquestrador → 4 Discovery → 5 Conteúdo → 6 Aquisição → 7 Conversão → 8 pacotes → 9 Control Center → 10 observabilidade e custos → 11 testes ponta a ponta → 12 autonomia gradual.

## 21. ESTIMATIVA DE COMPLEXIDADE
Baixa: infraestrutura mínima, Control Center (leitura), custos. Média: orquestrador, Discovery, Conteúdo, Conversão. Alta: Aquisição com gasto real e motor de pacotes com preço dinâmico.

## 22. O QUE PODE SER FEITO SEM INFRAESTRUTURA EXTERNA
Praticamente tudo: tabelas, orquestrador, os quatro agentes, chamadas a OpenAI/Gemini, Control Center, custos, aprovações e agendamento por Edge Functions.

## 23. O QUE EVENTUALMENTE EXIGIRÁ SERVIÇOS EXTERNOS
Contas e chaves OpenAI, Gemini, Google Ads/Keyword Planner; eventuais fornecedores de voos/hotéis para preços reais; tarefas muito longas (acima do limite de execução de uma função) que exijam divisão em passos ou um disparador externo.

## 24. RECOMENDAÇÃO FINAL
Não é preciso nova infraestrutura. Avançar para a Fase 2 apenas com as tabelas base e uma função de orquestração, mantendo tudo em modo rascunho com aprovação humana. Antes disso, faz sentido garantir oferta real na plataforma (serviços de parceiros), porque os agentes de Conteúdo, Aquisição e Conversão precisam de algo real para promover.

## Próximo passo
Esta fase termina aqui, sem alterações ao projeto. A Fase 2 só arranca com autorização explícita.
