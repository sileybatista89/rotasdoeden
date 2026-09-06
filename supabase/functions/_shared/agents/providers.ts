// Provider abstraction for the agent system.
// Agents never talk to a vendor directly; they ask for a provider by name.
// Secrets are read here, server-side only, and never returned to a caller.

export type ProviderName = "lovable" | "openai" | "google";

export interface GenerateRequest {
  model: string;
  system?: string;
  prompt: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface GenerateResult {
  text: string;
  provider: ProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface AIProvider {
  readonly name: ProviderName;
  isConfigured(): boolean;
  /** Cheap connectivity probe. Never runs heavy work. */
  ping(): Promise<{ ok: boolean; status?: number; error?: string }>;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
    readonly permanent = true,
  ) {
    super(message);
  }
}

const DEFAULT_TIMEOUT_MS = 60_000;

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new ProviderError("Request timed out", "timeout", undefined, false);
    }
    throw new ProviderError((error as Error).message, "network_error", undefined, false);
  } finally {
    clearTimeout(timer);
  }
}

/** 429 and 5xx are transient; everything else is terminal. */
function classify(status: number): { code: string; permanent: boolean } {
  if (status === 429) return { code: "rate_limited", permanent: false };
  if (status >= 500) return { code: "upstream_error", permanent: false };
  if (status === 402) return { code: "payment_required", permanent: true };
  if (status === 403) return { code: "forbidden", permanent: true };
  if (status === 401) return { code: "unauthorized", permanent: true };
  return { code: "bad_request", permanent: true };
}

/** OpenAI-compatible chat completions, shared by every provider we support today. */
class ChatCompletionsProvider implements AIProvider {
  constructor(
    readonly name: ProviderName,
    private readonly baseUrl: string,
    private readonly apiKey: string | undefined,
    private readonly authHeader: (key: string) => Record<string, string>,
    private readonly costPerMillion: { input: number; output: number },
  ) {}

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async ping() {
    if (!this.apiKey) return { ok: false, error: "missing_credentials" };
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.authHeader(this.apiKey),
      });
      return { ok: res.ok, status: res.status };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    if (!this.apiKey) {
      throw new ProviderError(`${this.name}: credentials not configured`, "missing_credentials");
    }
    const messages = [
      ...(req.system ? [{ role: "system", content: req.system }] : []),
      { role: "user", content: req.prompt },
    ];
    const res = await postJson(
      `${this.baseUrl}/chat/completions`,
      this.authHeader(this.apiKey),
      { model: req.model, messages, stream: false, max_tokens: req.maxOutputTokens ?? 1024 },
      req.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    if (!res.ok) {
      const { code, permanent } = classify(res.status);
      throw new ProviderError(await res.text(), code, res.status, permanent);
    }
    const data = await res.json();
    const inputTokens = data?.usage?.prompt_tokens ?? 0;
    const outputTokens = data?.usage?.completion_tokens ?? 0;
    return {
      text: data?.choices?.[0]?.message?.content ?? "",
      provider: this.name,
      model: req.model,
      inputTokens,
      outputTokens,
      estimatedCost:
        (inputTokens / 1_000_000) * this.costPerMillion.input +
        (outputTokens / 1_000_000) * this.costPerMillion.output,
    };
  }
}

export function getProvider(name: ProviderName): AIProvider {
  const env = (key: string) => Deno.env.get(key) ?? undefined;
  switch (name) {
    case "lovable":
      return new ChatCompletionsProvider(
        "lovable",
        "https://ai.gateway.lovable.dev/v1",
        env("LOVABLE_API_KEY"),
        (key) => ({ "Lovable-API-Key": key }),
        { input: 0.3, output: 2.5 },
      );
    case "openai":
      return new ChatCompletionsProvider(
        "openai",
        "https://api.openai.com/v1",
        env("OPENAI_API_KEY"),
        (key) => ({ Authorization: `Bearer ${key}` }),
        { input: 0.5, output: 4 },
      );
    case "google":
      return new ChatCompletionsProvider(
        "google",
        "https://generativelanguage.googleapis.com/v1beta/openai",
        env("GEMINI_API_KEY"),
        (key) => ({ Authorization: `Bearer ${key}` }),
        { input: 0.3, output: 2.5 },
      );
  }
}

export function providerStatus(): Record<ProviderName, boolean> {
  return {
    lovable: getProvider("lovable").isConfigured(),
    openai: getProvider("openai").isConfigured(),
    google: getProvider("google").isConfigured(),
  };
}
