import { LegalLayout } from "./LegalLayout";
import { legalPages } from "@/data/legalContent";

export default function AntifraudePage() {
  return <LegalLayout page={legalPages.antifraude} />;
}
