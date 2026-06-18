import { useCompetition } from "../app/competition-context";
import { StandingsTable } from "../features/standings/StandingsTable";
import type { Standing } from "../types/domain";
import { PageHeading } from "../components/PageSections";

/**
 * Displays one standings table per group or a single league table.
 *
 * @returns Standings route page.
 */
export default function StandingsPage() {
  const { data } = useCompetition();
  const groups = data.standings.reduce<Record<string, Standing[]>>((result, standing) => {
    const key = standing.group ?? "League table";
    (result[key] ??= []).push(standing);
    return result;
  }, {});
  return (
    <div className="page">
      <PageHeading eyebrow="The race" title={data.competition.capabilities.hasGroups ? "Group standings" : "League table"} description="Qualification and elimination zones include text labels and recent form." />
      <div className="standings-groups">{Object.entries(groups).map(([group, standings]) => <section className="content-section standings-section" key={group}><div className="section-heading"><div><span className="eyebrow">{data.competition.shortName}</span><h2>{group}</h2></div></div>{standings && <StandingsTable standings={standings} />}</section>)}</div>
      <div className="zone-legend"><span><i className="zone zone--qualified" />Qualification</span><span><i className="zone zone--eliminated" />Eliminated</span><span><i className="zone zone--relegated" />Relegation</span></div>
    </div>
  );
}
