import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { ArrowIcon, BracketIcon, CalendarIcon, ChevronIcon, HomeIcon, PlayerIcon, SignalIcon, TableIcon, TrophyIcon } from "../components/Icons";
import { CompetitionPicker } from "../features/competitions/CompetitionPicker";
import { PullToRefreshIndicator } from "../components/PullToRefreshIndicator";
import { useFavorites } from "../hooks/use-favorites";
import { useOnline } from "../hooks/use-online";
import { usePullToRefresh } from "../hooks/use-pull-to-refresh";
import { useCompetitionData, useCompetitions } from "../services/queries";
import type { Competition } from "../types/domain";
import { availableSections, formatUpdated, sectionPath, type Section } from "../utils/football";
import { clearLegacyPwaCaches } from "../utils/pwa-cache";
import { storage } from "../utils/storage";

const navMeta = {
  overview: { label: "Overview", icon: HomeIcon },
  fixtures: { label: "Fixtures", icon: CalendarIcon },
  results: { label: "Results", icon: TrophyIcon },
  standings: { label: "Table", icon: TableIcon },
  bracket: { label: "Bracket", icon: BracketIcon },
  scorers: { label: "Scorers", icon: PlayerIcon },
};

/**
 * Owns competition data loading, navigation, refresh, and picker state.
 *
 * @returns Routed competition shell with desktop, mobile, and nested section UI.
 */
export const CompetitionLayout = () => {
  const { competitionSlug = "", editionId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();
  const online = useOnline();
  const catalogQuery = useCompetitions();
  const competition = catalogQuery.data?.find((item) => item.slug === competitionSlug);
  const dataQuery = useCompetitionData(competition?.id ?? "", editionId);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });
  const {
    containerRef: pullRefreshContainerRef,
    progress: pullRefreshProgress,
    pullDistance,
    state: pullRefreshState,
  } = usePullToRefresh({
    disabled: !dataQuery.data,
    isRefreshing: dataQuery.isFetching,
    onRefresh: () => dataQuery.refetch(),
  });

  useEffect(() => {
    void clearLegacyPwaCaches();
  }, []);

  useEffect(() => {
    if (competition && competition.editions.some((edition) => edition.id === editionId)) {
      storage.setSelection({ competitionSlug: competition.slug, editionId });
      storage.addRecent(competition.id);
    }
  }, [competition, editionId]);

  const currentSection = useMemo<Section>(() => {
    const finalSegment = location.pathname.split("/").at(-1);
    return (["fixtures", "results", "standings", "bracket", "scorers"].includes(finalSegment ?? "") ? finalSegment : "overview") as Section;
  }, [location.pathname]);

  if (catalogQuery.isPending) return <LoadingScreen />;
  if (!competition) return <Navigate replace to="/not-found" />;
  if (!competition.editions.some((edition) => edition.id === editionId)) {
    return <Navigate replace to={sectionPath(competition, competition.activeEditionId, "overview")} />;
  }
  if (dataQuery.isPending) return <LoadingScreen />;
  if (dataQuery.isError || !dataQuery.data) return <ErrorScreen retry={() => void dataQuery.refetch()} />;

  const sections = availableSections(competition);
  if (!sections.includes(currentSection) && !location.pathname.includes("/matches/")) {
    return <Navigate replace to={sectionPath(competition, editionId, "overview")} />;
  }

  const selectCompetition = (next: Competition) => {
    const nextSection = availableSections(next).includes(currentSection) ? currentSection : "overview";
    navigate(sectionPath(next, next.activeEditionId, nextSection));
    setPickerOpen(false);
  };
  const selectEdition = (nextEdition: string) => navigate(sectionPath(competition, nextEdition, currentSection));
  const applyUpdate = () => {
    void updateServiceWorker(true);
    window.setTimeout(() => window.location.reload(), 700);
  };

  return (
    <div className="app" style={{ "--competition-accent": competition.accent } as React.CSSProperties}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <PullToRefreshIndicator progress={pullRefreshProgress} state={pullRefreshState} />
      <div
        className={`app-scroll app-scroll--${pullRefreshState}`}
        ref={pullRefreshContainerRef}
        style={{
          transform: pullRefreshState === "idle" ? "translateY(0)" : `translateY(${pullRefreshState === "refreshing" || pullRefreshState === "success" ? 36 : Math.min(pullDistance * 0.45, 36)}px)`,
        }}
      >
        {!online && <div className="network-banner" role="status"><SignalIcon />You’re offline. Showing saved competition data.</div>}
        <header className="topbar">
          <div className="topbar__inner">
            <NavLink className="brand" to="/"><span className="brand__mark">F</span><span>FULL TIME</span></NavLink>
            <button className="competition-switcher" onClick={() => setPickerOpen(true)}>
              <span className="competition-emblem" style={{ "--competition-accent": competition.accent } as React.CSSProperties}>{competition.emblem}</span>
              <span><small>Competition</small><strong>{competition.shortName}</strong></span><ChevronIcon />
            </button>
            <label className="edition-select"><span className="sr-only">Edition</span><select value={editionId} onChange={(event) => selectEdition(event.target.value)}>{competition.editions.map((edition) => <option value={edition.id} key={edition.id}>{edition.name}</option>)}</select></label>
          </div>
        </header>
        <div className="app-frame">
          <aside className="desktop-nav" aria-label="Competition sections">
            <div className="desktop-nav__identity">
              <span className="competition-emblem competition-emblem--large" style={{ "--competition-accent": competition.accent } as React.CSSProperties}>{competition.emblem}</span>
              <div><strong>{competition.name}</strong><span>{editionId} edition</span></div>
            </div>
            <nav>{sections.map((section) => <SectionLink key={section} section={section} competition={competition} editionId={editionId} />)}</nav>
            <div className="desktop-nav__footer"><span>{dataQuery.data.source === "live" ? "Live provider" : "Demo fallback"}</span><small>{dataQuery.data.provider}</small><small>Updated {formatUpdated(dataQuery.data.updatedAt)}</small></div>
          </aside>
          <main id="main-content" className="main-content">
            <div className="mobile-tabs" aria-label="Competition sections">{sections.map((section) => <SectionLink key={section} section={section} competition={competition} editionId={editionId} compact />)}</div>
            <div className="freshness" role="status">
              <span className={dataQuery.isFetching ? "freshness__pulse" : ""} />
              {dataQuery.isFetching ? "Refreshing data…" : `${dataQuery.data.source === "live" ? "Live" : "Demo"} · ${online ? "Updated" : "Saved"} ${formatUpdated(dataQuery.data.updatedAt)}`}
            </div>
            {dataQuery.data.notice && <div className="data-notice" role="status">{dataQuery.data.notice}</div>}
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                <Outlet context={{ data: dataQuery.data, editionId, updatedAt: dataQuery.dataUpdatedAt, isFetching: dataQuery.isFetching, refetch: dataQuery.refetch }} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <nav className="bottom-nav" aria-label="Primary mobile navigation">
        {sections.slice(0, 5).map((section) => <SectionLink key={section} section={section} competition={competition} editionId={editionId} bottom />)}
      </nav>
      <CompetitionPicker open={pickerOpen} competitions={catalogQuery.data ?? []} currentId={competition.id} favorites={favorites} recents={storage.getRecents()} onClose={() => setPickerOpen(false)} onSelect={selectCompetition} onToggleFavorite={toggleFavorite} />
      {needRefresh && <div className="update-toast" role="status"><div><strong>Update ready</strong><span>A new version of Full Time is available.</span></div><button onClick={applyUpdate}>Update <ArrowIcon /></button><button className="icon-button" onClick={() => setNeedRefresh(false)} aria-label="Dismiss update">×</button></div>}
    </div>
  );
};

