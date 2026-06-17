import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as fantasyContext from "../../app/fantasy-context";
import { fantasyGameData } from "../../mocks/fantasy";
import { FantasyLeaderboard } from "./FantasyLeaderboard";
import { FantasyQuestionCard } from "./FantasyQuestionCard";
import FantasyHomePage from "../../pages/FantasyHomePage";
import FantasyCreatePollPage from "../../pages/FantasyCreatePollPage";
import FantasyPollsPage from "../../pages/FantasyPollsPage";
import FantasyProfilePage from "../../pages/FantasyProfilePage";
import FantasyAdminScoreReviewPage from "../../pages/FantasyAdminScoreReviewPage";
import FantasyAdminSquadsPage from "../../pages/FantasyAdminSquadsPage";
import FantasyAdminPollsPage from "../../pages/FantasyAdminPollsPage";
import FantasyAdminParticipantsPage from "../../pages/FantasyAdminParticipantsPage";
import FantasyAdminFixturesPage from "../../pages/FantasyAdminFixturesPage";
import FantasyAdminTournamentPage from "../../pages/FantasyAdminTournamentPage";
import FantasyAdminQuestionTemplatesPage from "../../pages/FantasyAdminQuestionTemplatesPage";
import FantasyAdminAiSettingsPage from "../../pages/FantasyAdminAiSettingsPage";

describe("fantasy prediction game", () => {
  const renderWithQueryClient = (children: ReactNode) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
  };

  it("allows selecting an open poll option locally", async () => {
    const user = userEvent.setup();
    const question = fantasyGameData.questions.find((item) => item.id === "q-bra-arg-winner")!;

    render(<FantasyQuestionCard question={question} />);

    await user.click(screen.getByRole("button", { name: "Brazil" }));

    expect(screen.getByRole("button", { name: "Brazil" })).toHaveClass("fantasy-option--selected");
    expect(screen.getByText("Draft selected")).toBeInTheDocument();
  });

  it("submits the selected open poll option", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const question = fantasyGameData.questions.find((item) => item.id === "q-bra-arg-winner")!;

    render(<FantasyQuestionCard question={question} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Argentina" }));
    await user.click(screen.getByRole("button", { name: "Save pick" }));

    expect(onSubmit).toHaveBeenCalledWith("Argentina");
  });

  it("highlights the active participant in the leaderboard", () => {
    render(<FantasyLeaderboard rows={fantasyGameData.leaderboard} activeParticipantId={fantasyGameData.activeParticipantId} />);

    expect(screen.getByText("Brazil Boss").closest("article")).toHaveClass("fantasy-leaderboard__row--active");
    expect(screen.getByText("Prediction King")).toBeInTheDocument();
  });

  it("renders the fantasy dashboard from game context", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    render(
      <MemoryRouter>
        <FantasyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "World Cup Friends League" })).toBeInTheDocument();
    expect(screen.getByText("Brazil vs Argentina")).toBeInTheDocument();
    expect(screen.getByText("Vinicius Jr")).toBeInTheDocument();
  });

  it("hides draft-only polls from the player polls page", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({
      data: {
        ...fantasyGameData,
        questions: fantasyGameData.questions
          .filter((question) => question.matchId === "bra-arg")
          .map((question) => ({ ...question, status: "DRAFT" })),
      },
    });

    renderWithQueryClient(
      <MemoryRouter>
        <FantasyPollsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "No published polls yet" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Brazil vs Argentina" })).not.toBeInTheDocument();
    expect(screen.queryByText("Tournament-long")).not.toBeInTheDocument();
  });

  it("renders admin score review rows", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(
      <MemoryRouter initialEntries={["/fantasy/admin/score-review/eng-esp"]}>
        <Routes>
          <Route path="/fantasy/admin/score-review/:matchId" element={<FantasyAdminScoreReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Score review" })).toBeInTheDocument();
    expect(screen.getByText("VAR Villain")).toBeInTheDocument();
    expect(screen.getByText("8 pts")).toBeInTheDocument();
  });

  it("renders squad reference data for admin review", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminSquadsPage />);

    expect(screen.getByRole("heading", { name: "Brazil squad" })).toBeInTheDocument();
    expect(screen.getAllByText("Vinicius Jr").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Glove").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Import squads" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save team" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save player" })).toBeInTheDocument();
  });

  it("renders generated poll drafts from squad data", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminPollsPage />);

    expect(screen.getByRole("heading", { name: "Brazil vs Argentina" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish open" })).toBeInTheDocument();
    expect(screen.getAllByText("Validated against templates and squad data").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lionel Messi").length).toBeGreaterThan(0);
  });

  it("renders participant administration", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminParticipantsPage />);

    expect(screen.getByRole("heading", { name: "Participants" })).toBeInTheDocument();
    expect(screen.getByText("Brazil Boss")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create invite" })).toBeInTheDocument();
  });

  it("renders the active player profile editor", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyProfilePage />);

    expect(screen.getByRole("heading", { name: "Display name" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Brazil Boss")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save profile" })).toBeInTheDocument();
  });

  it("renders user poll creation with squad-backed player options", async () => {
    const user = userEvent.setup();
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(
      <MemoryRouter>
        <FantasyCreatePollPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Add a match poll" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Poll"), "FIRST_GOAL_SCORER");

    expect(screen.getByText("Who scores the first goal?")).toBeInTheDocument();
    expect(screen.getAllByText("Vinicius Jr").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lionel Messi").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Publish poll" })).toBeInTheDocument();
  });

  it("renders fixture administration", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminFixturesPage />);

    expect(screen.getByRole("heading", { name: "Fixtures" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /brazil vs argentina/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save fixture" })).toBeInTheDocument();
  });

  it("renders tournament setup administration", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminTournamentPage />);

    expect(screen.getByRole("heading", { name: "Tournament setup" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("World Cup Friends League")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save tournament" })).toBeInTheDocument();
  });

  it("renders question template administration", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminQuestionTemplatesPage />);

    expect(screen.getByRole("heading", { name: "Question templates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /match result/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Who will win the match?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save template" })).toBeInTheDocument();
  });

  it("renders AI agent settings administration", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminAiSettingsPage />);

    expect(screen.getByRole("heading", { name: "AI agent settings" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Mode" })).toHaveValue("TEMPLATE_ONLY");
    expect(screen.getByRole("combobox", { name: "Banter level" })).toHaveValue("LIGHT");
    expect(screen.getByRole("button", { name: "Save AI settings" })).toBeInTheDocument();
  });
});
