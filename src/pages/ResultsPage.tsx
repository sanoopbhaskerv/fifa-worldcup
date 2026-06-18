import { useMemo, useState } from "react";
import { useCompetition } from "../app/competition-context";
import { MatchCard } from "../features/matches/MatchCard";
import { filterMatches, formatDate, groupMatchesByDate } from "../utils/football";
import { EmptyState, MatchFilters, PageHeading } from "../components/PageSections";

/**
 * Displays newest-first completed matches with stage and team filters.
 *
 * @returns Results route page.
 */
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
      <MatchFilters
        searchLabel="Search results"
        searchPlaceholder="Search team or round"
        searchValue={search}
        onSearchChange={setSearch}
        stageLabel="Filter by stage"
        stageValue={stage}
        onStageChange={setStage}
        stageOptions={stages}
        standalone
      />
      {Object.entries(grouped).map(([date, dateMatches]) => <section className="date-group" key={date}><h2><span>{formatDate(date, true)}</span><small>{dateMatches?.length} results</small></h2><div className="match-list">{dateMatches?.map((match) => <MatchCard key={match.id} match={match} />)}</div></section>)}
      {results.length === 0 && <EmptyState title="No results found" body="Adjust the team search or stage filter." />}
    </div>
  );
}
