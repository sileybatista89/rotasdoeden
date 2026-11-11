# MFA para administração — plano

## Suporte real da arquitetura

O projeto usa Supabase Auth (GoTrue) com o SDK `@supabase/supabase-js` e a integração de login do
Lovable (`@lovable.dev/cloud-auth-js`). O Supabase suporta MFA por TOTP e por telefone; o TOTP é o
único que não depende de um fornecedor de SMS pago.

**Estado verificado:** não existe qualquer referência a MFA, `mfa.enroll`, `aal` ou `getAuthenticatorAssuranceLevel`
no código. Não há configuração remota visível. **Não é possível afirmar** se o MFA está ativo no
projeto `hiurdjlnnbrdsyplesfb`, nem se o plano contratado o permite.

## Porque não foi implementado agora

Três razões concretas:

1. Ativar MFA exige alterações no projeto Supabase (política de Auth) — operação remota, fora do que
   está autorizado.
2. Uma exigência de MFA que só exista no frontend é **teatro**: quem tiver a palavra-passe pode
   autenticar-se e falar diretamente com a API. A exigência tem de ser validada no backend.
3. Implementar a inscrição sem poder testar o desafio contra o servidor produziria código não
   verificado — exatamente o que este projeto tem evitado.

## O que uma implementação correta exige

### 1. Inscrição (admin)

- Ecrã em `/admin` (ou `/conta/seguranca`) com `supabase.auth.mfa.enroll({ factorType: 'totp' })`.
- Mostrar QR + segredo uma única vez, exigir código de 6 dígitos para confirmar
  (`challenge` + `verify`).
- Guardar o fator; nunca guardar o segredo na aplicação.

### 2. Desafio

- No login, depois da palavra-passe, consultar `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`.
- Se `currentLevel === 'aal1'` e `nextLevel === 'aal2'` com fator TOTP verificado, pedir código e
  `challenge`/`verify` antes de deixar entrar em `/admin`.

### 3. Recuperação (o ponto que mais falha)

- **Códigos de recuperação**: gerar 10, mostrar uma vez, guardar *hashes* numa tabela própria com
  RLS (apenas o próprio utilizador e admins), consumo de uso único.
- **Segundo administrador**: promover um segundo admin **antes** de ativar a exigência, para não
  haver um único ponto de falha.
- **Procedimento de rutura**: um admin de serviço pode remover um fator via API de administração;
  tem de estar documentado quem o pode fazer e como.

### 4. Prevenção de bloqueio

- Não ativar a exigência para todos ao mesmo tempo: primeiro para uma conta de teste.
- Sessões já abertas não devem ser expulsas a meio de uma operação; a exigência aplica-se na próxima
  autenticação ou em ações sensíveis (reautenticação).
- Estado explícito na UI quando o MFA é obrigatório e não está configurado (com caminho de inscrição),
  em vez de um erro genérico ou de um ecrã em branco.

### 5. Exigência efetiva no backend (não negociável)

- O claim `aal` do JWT tem de ser verificado no servidor. Para as operações de administração, isso
  significa: funções SQL (`SECURITY DEFINER`) que verifiquem `auth.jwt()->>'aal' = 'aal2'` além de
  `is_admin(auth.uid())`, ou edge functions que validem o mesmo antes de agir.
- Sem este passo, o MFA é apenas uma conveniência de interface.

## Ordem de trabalho proposta

| Passo | Onde | Autorização |
|---|---|---|
| 1. Confirmar plano e política de MFA do projeto | painel Supabase | leitura, requer acesso |
| 2. Criar tabela de códigos de recuperação + RLS | migração (local, depois staging) | aprovação de migração |
| 3. Verificação de `aal` nas RPCs de administração | migração | aprovação |
| 4. Ecrã de inscrição e de desafio | frontend | local |
| 5. Ativar exigência para uma conta de teste | Supabase Auth | aprovação específica |
| 6. Alargar a todos os admins | Supabase Auth | aprovação específica |

Nenhum destes passos foi executado. Este documento é o plano, não o estado.
