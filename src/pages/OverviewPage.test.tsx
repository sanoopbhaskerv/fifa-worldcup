import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as competitionContext from "../app/competition-context";
import { competitionCatalog } from "../mocks/catalog";
import { buildCompetitionData } from "../mocks/data";
import OverviewPage from "./OverviewPage";

const competition = competitionCatalog.find((item) => item.id === "world-cup")!;
const data = buildCompetitionData(competition, "2026");

describe("OverviewPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows match number in the hero match tile meta", () => {
    vi.spyOn(competitionContext, "useCompetition").mockReturnValue({
      data,
      editionId: "2026",
      updatedAt: Date.now(),
      isFetching: false,
      refetch: async () => undefined,
    });

    render(
      <MemoryRouter initialEntries={["/competitions/world-cup/2026"]}>
        <Routes>
          <Route
            path="/competitions/:competitionSlug/:editionId"
            element={<OverviewPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Live matches")).toBeInTheDocument();
    expect(screen.getByLabelText("Match 11")).toHaveTextContent("11");
    expect(screen.getAllByText("67'").length).toBeGreaterThan(0);
  });

  it("does not feature terminal live-phase matches as live", () => {
    vi.spyOn(competitionContext, "useCompetition").mockReturnValue({
      data: {
        ...data,
        matches: [
          { ...data.matches[2], status: "LIVE", livePhase: "FT", homeScore: 2, awayScore: 1 },
          { ...data.matches[3], status: "UPCOMING", matchNumber: "4" },
        ],
      },
      editionId: "2026",
      updatedAt: Date.now(),
      isFetching: false,
      refetch: async () => undefined,
    });

    render(
      <MemoryRouter initialEntries={["/competitions/world-cup/2026"]}>
        <Routes>
          <Route
            path="/competitions/:competitionSlug/:editionId"
            element={<OverviewPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Featured upcoming matches")).toBeInTheDocument();
    expect(screen.queryByText(/LIVE · FT/i)).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Match 4")[0]).toHaveTextContent("4");
  });

  it("deduplicates stale live rows for the same team pair", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-20T19:30:00Z"));
    const liveTemplate = data.matches[2];
    vi.spyOn(competitionContext, "useCompetition").mockReturnValue({
      data: {
        ...data,
        matches: [
          {
            ...liveTemplate,
            id: "stale-live",
            kickoff: "2026-06-15T19:00:00Z",
            matchNumber: "15",
            status: "LIVE",
            livePhase: "2H",
            minute: 67,
          },
          {
            ...liveTemplate,
            id: "current-live",
            kickoff: "2026-06-20T19:00:00Z",
            matchNumber: "20",
            status: "LIVE",
            livePhase: "2H",
            minute: 67,
          },
        ],
      },
      editionId: "2026",
      updatedAt: Date.now(),
      isFetching: false,
      refetch: async () => undefined,
    });

    render(
      <MemoryRouter initialEntries={["/competitions/world-cup/2026"]}>
        <Routes>
          <Route
            path="/competitions/:competitionSlug/:editionId"
            element={<OverviewPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Live matches")).toBeInTheDocument();
    expect(screen.queryByLabelText("Match 15")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Match 20")).toBeInTheDocument();
  });
});
