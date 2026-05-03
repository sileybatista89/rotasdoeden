import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES, type LangCode } from "@/i18n/translations";
import { useT } from "@/i18n/LanguageProvider";

interface Props {
  variant?: "ghost" | "outline";
  compact?: boolean;
}

export function LanguageSwitcher({ variant = "ghost", compact = false }: Props) {
  const { lang, setLang, t } = useT();
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className="gap-1.5 rounded-full px-3"
          aria-label={t("nav.language")}
        >
          <Globe size={15} />
          {compact ? (
            <span className="text-xs font-semibold uppercase">{current.code}</span>
          ) : (
            <span className="text-xs font-medium">
              <span className="mr-1">{current.flag}</span>
              <span className="hidden sm:inline">{current.label}</span>
              <span className="sm:hidden uppercase">{current.code}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">{t("nav.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code as LangCode)}
            className="gap-2 text-sm"
          >
            <span className="text-base leading-none">{l.flag}</span>
            <span className="flex-1">{l.label}</span>
            {l.code === lang && <Check size={14} className="text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
