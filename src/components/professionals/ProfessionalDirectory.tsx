import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTerritory } from "@/hooks/useTerritory";
import { AREAS_OF_ACTIVITY, PROFESSIONAL_TYPES, professionalTypeLabel, type ProfessionalType } from "@/lib/professional";

interface Pro {
  id: string;
  user_id: string;
  professional_type: ProfessionalType | null;
  district_id: string | null;
  locality_id: string | null;
  headline: string | null;
  company_name: string | null;
  areas_of_activity: string[];
  languages: string[];
  profile_photo_url: string | null;
}

const ALL = "all";

export function ProfessionalDirectory() {
  const { districts, localities, localitiesOf } = useTerritory();
  const [pros, setPros] = useState<Pro[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [district, setDistrict] = useState<string>(ALL);
  const [locality, setLocality] = useState<string>(ALL);
  const [area, setArea] = useState<string>(ALL);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("professional_profiles")
        .select("id, user_id, professional_type, district_id, locality_id, headline, company_name, areas_of_activity, languages, profile_photo_url")
        .eq("verification_status", "verified")
        .eq("suspended", false)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as Pro[];
      setPros(rows);
      if (rows.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", rows.map((r) => r.user_id));
        setNames(Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name ?? "Profissional"])));
      }
      setLoading(false);
    })();
  }, []);

  const districtName = (id: string | null) => districts.find((d) => d.id === id)?.name;
  const localityName = (id: string | null) => localities.find((l) => l.id === id)?.name;

  const filtered = useMemo(() => pros.filter((p) => {
    const label = `${names[p.user_id] ?? ""} ${p.company_name ?? ""} ${p.headline ?? ""}`.toLowerCase();
    if (search && !label.includes(search.toLowerCase())) return false;
    if (type !== ALL && p.professional_type !== type) return false;
    if (district !== ALL && p.district_id !== district) return false;
    if (locality !== ALL && p.locality_id !== locality) return false;
    if (area !== ALL && !p.areas_of_activity.includes(area)) return false;
    return true;
  }), [pros, names, search, type, district, locality, area]);

  if (loading || pros.length === 0) return null;

  return (
    <section className="py-14 md:py-20 border-b border-border">
      <div className="container">
        <div className="max-w-2xl mb-8">
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">Profissionais verificados</h2>
          <p className="text-muted-foreground">
            Guias, operadores e agências com identidade e experiência confirmadas pela nossa equipa.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <div className="relative lg:col-span-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Procurar" value={search} maxLength={80}
              onChange={(e) => setSearch(e.target.value)} aria-label="Procurar profissional" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger aria-label="Tipo de profissional"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os tipos</SelectItem>
              {PROFESSIONAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={district} onValueChange={(v) => { setDistrict(v); setLocality(ALL); }}>
            <SelectTrigger aria-label="Distrito"><SelectValue placeholder="Distrito" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os distritos</SelectItem>
              {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={locality} onValueChange={setLocality} disabled={district === ALL}>
            <SelectTrigger aria-label="Localidade"><SelectValue placeholder="Localidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as localidades</SelectItem>
              {localitiesOf(district === ALL ? null : district).map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger aria-label="Área de atuação"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as áreas</SelectItem>
              {AREAS_OF_ACTIVITY.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum profissional corresponde aos filtros escolhidos.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link key={p.id} to={`/guides/${p.user_id}`}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-44 bg-muted overflow-hidden">
                  {p.profile_photo_url && (
                    <img src={p.profile_photo_url} alt={names[p.user_id] ?? "Profissional verificado"}
                      loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1.5 text-xs text-primary font-semibold mb-1">
                    <ShieldCheck size={14} /> Perfil verificado
                  </div>
                  <h3 className="font-display font-semibold text-lg text-foreground">
                    {p.company_name || names[p.user_id] || "Profissional"}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">{professionalTypeLabel(p.professional_type)}</p>
                  {p.headline && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.headline}</p>}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin size={14} />
                    <span>
                      {[localityName(p.locality_id), districtName(p.district_id)].filter(Boolean).join(" · ") || "São Tomé e Príncipe"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
