import type { Scorer } from "../../types/domain";
import { TeamBadge } from "../../components/TeamBadge";

/**
 * Renders ranked top scorers with team identity, assists, and goals.
 *
 * @param props - Component props.
 * @param props.scorers - Ordered scorer rows to display.
 * @returns Scorer leaderboard list.
 */
export const ScorerList = ({ scorers }: { scorers: Scorer[] }) => (
  <div className="scorer-list">
    {scorers.map((scorer) => (
      <article className="scorer-row" key={scorer.id}>
        <span className="scorer-row__rank">{scorer.rank}</span>
        <TeamBadge team={scorer.team} size="md" />
        <div className="scorer-row__player"><strong>{scorer.name}</strong><span>{scorer.team.name} · {scorer.matches} apps</span></div>
        <div className="scorer-row__secondary"><span>{scorer.assists ?? "–"}</span><small>AST</small></div>
        <div className="scorer-row__goals"><strong>{scorer.goals}</strong><small>GOALS</small></div>
      </article>
    ))}
  </div>
);
