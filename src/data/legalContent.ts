export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "h3"; text: string };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalPage {
  slug: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}

const UPDATED = "21 de Abril de 2026";
const INTERMEDIARY_NOTE =
  "A Rotas do Éden actua como intermediária tecnológica entre viajantes e prestadores turísticos independentes em São Tomé e Príncipe. Salvo indicação expressa, a plataforma não presta directamente os serviços turísticos reservados.";

export const legalPages: Record<string, LegalPage> = {
  termos: {
    slug: "termos",
    title: "Termos de Serviço",
    intro:
      "Estes Termos regulam a utilização da plataforma Rotas do Éden. Ao criar uma conta ou efectuar uma reserva, o utilizador confirma que leu, compreendeu e aceitou integralmente estes Termos.",
    updated: UPDATED,
    sections: [
      {
        id: "natureza",
        title: "1. Natureza do serviço",
        blocks: [
          { type: "p", text: INTERMEDIARY_NOTE },
          {
            type: "p",
            text: "A utilização da plataforma implica a aceitação integral destes Termos, da Política de Privacidade e das demais políticas publicadas em /legal.",
          },
        ],
      },
      {
        id: "elegibilidade",
        title: "2. Elegibilidade",
        blocks: [
          {
            type: "p",
            text: "Ao utilizar a plataforma, o utilizador declara que:",
          },
          {
            type: "ul",
            items: [
              "Possui capacidade legal para celebrar contratos no seu país de residência;",
              "Fornece dados verdadeiros, completos e actualizados;",
              "Actua de boa-fé e em conformidade com a legislação aplicável;",
              "Não utiliza a plataforma para fins ilícitos ou fraudulentos.",
            ],
          },
        ],
      },
      {
        id: "contas",
        title: "3. Contas de utilizador",
        blocks: [
          {
            type: "p",
            text: "O utilizador é responsável pela confidencialidade das suas credenciais e por toda a actividade realizada através da sua conta. Qualquer suspeita de acesso não autorizado deve ser comunicada de imediato para info@rotasdoeden.com.",
          },
        ],
      },
      {
        id: "reservas",
        title: "4. Reservas",
        blocks: [
          {
            type: "p",
            text: "As reservas só são consideradas válidas após a confirmação do pagamento. A plataforma reserva-se o direito de cancelar reservas em caso de suspeita de fraude, erro técnico, indisponibilidade do guia ou violação destes Termos.",
          },
        ],
      },
      {
        id: "responsabilidade",
        title: "5. Limitação de responsabilidade",
        blocks: [
          {
            type: "p",
            text: "Na máxima extensão permitida por lei, a Rotas do Éden não responde por:",
          },
          {
            type: "ul",
            items: [
              "Actos ou omissões independentes dos guias parceiros;",
              "Acidentes ocorridos fora do controlo razoável da plataforma;",
              "Condições climatéricas, atrasos logísticos ou eventos de força maior;",
              "Decisões de autoridades públicas que afectem o decorrer dos serviços.",
            ],
          },
        ],
      },
      {
        id: "aviso-legal",
        title: "6. Aviso legal",
        blocks: [
          {
            type: "p",
            text: "A Rotas do Éden actua como intermediária digital, salvo indicação expressa em contrário. Não garante clima, tráfego, decisões governamentais ou acções individuais de terceiros que possam afectar a experiência reservada.",
          },
        ],
      },
      {
        id: "alteracoes",
        title: "7. Alterações aos Termos",
        blocks: [
          {
            type: "p",
            text: "Estes Termos podem ser actualizados periodicamente. As alterações entram em vigor após publicação nesta página. A utilização continuada da plataforma após a publicação implica aceitação da nova versão.",
          },
        ],
      },
    ],
  },

  privacidade: {
    slug: "privacidade",
    title: "Privacidade e Protecção de Dados",
    intro:
      "Esta política descreve como recolhemos, utilizamos e protegemos os dados pessoais dos utilizadores da Rotas do Éden, em conformidade com o Regulamento Geral de Protecção de Dados (RGPD) e a legislação aplicável.",
    updated: UPDATED,
    sections: [
      {
        id: "dados-recolhidos",
        title: "1. Dados que recolhemos",
        blocks: [
          {
            type: "p",
            text: "Recolhemos apenas os dados estritamente necessários para o funcionamento do serviço:",
          },
          {
            type: "ul",
            items: [
              "Dados de conta: nome, email, telefone, país;",
              "Dados de reserva: serviço escolhido, data, número de pessoas;",
              "Dados de pagamento (processados por parceiros autorizados);",
              "Mensagens trocadas dentro da plataforma;",
              "Documentos de verificação (KYC) para guias;",
              "Dados técnicos: IP, tipo de dispositivo, registos de acesso.",
            ],
          },
        ],
      },
      {
        id: "finalidades",
        title: "2. Finalidades do tratamento",
        blocks: [
          {
            type: "ul",
            items: [
              "Operação da conta e gestão de reservas;",
              "Processamento seguro de pagamentos;",
              "Prevenção e detecção de fraude;",
              "Suporte ao cliente e resolução de disputas;",
              "Comunicações de marketing apenas com consentimento prévio.",
            ],
          },
          {
            type: "p",
            text: "Os dados nunca serão vendidos a terceiros.",
          },
        ],
      },
      {
        id: "direitos",
        title: "3. Direitos do utilizador (RGPD)",
        blocks: [
          {
            type: "p",
            text: "O utilizador pode, a qualquer momento, solicitar:",
          },
          {
            type: "ul",
            items: [
              "Acesso aos seus dados pessoais;",
              "Correcção de dados incorrectos ou desactualizados;",
              "Eliminação dos seus dados (direito ao esquecimento);",
              "Limitação ou oposição ao tratamento;",
              "Portabilidade dos dados num formato estruturado.",
            ],
          },
          {
            type: "p",
            text: "Pedidos podem ser enviados para info@rotasdoeden.com.",
          },
        ],
      },
      {
        id: "retencao",
        title: "4. Retenção de dados",
        blocks: [
          {
            type: "p",
            text: "Os dados são mantidos apenas pelo tempo necessário para a operação do serviço, cumprimento de obrigações legais, prevenção de fraude e histórico contabilístico.",
          },
        ],
      },
      {
        id: "cookies",
        title: "5. Cookies",
        blocks: [
          {
            type: "p",
            text: "Utilizamos cookies para garantir o funcionamento essencial da plataforma e para melhorar a experiência do utilizador:",
          },
          {
            type: "ul",
            items: [
              "Cookies de sessão e autenticação (essenciais);",
              "Cookies de preferências (idioma, definições);",
              "Cookies de desempenho e analytics agregados;",
            ],
          },
          {
            type: "p",
            text: "O utilizador pode gerir o seu consentimento a partir das definições do navegador.",
          },
        ],
      },
      {
        id: "seguranca",
        title: "6. Segurança",
        blocks: [
          {
            type: "p",
            text: "Adoptamos medidas técnicas e organizacionais razoáveis: encriptação em trânsito, controlo de acesso, registos de auditoria e backups. Nenhum sistema é, contudo, 100% inviolável.",
          },
        ],
      },
    ],
  },

  reservas: {
    slug: "reservas",
    title: "Reservas, Pagamentos e Cancelamentos",
    intro:
      "Esta política descreve as regras aplicáveis a reservas, pagamentos, comissões, cancelamentos, reembolsos e contestações.",
    updated: UPDATED,
    sections: [
      {
        id: "reservas",
        title: "1. Reservas",
        blocks: [
          {
            type: "p",
            text: "Todas as reservas devem ser efectuadas dentro da plataforma. Reservas confirmadas exigem pagamento validado. Reservas combinadas fora da plataforma não beneficiam de qualquer protecção.",
          },
        ],
      },
      {
        id: "pagamentos",
        title: "2. Pagamentos",
        blocks: [
          {
            type: "p",
            text: "Os pagamentos são processados por parceiros autorizados. A plataforma pode reter valores temporariamente para verificação, conclusão do serviço ou prevenção de fraude.",
          },
        ],
      },
      {
        id: "comissoes",
        title: "3. Comissões",
        blocks: [
          {
            type: "p",
            text: "As comissões aplicáveis podem variar conforme a categoria do serviço, campanhas promocionais, parcerias comerciais, país e volume de reservas. A percentagem aplicável é comunicada ao parceiro antes da adesão.",
          },
        ],
      },
      {
        id: "cancelamentos",
        title: "4. Cancelamentos e reembolsos",
        blocks: [
          {
            type: "p",
            text: "Política padrão para cancelamentos por parte do cliente:",
          },
          {
            type: "ul",
            items: [
              "Mais de 48h antes do início: reembolso total ou parcial, conforme as condições do serviço;",
              "Entre 24h e 48h: reembolso parcial;",
              "Menos de 24h: sem direito a reembolso;",
              "Não comparência (no-show): sem direito a reembolso.",
            ],
          },
          {
            type: "p",
            text: "Casos de força maior são avaliados individualmente. Cancelamentos injustificados por parte do guia podem dar origem a penalizações, perda de destaque ou suspensão.",
          },
        ],
      },
      {
        id: "chargeback",
        title: "5. Chargebacks e disputas",
        blocks: [
          {
            type: "p",
            text: "Em caso de contestação bancária, a plataforma reserva-se o direito de utilizar como prova o histórico de mensagens, comprovativos, geolocalização, registos de acesso e confirmações internas. Utilizadores com chargebacks abusivos poderão ter a sua conta suspensa.",
          },
        ],
      },
      {
        id: "disputas",
        title: "6. Resolução de disputas",
        blocks: [
          {
            type: "p",
            text: "Em caso de conflito entre as partes, recomendamos:",
          },
          {
            type: "ul",
            items: [
              "Contacto directo entre cliente e guia através do chat interno;",
              "Mediação pela equipa da Rotas do Éden;",
              "Decisão interna fundamentada em provas documentais;",
              "Aplicação das medidas adequadas para proteger o ecossistema.",
            ],
          },
        ],
      },
    ],
  },

  antifraude: {
    slug: "antifraude",
    title: "Protecção Antifraude e Segurança",
    intro:
      "A confiança é o pilar central da Rotas do Éden. Esta política descreve as práticas proibidas, as medidas preventivas e as consequências aplicáveis.",
    updated: UPDATED,
    sections: [
      {
        id: "condutas-proibidas",
        title: "1. Condutas proibidas",
        blocks: [
          {
            type: "ul",
            items: [
              "Solicitar ou efectuar pagamentos fora da plataforma;",
              "Trocar contactos pessoais para contornar a comissão;",
              "Criar contas falsas ou múltiplas contas com fins abusivos;",
              "Apresentar documentos falsos ou adulterados;",
              "Publicar avaliações falsas ou manipuladas;",
              "Iniciar chargebacks abusivos;",
              "Enviar spam ou assediar outros utilizadores;",
              "Usurpar identidade de terceiros.",
            ],
          },
        ],
      },
      {
        id: "medidas",
        title: "2. Medidas preventivas",
        blocks: [
          {
            type: "ul",
            items: [
              "Verificação documental (KYC) para guias parceiros;",
              "Monitorização de actividade e padrões anómalos;",
              "Análise de transacções de risco;",
              "Revisão manual de submissões e denúncias;",
              "Bloqueio preventivo em caso de suspeita fundada;",
              "Cooperação com autoridades quando legalmente exigido.",
            ],
          },
        ],
      },
      {
        id: "suspensao",
        title: "3. Suspensão de contas",
        blocks: [
          {
            type: "p",
            text: "A plataforma reserva-se o direito de suspender ou encerrar contas em caso de:",
          },
          {
            type: "ul",
            items: [
              "Fraude comprovada ou tentativa de fraude;",
              "Abuso, assédio ou linguagem ofensiva;",
              "Múltiplas reclamações graves;",
              "Tentativa de contornar a plataforma;",
              "Incumprimento reiterado destes Termos.",
            ],
          },
        ],
      },
      {
        id: "seguranca-plataforma",
        title: "4. Segurança da plataforma",
        blocks: [
          {
            type: "p",
            text: "Adoptamos medidas razoáveis de protecção: encriptação, backups regulares, controlo de acessos baseado em funções, registos de auditoria e monitorização contínua.",
          },
        ],
      },
    ],
  },

  guias: {
    slug: "guias",
    title: "Guias Parceiros e Código de Conduta",
    intro:
      "Esta política regula a relação entre a Rotas do Éden e os guias parceiros, incluindo deveres profissionais, condições de parceria e padrões de conduta.",
    updated: UPDATED,
    sections: [
      {
        id: "deveres",
        title: "1. Deveres do guia parceiro",
        blocks: [
          {
            type: "ul",
            items: [
              "Fornecer dados pessoais e profissionais verdadeiros;",
              "Manter documentação válida e licenças exigidas pela legislação local;",
              "Cumprir horários e itinerários acordados;",
              "Manter descrições de serviço honestas, sem cobrança de extras ocultos;",
              "Tratar os clientes com respeito e profissionalismo;",
              "Não desviar clientes para fora da plataforma.",
            ],
          },
        ],
      },
      {
        id: "parceria",
        title: "2. Contrato de parceria",
        blocks: [
          {
            type: "p",
            text: "Ao aderir como guia, o parceiro reconhece que actua como profissional independente, sendo o único responsável pela execução do serviço prestado, pelo cumprimento das leis locais e pelas suas obrigações fiscais.",
          },
        ],
      },
      {
        id: "pagamento-guia",
        title: "3. Pagamento ao guia",
        blocks: [
          {
            type: "p",
            text: "Os pagamentos ao guia podem ocorrer após a confirmação da conclusão do serviço, decorrido o período antifraude e validação interna da reserva.",
          },
        ],
      },
      {
        id: "encerramento",
        title: "4. Encerramento da parceria",
        blocks: [
          {
            type: "p",
            text: "A parceria pode ser encerrada em caso de fraude, reclamações graves, incumprimento dos Termos ou tentativas de captação externa de clientes.",
          },
        ],
      },
      {
        id: "codigo-conduta",
        title: "5. Código de conduta",
        blocks: [
          {
            type: "p",
            text: "Todos os utilizadores e guias devem agir com:",
          },
          {
            type: "ul",
            items: [
              "Respeito mútuo e tolerância;",
              "Honestidade e transparência;",
              "Pontualidade e responsabilidade;",
              "Boa-fé contratual;",
              "Profissionalismo nas comunicações.",
            ],
          },
        ],
      },
    ],
  },

  comunidade: {
    slug: "comunidade",
    title: "Comunidade, Avaliações e Conteúdo",
    intro:
      "Esta política regula avaliações, conteúdo gerado pelos utilizadores, comunicações internas e direitos de protecção do cliente.",
    updated: UPDATED,
    sections: [
      {
        id: "avaliacoes",
        title: "1. Avaliações",
        blocks: [
          {
            type: "p",
            text: "Apenas clientes com reserva concluída podem submeter avaliações. A plataforma reserva-se o direito de remover avaliações que contenham:",
          },
          {
            type: "ul",
            items: [
              "Insultos ou linguagem ofensiva;",
              "Conteúdo comprovadamente falso;",
              "Manipulação ou tentativas de chantagem;",
              "Spam ou conteúdo irrelevante.",
            ],
          },
        ],
      },
      {
        id: "conteudo",
        title: "2. Conteúdo publicado",
        blocks: [
          {
            type: "p",
            text: "É proibido publicar na plataforma:",
          },
          {
            type: "ul",
            items: [
              "Conteúdo falso ou enganoso;",
              "Imagens cuja titularidade não seja do utilizador;",
              "Linguagem ofensiva ou discriminatória;",
              "Material ilegal ou que promova actividades ilícitas.",
            ],
          },
        ],
      },
      {
        id: "comunicacoes",
        title: "3. Comunicações internas",
        blocks: [
          {
            type: "p",
            text: "As comunicações entre clientes e guias devem ocorrer dentro do sistema de mensagens. Estas mensagens podem ser monitorizadas para fins de segurança, suporte e prevenção de fraude. É proibido qualquer tipo de assédio ou spam.",
          },
        ],
      },
      {
        id: "proteccao-cliente",
        title: "4. Protecção do cliente",
        blocks: [
          {
            type: "p",
            text: "O cliente tem direito a:",
          },
          {
            type: "ul",
            items: [
              "Informação clara sobre o serviço reservado;",
              "Preço transparente, sem custos ocultos;",
              "Suporte razoável em caso de problemas;",
              "Canal de reclamação acessível;",
              "Tratamento respeitoso por parte do guia e da plataforma.",
            ],
          },
        ],
      },
    ],
  },

  parcerias: {
    slug: "parcerias",
    title: "Propriedade Intelectual e Parcerias",
    intro:
      "Esta política regula os direitos de propriedade intelectual da Rotas do Éden e as condições aplicáveis a parcerias institucionais.",
    updated: UPDATED,
    sections: [
      {
        id: "propriedade-intelectual",
        title: "1. Propriedade intelectual",
        blocks: [
          {
            type: "p",
            text: "Todo o conteúdo da plataforma, incluindo a marca, design, software, textos e identidade visual, pertence à Rotas do Éden ou aos seus licenciadores. A utilização indevida é proibida.",
          },
        ],
      },
      {
        id: "parcerias-institucionais",
        title: "2. Parcerias institucionais",
        blocks: [
          {
            type: "p",
            text: "A plataforma pode estabelecer parcerias estratégicas com entidades públicas, hotéis, agências e operadores turísticos, sem que daí resulte transferência automática de controlo, exclusividade ou responsabilidade directa sobre cada tour individual, salvo contrato específico.",
          },
        ],
      },
      {
        id: "termos-institucionais",
        title: "3. Termos institucionais",
        blocks: [
          {
            type: "p",
            text: "Parcerias com entidades públicas ou privadas não significam responsabilidade directa da Rotas do Éden sobre cada experiência turística individual, salvo quando expressamente contratado.",
          },
        ],
      },
    ],
  },
};

export const legalNav: { slug: string; label: string }[] = [
  { slug: "termos", label: "Termos de Serviço" },
  { slug: "privacidade", label: "Privacidade e Cookies" },
  { slug: "reservas", label: "Reservas e Pagamentos" },
  { slug: "antifraude", label: "Antifraude e Segurança" },
  { slug: "guias", label: "Guias Parceiros" },
  { slug: "comunidade", label: "Comunidade e Avaliações" },
  { slug: "parcerias", label: "Propriedade Intelectual" },
];
