// Discovery data sources. Only SearchConsoleSource is implemented in V1.
// A source NEVER invents data: when it cannot reach the real API it fails closed.

import type { DiscoverySignal, DiscoverySource, DiscoverySourceResult } from "./discovery.ts";

export class SourceUnavailableError extends Error {
  constructor(message: string, readonly code = "source_unavailable", readonly permanent = true) {
    super(message);
  }
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Google Search Console — OBSERVED demand inside Rotas do Éden's own digital presence.
 * It is NOT a representation of worldwide demand and must always be labelled as such.
 */
export class SearchConsoleSource implements DiscoverySource {
  readonly name = "google_search_console";

  constructor(
    private readonly apiKey: string | undefined,
    private readonly siteUrl: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.siteUrl);
  }

  async fetchSignals(input: {
    countries?: string[];
    startDate?: string;
    endDate?: string;
    limit: number;
  }): Promise<DiscoverySourceResult> {
    if (!this.isConfigured()) {
      throw new SourceUnavailableError(
        "Google Search Console não está configurado (falta credencial ou site).",
        "source_not_configured",
      );
    }

    const startDate = input.startDate ?? isoDaysAgo(90);
    const endDate = input.endDate ?? isoDaysAgo(2);
    const body: Record<string, unknown> = {
      startDate,
      endDate,
      dimensions: ["query", "country"],
      rowLimit: input.limit,
    };
    if (input.countries?.length) {
      body.dimensionFilterGroups = [
        {
          filters: input.countries.map((country) => ({
            dimension: "country",
            operator: "equals",
            expression: country.toLowerCase(),
          })),
          groupType: "or",
        },
      ];
    }

    const url =
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.siteUrl)}` +
      `/searchAnalytics/query?key=${encodeURIComponent(this.apiKey!)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      const transient = res.status === 429 || res.status >= 500;
      throw new SourceUnavailableError(
        `Search Console respondeu ${res.status}: ${text.slice(0, 300)}`,
        `search_console_${res.status}`,
        !transient,
      );
    }

    const data = await res.json();
    const collectedAt = new Date().toISOString();
    const signals: DiscoverySignal[] = (data?.rows ?? []).map((row: Record<string, unknown>) => {
      const keys = (row.keys ?? []) as string[];
      return {
        query: String(keys[0] ?? "").trim(),
        country: String(keys[1] ?? "").trim().toUpperCase(),
        language: null,
        impressions: Number(row.impressions ?? 0),
        clicks: Number(row.clicks ?? 0),
        position: Number(row.position ?? 0) || null,
        ctr: Number(row.ctr ?? 0),
        period_start: startDate,
        period_end: endDate,
        source: this.name,
        source_reference: { site: this.siteUrl, start_date: startDate, end_date: endDate, dimensions: ["query", "country"] },
        collected_at: collectedAt,
      };
    }).filter((signal: DiscoverySignal) => signal.query.length > 0);

    return {
      source: this.name,
      signals,
      collected_at: collectedAt,
      limitations: [
        "Search Console mostra apenas procura observada dentro da presença digital existente da Rotas do Éden.",
      ],
    };
  }
}

/**
 * Explicit, operator-supplied signals. Used for controlled/manual runs and tests.
 * The source label makes the origin unmistakable — it is never presented as observed market data.
 */
export class ManualSignalsSource implements DiscoverySource {
  readonly name = "manual_input";

  constructor(private readonly signals: DiscoverySignal[]) {}

  isConfigured(): boolean {
    return this.signals.length > 0;
  }

  fetchSignals(input: { limit: number }): Promise<DiscoverySourceResult> {
    if (!this.isConfigured()) {
      throw new SourceUnavailableError("Nenhum sinal manual fornecido.", "source_not_configured");
    }
    const collectedAt = new Date().toISOString();
    return Promise.resolve({
      source: this.name,
      signals: this.signals.slice(0, input.limit).map((signal) => ({
        ...signal,
        source: this.name,
        collected_at: signal.collected_at ?? collectedAt,
      })),
      collected_at: collectedAt,
      limitations: ["Sinais fornecidos manualmente por um administrador; não são dados observados de mercado."],
    });
  }
}

/** Registry so future sources plug in without rewriting the agent. */
export function buildSource(
  kind: string,
  options: { apiKey?: string; siteUrl?: string; signals?: DiscoverySignal[] },
): DiscoverySource {
  switch (kind) {
    case "google_search_console":
      return new SearchConsoleSource(options.apiKey, options.siteUrl ?? "https://www.rotasdoeden.com/");
    case "manual_input":
      return new ManualSignalsSource(options.signals ?? []);
    default:
      throw new SourceUnavailableError(`Fonte desconhecida: ${kind}`, "unknown_source");
  }
}