/**
 * Renders one navigation link for a competition section.
 *
 * @param props - Component props.
 * @param props.section - Section id this link targets.
 * @param props.competition - Competition whose route slug should be used.
 * @param props.editionId - Active edition id for route construction.
 * @param props.compact - Whether to render the compact tab variant.
 * @param props.bottom - Whether to render the bottom-navigation variant.
 * @returns Navigation link with the section icon and active state.
 */
const SectionLink = ({ section, competition, editionId, compact, bottom }: { section: Section; competition: Competition; editionId: string; compact?: boolean; bottom?: boolean }) => {
  const meta = navMeta[section];
  const Icon = meta.icon;
  return <NavLink end={section === "overview"} className={({ isActive }) => `section-link ${isActive ? "section-link--active" : ""} ${compact ? "section-link--compact" : ""} ${bottom ? "section-link--bottom" : ""}`} to={sectionPath(competition, editionId, section)}><Icon /><span>{meta.label}</span></NavLink>;
};

/**
 * Renders the full-page loading state for initial catalog or competition fetches.
 *
 * @returns Loading screen element.
 */
const LoadingScreen = () => <div className="loading-screen" role="status"><span className="loading-mark">F</span><strong>Loading the competition…</strong></div>;

/**
 * Renders the full-page recoverable provider error state.
 *
 * @param props - Component props.
 * @param props.retry - Callback invoked when the user retries the data request.
 * @returns Error screen with retry affordance.
 */
const ErrorScreen = ({ retry }: { retry: () => void }) => <div className="error-screen"><span className="eyebrow">Provider unavailable</span><h1>We couldn’t load this competition.</h1><p>Your saved data is safe. Check your connection and try again.</p><button className="button button--primary" onClick={retry}>Try again</button></div>;
