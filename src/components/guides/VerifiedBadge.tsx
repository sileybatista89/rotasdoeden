import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function VerifiedBadge({ size = "md", showLabel = true, className }: VerifiedBadgeProps) {
  const sizes = {
    sm: "text-xs gap-0.5 px-1.5 py-0.5",
    md: "text-sm gap-1 px-2 py-0.5",
    lg: "text-base gap-1.5 px-3 py-1",
  };
  const iconSizes = { sm: 12, md: 14, lg: 18 };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium text-accent-foreground bg-accent border border-primary/20 rounded-full",
        sizes[size],
        className
      )}
      title="Guia com licença verificada pela Direcção-Geral do Turismo e Hotelaria de STP"
    >
      <CheckCircle size={iconSizes[size]} className="text-primary" />
      {showLabel && <span>Guia Verificado</span>}
    </span>
  );
}
