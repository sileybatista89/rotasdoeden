import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  withWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  to?: string;
  variant?: "default" | "light";
}

const sizeMap = {
  sm: { mark: "w-8 h-8", text: "text-base" },
  md: { mark: "w-10 h-10", text: "text-lg sm:text-xl" },
  lg: { mark: "w-12 h-12", text: "text-2xl" },
};

export function LogoMark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const s = sizeMap[size].mark;
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl shadow-md shadow-primary/20 ring-1 ring-primary/20",
        "bg-gradient-to-br from-primary via-primary to-eden-green-dark",
        s,
        className
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="w-[62%] h-[62%] text-primary-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
      >
        {/* Stylised compass + leaf + route mark */}
        <circle cx="16" cy="16" r="13" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
        <path
          d="M16 4 C 11 11, 11 21, 16 28 C 21 21, 21 11, 16 4 Z"
          fill="currentColor"
          fillOpacity="0.95"
        />
        <path
          d="M16 6 C 14 12, 14 20, 16 26"
          stroke="hsl(var(--eden-sand))"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="1.6" fill="hsl(var(--eden-sand))" />
      </svg>
    </span>
  );
}

export function Logo({ className, withWordmark = true, size = "md", to = "/", variant = "default" }: LogoProps) {
  const s = sizeMap[size];
  const wordmarkColor = variant === "light" ? "text-primary-foreground" : "text-foreground";

  const inner = (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="leading-tight">
          <span className={cn("font-display font-bold tracking-tight", s.text, wordmarkColor)}>
            Rotas do Éden
          </span>
          <span className={cn("hidden sm:block text-[10px] uppercase tracking-[0.2em]",
            variant === "light" ? "text-primary-foreground/70" : "text-primary/70 font-semibold")}>
            São Tomé · Príncipe
          </span>
        </span>
      )}
    </span>
  );

  if (!to) return inner;
  return (
    <Link to={to} className="inline-flex items-center group" aria-label="Rotas do Éden">
      {inner}
    </Link>
  );
}
