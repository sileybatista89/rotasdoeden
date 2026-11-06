import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TravelSearchTabs } from "@/components/search/TravelSearchTabs";

function CurrentRoute() {
  const location = useLocation();
  return <output data-testid="current-route">{`${location.pathname}${location.search}`}</output>;
}

function renderSearchTabs(defaultValue?: string) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <TravelSearchTabs defaultValue={defaultValue} />
      <CurrentRoute />
    </MemoryRouter>,
  );
}

describe("TravelSearchTabs", () => {
  it("offers accessible tabs for packages, flights, stays and experiences", () => {
    renderSearchTabs();

    expect(screen.getByRole("tablist", { name: "Pesquisar uma viagem" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Pacotes" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Voos" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Estadias" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Experiências" })).toBeTruthy();
  });

  it("navigates to flight search with the quick-search values", () => {
    renderSearchTabs("voos");
    fireEvent.change(screen.getByLabelText("Origem"), { target: { value: "Lisboa (LIS)" } });
    fireEvent.change(screen.getByLabelText("Destino"), { target: { value: "São Tomé (TMS)" } });
    fireEvent.change(screen.getByLabelText("Ida"), { target: { value: "2026-11-08" } });
    fireEvent.change(screen.getByLabelText("Regresso"), { target: { value: "2026-11-18" } });
    fireEvent.click(screen.getByRole("button", { name: "Pesquisar voos" }));

    expect(screen.getByTestId("current-route").textContent).toBe(
      "/voos?origin=LIS&destination=TMS&departure=2026-11-08&return=2026-11-18&adults=1&children=0&infants=0",
    );
  });

  it("explains how to recover when the airport text is not a supported option", () => {
    renderSearchTabs("voos");
    fireEvent.change(screen.getByLabelText("Origem"), { target: { value: "Lisboa" } });
    fireEvent.change(screen.getByLabelText("Ida"), { target: { value: "2026-11-08" } });
    fireEvent.change(screen.getByLabelText("Regresso"), { target: { value: "2026-11-18" } });
    fireEvent.click(screen.getByRole("button", { name: "Pesquisar voos" }));

    expect(screen.getByRole("alert").textContent).toContain("Escolhe um aeroporto da lista");
    expect(screen.getByTestId("current-route").textContent).toBe("/");
  });

  it("does not imply public stay inventory exists yet", () => {
    renderSearchTabs("estadias");

    expect(screen.getByText("A pesquisa de estadias está em preparação." )).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explorar experiências disponíveis" }).getAttribute("href"))
      .toBe("/experiences");
  });

  it("offers an existing package route from the packages tab", () => {
    renderSearchTabs();

    expect(screen.getByRole("link", { name: "Ver pacote Rotas Essencial" }).getAttribute("href"))
      .toBe("/pacotes/rotas-essencial");
  });
});
