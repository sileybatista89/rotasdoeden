import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FilterResult {
  filtered: string;
  wasFiltered: boolean;
  reasons: string[];
}

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "email", re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
  { name: "phone", re: /(?:\+?\d[\d\s\-().]{6,}\d)/g },
  { name: "url", re: /\b(?:https?:\/\/|www\.)[^\s]+/gi },
  { name: "whatsapp_link", re: /\b(?:wa\.me|api\.whatsapp\.com|t\.me|telegram\.me)\/[^\s]*/gi },
  { name: "social_handle", re: /(?:^|\s)@[a-z0-9._]{3,}/gi },
  {
    name: "external_payment",
    re: /\b(paypal|mbway|revolut|wise|venmo|cash\s?app|zelle|iban|swift|bitcoin|btc|crypto|moneygram|western\s?union)\b/gi,
  },
  {
    name: "off_platform_keywords",
    re: /\b(fora\s+da\s+plataforma|diretamente\s+comigo|direct(?:o|amente)\s+comigo|pagar\s+(?:em\s+)?dinheiro|pay\s+cash|off[-\s]?platform|outside\s+the\s+app|whatsapp|instagram|facebook|messenger|signal|viber)\b/gi,
  },
];

function filterContent(input: string): FilterResult {
  const reasons = new Set<string>();
  let filtered = input;
  for (const { name, re } of PATTERNS) {
    if (re.test(filtered)) {
      reasons.add(name);
      filtered = filtered.replace(re, "███");
    }
  }
  return {
    filtered,
    wasFiltered: reasons.size > 0,
    reasons: Array.from(reasons),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require authentication so the endpoint cannot be probed anonymously
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content } = await req.json();
    if (typeof content !== "string" || content.length === 0 || content.length > 4000) {
      return new Response(JSON.stringify({ error: "Invalid content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = filterContent(content);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
