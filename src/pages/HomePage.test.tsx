import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import HomePage from "./HomePage";

describe("HomePage", () => {
  it("renders fantasy and football launcher tiles", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("link", { name: /open fantasy/i })).toHaveAttribute("href", "/fantasy");
    expect(screen.getByRole("link", { name: /browse football/i })).toHaveAttribute("href", "/competitions/world-cup/2026");
    expect(screen.getByText("Friend Prediction Leaague")).toBeInTheDocument();
  });
});
