import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App shell", () => {
  it("renders the main shell with feature placeholders", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Orders Client" })).toBeInTheDocument();
    expect(screen.getByTestId("home-shell")).toBeInTheDocument();
    expect(screen.getByText("Authentication")).toBeInTheDocument();
    expect(screen.getByText("Menu + Basket")).toBeInTheDocument();
    expect(screen.getByText("Order Submission")).toBeInTheDocument();
  });

  it("shows backend url configuration summary", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    const configBlock = screen.getByTestId("service-config");
    expect(configBlock).toHaveTextContent("http://localhost:8081");
    expect(configBlock).toHaveTextContent("http://localhost:8082");
    expect(configBlock).toHaveTextContent("http://localhost:8083");
  });
});
