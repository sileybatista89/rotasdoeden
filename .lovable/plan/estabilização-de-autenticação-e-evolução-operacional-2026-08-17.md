# Estabilização de autenticação e evolução operacional

## Objetivo
Corrigir primeiro o acesso e registo sem alterar fluxos que já funcionam; depois tornar a verificação profissional, o suporte e as notificações mais robustos, com entregas separadas e verificáveis.

## Estado confirmado
- As rotas `/auth` e `/auth?mode=register` abriram corretamente no teste local, com formulário visível, resposta HTTP 200 e sem exceção fatal. Portanto, a tela branca não foi reproduzida neste momento e pode depender do clique/origem, sessão guardada, dispositivo ou versão publicada.
- O registo atual usa email/password, confirmação por email e cria o perfil/role através do fluxo existente.
- A verificação profissional atual permite aprovar ou rejeitar, mas a licença/credencial é opcional no formulário e a aprovação não valida documentos por categoria.
- O chat atual funciona apenas entre turista e guia; as políticas atuais não permitem ao administrador iniciar uma conversa de suporte como participante.
- Não existe atualmente um centro de notificações no site nem envio transacional de email ligado a reservas, mensagens ou revisão documental.

## Fase 1 — Corrigir e proteger login/registo
1. Reproduzir a navegação a partir de todos os botões “Entrar” e “Criar conta”, em desktop e mobile, incluindo a versão publicada e sessões autenticadas/desautenticadas.
2. Corrigir apenas a causa comprovada da tela branca. Tornar o estado de autenticação resiliente a falhas de rede/consulta de role, evitando carregamento infinito e redirecionamentos silenciosos.
3. Melhorar o retorno de erros do login e registo, preservar a intenção de navegação e mostrar claramente o estado “verifica o teu email”.
4. Adicionar testes focados para abertura das duas modalidades, submissão, falha de rede e redirecionamento após autenticação.

## Fase 2 — Verificação por categoria, checklist e suporte
1. Definir uma matriz de documentos por categoria profissional:
   - guia credenciado: identificação + licença/credencial de turismo;
   - guia local: identificação + declaração/credencial alternativa aplicável;
   - operador/empresa: identificação do responsável + registo/licença da entidade;
   - outro: requisitos definidos pelo administrador antes da decisão.
2. Introduzir o estado `documentos_em_falta` sem apagar o histórico. Cada pedido terá checklist, itens obrigatórios, nota do administrador, datas e trilho de auditoria.
3. Impedir aprovação enquanto um item obrigatório estiver ausente. A decisão final será feita por uma operação segura e atómica no backend, em vez de múltiplas atualizações independentes no navegador.
4. Permitir ao guia reenviar somente os documentos pedidos no mesmo processo; o administrador compara versões e retoma a revisão.
5. Corrigir o caso já aprovado indevidamente através do novo fluxo somente depois de identificar inequivocamente o utilizador no painel; a pesquisa textual feita na base não encontrou correspondência segura para “Ismail Limon”, portanto nenhum dado será alterado por suposição.
6. Criar conversas de suporte separadas das conversas comerciais. O administrador poderá iniciar o contacto a partir do pedido, e o guia verá a chamada no seu centro de mensagens. Aplicar acesso apenas ao guia envolvido e a administradores, com moderação e auditoria.

## Fase 3 — Notificações no site e email
1. Criar um centro de notificações com contador, estados lida/não lida e links para reserva, mensagem, verificação ou suporte.
2. Gerar notificações para: nova reserva confirmada, nova mensagem, pedido de documentos, documento reenviado, aprovação, rejeição, advertência e suspensão.
3. Enviar emails transacionais oficiais para os mesmos eventos críticos, por funções do backend e não diretamente pelo navegador. Incluir identidade Rotas do Éden, links no domínio oficial e preferências de comunicação.
4. Implementar idempotência, fila/estado de entrega, tentativas e registo de falhas para evitar emails duplicados ou perdidos.
5. Configurar autenticação do domínio de envio e boas práticas de reputação. Não é tecnicamente possível prometer “nunca cair em spam”, mas SPF, DKIM, DMARC, conteúdo transacional e higiene de envio reduzirão fortemente esse risco.

## Fase 4 — Painel administrativo operacional
1. Unificar a visão do guia: perfil, categoria, checklist documental, histórico de decisões, reservas, suporte, advertências e estado da conta.
2. Adicionar ações explícitas e auditadas: pedir documentos, iniciar suporte, advertir, suspender/desbloquear e banir/desbanir.
3. Substituir atividade demonstrativa por eventos reais e adicionar filtros para pendências, documentos em falta, mensagens por responder e entregas de email falhadas.
4. Manter KYC de identidade separado da verificação profissional, evitando as duas filas atuais aprovarem estados contraditórios.

## Detalhes técnicos e segurança
- Alterações de base de dados serão aditivas, com `GRANT`, RLS e políticas específicas para utilizador, administrador e funções de serviço.
- Roles continuam exclusivamente em `user_roles`; nenhuma autorização dependerá de dados locais do navegador.
- Documentos continuam privados, com URLs temporárias e acesso auditado.
- Ações administrativas sensíveis serão centralizadas em funções protegidas para validar role, checklist e transições de estado.
- Cada fase terá validação no navegador, testes seletivos e verificação das políticas antes de avançar para a seguinte.

## Critérios de aceitação
- Login e registo nunca deixam uma tela branca; falhas mostram uma mensagem e uma ação de recuperação.
- Um perfil não pode ser verificado sem todos os documentos exigidos pela sua categoria.
- O administrador pede documentos em falta com checklist e chat; o guia recebe aviso no site e por email e pode reenviar.
- Reservas, mensagens e decisões de verificação criam notificações rastreáveis sem duplicação.
- O painel mostra histórico e ações reais sem quebrar reservas, pagamentos, chat comercial ou perfis existentes.
