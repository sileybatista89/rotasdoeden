# Fase 5 — Content Agent V1 (plano técnico)

Plano apenas. Nada é implementado nesta interação. Nenhuma tabela, função, migração, cron ou alteração do site público.

## Estado atual verificado (consultas de leitura feitas agora)

- Tabelas de agentes existentes: `agent_tasks`, `agent_runs`, `agent_costs`, `agent_approvals`, `agent_policies`, `agent_settings`, `agent_config`.
- Tabelas de Discovery existentes: `discovery_opportunities` (com `market`, `country`, `language`, `query`, `intent`, `category`, `season`, `source`, `source_reference`, `evidence_type`, `opportunity_score`, `confidence_score`, `rationale`, `status`, `task_id`, `run_id`, `expires_at`), `discovery_opportunity_history`, `discovery_cache`.
- **Não existe** nenhuma tabela de conteúdo: nem `content`, nem `content_versions`, `content_sources`, `content_reviews`, `content_publications`, `content_translations`.
- Políticas do agente `content` já existem e serão respeitadas tal como estão: `research` livre, `create_draft` livre, `update_draft` livre, `publish` exige aprovação, `delete_content` proibido.
- Dados reais disponíveis como fonte interna: `professional_profiles`, `services`, `districts`, `localities`, `profiles_public`, `bookings`.
- `supabase/functions/ai-content/index.ts` continua um esboço que devolve "não implementado". Módulos partilhados reutilizáveis: `core.ts`, `providers.ts`, `tools.ts`, `discovery.ts`, `sources.ts`.

## 1. Arquitetura

O Content Agent segue exatamente o modelo do Discovery: nenhuma lógica nova de orquestração, fila, custos ou segurança.

```text
ai-orchestrator (existente)
   ├─ valida agente/tarefa, política, orçamento, lease, retries, chaining
   └─ chama ai-content
        ├─ _shared/agents/content.ts   (lógica pura: validação, dedup, qualidade, SEO)
        ├─ _shared/agents/tools.ts     (registo de tools, já existente)
        └─ _shared/agents/providers.ts (Lovable / OpenAI / Google, já existente)
```

Toda a lógica determinística (validação de fontes, deteção de duplicados, verificações de qualidade, estrutura SEO, escolha de idioma) fica em `content.ts` puro, testável em Vitest sem chamar IA. A função edge só faz I/O.

## 2. Relação com Discovery

- Só oportunidades com `status = 'aceite'` e `expires_at` no futuro (ou nulo) são elegíveis.
- `nova`, `em_analise`, `rejeitada`, `expirada` → tarefa termina com motivo explícito, sem gerar nada.
- Cada conteúdo guarda `discovery_opportunity_id`; o contexto (`country`, `language`, `market`, `intent`, `season`, `category`) é copiado da oportunidade, nunca inventado nem hardcoded.

## 3. Fluxo de criação

```text
oportunidade aceite → validação → tarefa de conteúdo → recolha de dados internos/fontes
→ outline → rascunho → quality check → rascunho gravado (draft) → revisão humana
```

Se o quality check falhar de forma bloqueante, o rascunho é gravado com `status = 'draft'` e a lista de problemas; nunca é promovido.

## 4. Fluxo de aprovação

Criação e publicação são separadas. O agente pode criar e alterar rascunhos livremente. A publicação cria um registo em `agent_approvals` (`publish` = approval_required) e só um administrador a resolve. Nesta versão a publicação apenas marca o estado no sistema — não escreve no site público.

## 5. Estados de conteúdo

`draft → in_review → approved → published`, com `rejected` e `archived` como saídas. Transições permitidas validadas em código e por CHECK; publicação automática impossível.

## 6. Estrutura de dados proposta (a criar só no BUILD)

- `content_items` — item lógico: tipo (`destination_page`, `seo_article`, `landing_page`, `faq`, `social_post`, `experience_content`, `market_content`), `discovery_opportunity_id`, país/idioma/mercado/intenção/época/audiência, `slug`, `status`, `generated_by` (`ai_content` ou `human`), `translation_group_id`, `current_version_id`, `task_id`, `run_id`, timestamps.
- `content_versions` — corpo completo por versão: número, título, meta description, outline, blocos, SEO (keyword principal, secundárias, headings, links internos, sugestões de schema/canonical), autor/agente, motivo da alteração, resultado do quality check. Nunca sobrescrever: nova versão sempre.
- `content_sources` — fonte por versão: tipo interno/externo, tabela/registo interno ou URL externo, data de consulta, excerto de evidência, classificação `observed | interpreted | hypothesis | recommendation`.
- `content_reviews` — revisão humana: revisor, decisão, nota, timestamp.
- `content_publications` — pedido e histórico de publicação, com ligação à aprovação e ao administrador.
- Traduções através de `translation_group_id` + `language` (unicidade por grupo/idioma), não por tabela separada.

Todas as tabelas: GRANT explícito (`authenticated` para admin, `service_role` para as funções), RLS ativa, leitura/escrita apenas para administradores, escrita do agente pela chave de serviço.

## 7. Versionamento

Cada alteração cria uma nova linha em `content_versions` e atualiza `current_version_id`. Guarda versão, timestamp, autor/agente, motivo, fontes, oportunidade e estado. Reposição de versão anterior = criação de nova versão com o conteúdo antigo, mantendo o histórico intacto.

## 8. Modelo de fontes

Nenhum facto, número, preço ou nome de parceiro entra no conteúdo sem uma linha correspondente em `content_sources`. Dados internos referenciam tabela e id reais. URLs externos só entram se tiverem sido efetivamente consultados por uma tool; nunca produzidos pelo modelo. Lacunas ficam marcadas como desconhecidas ou interrompem aquele conteúdo.

