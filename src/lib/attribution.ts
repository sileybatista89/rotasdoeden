// First-party attribution. No third-party analytics, no personal data.
// Nothing is stored or sent unless the visitor accepted optional cookies.

import { supabase } from "@/integrations/supabase/client";

const CONSENT_KEY = "rde_cookie_consent";
const VISITOR_KEY = "rde_visitor_id";
const ATTRIBUTION_KEY = "rde_attribution";

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer_host?: string;
  language?: string;
}

export type TrafficEventType =
  | "visit"
  | "service_view"
  | "guide_view"
  | "booking_started"
  | "contact_started";

export function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as { choice?: string }).choice === "accepted";
  } catch {
    return false;
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function getVisitorId(): string | null {
  if (!hasAnalyticsConsent()) return null;
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Parses the current URL. Only known UTM parameters are kept. */
export function parseAttributionFromLocation(
  search: string,
  referrer: string,
  language: string,
): Attribution {
  const params = new URLSearchParams(search);
  const pick = (key: string) => {
    const value = params.get(key)?.trim();
    return value ? value.slice(0, 150) : undefined;
  };

  let referrerHost: string | undefined;
  try {
    if (referrer) {
      const host = new URL(referrer).hostname;
      if (host && host !== window.location.hostname) referrerHost = host;
    }
  } catch {
    referrerHost = undefined;
  }

  const attribution: Attribution = {
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
    utm_content: pick("utm_content"),
    utm_term: pick("utm_term"),
    referrer_host: referrerHost,
    language: language?.slice(0, 10) || undefined,
  };

  return Object.fromEntries(
    Object.entries(attribution).filter(([, v]) => Boolean(v)),
  ) as Attribution;
}

/** First touch wins: the origin that brought the visitor is never overwritten. */
export function rememberAttribution(current: Attribution): Attribution {
  const stored = readJson<Attribution>(ATTRIBUTION_KEY);
  const hasSignal =
    Boolean(current.utm_source || current.utm_campaign || current.utm_medium);

  if (stored && !hasSignal) return stored;
  const next = stored && !hasSignal ? stored : { ...current };
  try {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — tracking simply does not happen */
  }
  return next;
}

export function getStoredAttribution(): Attribution {
  if (!hasAnalyticsConsent()) return {};
  return readJson<Attribution>(ATTRIBUTION_KEY) ?? {};
}

export async function trackEvent(
  eventType: TrafficEventType,
  options: { path?: string; entityType?: string; entityId?: string } = {},
): Promise<void> {
  const visitorId = getVisitorId();
  if (!visitorId) return;

  const attribution = rememberAttribution(
    parseAttributionFromLocation(
      window.location.search,
      document.referrer,
      navigator.language,
    ),
  );

  try {
    await supabase.rpc("record_traffic_event", {
      _visitor_id: visitorId,
      _event_type: eventType,
      _path: options.path ?? window.location.pathname,
      _attribution: attribution as unknown as Record<string, string>,
      _entity_type: options.entityType ?? null,
      _entity_id: options.entityId ?? null,
    });
  } catch {
    /* measurement must never break the visit */
  }
}
