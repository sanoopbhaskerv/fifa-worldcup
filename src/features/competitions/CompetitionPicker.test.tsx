import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { competitionCatalog } from "../../mocks/catalog";
import { CompetitionPicker } from "./CompetitionPicker";

describe("CompetitionPicker", () => {
  it("searches and selects a competition", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CompetitionPicker open competitions={competitionCatalog} currentEditionId="2026" currentId="world-cup" favorites={[]} recents={[]} onClose={vi.fn()} onSelect={onSelect} onToggleFavorite={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/search competitions/i), "Premier");
    expect(screen.getByText("English Premier League")).toBeInTheDocument();
    await user.click(screen.getByText("English Premier League"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "premier-league", activeEditionId: "2025-26" }), "2025-26");
  });

  it("filters by region or confederation", async () => {
    const user = userEvent.setup();
    render(<CompetitionPicker open competitions={competitionCatalog} currentEditionId="2026" currentId="world-cup" favorites={[]} recents={[]} onClose={vi.fn()} onSelect={vi.fn()} onToggleFavorite={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText(/region, country or confederation/i), "CONMEBOL");
    expect(screen.getByText("Copa Libertadores")).toBeInTheDocument();
    expect(screen.queryByText("English Premier League")).not.toBeInTheDocument();
  });
});
