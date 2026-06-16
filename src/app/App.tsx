import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { CompetitionLayout } from "./CompetitionLayout";
import { RootRedirect } from "./RootRedirect";

const OverviewPage = lazy(() => import("../pages/OverviewPage"));
const FixturesPage = lazy(() => import("../pages/FixturesPage"));
const ResultsPage = lazy(() => import("../pages/ResultsPage"));
const StandingsPage = lazy(() => import("../pages/StandingsPage"));
const BracketPage = lazy(() => import("../pages/BracketPage"));
const ScorersPage = lazy(() => import("../pages/ScorersPage"));
const MatchPage = lazy(() => import("../pages/MatchPage"));

/**
 * Defines the top-level route tree with lazy-loaded competition sections.
 *
 * @returns Application router element.
 */
export const App = () => (
  <Suspense fallback={<div className="loading-screen" role="status">Loading view…</div>}>
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/competitions/:competitionSlug/:editionId" element={<CompetitionLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="fixtures" element={<FixturesPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="standings" element={<StandingsPage />} />
        <Route path="bracket" element={<BracketPage />} />
        <Route path="scorers" element={<ScorersPage />} />
        <Route path="matches/:matchId" element={<MatchPage />} />
      </Route>
      <Route path="/not-found" element={<div className="error-screen"><span className="eyebrow">404</span><h1>That page is off the pitch.</h1><p>The competition or edition may no longer be available.</p><a className="button button--primary" href="/">Go home</a></div>} />
      <Route path="*" element={<Navigate replace to="/not-found" />} />
    </Routes>
  </Suspense>
);
