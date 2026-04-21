export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface MockBooking {
  id: string;
  guide_id: string;
  guide_name: string;
  service_title: string;
  tourist_name: string;
  tourist_country: string;
  date: string;
  num_people: number;
  total: number;
  status: BookingStatus;
  created_at: string;
}

export const mockBookings: MockBooking[] = [
  { id: "bk001", guide_id: "g1", guide_name: "Carlos Espírito Santo", service_title: "Mergulho nos Recifes Profundos", tourist_name: "Sophie Müller", tourist_country: "Alemanha", date: "2026-05-12", num_people: 2, total: 170, status: "confirmed", created_at: "2026-04-10" },
  { id: "bk002", guide_id: "g2", guide_name: "João da Costa", service_title: "Trekking ao Pico de São Tomé", tourist_name: "Lars Andersen", tourist_country: "Dinamarca", date: "2026-05-18", num_people: 4, total: 280, status: "pending", created_at: "2026-04-15" },
  { id: "bk003", guide_id: "g3", guide_name: "Ana Quaresma", service_title: "Aula de Culinária Santomense", tourist_name: "Patricia Lemos", tourist_country: "Brasil", date: "2026-04-25", num_people: 3, total: 195, status: "confirmed", created_at: "2026-04-08" },
  { id: "bk004", guide_id: "g4", guide_name: "Pedro Bragança", service_title: "Tour Histórico de São Tomé", tourist_name: "Olga Petrov", tourist_country: "Rússia", date: "2026-04-22", num_people: 2, total: 100, status: "completed", created_at: "2026-04-05" },
  { id: "bk005", guide_id: "g5", guide_name: "Maria do Príncipe", service_title: "Praias Remotas do Príncipe", tourist_name: "Emma Thompson", tourist_country: "Reino Unido", date: "2026-06-02", num_people: 6, total: 540, status: "pending", created_at: "2026-04-18" },
  { id: "bk006", guide_id: "g6", guide_name: "Tomás Vaz", service_title: "Kayak pela Costa Noroeste", tourist_name: "Camille Bernard", tourist_country: "França", date: "2026-04-28", num_people: 2, total: 130, status: "confirmed", created_at: "2026-04-12" },
  { id: "bk007", guide_id: "g1", guide_name: "Carlos Espírito Santo", service_title: "Snorkeling Familiar", tourist_name: "Marco Delgado", tourist_country: "Portugal", date: "2026-04-21", num_people: 4, total: 200, status: "cancelled", created_at: "2026-04-01" },
  { id: "bk008", guide_id: "g2", guide_name: "João da Costa", service_title: "Trilho das Cascatas", tourist_name: "Tom Harrison", tourist_country: "Austrália", date: "2026-05-05", num_people: 2, total: 110, status: "confirmed", created_at: "2026-04-14" },
  { id: "bk009", guide_id: "g3", guide_name: "Ana Quaresma", service_title: "Tour de Cacau e Chocolate", tourist_name: "Heinrich Bauer", tourist_country: "Alemanha", date: "2026-05-22", num_people: 2, total: 150, status: "pending", created_at: "2026-04-19" },
  { id: "bk010", guide_id: "g5", guide_name: "Maria do Príncipe", service_title: "Observação de Tartarugas", tourist_name: "Annika Svensson", tourist_country: "Suécia", date: "2026-06-15", num_people: 3, total: 225, status: "confirmed", created_at: "2026-04-17" },
];

// Bookings per month for chart (last 6 months)
export const bookingsPerMonth = [
  { month: "Nov", reservas: 18, receita: 4200 },
  { month: "Dez", reservas: 22, receita: 5100 },
  { month: "Jan", reservas: 28, receita: 6800 },
  { month: "Fev", reservas: 31, receita: 7400 },
  { month: "Mar", reservas: 42, receita: 9800 },
  { month: "Abr", reservas: 56, receita: 13200 },
];
