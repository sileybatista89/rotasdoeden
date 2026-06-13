import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/optimized/logo-rotas-eden.webp";

interface LogoProps {
  className?: string;
  withWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  to?: string;
  variant?: "default" | "light";
}

const heightMap = {
  sm: "h-12",
  md: "h-16 md:h-20",
  lg: "h-24 md:h-28",
};

export function LogoMark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <img
      src={logoImg}
      alt="Rotas do Éden"
      className={cn(heightMap[size], "w-auto object-contain", className)}
    />
  );
}

export function Logo({ className, size = "md", to = "/", variant = "default" }: LogoProps) {
  const inner = (
    <span
      className={cn(
        "inline-flex items-center",
        variant === "light" && "bg-white/95 rounded-xl px-2 py-1",
        className
      )}
    >
      <img
        src={logoImg}
        alt="Rotas do Éden"
        className={cn(heightMap[size], "w-auto object-contain")}
      />
    </span>
  );

  if (!to) return inner;
  return (
    <Link to={to} className="inline-flex items-center group" aria-label="Rotas do Éden">
      {inner}
    </Link>
  );
}
