# Atualização de produto: perfis profissionais, localização e verificação

Atualização incremental. Mantém-se o design atual (Atlântico Éden, tipografia, cards, botões), a navegação, os fluxos de reserva/pagamento e todos os dados existentes.

## Estado atual (verificado no código)

- Não existe tabela de perfil profissional: só `profiles` (nome, bio, avatar, país, `kyc_status`), `user_roles`, `services`, `kyc_submissions`.
- `/guides` é uma página estática "guias em adesão"; `/guides/:id` mostra "perfil ainda não disponível". Não existe diretório nem filtros.
- `services` não tem localidade, dias/horários nem idiomas.
- Verificação existente = KYC (`/kyc` + fila no admin) com estados `pending / submitted / verified / rejected`.

## O que vai ser feito

### 1. Base de dados (migração segura, sem apagar nada)
- `professional_type` (enum): guia credenciado, guia local, operador turístico, empresa/agência, outro.
- Nova tabela `professional_profiles` (1 por utilizador): tipo, distrito, localidade, áreas de atuação, tipos de experiência, descrição profissional, idiomas, foto de perfil, galeria de fotos, `verification_status` (`not_verified`, `pending`, `verified`, `rejected`, `expired`), notas do admin.
- Tabelas territoriais `districts` e `localities` (país → distrito → localidade), com `slug` normalizado (sem acentos/maiúsculas) para evitar duplicados como "Agua Ize"/"Água Izé", e nome oficial de apresentação. Geridas pelo admin.
- Seed dos 7 distritos oficiais e das localidades conhecidas de cada um; a lista fica editável no painel admin em vez de fixa no código.
- `services`: novos campos opcionais de distrito, localidade, ponto de partida, dias e horários disponíveis, idiomas.
- Tabela `admin_audit_log` para registar aprovações, rejeições, mudanças de classificação e correções de localidade.
- Perfis antigos: tipo e localidade a `null`, `verification_status = not_verified`. Nada é bloqueado nem removido.
- RLS + GRANTs: o próprio profissional gere o seu perfil; público lê apenas perfis verificados e não suspensos; documentos privados nunca são públicos; admin tem acesso total via `has_role`.

### 2. Fluxo do profissional
- Nova página "O meu perfil profissional": tipo de profissional (obrigatório), campos que se adaptam ao tipo escolhido, seletor Distrito → Localidade encadeado, descrição, idiomas, áreas de atuação.
- Upload de foto de perfil e galeria de fotos de experiências/serviços já realizados (bucket público) — sem exigir reservas anteriores na plataforma.
- Botão "Solicitar verificação": reutiliza o fluxo/bucket privado do KYC, aceitando documento de identificação, credencial, certificado e outros documentos. Estado visível no painel.
- Experiências (`/my-services`): formulário existente estendido com localidade, dias/horários, idiomas e informações adicionais. Preços e disponibilidade continuam 100% definidos pelo profissional.

### 3. Perfil público e diretório
- `/guides` passa a diretório real de profissionais verificados, com os cards no estilo atual. Se não houver perfis verificados, mantém-se a mensagem "em adesão" atual.
- Filtros: tipo de profissional, distrito, localidade, idioma, preço, verificação (arquitetura preparada para experiência e disponibilidade).
- `/guides/:id` passa a perfil real: selo único "🟢 Perfil Verificado", classificação e localização ("Guia Local · Água Izé · Cantagalo"), galeria, experiências, preços, avaliações.
- Um só selo. O texto do selo passa a "Perfil e informações profissionais analisados pela Rotas do Éden" — deixa de afirmar credenciação governamental. Guia Local nunca é convertido automaticamente em Guia Credenciado.

### 4. Painel de administração
- Fila de verificação unificada: rever documentos, aprovar, rejeitar, expirar.
- Alterar classificação profissional, corrigir distrito/localidade, suspender perfil, remover conteúdo.
- Gestão da lista de distritos/localidades (criar, renomear, fundir duplicados).
- Todas estas ações ficam registadas no log de auditoria.

### 5. Mobile e qualidade
- Formulário de cadastro em passos curtos, seletores nativos amigáveis em telemóvel, upload de fotos otimizado.
- Sem dados fictícios: nenhum guia, avaliação, reserva ou foto inventada.

## Ordem de execução

1. Migração da base de dados + seed territorial (aprovação necessária).
2. Perfil profissional + localização encadeada.
3. Fotos e experiências.
4. Pedido de verificação + painel admin + auditoria.
5. Diretório público, filtros e perfil público.
6. Teste do fluxo completo: registo → guia local → distrito → localidade → perfil → foto → experiência → preço → disponibilidade → pedido de verificação → aprovação → perfil público com selo.

## Nota sobre as localidades

As localidades serão semeadas a partir das divisões administrativas conhecidas de cada um dos 7 distritos (ex.: Cantagalo → Santana, Ribeira Afonso, Água Izé, Praia Melão). Nada será inventado: onde houver dúvida, a localidade não entra no seed e pode ser adicionada pelo admin.
