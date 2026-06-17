import type { FantasyLeaderboardRow } from "../../types/fantasy";

/**
 * Renders the friends-league leaderboard.
 *
 * @param props - Component props.
 * @param props.rows - Rows sorted by current rank.
 * @param props.activeParticipantId - Participant to highlight.
 * @returns Leaderboard table-like card list.
 */
export const FantasyLeaderboard = ({ rows, activeParticipantId }: { rows: FantasyLeaderboardRow[]; activeParticipantId: string }) => (
  <section className="fantasy-leaderboard" aria-label="Friends leaderboard">
    <div className="fantasy-leaderboard__head"><span>Rank</span><span>Player</span><span>Total</span><span>Today</span><span>Streak</span></div>
    {rows.map((row) => {
      const movement = row.previousRank ? row.previousRank - row.rank : 0;
      return (
        <article className={`fantasy-leaderboard__row ${row.participantId === activeParticipantId ? "fantasy-leaderboard__row--active" : ""}`} key={row.participantId}>
          <span className="fantasy-rank">#{row.rank}{movement !== 0 && <small className={movement > 0 ? "fantasy-rank--up" : "fantasy-rank--down"}>{movement > 0 ? `+${movement}` : movement}</small>}</span>
          <span className="fantasy-player"><strong>{row.nickname}</strong><small>{row.favoriteTeam} · {row.correctWinners} winners</small></span>
          <strong>{row.totalPoints}</strong>
          <span>{row.todayPoints}</span>
          <span>{row.streak}</span>
          <div className="fantasy-badges">{row.badges.map((badge) => <em key={badge}>{badge}</em>)}</div>
        </article>
      );
    })}
  </section>
);