## 9. Multilingue

Idioma vem da oportunidade. Versões linguísticas são itens independentes ligados por `translation_group_id`. Não há tradução automática do site nem alteração do i18n global. Validação automática de que o texto gerado está no idioma pedido.

## 10. Arquitetura SEO

Campos estruturados por versão: title, meta description, slug, H1/H2/H3, FAQ, links internos apenas para rotas existentes, keyword principal e secundárias, intenção de pesquisa, sugestões de schema e canonical. Regras anti-spam: um item por (oportunidade, tipo, idioma, mercado); rejeição de densidade excessiva de keyword; rejeição de similaridade alta com conteúdo existente; sem geração em massa de páginas quase iguais.

## 11. Tipos de conteúdo

Registo extensível em `agent_config` (`content_types`) com, por tipo: comprimento mínimo/máximo, secções obrigatórias, campos SEO exigidos, se admite imagens, limites por lote. Adicionar um tipo novo é configuração, não código.

## 12. Ferramentas (a implementar no BUILD, todas registadas em `tools.ts`)

`get_discovery_opportunity`, `get_destination_data`, `get_partner_data`, `get_experience_data`, `search_sources`, `validate_source`, `generate_outline`, `generate_draft`, `seo_analyze`, `quality_check`, `save_draft`. Cada uma valida input, verifica a política do agente, regista uso na execução e devolve estrutura tipada. Nenhuma acede a secrets diretamente. Ferramentas com custo externo (`search_sources`) ficam `approval_required` por omissão.

## 13. Providers

Usa `providers.ts` sem alterações: Lovable Gateway por omissão, OpenAI e Google configuráveis. Modelo por operação, configurável em `agent_config`: modelo barato para outline, classificação e quality check; modelo mais capaz apenas para o rascunho final. Erros 429/5xx com backoff; 402/403 param a cadeia e notificam o administrador.

## 14. Custos

Respeita integralmente o que já existe: pausa global, limites diário/mensal, limite por agente e por execução, registo em `agent_costs`. Acrescenta um limite de lote configurável (proposta: máximo 3 conteúdos por execução, 1 rascunho longo por tarefa). Limites do Content Agent ficam a zero/pausado até autorização explícita.

## 15. Cache

Reutiliza o padrão de `discovery_cache`: cache de dados internos e de resultados de pesquisa de fontes, com TTL configurável, apenas do lado do servidor, sem acesso de clientes.

## 16. Deduplicação

Antes de gerar: chave lógica (oportunidade, tipo, idioma, mercado, intenção) com índice único; verificação de slug existente; verificação de similaridade do outline com conteúdos ativos. Se existir, a tarefa devolve "já existe" e liga ao conteúdo atual, sem gastar tokens.

## 17-18. Segurança e permissões

RLS em todas as tabelas novas, leitura e escrita só para administradores; nada exposto a turistas ou guias; escrita do agente pela chave de serviço; validação no servidor; secrets só no servidor; funções admin com `SECURITY DEFINER`, `search_path` fixo, verificação `is_admin` e execução revogada a `anon`. Frontend nunca escreve diretamente — só através de RPCs.

## 19-20. Auditoria e observabilidade

Ações administrativas (aprovar, rejeitar, publicar, repor versão) em `admin_audit_log`. Cada execução regista em `agent_runs`/`agent_costs`: tarefa, provider, modelo, tokens, custo, duração, tools usadas, oportunidade, conteúdos criados, fontes, resultado e erro. Notificações ao administrador em falha permanente, limite atingido e aprovação pendente.

## 21. Integração futura com Acquisition

O output fica estruturado (item + versão aprovada + SEO + mercado/idioma) para o Acquisition Agent poder consumi-lo mais tarde através do encadeamento já existente no orquestrador. Nada de Acquisition é implementado.

## 22. Impacto no site

Zero. Sem alterações a rotas públicas, layout, navegação, SEO global ou i18n. Só uma nova secção "Conteúdo IA" dentro do `/admin` existente, ao lado do Discovery Control Center, reutilizando `AdminSidebar` e `AdminPage` (sem novo sistema de autenticação e sem novo painel global).

## 23. Dependências

Orquestrador, políticas do agente `content` (já existentes), providers, oportunidades aceites no Discovery (atualmente zero em produção — os testes usam dados controlados que são apagados no fim).

## 24. Complexidade

Média-alta. Maior peso: modelo de dados com versões e fontes, quality check e a secção administrativa. A orquestração, custos e segurança já estão feitos.

## 25. Testes

Oportunidade aceite / rejeitada / expirada / inexistente; fonte ausente e fonte inválida; conteúdo duplicado; idioma incorreto; provider indisponível; limite de custo; retry; timeout; permissão negada; rascunho criado; publicação bloqueada sem aprovação; versionamento e reposição; rastreabilidade até à oportunidade; ausência de factos sem fonte. Mais typecheck, suíte existente intacta e verificação do admin em desktop e mobile.

## 26. Sequência de implementação (no BUILD)

1. Migração das tabelas de conteúdo com GRANTs, RLS, índices de deduplicação e RPCs administrativas.
2. `_shared/agents/content.ts` puro + testes unitários.
3. Tools registadas e validadas.
4. `ai-content` completo ligado ao orquestrador.
5. Testes de execução controlada com dados apagados no fim.
6. Secção administrativa "Conteúdo IA" (lista, detalhe, versões, fontes, revisão, aprovação de publicação).
7. Relatório final; limites mantidos a zero, sem cron e sem autonomia.

## Ponto a confirmar antes do build

A publicação aprovada nesta V1 fica apenas registada no sistema (sem qualquer página pública nova). A criação das páginas públicas seria uma fase separada.
