import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

const state = vi.hoisted(() => ({
  auth: { user: null as unknown, role: null as unknown, loading: false },
  query: null as unknown as () => Promise<{ data: unknown; error: unknown }>,
  signOut: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => state.query(),
        }),
      }),
    }),
    auth: { signOut: state.signOut },
  },
}));

const { ProtectedRoute } = await import("@/components/auth/ProtectedRoute");

function renderRoute(node: ReactNode = <div>conteúdo protegido</div>) {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/admin" element={<ProtectedRoute requireRole="admin">{node}</ProtectedRoute>} />
        <Route path="/auth" element={<div>página de autenticação</div>} />
        <Route path="/" element={<div>home pública</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function ok(data: unknown) {
  return Promise.resolve({ data, error: null });
}
function fail() {
  return Promise.resolve({ data: null, error: { message: "network" } });
}

beforeEach(() => {
  state.auth = { user: { id: "u1" }, role: "admin", loading: false };
  state.query = () => ok({ banned: false });
  state.signOut.mockClear();
});

describe("ProtectedRoute", () => {
  it("mostra o conteúdo quando a conta está verificada e autorizada", async () => {
    renderRoute();
    expect(await screen.findByText("conteúdo protegido")).toBeTruthy();
  });

  it("não mostra conteúdo enquanto a conta está a ser verificada", async () => {
    let resolve: (value: unknown) => void = () => {};
    state.query = () => new Promise((r) => { resolve = r; });

    renderRoute();
    expect(screen.queryByText("conteúdo protegido")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();

    resolve({ data: { banned: false }, error: null });
    expect(await screen.findByText("conteúdo protegido")).toBeTruthy();
  });

  it("não mostra o conteúdo durante o carregamento da autenticação", () => {
    state.auth = { user: null, role: null, loading: true };
    renderRoute();
    expect(screen.queryByText("conteúdo protegido")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("termina a sessão e encaminha para autenticação quando a conta está banida", async () => {
    state.query = () => ok({ banned: true });
    renderRoute();

    expect(await screen.findByText("página de autenticação")).toBeTruthy();
    expect(screen.queryByText("conteúdo protegido")).toBeNull();
    await waitFor(() => expect(state.signOut).toHaveBeenCalled(), { timeout: 5000 });
  });

  it("falha fechado quando a consulta ao perfil falha", async () => {
    state.query = () => fail();
    renderRoute();

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Não conseguimos confirmar o estado da conta/)).toBeTruthy();
    expect(screen.queryByText("conteúdo protegido")).toBeNull();
    // Não deve afirmar um veredicto sobre a conta, em nenhum dos sentidos.
    expect(screen.queryByText(/conta (banida|suspensa)/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Terminar sessão" })).toBeTruthy();
    expect(state.signOut).not.toHaveBeenCalled();
  });

  it("recupera quando a nova tentativa tem sucesso", async () => {
    state.query = () => fail();
    renderRoute();
    expect(await screen.findByRole("alert")).toBeTruthy();

    state.query = () => ok({ banned: false });
    screen.getByRole("button", { name: "Tentar novamente" }).click();

    expect(await screen.findByText("conteúdo protegido")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mantém a sessão terminável a partir do estado indisponível", async () => {
    state.query = () => fail();
    renderRoute();
    expect(await screen.findByRole("alert")).toBeTruthy();

    screen.getByRole("button", { name: "Terminar sessão" }).click();
    await waitFor(() => expect(state.signOut).toHaveBeenCalledTimes(1), { timeout: 5000 });
  });

  it("encaminha para a página inicial quando a função exigida não corresponde", async () => {
    state.auth = { user: { id: "u1" }, role: "tourist", loading: false };
    renderRoute();
    expect(await screen.findByText("home pública")).toBeTruthy();
    expect(screen.queryByText("conteúdo protegido")).toBeNull();
  });
});
