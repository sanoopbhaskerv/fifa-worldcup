import { useCompetition } from "../app/competition-context";
import { ScorerList } from "../features/scorers/ScorerList";
import { PageHeading } from "./FixturesPage";

/**
 * Displays top scorers for competitions with scorer data.
 *
 * @returns Scorers route page.
 */
export default function ScorersPage() {
  const { data } = useCompetition();
  return <div className="page"><PageHeading eyebrow="Golden boot race" title="Top scorers" description="Goals, assists and appearances across this edition." /><div className="scorer-header"><span>Player</span><span>Assists</span><span>Goals</span></div><ScorerList scorers={data.scorers} /></div>;
}
