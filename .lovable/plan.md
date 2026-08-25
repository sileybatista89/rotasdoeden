# Auditoria final e plano de conclusão — Rotas do Éden

## O que já existe e funciona (verificado agora na app e na base de dados)

- Painel admin com ficha completa do guia (perfil, KYC, documentos assinados, checklist de publicação, alterar estado, pedir documento, aprovar/recusar documento com motivo obrigatório, mensagem persistente, banir) — requisitos 1, 2, 4, 5 cobertos.
- Guia vê estado de verificação, documentos pedidos e motivos de recusa em `/verificacao`, e gere ofertas em `/my-services` — requisitos 6 e 10 parcialmente cobertos.
- Moderação de serviços no admin (aprovar / pedir alterações com nota) e estado de moderação visível ao guia — requisitos 8 e 9 cobertos.
- Página de experiências com bloco editorial de 6 categorias reais, sem preços nem botão de reserva — requisitos 15, 16, 17 cobertos.
- Métricas do painel admin já vêm de dados reais (nada inventado).

Estado real dos dados hoje: 3 contas com papel de guia, 0 serviços, 0 reservas, 0 pedidos de verificação, 0 fotos de perfil. Dois guias estão em `verificacao_em_curso` e um em `candidatura_recebida`; nenhum tem tipo profissional, distrito, apresentação ou fotografia preenchidos. Ou seja: nenhum guia cumpre hoje os critérios de publicação — não por bug, mas por falta de dados reais.

## Falhas encontradas que o plano ainda NÃO cobria (o que será corrigido)

1. **Link de suporte partido** — as notificações de mensagens apontam para `/suporte/<id>`, mas a rota real é `/support/:id`. O guia clica na notificação e cai no 404. (afecta req. 5)
2. **Estados de documento incompletos** — hoje só existem `open`, `fulfilled`, `approved`; ao recusar, o registo volta a `open`, por isso o ecrã do guia que procura `rejected` nunca o mostra. Falta `in_review` e `expired`. (req. 3 e 4)
3. **Experiências não filtram moderação no cliente** — a listagem e o detalhe filtram só `is_active`; um guide autenticado vê a própria oferta pendente como se fosse pública. (req. 8 e 11)
4. **Formulário de serviço sem localização** — não permite escolher distrito/localidade nem idiomas, apesar de as colunas existirem. (req. 7)
5. **Foto pública do guia** — o directório e o perfil público usam só `profile_photo_url`; se o guia só tiver avatar da conta, aparece sem fotografia. (req. 13)
6. **Página de guias com copy fixo** — diz sempre "os primeiros guias estão em adesão", mesmo que existam guias publicados. (req. 12)
7. **Métricas públicas da home** — "42 000+ visitantes", "18 dias" de estadia aparecem sem fonte. São dados de turismo, não da plataforma, e têm de ficar explicitamente identificados como tal (ou sair). (req. 20)
8. **Testes ponta a ponta autenticados** ainda não foram feitos. (req. 21, 22, 23)

## Lista objectiva de alterações

### Base de dados (migração pequena, sem perda de dados)
- Alargar os estados de `document_requests` para: `open` (solicitado), `fulfilled` (enviado), `in_review` (em análise), `approved`, `rejected`, `expired`.
- `admin_review_document`: recusa passa a gravar `rejected` (mantendo o motivo obrigatório) em vez de voltar a `open`; o guia pode reenviar, o que devolve o registo a `fulfilled`.
- Corrigir o link das notificações de suporte para `/support/<id>`.
- Nenhuma tabela apagada, nenhum dado real substituído.

### Admin
- Ficha do guia: mostrar o novo ciclo de estados por documento e permitir marcar "em análise".
- Sem outras alterações estruturais — o que já funciona fica intacto.

### Guia
- `/verificacao`: lista todos os estados de documento com etiqueta clara e motivo de recusa; reenvio directo nos recusados.
- `/perfil-profissional`: destaque do que falta para publicação (tipo profissional, distrito, apresentação, fotografia).
- Formulário de serviço: adicionar distrito, localidade e idiomas (campos já existentes na base de dados).

### Área pública
- Experiências e detalhe de experiência: filtrar explicitamente `moderation_status = 'approved'`.
- Directório e perfil público de guia: usar `profile_photo_url` e, em alternativa, o avatar da conta.
- Página de guias: cabeçalho condicional — mensagem de "em adesão" só quando não houver guias publicados; caso contrário, directório em primeiro lugar.
- Home: métricas de turismo passam a indicar a fonte e o ano; qualquer número sem fonte é removido. Nenhuma métrica da plataforma é inventada.

### Testes (executados antes de dar por concluído)
- Admin: abrir ficha de guia, pedir documento, recusar com motivo, aprovar, alterar estado, mensagem, moderar serviço.
- Guia: ver estado, reenviar documento recusado, criar serviço, ver "em análise", corrigir depois de recusa.
- Turista: ver experiências, abrir detalhe, iniciar reserva.
- Permissões: guia e turista bloqueados em `/admin`; chamadas às funções administrativas recusadas fora do papel de admin.
- Desktop (1280px) e mobile (390px), com verificação de erros de consola.

## Nada fica de fora

Os 23 requisitos ficam cobertos: 1-2-4-5 já existem, 3 e 6-7-11-12-13-20 são corrigidos acima, 8-9-10 já existem e ficam reforçados pelo filtro de moderação, 14-16-17-18-19 são regra de execução (nenhum dado fictício criado, nada removido), 15 já implementado, 21-22-23 são a fase de testes.
