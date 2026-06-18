import { lazy, Suspense } from "react";
import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { CompetitionLayout } from "./CompetitionLayout";
import { FantasyLayout } from "./FantasyLayout";
import { PwaUpdatePrompt } from "./PwaUpdatePrompt";
import { useFantasy } from "./fantasy-context";

const HomePage = lazy(() => import("../pages/HomePage"));
const OverviewPage = lazy(() => import("../pages/OverviewPage"));
const FixturesPage = lazy(() => import("../pages/FixturesPage"));
const ResultsPage = lazy(() => import("../pages/ResultsPage"));
const StandingsPage = lazy(() => import("../pages/StandingsPage"));
const BracketPage = lazy(() => import("../pages/BracketPage"));
const ScorersPage = lazy(() => import("../pages/ScorersPage"));
const MatchPage = lazy(() => import("../pages/MatchPage"));
const FantasyHomePage = lazy(() => import("../pages/FantasyHomePage"));
const FantasyCreatePollPage = lazy(() => import("../pages/FantasyCreatePollPage"));
const FantasyPollsPage = lazy(() => import("../pages/FantasyPollsPage"));
const FantasyProfilePage = lazy(() => import("../pages/FantasyProfilePage"));
const FantasyPredictionsPage = lazy(() => import("../pages/FantasyPredictionsPage"));
const FantasyLeaderboardPage = lazy(() => import("../pages/FantasyLeaderboardPage"));
const FantasyResultsPage = lazy(() => import("../pages/FantasyResultsPage"));
const FantasyRulesPage = lazy(() => import("../pages/FantasyRulesPage"));
const FantasyAdminResultsPage = lazy(() => import("../pages/FantasyAdminResultsPage"));
const FantasyAdminScoreReviewPage = lazy(() => import("../pages/FantasyAdminScoreReviewPage"));
const FantasyAdminSquadsPage = lazy(() => import("../pages/FantasyAdminSquadsPage"));
const FantasyAdminPollsPage = lazy(() => import("../pages/FantasyAdminPollsPage"));
const FantasyAdminSubmittedPollsPage = lazy(() => import("../pages/FantasyAdminSubmittedPollsPage"));
const FantasyAdminParticipantsPage = lazy(() => import("../pages/FantasyAdminParticipantsPage"));
const FantasyAdminFixturesPage = lazy(() => import("../pages/FantasyAdminFixturesPage"));
const FantasyAdminTournamentPage = lazy(() => import("../pages/FantasyAdminTournamentPage"));
const FantasyAdminQuestionTemplatesPage = lazy(() => import("../pages/FantasyAdminQuestionTemplatesPage"));
const FantasyAdminAiSettingsPage = lazy(() => import("../pages/FantasyAdminAiSettingsPage"));

const FantasyAdminOnly = ({ children }: { children: ReactElement }) => {
  const { isAdmin } = useFantasy();
  return isAdmin ? children : <Navigate replace to="/fantasy" />;
};

/**
 * Defines the top-level route tree with lazy-loaded competition sections.
 *
 * @returns Application router element.
 */
export const App = () => (
  <Suspense fallback={<div className="loading-screen" role="status">Loading view…</div>}>
    <PwaUpdatePrompt />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/competitions/:competitionSlug/:editionId" element={<CompetitionLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="fixtures" element={<FixturesPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="standings" element={<StandingsPage />} />
        <Route path="bracket" element={<BracketPage />} />
        <Route path="scorers" element={<ScorersPage />} />
        <Route path="matches/:matchId" element={<MatchPage />} />
      </Route>
      <Route path="/fantasy" element={<FantasyLayout />}>
        <Route index element={<FantasyHomePage />} />
        <Route path="create-poll" element={<FantasyCreatePollPage />} />
        <Route path="polls" element={<FantasyPollsPage />} />
        <Route path="profile" element={<FantasyProfilePage />} />
        <Route path="predictions" element={<FantasyPredictionsPage />} />
        <Route path="leaderboard" element={<FantasyLeaderboardPage />} />
        <Route path="results" element={<FantasyResultsPage />} />
        <Route path="rules" element={<FantasyRulesPage />} />
        <Route path="admin/tournament" element={<FantasyAdminOnly><FantasyAdminTournamentPage /></FantasyAdminOnly>} />
        <Route path="admin/participants" element={<FantasyAdminOnly><FantasyAdminParticipantsPage /></FantasyAdminOnly>} />
        <Route path="admin/fixtures" element={<FantasyAdminOnly><FantasyAdminFixturesPage /></FantasyAdminOnly>} />
        <Route path="admin/squads" element={<FantasyAdminOnly><FantasyAdminSquadsPage /></FantasyAdminOnly>} />
        <Route path="admin/templates" element={<FantasyAdminOnly><FantasyAdminQuestionTemplatesPage /></FantasyAdminOnly>} />
        <Route path="admin/ai-settings" element={<FantasyAdminOnly><FantasyAdminAiSettingsPage /></FantasyAdminOnly>} />
        <Route path="admin/polls" element={<FantasyAdminOnly><FantasyAdminPollsPage /></FantasyAdminOnly>} />
        <Route path="admin/submitted-polls" element={<FantasyAdminOnly><FantasyAdminSubmittedPollsPage /></FantasyAdminOnly>} />
        <Route path="admin/results" element={<FantasyAdminOnly><FantasyAdminResultsPage /></FantasyAdminOnly>} />
        <Route path="admin/score-review/:matchId" element={<FantasyAdminOnly><FantasyAdminScoreReviewPage /></FantasyAdminOnly>} />
      </Route>
      <Route path="/not-found" element={<div className="error-screen"><span className="eyebrow">404</span><h1>That page is off the pitch.</h1><p>The competition or edition may no longer be available.</p><a className="button button--primary" href="/">Go home</a></div>} />
      <Route path="*" element={<Navigate replace to="/not-found" />} />
    </Routes>
  </Suspense>
);
