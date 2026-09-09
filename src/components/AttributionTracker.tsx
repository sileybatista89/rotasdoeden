import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { captureInitialAttribution, trackEvent } from "@/lib/attribution";

/** Records a first-party page visit. Silent, consent-gated, renders nothing. */
export function AttributionTracker() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    captureInitialAttribution();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (lastPath.current === path) return;
    lastPath.current = path;
    void trackEvent("visit", { path });
  }, [location.pathname]);

  return null;
}
