import { useMemo, useState } from "react";
import { useCompetition } from "../app/competition-context";
import { MatchCard } from "../features/matches/MatchCard";
import { filterMatches, formatDate, groupMatchesByDate } from "../utils/football";
import { EmptyState, PageHeading } from "./FixturesPage";

export default function ResultsPage() {
  const { data } = useCompetition();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("ALL");
  const stages = [...new Set(data.matches.map((match) => match.stage))];
  const results = useMemo(
    () =>
      [...filterMatches(data.matches, "COMPLETED", search, stage)].sort(
        (left, right) => Date.parse(right.kickoff) - Date.parse(left.kickoff),
      ),
    [data.matches, search, stage],
  );
  const grouped = groupMatchesByDate(results);
  return (
    <div className="page">
      <PageHeading eyebrow="Final whistle" title="Results" description="Final scores, shootouts and aggregate outcomes." />
      <div className="filter-fields filter-fields--standalone"><input aria-label="Search results" placeholder="Search team or round" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Filter by stage" value={stage} onChange={(event) => setStage(event.target.value)}><option value="ALL">All stages</option>{stages.map((item) => <option key={item}>{item}</option>)}</select></div>
      {Object.entries(grouped).map(([date, dateMatches]) => <section className="date-group" key={date}><h2><span>{formatDate(date, true)}</span><small>{dateMatches?.length} results</small></h2><div className="match-list">{dateMatches?.map((match) => <MatchCard key={match.id} match={match} />)}</div></section>)}
      {results.length === 0 && <EmptyState title="No results found" body="Adjust the team search or stage filter." />}
    </div>
  );
}
