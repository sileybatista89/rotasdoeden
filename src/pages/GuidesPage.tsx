import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GuideCard } from "@/components/guides/GuideCard";
import { Button } from "@/components/ui/button";
import { mockGuides } from "@/data/mockData";
import type { GuideFilters } from "@/types";

const specialties = ["Natureza", "História", "Mergulho", "Gastronomia", "Aventura", "Birdwatching", "Pesca"];
const languages = ["Português", "Inglês", "Francês", "Espanhol", "Alemão"];
const cities = ["São Tomé", "Príncipe", "Neves", "Santana"];

export default function GuidesPage() {
  const [filters, setFilters] = useState<GuideFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string>("rating");

  const filteredGuides = useMemo(() => {
    let result = [...mockGuides];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (g) =>
          g.user?.name?.toLowerCase().includes(q) ||
          g.bio?.toLowerCase().includes(q)
      );
    }
    if (filters.specialty) {
      result = result.filter((g) => g.specialties.includes(filters.specialty!));
    }
    if (filters.language) {
      result = result.filter((g) => g.languages.includes(filters.language!));
    }
    if (filters.city) {
      result = result.filter((g) => g.city === filters.city);
    }

    if (sortBy === "rating") result.sort((a, b) => b.rating - a.rating);
    if (sortBy === "price_asc") result.sort((a, b) => (a.price_per_day ?? 0) - (b.price_per_day ?? 0));
    if (sortBy === "price_desc") result.sort((a, b) => (b.price_per_day ?? 0) - (a.price_per_day ?? 0));

    return result;
  }, [filters, sortBy]);

  const clearFilters = () => setFilters({});
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="bg-gradient-to-b from-accent/50 to-background py-10">
          <div className="container">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Guias Turísticos
            </h1>
            <p className="text-muted-foreground">
              {filteredGuides.length} guias verificados prontos para te guiar
            </p>
          </div>
        </div>

        <div className="container py-8">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border">
              <Search size={18} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar guias..."
                className="bg-transparent text-sm flex-1 outline-none text-foreground placeholder:text-muted-foreground"
                value={filters.search ?? ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal size={16} />
              Filtros
            </Button>
            <select
              className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="rating">Melhor avaliação</option>
              <option value="price_asc">Preço crescente</option>
              <option value="price_desc">Preço decrescente</option>
            </select>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="bg-card border border-border rounded-lg p-5 mb-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold">Filtros</h3>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                    <X size={14} /> Limpar
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Especialidade</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    value={filters.specialty ?? ""}
                    onChange={(e) => setFilters({ ...filters, specialty: e.target.value || undefined })}
                  >
                    <option value="">Todas</option>
                    {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Língua</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    value={filters.language ?? ""}
                    onChange={(e) => setFilters({ ...filters, language: e.target.value || undefined })}
                  >
                    <option value="">Todas</option>
                    {languages.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Cidade</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    value={filters.city ?? ""}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })}
                  >
                    <option value="">Todas</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>

          {filteredGuides.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">Nenhum guia encontrado com esses filtros.</p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">Limpar filtros</Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
