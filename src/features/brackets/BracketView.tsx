import type { KnockoutTie } from "../../types/domain";
import { TeamBadge } from "../../components/TeamBadge";
import { formatDate } from "../../utils/football";

export const BracketView = ({ ties }: { ties: KnockoutTie[] }) => {
  const rounds = ties.reduce<Record<string, KnockoutTie[]>>((groups, tie) => {
    (groups[tie.round] ??= []).push(tie);
    return groups;
  }, {});
  return (
    <div className="bracket">
      {Object.entries(rounds).map(([round, roundTies]) => (
        <section className="bracket__round" key={round}>
          <div className="eyebrow">{round}</div>
          {roundTies?.map((tie) => (
            <article className="tie-card" key={tie.id}>
              <div className="tie-card__date">{formatDate(tie.date)}{tie.aggregate && <span>{tie.aggregate}</span>}</div>
              {[tie.home, tie.away].map((entry, index) => {
                const winner = tie.winnerId === entry.id;
                const score = index === 0 ? tie.homeScore : tie.awayScore;
                const penalties = index === 0 ? tie.homePenalties : tie.awayPenalties;
                return (
                  <div className={`tie-team ${winner ? "tie-team--winner" : ""}`} key={entry.id}>
                    <TeamBadge team={entry} size="sm" /><span>{entry.name}</span><strong>{score}{penalties !== undefined && <small> ({penalties})</small>}</strong>
                  </div>
                );
              })}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
};
