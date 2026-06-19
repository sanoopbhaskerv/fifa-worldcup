import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../app/theme-context";
import * as pwaCache from "../utils/pwa-cache";
import { AccountMenu } from "./AccountMenu";

describe("AccountMenu", () => {
  it("opens and closes on trigger and Escape", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AccountMenu displayName="Sanoop Bhasker" subtitle="Player" />
        </MemoryRouter>
      </ThemeProvider>,
    );

    const trigger = screen.getByRole("button", { name: "Account menu" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "View profile" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Clear cache and reload" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("renders only account essentials", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AccountMenu displayName="Sanoop Bhasker" subtitle="Admin" />
        </MemoryRouter>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menuitem", { name: "View profile" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Edit display name" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("clears app cache from the account menu", () => {
    const clearCache = vi.spyOn(pwaCache, "clearAppCacheAndReload").mockResolvedValue();
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AccountMenu displayName="Sanoop Bhasker" subtitle="Admin" />
        </MemoryRouter>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Clear cache and reload" }));

    expect(clearCache).toHaveBeenCalledTimes(1);
  });
});
