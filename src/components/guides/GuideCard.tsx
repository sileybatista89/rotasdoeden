import { Star, MapPin, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "./VerifiedBadge";
import type { Guide } from "@/types";

interface GuideCardProps {
  guide: Guide;
}

const specialtyColors: Record<string, string> = {
  Natureza: "bg-accent text-accent-foreground",
  História: "bg-eden-sand-light text-secondary-foreground",
  Mergulho: "bg-eden-ocean-light text-foreground",
  Gastronomia: "bg-eden-sand-light text-secondary-foreground",
  Aventura: "bg-accent text-accent-foreground",
  Birdwatching: "bg-accent text-accent-foreground",
  Pesca: "bg-eden-ocean-light text-foreground",
};

export function GuideCard({ guide }: GuideCardProps) {
  const initials = guide.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2) ?? "G";

  return (
    <div className="group bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
      {/* Cover area */}
      <div className="h-36 bg-gradient-to-br from-primary/20 to-primary/5 relative flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 border-4 border-card flex items-center justify-center text-2xl font-display font-bold text-primary absolute -bottom-10 left-5 shadow-md">
          {initials}
        </div>
      </div>

      <div className="pt-12 px-5 pb-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">{guide.user?.name}</h3>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <MapPin size={14} />
              <span>{guide.city}</span>
            </div>
          </div>
          {guide.license_verified && <VerifiedBadge size="sm" showLabel={false} />}
        </div>

        <div className="flex items-center gap-1 mb-3">
          <Star size={14} className="fill-secondary text-secondary" />
          <span className="font-semibold text-sm">{guide.rating.toFixed(1)}</span>
          <span className="text-muted-foreground text-sm">({guide.total_reviews} avaliações)</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {guide.specialties.slice(0, 3).map((s) => (
            <span
              key={s}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${specialtyColors[s] ?? "bg-muted text-muted-foreground"}`}
            >
              {s}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 mb-4 text-muted-foreground text-sm">
          <Globe size={14} />
          <span>{guide.languages.join(" · ")}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">A partir de</span>
            <p className="font-display font-bold text-lg text-foreground">€{guide.price_per_day}<span className="text-sm font-normal text-muted-foreground">/dia</span></p>
          </div>
          <Button asChild size="sm">
            <Link to={`/guides/${guide.id}`}>Ver Perfil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
