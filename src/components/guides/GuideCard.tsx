import { Star, MapPin, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "./VerifiedBadge";
import { guidePhotos } from "@/data/guidePhotos";
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
  const photo = guidePhotos[guide.id];

  return (
    <div className="group bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
      {/* Cover area with photo */}
      <div className="h-48 relative overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={guide.user?.name ?? "Guia"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            width={800}
            height={1024}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent" />
        {guide.license_verified && (
          <div className="absolute top-3 right-3">
            <VerifiedBadge size="sm" showLabel={false} className="bg-card/90 backdrop-blur-sm" />
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">{guide.user?.name}</h3>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <MapPin size={14} />
              <span>{guide.city}</span>
            </div>
          </div>
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
