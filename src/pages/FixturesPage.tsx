import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useCompetition } from "../app/competition-context";
import { MatchCard } from "../features/matches/MatchCard";
import type { MatchStatus } from "../types/domain";
import { filterMatches, formatDate, groupMatchesByDate } from "../utils/football";
import { EmptyState, MatchFilters, PageHeading } from "../components/PageSections";

const filters: { label: string; value: "ALL" | MatchStatus }[] = [
  { label: "All", value: "ALL" }, { label: "Live", value: "LIVE" }, { label: "Upcoming", value: "UPCOMING" },
  { label: "Postponed", value: "POSTPONED" }, { label: "Completed", value: "COMPLETED" },
];

/**
 * Formats a local date key for choosing the current fixture group.
 *
 * @param date - Date to convert into a local `YYYY-MM-DD` key.
 * @returns Local date key used to find the current fixture group.
 */
const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Displays fixtures with filters and automatic scroll to the current fixture date.
 *
 * @returns Fixtures route page.
 */
export default function FixturesPage() {
  const { data } = useCompetition();
  const didAutoScroll = useRef(false);
  const [params, setParams] = useSearchParams();
  const status = (params.get("status")?.toUpperCase() ?? "ALL") as "ALL" | MatchStatus;
  const search = params.get("q") ?? "";
  const stage = params.get("stage") ?? "ALL";
  const stages = [...new Set(data.matches.map((match) => match.stage))];
  const matches = useMemo(() => filterMatches(data.matches, status, search, stage), [data.matches, search, stage, status]);
  const grouped = groupMatchesByDate(matches);
  const groupedEntries = Object.entries(grouped);
  const today = localDateKey(new Date());
  const targetDate =
    groupedEntries.find(([date]) => date >= today)?.[0] ??
    groupedEntries.at(-1)?.[0];

  useEffect(() => {
    if (didAutoScroll.current || !targetDate) return;
    const scrollToTarget = () => {
      const target = document.getElementById(`fixtures-${targetDate}`);
      if (!target || didAutoScroll.current) return;
      target.scrollIntoView({ behavior: "auto", block: "start" });
      didAutoScroll.current = true;
    };
    const animationFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToTarget);
    });
    const fallback = window.setTimeout(scrollToTarget, 450);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(fallback);
    };
  }, [targetDate]);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "" || value === "ALL") next.delete(key);
    else next.set(key, value.toLowerCase());
    setParams(next);
  };
  return (
    <div className="page">
      <PageHeading eyebrow="Match calendar" title="Fixtures" description="Kickoff times automatically use your local timezone." />
      <MatchFilters
        statusOptions={filters}
        statusValue={status}
        onStatusChange={(value) => update("status", value)}
        searchLabel="Search teams or rounds"
        searchPlaceholder="Search team or round"
        searchValue={search}
        onSearchChange={(value) => update("q", value)}
        stageLabel="Filter by stage"
        stageValue={stage}
        onStageChange={(value) => update("stage", value)}
        stageOptions={stages}
      />
      {groupedEntries.map(([date, dateMatches]) => <section className="date-group" id={`fixtures-${date}`} key={date}><h2><span>{date === targetDate && <em className="date-group__anchor">Current</em>}{formatDate(date, true)}</span><small>{dateMatches?.length} matches</small></h2><div className="match-list">{dateMatches?.map((match) => <MatchCard key={match.id} match={match} />)}</div></section>)}
      {matches.length === 0 && <EmptyState title="No fixtures found" body="Try another status, stage, or search term." />}
    </div>
  );
}

export { EmptyState, PageHeading } from "../components/PageSections";
