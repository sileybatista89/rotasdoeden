// Pure decision logic for payments. No Deno/npm imports so it is unit-testable.
// Source of truth: public.commerce_settings (sales_enabled, payment_mode).
// The presence of a live key NEVER selects live mode.

export type StripeEnvName = "sandbox" | "live";

export interface CommerceSettingsInput {
  sales_enabled?: unknown;
  payment_mode?: unknown;
}

export type PaymentGateResult =
  | { ok: true; env: StripeEnvName }
  | { ok: false; code: string; message: string };

export function resolvePaymentGate(
  settings: CommerceSettingsInput | null | undefined,
  keys: { hasSandboxKey: boolean; hasLiveKey: boolean },
  clientEnv?: unknown,
): PaymentGateResult {
  // Missing row → defaults (test mode, sales off).
  const mode = settings?.payment_mode ?? "test";
  const salesEnabled = settings?.sales_enabled ?? false;

  if (mode !== "test" && mode !== "live") {
    return { ok: false, code: "invalid_config", message: "Configuração de pagamentos inválida. Pagamentos bloqueados." };
  }
  if (typeof salesEnabled !== "boolean") {
    return { ok: false, code: "invalid_config", message: "Configuração de vendas inválida. Pagamentos bloqueados." };
  }

  let env: StripeEnvName;
  if (mode === "live") {
    if (salesEnabled !== true) {
      return { ok: false, code: "sales_disabled", message: "As vendas reais estão desativadas. Não é possível pagar neste momento." };
    }
    if (!keys.hasLiveKey) {
      return { ok: false, code: "live_not_configured", message: "Pagamentos reais não configurados." };
    }
    env = "live";
  } else {
    if (!keys.hasSandboxKey) {
      return { ok: false, code: "test_not_configured", message: "Pagamentos de teste não configurados. Pagamento bloqueado." };
    }
    env = "sandbox";
  }

  // The browser's publishable key must match; a mismatch is ambiguous → block.
  if (clientEnv !== undefined && clientEnv !== null && clientEnv !== env) {
    return { ok: false, code: "env_mismatch", message: "Modo de pagamento inconsistente. Pagamento bloqueado." };
  }
  return { ok: true, env };
}

// ---- Webhook idempotency ----

export type ExistingEvent = { status: string; attempts?: number } | null;

/** Decide what to do with an incoming (already signature-verified) event. */
export function decideEventAction(existing: ExistingEvent): "process" | "skip" {
  if (!existing) return "process";
  return existing.status === "processed" ? "skip" : "process"; // failed/processing → retry
}

export interface SessionLike {
  id?: string;
  livemode?: boolean;
  payment_status?: string;
  metadata?: Record<string, string> | null;
}

/** Validate that a checkout session belongs to this environment and to the booking. */
export function validateSessionForBooking(
  session: SessionLike,
  env: StripeEnvName,
  booking: { id: string; stripe_session_id: string | null } | null,
): { ok: true } | { ok: false; reason: string } {
  if (typeof session.livemode === "boolean" && session.livemode !== (env === "live")) {
    return { ok: false, reason: "environment_mismatch" };
  }
  if (!session.metadata?.bookingId) return { ok: false, reason: "missing_booking_id" };
  if (!booking) return { ok: false, reason: "booking_not_found" };
  if (booking.id !== session.metadata.bookingId) return { ok: false, reason: "booking_mismatch" };
  if (booking.stripe_session_id && session.id && booking.stripe_session_id !== session.id) {
    return { ok: false, reason: "session_mismatch" };
  }
  return { ok: true };
}

/** Booking transition for a completed session. Never re-confirms an already paid booking. */
export function paidTransition(
  session: SessionLike,
  current: { payment_status: string | null; status: string },
): { update: false } | { update: true; payment_status: "paid"; status: "confirmed" } {
  const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
  if (!paid) return { update: false };
  if (current.payment_status === "paid") return { update: false };
  if (current.status === "cancelled" || current.status === "refunded") return { update: false };
  return { update: true, payment_status: "paid", status: "confirmed" };
}
