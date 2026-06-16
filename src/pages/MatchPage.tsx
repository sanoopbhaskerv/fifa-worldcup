import { Link, useParams } from "react-router-dom";
import { useCompetition } from "../app/competition-context";
import { ArrowIcon, CalendarIcon, SignalIcon } from "../components/Icons";
import { TeamBadge } from "../components/TeamBadge";
import { useMatchDetails } from "../services/queries";
import { formatDate, formatKickoff } from "../utils/football";

/** Human-readable labels for provider event types. */
const eventLabels = { goal: "Goal", "yellow-card": "Yellow card", "red-card": "Red card", substitution: "Substitution" };

/**
 * Presents match score, timeline, metadata, lineups, and statistics for one route.
 *
 * @returns Match detail page for the route's `matchId` parameter.
 */
export default function MatchPage() {
  const { data } = useCompetition();
  const { matchId } = useParams();
  const match = data.matches.find((item) => item.id === matchId);
  const detailQuery = useMatchDetails(match);
  if (!match) return <div className="empty-state"><h1>Match not found</h1><p>This match may not belong to the selected edition.</p></div>;
  const details = detailQuery.data;
  const events = details?.events.length ? details.events : data.events[match.id] ?? [];
  const officials = details?.officials.length ? details.officials : match.officials ?? [];
  const hasScore = match.homeScore !== undefined;
  return (
    <div className="page match-page">
      <Link className="back-link" to="../fixtures">← Back to fixtures</Link>
      <section className="match-scoreboard">
        <div className="match-scoreboard__meta"><span className={`status status--${match.status.toLowerCase()}`}>{match.status === "LIVE" ? `Live${match.minute ? ` · ${match.minute}'` : ""}` : match.status.replace("_", " ")}</span><span>{match.stage} · {match.round}</span></div>
        <div className="match-scoreboard__teams">
          <div><TeamBadge team={match.home} size="lg" /><h2>{match.home.name}</h2><span>{match.home.code}</span></div>
          <div className="match-scoreboard__score">{hasScore ? <strong>{match.homeScore}<i>:</i>{match.awayScore}</strong> : <><strong>{formatKickoff(match.kickoff)}</strong><span>{formatDate(match.kickoff)}</span></>}{match.homePenalties !== undefined && <small>{match.homePenalties}–{match.awayPenalties} on penalties</small>}</div>
          <div><TeamBadge team={match.away} size="lg" /><h2>{match.away.name}</h2><span>{match.away.code}</span></div>
        </div>
        <div className="match-scoreboard__venue">{match.venue} · {match.city}</div>
      </section>
      <div className="match-detail-grid">
        <section className="content-section">
          <div className="section-heading"><div><span className="eyebrow">Key moments</span><h2>Match timeline</h2></div>{detailQuery.isFetching && <small className="loading-inline">Refreshing…</small>}</div>
          {events.length > 0 ? <ol className="timeline">{events.map((event) => <li key={event.id}><time>{event.minute}'{event.extraMinute ? `+${event.extraMinute}` : ""}</time><span className={`event-dot event-dot--${event.type}`} /><div><strong>{eventLabels[event.type]} · {event.player}</strong><span>{event.assist ? `Assist: ${event.assist} · ` : ""}{event.detail}</span></div></li>)}</ol> : <p className="partial-note">A detailed event feed is not available for this match.</p>}
          {details?.notice && <p className="partial-note">{details.notice}</p>}
        </section>
        <aside className="content-section match-info">
          <div className="section-heading"><div><span className="eyebrow">Match info</span><h2>Details</h2></div></div>
          <dl><div><dt><CalendarIcon />Kickoff</dt><dd>{formatDate(match.kickoff, true)}<br />{formatKickoff(match.kickoff)}</dd></div><div><dt><SignalIcon />Venue</dt><dd>{match.venue}<br />{match.city}</dd></div><div><dt><ArrowIcon />Stage</dt><dd>{match.stage}<br />{match.round}</dd></div>{match.attendance && <div><dt>Attendance</dt><dd>{match.attendance.toLocaleString()}</dd></div>}{officials.length > 0 && <div><dt>Officials</dt><dd>{officials.join(", ")}</dd></div>}</dl>
          <p className="partial-note">{details ? `Match detail supplied by ${details.provider}.` : "Lineups, officials and advanced statistics appear only when supplied by the configured provider."}</p>
        </aside>
      </div>
      {details?.statistics.length ? <StatisticsSection statistics={details.statistics} /> : null}
      {details?.lineups.length ? <LineupsSection lineups={details.lineups} /> : null}
    </div>
  );
}

/**
 * Renders a side-by-side comparison of provider-supplied team statistics.
 *
 * @param props - Component props.
 * @param props.statistics - Team statistics for the home and away sides.
 * @returns Statistics comparison section, or `null` when either team is missing.
 */
const StatisticsSection = ({ statistics }: { statistics: import("../types/domain").TeamStatistics[] }) => {
  const [home, away] = statistics;
  if (!home || !away) return null;
  const labels = [...new Set([...Object.keys(home.values), ...Object.keys(away.values)])];
  return <section className="content-section details-section"><div className="section-heading"><div><span className="eyebrow">By the numbers</span><h2>Team statistics</h2></div></div><div className="stats-comparison"><header><strong>{home.teamName}</strong><strong>{away.teamName}</strong></header>{labels.map((label) => <div className="stats-comparison__row" key={label}><strong>{String(home.values[label] ?? "–")}</strong><span>{label.replace("expected_goals", "Expected goals")}</span><strong>{String(away.values[label] ?? "–")}</strong></div>)}</div></section>;
};

/**
 * Renders provider-supplied starting elevens and substitute benches.
 *
 * @param props - Component props.
 * @param props.lineups - Team lineup payloads to display.
 * @returns Lineup section for the match detail page.
 */
const LineupsSection = ({ lineups }: { lineups: import("../types/domain").TeamLineup[] }) => (
  <section className="content-section details-section"><div className="section-heading"><div><span className="eyebrow">Starting elevens</span><h2>Lineups</h2></div></div><div className="lineups">{lineups.map((lineup) => <article key={lineup.teamId}><header><strong>{lineup.teamName}</strong><span>{lineup.formation ?? "Formation TBC"}</span></header>{lineup.coach && <p>Coach · {lineup.coach}</p>}<ol>{lineup.starters.map((player) => <li key={player.id}><span>{player.number ?? "–"}</span><strong>{player.name}</strong><small>{player.position}</small></li>)}</ol><details><summary>Substitutes ({lineup.substitutes.length})</summary><ul>{lineup.substitutes.map((player) => <li key={player.id}>{player.number ?? "–"} · {player.name}</li>)}</ul></details></article>)}</div></section>
);
