import { Link, useParams } from "react-router-dom";
import type { Match } from "../../types/domain";
import { formatKickoff, formatLiveClock, isActiveLivePhase } from "../../utils/football";
import { TeamBadge } from "../../components/TeamBadge";
import { ChevronIcon } from "../../components/Icons";

const statusLabel: Record<Match["status"], string> = {
  LIVE: "Live",
  UPCOMING: "Upcoming",
  COMPLETED: "Full time",
  POSTPONED: "Postponed",
  CANCELLED: "Cancelled",
};

/**
 * Displays a navigable match summary card for fixtures and results.
 *
 * @param props - Component props.
 * @param props.match - Match to summarize and link to.
 * @param props.compact - Whether to hide secondary metadata for dense lists.
 * @returns Link element pointing to the match detail route.
 */
export const MatchCard = ({ match, compact = false }: { match: Match; compact?: boolean }) => {
  const { competitionSlug, editionId } = useParams();
  const hasScore = match.homeScore !== undefined && match.awayScore !== undefined;
  const primaryMeta = match.group ?? match.round;
  const matchNumber = match.matchNumber;
  const liveClock = match.status === "LIVE" ? formatLiveClock(match) : undefined;
  return (
    <Link className={`match-card ${compact ? "match-card--compact" : ""}`} to={`/competitions/${competitionSlug}/${editionId}/matches/${match.id}`} aria-label={`${match.home.name} versus ${match.away.name}`}>
      <div className="match-card__meta">
        <span className={`status status--${match.status.toLowerCase()}`}>
          {match.status === "LIVE" ? (
            <>
              {isActiveLivePhase(match.livePhase) && <span className="status__dot" />}
              {liveClock ?? "Live"}
            </>
          ) : statusLabel[match.status]}
        </span>
        <span>{primaryMeta}</span>
        {matchNumber && <span className="match-card__number" aria-label={`Match ${matchNumber}`}>{matchNumber}</span>}
        <span className="match-card__time">{formatKickoff(match.kickoff)}</span>
      </div>
      <div className="match-card__teams">
        <div className="match-team"><TeamBadge team={match.home} size="sm" /><span>{match.home.name}</span><strong>{hasScore ? match.homeScore : "–"}</strong></div>
        <div className="match-team"><TeamBadge team={match.away} size="sm" /><span>{match.away.name}</span><strong>{hasScore ? match.awayScore : "–"}</strong></div>
      </div>
      {!compact && <div className="match-card__venue"><span>{match.venue}, {match.city}</span><ChevronIcon /></div>}
    </Link>
  );
};
