import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import HomePage from "./HomePage";

describe("HomePage", () => {
  it("renders fantasy and football launcher tiles", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /open fantasy/i })).toHaveAttribute("href", "/fantasy");
    expect(screen.getByRole("link", { name: /browse football/i })).toHaveAttribute("href", "/competitions/world-cup/2026");
    expect(screen.getByText("World Cup Friends League")).toBeInTheDocument();
  });
});
