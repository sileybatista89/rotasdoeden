import { LegalLayout } from "./LegalLayout";
import { legalPages } from "@/data/legalContent";

export default function PrivacidadePage() {
  return <LegalLayout page={legalPages.privacidade} />;
}
