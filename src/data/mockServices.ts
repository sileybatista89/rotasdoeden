import type { Service } from "@/types";

// Sem serviços fictícios. Serão alimentados pelo backend assim que existirem
// guias parceiros verificados a publicar experiências reais.
export const mockServices: Service[] = [];

    id: "s1", guide_id: "g1", title: "Mergulho para Iniciantes",
    description: "Experiência completa de mergulho para quem nunca mergulhou. Inclui equipamento, instrução em terra e 2 mergulhos guiados em águas rasas até 8 metros.",
    duration_hours: 4, price: 65, max_people: 4, min_people: 1, category: "diving", images: [],
    includes: ["Equipamento completo", "Instrução em terra", "2 mergulhos guiados", "Seguro"],
    meeting_point: "Marina de São Tomé", is_active: true,
  },
  {
    id: "s2", guide_id: "g1", title: "Expedição aos Recifes Profundos",
    description: "Para mergulhadores certificados (Open Water ou superior). Exploramos 3 pontos de mergulho diferentes, incluindo o famoso Banco João de Lisboa, com peixes-leão e corais negros.",
    duration_hours: 8, price: 120, max_people: 6, min_people: 2, category: "diving", images: [],
    includes: ["Equipamento", "3 mergulhos", "Almoço a bordo", "Transporte"],
    meeting_point: "Marina de São Tomé", is_active: true,
  },
  {
    id: "s3", guide_id: "g1", title: "Snorkeling em Família",
    description: "Perfeito para famílias com crianças a partir dos 6 anos. Passeio de barco até 2 praias remotas com snorkeling guiado e piquenique incluído.",
    duration_hours: 3, price: 40, max_people: 10, min_people: 2, category: "diving", images: [],
    includes: ["Equipamento de snorkel", "Passeio de barco", "Piquenique", "Guia"],
    meeting_point: "Praia de Lagarto", is_active: true,
  },

  // João da Costa (g2)
  {
    id: "s4", guide_id: "g2", title: "Trekking Pico de São Tomé",
    description: "A subida mais épica da ilha — 2024 metros de altitude, floresta primária, névoa mística e uma vista de 360º que nunca esquecerás. Nível: moderado a difícil.",
    duration_hours: 10, price: 95, max_people: 8, min_people: 2, category: "hiking", images: [],
    includes: ["Transferes", "Pequeno-almoço", "Almoço na montanha", "Bastões de trilho"],
    meeting_point: "Hotel Pestana, São Tomé", is_active: true,
  },
  {
    id: "s5", guide_id: "g2", title: "Observação de Pássaros Endémicos",
    description: "Madrugar vale a pena. Saímos antes do amanhecer para ouvir o coro da floresta e identificar as 12 espécies de aves endémicas mais raras, incluindo o ibis-de-São-Tomé e o zosterope-de-Newton.",
    duration_hours: 6, price: 75, max_people: 6, min_people: 1, category: "birdwatching", images: [],
    includes: ["Guia de campo ilustrado (oferta)", "Binóculos", "Pequeno-almoço"],
    meeting_point: "Parque Natural Obô, entrada norte", is_active: true,
  },
  {
    id: "s6", guide_id: "g2", title: "Cascatas e Banhos Naturais",
    description: "Uma caminhada fácil por floresta densa até às 3 cascatas mais belas da ilha, com paragens para nadar em piscinas naturais cristalinas. Ideal para famílias.",
    duration_hours: 5, price: 55, max_people: 12, min_people: 1, category: "hiking", images: [],
    includes: ["Transporte", "Lanche", "Guia naturalista"],
    meeting_point: "São Tomé, Centro", is_active: true,
  },

  // Ana Quaresma (g3)
  {
    id: "s7", guide_id: "g3", title: "Tour do Cacau: da Planta ao Chocolate",
    description: "Visita à Roça Água Izé, colheita de cacau, processo de fermentação e secagem, degustação de chocolates premium. Inclui workshop de confeção de bombons que podes levar para casa.",
    duration_hours: 7, price: 85, max_people: 10, min_people: 2, category: "gastronomy", images: [],
    includes: ["Transporte", "Degustação", "Workshop", "Almoço na roça", "Bombons para levar"],
    meeting_point: "Mercado Municipal de São Tomé", is_active: true,
  },
  {
    id: "s8", guide_id: "g3", title: "Aula de Culinária Santomense",
    description: "Aprende a cozinhar calulu de peixe, matata de amêijoas e bolo de mel da terra na cozinha da minha família. Mercado local incluído de manhã para escolher os ingredientes frescos.",
    duration_hours: 4, price: 70, max_people: 8, min_people: 1, category: "gastronomy", images: [],
    includes: ["Ingredientes", "Receitas", "Refeição completa", "Visita ao mercado"],
    meeting_point: "Mercado Municipal de São Tomé", is_active: true,
  },
  {
    id: "s9", guide_id: "g3", title: "Rota das Roças Históricas",
    description: "Tour completo pelas 4 roças mais importantes da ilha — Água Izé, Monte Café, Rio do Ouro e Agostinho Neto. História colonial, arquitectura, café e cacau.",
    duration_hours: 8, price: 90, max_people: 12, min_people: 2, category: "culture", images: [],
    includes: ["Transporte", "Almoço", "Degustações", "Guia historiadora"],
    meeting_point: "Praça da Independência, São Tomé", is_active: true,
  },

  // Pedro Bragança (g4)
  {
    id: "s10", guide_id: "g4", title: "Tour Histórico do Centro Colonial",
    description: "Percurso a pé pelo centro histórico: Fortaleza de São Sebastião, Catedral, Mercado Municipal, Bairro da Pelourinho. Cada paragem tem uma história que nunca encontras nos livros de viagem.",
    duration_hours: 4, price: 60, max_people: 15, min_people: 1, category: "tour", images: [],
    includes: ["Guia historiador", "Entradas nos museus"],
    meeting_point: "Fortaleza de São Sebastião", is_active: true,
  },
  {
    id: "s11", guide_id: "g4", title: "Fotografia Urbana ao Amanhecer",
    description: "Saímos às 6h para capturar a cidade que acorda — pescadores chegando ao mercado, mulheres com cestos na cabeça, crianças a caminho da escola. Pedro guia tanto o olhar fotográfico como o percurso histórico.",
    duration_hours: 3, price: 55, max_people: 6, min_people: 1, category: "photography", images: [],
    includes: ["Guia fotográfico", "Dicas de composição", "Café"],
    meeting_point: "Mercado Municipal, 5:45h", is_active: true,
  },
  {
    id: "s12", guide_id: "g4", title: "São Tomé Noturna: Bares, Músicos e Memórias",
    description: "A cidade transforma-se à noite. Visitamos 3 bares locais com semba e ússua ao vivo, provamos a grogue local com história, e terminamos num miradouro secreto com vista para o porto.",
    duration_hours: 4, price: 65, max_people: 10, min_people: 2, category: "nightlife", images: [],
    includes: ["3 bebidas incluídas", "Entrada nos bares", "Guia cultural"],
    meeting_point: "Praça da Independência, 20h", is_active: true,
  },

  // Maria do Príncipe (g5)
  {
    id: "s13", guide_id: "g5", title: "Avistamento de Tartarugas Marinhas",
    description: "De Junho a Setembro, as tartarugas-de-couro e verdes desovam nas praias do Príncipe. Saímos à meia-noite para assistir a este fenómeno natural extraordinário com impacto mínimo nos animais.",
    duration_hours: 5, price: 80, max_people: 6, min_people: 2, category: "experience", images: [],
    includes: ["Guia educativo", "Transporte", "Lanche nocturno"],
    meeting_point: "Santo António, Príncipe", is_active: true,
  },
  {
    id: "s14", guide_id: "g5", title: "Surf no Príncipe — Aula + Sessão Livre",
    description: "Picos de surf praticamente virgens, ondas consistentes e quase nunca há mais de 2 pessoas na água. Para iniciantes e intermédios.",
    duration_hours: 4, price: 70, max_people: 4, min_people: 1, category: "surfing", images: [],
    includes: ["Prancha", "Leash", "Wetsuit", "Instrução"],
    meeting_point: "Praia Banana, Príncipe", is_active: true,
  },
  {
    id: "s15", guide_id: "g5", title: "Expedição às Praias Remotas",
    description: "Barco até às 3 praias mais remotas do Príncipe — Praia Banana, Praia Salgada e Praia Infante — com snorkeling, almoço de peixe fresco grelhado e observação de macacos-de-cauda-longa.",
    duration_hours: 8, price: 100, max_people: 8, min_people: 2, category: "experience", images: [],
    includes: ["Barco", "Snorkeling", "Almoço de peixe fresco", "Guia naturalista"],
    meeting_point: "Porto de Santo António", is_active: true,
  },

  // Tomás Vaz (g6)
  {
    id: "s16", guide_id: "g6", title: "Pesca Tradicional em Piroga",
    description: "Saímos ao amanhecer numa piroga tradicional pintada à mão com pescadores locais. Aprendemos a lançar as redes, pescamos peixe fresco e cozinhamos numa praia isolada.",
    duration_hours: 6, price: 75, max_people: 4, min_people: 1, category: "fishing", images: [],
    includes: ["Piroga", "Equipamento de pesca", "Almoço na praia", "Guia local"],
    meeting_point: "Praia de Neves, 5:30h", is_active: true,
  },
  {
    id: "s17", guide_id: "g6", title: "Kayak pela Costa Noroeste",
    description: "Percurso de kayak pelas grutas e enseadas da costa noroeste — a costa mais selvagem e menos visitada da ilha. Paragem para nadar nas piscinas naturais de rocha vulcânica.",
    duration_hours: 5, price: 65, max_people: 8, min_people: 2, category: "kayak", images: [],
    includes: ["Equipamento completo", "Lanche", "Guia de kayak"],
    meeting_point: "Praia de Neves", is_active: true,
  },
  {
    id: "s18", guide_id: "g6", title: "Dia com a Comunidade Piscatória de Neves",
    description: "A experiência cultural mais autêntica da ilha. Manhã no mercado de peixe com os pescadores, tarde a construir redes com as mulheres da comunidade, e jantar em casa de uma família local.",
    duration_hours: 7, price: 80, max_people: 6, min_people: 2, category: "culture", images: [],
    includes: ["Mercado de peixe", "Workshop de redes", "Jantar em família", "Música local"],
    meeting_point: "Mercado de Neves, 7h", is_active: true,
  },
];
