# Fase 2A — Fundação do sistema de agentes IA

Só infraestrutura. Nenhum agente comercial, nenhuma campanha, nenhuma alteração ao site público, ao design, ao admin visual, aos pagamentos ou a qualquer fluxo existente.

## Resumo da Fase 1 (confirmado na auditoria)
Base de dados única no Lovable Cloud, 19 tabelas, RLS ativa, `admin_audit_log` e `notifications` já existentes, 4 funções servidor (Stripe, emails, filtro de mensagens), sem `pg_cron`/`pg_net`, sem qualquer estrutura de IA.

## O que vai ser criado

### 1. Seis tabelas novas (só administradores acedem)
- `agent_tasks` — fila de tarefas: agente, tipo, prioridade, estado (pendente, em fila, a correr, à espera de aprovação, concluída, falhada, cancelada), dados de entrada e resultado, contagem e limite de tentativas, agendamento, chave de idempotência única.
- `agent_runs` — cada execução: tarefa, agente, fornecedor e modelo, resumo de entrada/saída (só resumos, sem dados pessoais completos), número de ferramentas usadas, tokens, custo estimado, duração, código e mensagem de erro.
- `agent_costs` — custo por execução, por agente, fornecedor, modelo e dia, com índices para totais diários e mensais.
- `agent_approvals` — fila de aprovação humana: ação, descrição, dados, estado (pendente, aprovada, rejeitada, expirada, cancelada), quem reviu e motivo da rejeição.
- `agent_policies` — permissão por agente e por ação com três níveis: livre, exige aprovação, proibida. Inicializada com as regras indicadas para Content, Discovery, Acquisition e Conversion. Isto é configuração do sistema, não dados fictícios.
- `agent_settings` — limites de custo: diário e mensal globais e por agente, e interruptor geral de pausa.

Todas com RLS: leitura e escrita apenas por administrador; as funções servidor escrevem com a chave de serviço. Nenhum acesso para turistas, guias ou visitantes.

### 2. Orquestrador (`ai-orchestrator`)
Função servidor genérica, sem lógica comercial: valida o agente e o tipo de tarefa, consulta a política, verifica os limites de custo, marca a tarefa como a corrar de forma atómica (impede execução dupla), chama a função do agente, grava a execução, o custo e o erro, aplica as tentativas (máximo 3, com espera crescente) e marca falha permanente ao esgotar. Cria aprovação pendente quando a política exige, em vez de agir.

### 3. Camada de fornecedores de IA
Módulo partilhado com uma interface única e duas implementações — OpenAI e Google/Gemini — escolhidas por configuração, para que os agentes futuros não fiquem presos a um fornecedor. Inclui tempo-limite, contagem de tokens, estimativa de custo e tratamento de erros. Nesta fase só é testada a conectividade, sem processamento pesado.

### 4. Camada de ferramentas
Apenas o esqueleto: registo de ferramentas, validação de argumentos, verificação de permissão pela política e registo da execução. Nenhuma ferramenta de negócio é implementada agora.

### 5. Funções dos agentes
Quatro esboços controlados (`ai-content`, `ai-discovery`, `ai-acquisition`, `ai-conversion`) que apenas confirmam o fluxo do orquestrador e devolvem "não implementado". Sem comportamento comercial.

### 6. Execução assíncrona e agendamento
As tarefas ficam na tabela `agent_tasks` (fila em base de dados, sem serviço externo). O disparo periódico do orquestrador exige as extensões `pg_cron` e `pg_net`, que hoje não estão instaladas — proponho ativá-las e registar um agendamento único e conservador. Nesta fase o agendamento fica criado mas desligado: nada corre em ciclo automático até autorização.

### 7. Notificações e auditoria
Reutilizam `notifications` (erro crítico, aprovação pendente, limite de custo atingido, falha permanente) e `admin_audit_log` (aprovações, rejeições, alterações de limites). Nenhum sistema paralelo.

### 8. Testes
Testes automáticos da fundação: criação e validação de tarefa, agente inválido, aplicação da política (livre / com aprovação / proibida), criação e fecho de execução, tentativas e limite de tentativas, idempotência, aprovação e rejeição, bloqueio por limite de custo, acesso de administrador permitido e de utilizador normal negado, falha de API, tempo-limite e erro permanente. Além disso, verificação de que autenticação, admin, pagamentos e tempo real continuam intactos.

## O que NÃO é tocado
Site público, autenticação, perfis, verificação, documentos, serviços, moderação, reservas, mensagens, suporte, Stripe, Storage, tempo real, SEO, traduções, layout e navegação. Nenhuma tabela existente é alterada. Nenhum dado é inserido além da configuração de políticas e limites.

## Decisões que preciso de confirmar antes de implementar
1. **Chaves de IA**: o projeto já tem acesso à IA da Lovable sem chaves nem contas extra. Posso usá-la como fornecedor inicial (com a camada preparada para OpenAI e Gemini diretos), ou prefere fornecer já `OPENAI_API_KEY` e `GEMINI_API_KEY`? Sem chaves próprias, o teste de conectividade direto a OpenAI/Google não pode correr.
2. **Extensões de agendamento**: confirma a ativação de `pg_cron` e `pg_net` na base de dados para permitir execução sem o navegador aberto?

## Relatório final
No fim entrego o relatório com as secções A a R pedidas (criado, alterado, reutilizado, tabelas, funções, segredos, fila, agendador, tentativas, custos, autorização, idempotência, testes, falhas, problemas, riscos, não implementado, próxima fase). Depois disso paro e aguardo autorização para a Fase 3.
