import { LegalLayout } from "./LegalLayout";
import { legalPages } from "@/data/legalContent";

export default function GuiasLegalPage() {
  return <LegalLayout page={legalPages.guias} />;
}
