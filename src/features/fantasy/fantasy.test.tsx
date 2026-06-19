import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import FantasyAdminAiHostPage from "../../pages/FantasyAdminAiHostPage";
import FantasyAdminSubmittedPollsPage from "../../pages/FantasyAdminSubmittedPollsPage";
import { matchPassesDateRange } from "../../components/MatchDateRangeFilter";

describe("fantasy prediction game", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-17T12:00:00+05:30"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("submits an exact score poll answer", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const question = {
      ...fantasyGameData.questions.find((item) => item.id === "q-bra-arg-winner")!,
      category: "EXACT_SCORE" as const,
      type: "EXACT_SCORE" as const,
      text: "What will the final score be?",
      options: [],
      points: 8,
    };

    render(<FantasyQuestionCard question={question} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Score"), "Brazil 3 Argentina 4");
    await user.click(screen.getByRole("button", { name: "Save pick" }));

    expect(onSubmit).toHaveBeenCalledWith("Brazil 3 Argentina 4");
  });

  it("locks poll controls after kickoff", async () => {
    const onSubmit = vi.fn();
    const question = fantasyGameData.questions.find((item) => item.id === "q-bra-arg-winner")!;

    render(<FantasyQuestionCard question={question} isLocked onSubmit={onSubmit} />);

    expect(screen.getByRole("button", { name: "Brazil" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save pick" })).not.toBeInTheDocument();
    expect(screen.getByText("Locked")).toBeInTheDocument();
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

    expect(screen.getByRole("heading", { name: "Friend Prediction Leaague" })).toBeInTheDocument();
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

  it("renders match-level changed-pick save controls", async () => {
    const user = userEvent.setup();
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(
      <MemoryRouter>
        <FantasyPollsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Brazil vs Argentina" })).toBeInTheDocument();
    expect(screen.getByLabelText("From date")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "England vs Spain" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All matches" }));
    expect(screen.getByRole("heading", { name: "England vs Spain" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "All saved" }).length).toBeGreaterThan(0);
  });

  it("opens poll filters in a dialog with the match filter inside", async () => {
    const user = userEvent.setup();
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(
      <MemoryRouter>
        <FantasyPollsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /Filters/ }));

    const dialog = await screen.findByRole("dialog", { name: /Filter polls/ });
    expect(screen.getByLabelText("League")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Match")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("From date")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("To date")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("League")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "All matches" })).toBeInTheDocument();
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
    expect(screen.getAllByText("8 pts").length).toBeGreaterThan(0);
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

  it("renders generated poll drafts from squad data", async () => {
    const user = userEvent.setup();
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminPollsPage />);

    expect(screen.getByRole("heading", { name: "Brazil vs Argentina" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish open" })).toBeInTheDocument();
    expect(screen.getAllByText(/Thursday, Jun 18, 2026/).length).toBeGreaterThan(1);
    expect(screen.getByText("Match 3")).toBeInTheDocument();
    expect(screen.getByText("7 published")).toBeInTheDocument();
    expect(screen.getByText("4 submitted")).toBeInTheDocument();
    expect(screen.getAllByText("Validated against templates and squad data").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lionel Messi").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "All matches" }));
    await user.selectOptions(screen.getByLabelText("Match"), "eng-esp");
    expect(screen.getByRole("heading", { name: "England vs Spain" })).toBeInTheDocument();
  });

  it("filters poll management matches by date and blocks completed match publishing", async () => {
    const user = userEvent.setup();
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminPollsPage />);

    await user.clear(screen.getByLabelText("From date"));
    await user.type(screen.getByLabelText("From date"), "2026-06-16");
    await user.clear(screen.getByLabelText("To date"));
    await user.type(screen.getByLabelText("To date"), "2026-06-16");

    expect(screen.queryByRole("heading", { name: "Brazil vs Argentina" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "England vs Spain" })).toBeInTheDocument();
    expect(screen.getByText("Polls can only be published for upcoming matches.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish open" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Publish filtered upcoming" })).toBeDisabled();
  });

  it("includes matches between date range boundaries", () => {
    const matches = fantasyGameData.matches.filter((match) => matchPassesDateRange(match, {
      fromDate: "2026-06-16",
      toDate: "2026-06-18",
      groupStageOnly: false,
    }));

    expect(matches.map((match) => match.id)).toEqual(["bra-arg", "fra-ger", "eng-esp"]);
  });

  it("opens admin poll draft filters in a dialog while league stays outside", async () => {
    const user = userEvent.setup();
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminPollsPage />);

    await user.click(screen.getByRole("button", { name: /Filters/ }));

    const dialog = await screen.findByRole("dialog", { name: /Filter matches/ });
    expect(screen.getByLabelText("League")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Match")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("From date")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("To date")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("League")).not.toBeInTheDocument();
  });

  it("renders poll response coverage for admin follow-up", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({
      data: {
        ...fantasyGameData,
        questions: [
          ...fantasyGameData.questions,
          {
            id: "user-bra-arg-first-goal-p-sanoop-20260618",
            tournamentId: fantasyGameData.tournament.id,
            matchId: "bra-arg",
            createdByParticipantId: "p-sanoop",
            createdAt: "2026-06-18T03:00:00Z",
            source: "USER",
            category: "FIRST_GOAL_SCORER",
            type: "PLAYER",
            text: "Who scores the first goal?",
            options: ["Vinicius Jr", "Lionel Messi", "No goal"],
            points: 8,
            status: "OPEN",
            closeAt: "2026-06-18T20:15:00+05:30",
          },
        ],
      },
    });

    renderWithQueryClient(<FantasyAdminSubmittedPollsPage />);

    expect(screen.getByRole("heading", { name: "Poll responses" })).toBeInTheDocument();
    expect(screen.getAllByText("Brazil Boss").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Brazil vs Argentina/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Who scores the first goal?").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "Pending" }).length).toBeGreaterThan(0);
  });

  it("renders participant administration", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminParticipantsPage />);

    expect(screen.getByRole("heading", { name: "Participants" })).toBeInTheDocument();
    expect(screen.getAllByText("Brazil Boss").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Create invite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove admin" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Issue new invite" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Set temporary" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /groups/i })).toBeInTheDocument();
  });

  it("renders the active player profile editor", () => {
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyProfilePage />);

    expect(screen.getByRole("heading", { name: "Display name" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Brazil Boss")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set password" })).toBeInTheDocument();
    expect(screen.getByText("Confirm new password")).toBeInTheDocument();
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

  it("renders exact score and first goal time user poll types", async () => {
    const user = userEvent.setup();
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(
      <MemoryRouter>
        <FantasyCreatePollPage />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText("Poll"), "TOTAL_GOALS");
    expect(screen.getByText("Free answer · 0-0 · Brazil 3 Germany 4")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Poll"), "FIRST_GOAL_TIME");
    expect(screen.getByText("Before 10")).toBeInTheDocument();
    expect(screen.getByText("90+")).toBeInTheDocument();
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
    expect(screen.getByDisplayValue("Friend Prediction Leaague")).toBeInTheDocument();
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

  it("renders AI host message administration", async () => {
    const user = userEvent.setup();
    vi.spyOn(fantasyContext, "useFantasy").mockReturnValue({ data: fantasyGameData });

    renderWithQueryClient(<FantasyAdminAiHostPage />);

    expect(screen.getByRole("heading", { name: "AI host" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Message type" })).toHaveValue("REMINDER");
    expect(screen.getByRole("combobox", { name: "League" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Match" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate draft" })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Message type" }), "LEADERBOARD_SUMMARY");

    expect(screen.queryByRole("combobox", { name: "League" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Match" })).not.toBeInTheDocument();
  });
});
