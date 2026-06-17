import { PageHeading } from "./FixturesPage";

const matchRules = [
  ["Winner", "5"],
  ["First scoring team", "4"],
  ["First goal time", "5"],
  ["First goal scorer", "8"],
  ["Total goals range", "3"],
  ["Both teams score", "3"],
  ["Star player scores", "3"],
  ["Man of the Match", "7"],
];

const tournamentRules = [
  ["Tournament winner", "30"],
  ["Runner-up", "20"],
  ["Semi-finalist", "10 each"],
  ["Quarter-finalist", "6 each"],
  ["Golden Boot", "25"],
  ["Golden Glove", "20"],
  ["Best Player", "20"],
  ["Group winner", "8 each"],
];

/**
 * Displays fantasy scoring and lock rules.
 *
 * @returns Rules page.
 */
export default function FantasyRulesPage() {
  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Game rules" title="Simple scoring" description="The game stays prediction-first: answer polls, lock before kickoff, score when admin publishes results." />
      <div className="fantasy-columns">
        <RulesTable title="Match questions" rows={matchRules} />
        <RulesTable title="Tournament questions" rows={tournamentRules} />
      </div>
      <section className="content-section fantasy-rules-notes">
        <div className="section-heading"><div><span className="eyebrow">Anti-confusion</span><h2>Hard rules</h2></div></div>
        <ul>
          <li>Polls close 15 minutes before kickoff.</li>
          <li>No late entries after closure.</li>
          <li>Knockout questions separate 90-minute result from qualification.</li>
          <li>Own goal counts as Own Goal for first goal scorer.</li>
          <li>AI generates drafts, but the backend validates options and scoring.</li>
        </ul>
      </section>
    </div>
  );
}

const RulesTable = ({ title, rows }: { title: string; rows: string[][] }) => (
  <section className="content-section fantasy-rules-table">
    <div className="section-heading"><div><span className="eyebrow">Points</span><h2>{title}</h2></div></div>
    <table>
      <thead><tr><th>Prediction</th><th>Points</th></tr></thead>
      <tbody>{rows.map(([label, points]) => <tr key={label}><td>{label}</td><td>{points}</td></tr>)}</tbody>
    </table>
  </section>
);
