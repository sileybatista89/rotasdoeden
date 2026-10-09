import { describe, it, expect } from "vitest";
import {
  resolvePaymentGate,
  decideEventAction,
  validateSessionForBooking,
  paidTransition,
} from "../../supabase/functions/_shared/payment-gate";

const both = { hasSandboxKey: true, hasLiveKey: true };

describe("sales gate", () => {
  it("blocks a live sale when sales are disabled, even with a live key", () => {
    const r = resolvePaymentGate({ sales_enabled: false, payment_mode: "live" }, both);
    expect(r).toMatchObject({ ok: false, code: "sales_disabled" });
  });
  it("missing settings default to test mode, never live", () => {
    expect(resolvePaymentGate(null, both)).toEqual({ ok: true, env: "sandbox" });
    expect(resolvePaymentGate({}, both)).toEqual({ ok: true, env: "sandbox" });
  });
  it("invalid settings block payment instead of going live", () => {
    expect(resolvePaymentGate({ payment_mode: "LIVE" }, both)).toMatchObject({ ok: false, code: "invalid_config" });
    expect(resolvePaymentGate({ payment_mode: "live", sales_enabled: "true" }, both)).toMatchObject({ ok: false, code: "invalid_config" });
  });
  it("test mode uses only sandbox credentials", () => {
    expect(resolvePaymentGate({ sales_enabled: true, payment_mode: "test" }, both)).toEqual({ ok: true, env: "sandbox" });
  });
  it("test mode without sandbox key blocks; never falls back to live", () => {
    const r = resolvePaymentGate({ payment_mode: "test" }, { hasSandboxKey: false, hasLiveKey: true });
    expect(r).toMatchObject({ ok: false, code: "test_not_configured" });
  });
  it("client asking for live while server is in test is blocked", () => {
    expect(resolvePaymentGate({ payment_mode: "test" }, both, "live")).toMatchObject({ ok: false, code: "env_mismatch" });
  });
  it("live only with sales enabled AND live mode AND live key", () => {
    expect(resolvePaymentGate({ sales_enabled: true, payment_mode: "live" }, both)).toEqual({ ok: true, env: "live" });
    expect(resolvePaymentGate({ sales_enabled: true, payment_mode: "live" }, { hasSandboxKey: true, hasLiveKey: false }))
      .toMatchObject({ ok: false, code: "live_not_configured" });
  });
});

describe("webhook idempotency", () => {
  it("same event received twice is processed once", () => {
    expect(decideEventAction(null)).toBe("process");
    expect(decideEventAction({ status: "processed" })).toBe("skip");
  });
  it("a failed event is retried", () => {
    expect(decideEventAction({ status: "failed", attempts: 1 })).toBe("process");
  });
  it("a retry does not re-confirm an already paid booking", () => {
    expect(paidTransition({ payment_status: "paid" }, { payment_status: "paid", status: "confirmed" })).toEqual({ update: false });
  });
  it("a paid session confirms an unpaid booking", () => {
    expect(paidTransition({ payment_status: "paid" }, { payment_status: "unpaid", status: "pending_payment" }))
      .toEqual({ update: true, payment_status: "paid", status: "confirmed" });
  });
  it("an unpaid (delayed) session does not confirm", () => {
    expect(paidTransition({ payment_status: "unpaid" }, { payment_status: "unpaid", status: "pending_payment" })).toEqual({ update: false });
  });
  it("payment is tied to the correct booking and session", () => {
    const s = { id: "cs_1", livemode: false, metadata: { bookingId: "b1" } };
    expect(validateSessionForBooking(s, "sandbox", { id: "b1", stripe_session_id: "cs_1" })).toEqual({ ok: true });
    expect(validateSessionForBooking(s, "sandbox", { id: "b1", stripe_session_id: "cs_other" })).toMatchObject({ ok: false, reason: "session_mismatch" });
    expect(validateSessionForBooking(s, "live", { id: "b1", stripe_session_id: "cs_1" })).toMatchObject({ ok: false, reason: "environment_mismatch" });
    expect(validateSessionForBooking(s, "sandbox", null)).toMatchObject({ ok: false, reason: "booking_not_found" });
  });
});
