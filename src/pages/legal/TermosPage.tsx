import { LegalLayout } from "./LegalLayout";
import { legalPages } from "@/data/legalContent";

export default function TermosPage() {
  return <LegalLayout page={legalPages.termos} />;
}
