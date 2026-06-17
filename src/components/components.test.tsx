import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { buildCompetitionData } from "../mocks/data";
import { competitionCatalog } from "../mocks/catalog";
import { MatchCard } from "../features/matches/MatchCard";
import { StandingsTable } from "../features/standings/StandingsTable";
import { BracketView } from "../features/brackets/BracketView";
import { ScorerList } from "../features/scorers/ScorerList";

const competition = competitionCatalog.find((item) => item.id === "world-cup")!;
const data = buildCompetitionData(competition, "2026");

describe("football components", () => {
  it("renders a linked match card with score and status", () => {
    render(<MemoryRouter initialEntries={["/competitions/world-cup/2026"]}><Routes><Route path="/competitions/:competitionSlug/:editionId" element={<MatchCard match={data.matches[0]} />} /></Routes></MemoryRouter>);
    expect(screen.getByLabelText(/versus/i)).toHaveAttribute("href", expect.stringContaining("/matches/"));
    expect(screen.getByText("Full time")).toBeInTheDocument();
    expect(screen.getByLabelText("Match 1")).toHaveTextContent("1");
  });

  it("renders accessible standings with zone text", () => {
    render(<StandingsTable standings={data.standings.slice(0, 4)} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByText("Qualified").length).toBeGreaterThan(0);
  });

  it("renders knockout winners and scorer rankings", () => {
    const { rerender } = render(<BracketView ties={data.ties} />);
    expect(screen.getByText("Final")).toBeInTheDocument();
    rerender(<ScorerList scorers={data.scorers.slice(0, 2)} />);
    expect(screen.getByText("Mateo Silva")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });
});
