import { LegalLayout } from "./LegalLayout";
import { legalPages } from "@/data/legalContent";

export default function ReservasPage() {
  return <LegalLayout page={legalPages.reservas} />;
}
