import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useCompetition } from "../app/competition-context";
import { MatchCard } from "../features/matches/MatchCard";
import type { MatchStatus } from "../types/domain";
import { filterMatches, formatDate, groupMatchesByDate } from "../utils/football";

const filters: { label: string; value: "ALL" | MatchStatus }[] = [
  { label: "All", value: "ALL" }, { label: "Live", value: "LIVE" }, { label: "Upcoming", value: "UPCOMING" },
  { label: "Postponed", value: "POSTPONED" }, { label: "Completed", value: "COMPLETED" },
];

export default function FixturesPage() {
  const { data } = useCompetition();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status")?.toUpperCase() ?? "ALL") as "ALL" | MatchStatus;
  const search = params.get("q") ?? "";
  const stage = params.get("stage") ?? "ALL";
  const stages = [...new Set(data.matches.map((match) => match.stage))];
  const matches = useMemo(() => filterMatches(data.matches, status, search, stage), [data.matches, search, stage, status]);
  const grouped = groupMatchesByDate(matches);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "" || value === "ALL") next.delete(key);
    else next.set(key, value.toLowerCase());
    setParams(next);
  };
  return (
    <div className="page">
      <PageHeading eyebrow="Match calendar" title="Fixtures" description="Kickoff times automatically use your local timezone." />
      <div className="filters">
        <div className="chip-row">{filters.map((filter) => <button className={`chip ${status === filter.value ? "chip--active" : ""}`} onClick={() => update("status", filter.value)} key={filter.value}>{filter.label}</button>)}</div>
        <div className="filter-fields"><input aria-label="Search teams or rounds" placeholder="Search team or round" value={search} onChange={(event) => update("q", event.target.value)} /><select aria-label="Filter by stage" value={stage} onChange={(event) => update("stage", event.target.value)}><option value="ALL">All stages</option>{stages.map((item) => <option key={item}>{item}</option>)}</select></div>
      </div>
      {Object.entries(grouped).map(([date, dateMatches]) => <section className="date-group" key={date}><h2><span>{formatDate(date, true)}</span><small>{dateMatches?.length} matches</small></h2><div className="match-list">{dateMatches?.map((match) => <MatchCard key={match.id} match={match} />)}</div></section>)}
      {matches.length === 0 && <EmptyState title="No fixtures found" body="Try another status, stage, or search term." />}
    </div>
  );
}

export const PageHeading = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => <header className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>;
export const EmptyState = ({ title, body }: { title: string; body: string }) => <div className="empty-state"><span>90:00</span><h2>{title}</h2><p>{body}</p></div>;
