# Corrigir erro ao pedir documentos a um guia

## O problema (confirmado)

Ao clicar em "Enviar pedido" no perfil do guia, a base de dados rejeita o pedido:

```text
new row for relation "document_requests" violates check constraint
"document_requests_document_type_check"
```

A tabela `document_requests` só aceita estes tipos de documento:
`identity`, `tourism_license`, `local_credential`, `business_registration`, `responsible_identity`, `other`.

Mas o painel de administração envia os valores em português definidos no código:
`identificacao`, `licenca_profissional`, `certificacao`, `seguro`, `outro`.

Nenhum coincide, por isso qualquer pedido de documento falha — incluindo "Licença profissional",
que é exatamente o documento que estava a tentar pedir ao Esmael Lima.

Nota: enviar mensagem simples e alterar estado do guia funcionam (o pedido `admin_set_guide_status`
foi executado com sucesso às 14:11). Só o pedido de documento é que falha.

## O que vai ser alterado

1. Migração na base de dados que alarga a lista de tipos aceites em `document_requests`,
   passando a incluir os valores usados pelo painel:
   `identificacao`, `licenca_profissional`, `certificacao`, `seguro`, `outro`,
   mantendo também os valores antigos (`identity`, `tourism_license`, etc.) para não quebrar
   registos ou fluxos existentes.

2. Nada mais é alterado: sem mudanças de interface, sem alterar as ações de estado,
   mensagens, moderação de serviços ou verificação.

## Detalhes técnicos

- `ALTER TABLE public.document_requests DROP CONSTRAINT document_requests_document_type_check`
  seguido de novo `CHECK` com a união dos dois conjuntos de valores.
- Sem alterações a RLS, GRANTs, funções ou triggers.
- `public.admin_request_document` continua igual — passa a funcionar assim que a constraint aceitar o valor.

## Validação

- Abrir o perfil de um guia no painel de administração, pedir "Licença profissional" e confirmar
  que o pedido é criado, aparece em "Documentos pedidos" e gera notificação/mensagem ao guia.
- Confirmar que o guia vê o pedido em `/verificacao`.
