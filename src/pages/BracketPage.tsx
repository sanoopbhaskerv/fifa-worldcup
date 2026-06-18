import { useCompetition } from "../app/competition-context";
import { BracketView } from "../features/brackets/BracketView";
import { PageHeading } from "../components/PageSections";

/**
 * Displays the knockout bracket for competitions that expose tie data.
 *
 * @returns Bracket route page.
 */
export default function BracketPage() {
  const { data } = useCompetition();
  return <div className="page page--wide"><PageHeading eyebrow="The road to glory" title="Knockout bracket" description={data.competition.capabilities.hasTwoLeggedTies ? "Winners progress across two-legged ties, with aggregate scores shown." : "Follow every winner from the quarter-finals to the trophy."} /><BracketView ties={data.ties} /></div>;
}
