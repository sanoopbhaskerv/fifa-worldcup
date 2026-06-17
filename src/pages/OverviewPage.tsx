import { Link } from "react-router-dom";
import { ArrowIcon, CalendarIcon, TableIcon, TrophyIcon } from "../components/Icons";
import { TeamBadge } from "../components/TeamBadge";
import { MatchCard } from "../features/matches/MatchCard";
import { useCompetition } from "../app/competition-context";
import { formatDate, formatKickoff, resolveLiveMinute, sectionPath } from "../utils/football";

/**
 * Displays the competition landing page with hero match, key stats, and quick links.
 *
 * @returns Overview route page.
 */
export default function OverviewPage() {
  const { data, editionId } = useCompetition();
  const { competition, matches, standings, scorers } = data;
  const featured = matches.find((match) => match.status === "LIVE") ?? matches.find((match) => match.status === "UPCOMING") ?? matches[0];
  const featuredMeta = featured
    ? [featured.stage, featured.round, featured.matchNumber ? `Match ${featured.matchNumber}` : undefined]
      .filter(Boolean)
      .join(" · ")
    : "";
  const featuredLiveMinute = featured
    ? resolveLiveMinute(featured.minute, featured.kickoff)
    : undefined;
  const featuredTimeLabel = featured
    ? featured.status === "LIVE"
      ? featuredLiveMinute === undefined
        ? "LIVE"
        : `${featuredLiveMinute}'`
      : formatKickoff(featured.kickoff)
    : "";
  const recent = [...matches]
    .filter((match) => match.status === "COMPLETED")
    .sort((left, right) => Date.parse(right.kickoff) - Date.parse(left.kickoff))
    .slice(0, 3);
  const upcoming = matches.filter((match) => ["UPCOMING", "POSTPONED"].includes(match.status)).slice(0, 3);
  const leader = standings.find((standing) => standing.position === 1);

  return (
    <div className="page">
      <section className="overview-heading">
        <div><span className="eyebrow">{competition.category} · {competition.region}</span><h1>{competition.name}</h1><p>{competition.summary}</p></div>
        <span className="edition-pill">{editionId} edition</span>
      </section>
      {featured && (
        <Link className="hero-match" to={`matches/${featured.id}`}>
          <div className="hero-match__top"><span className={`status status--${featured.status.toLowerCase()}`}>{featured.status === "LIVE" ? `LIVE${featured.minute ? ` · ${featured.minute}'` : ""}` : "NEXT MATCH"}</span><span>{featuredMeta}</span></div>
          <div className="hero-match__teams">
            <div><TeamBadge team={featured.home} size="lg" /><strong>{featured.home.name}</strong></div>
            <div className="hero-match__score">
              {featured.homeScore !== undefined ? <><strong>{featured.homeScore} <span>:</span> {featured.awayScore}</strong><span>{featuredTimeLabel}</span></> : <><strong>{featuredTimeLabel}</strong><span>{formatDate(featured.kickoff)}</span></>}
            </div>
            <div><TeamBadge team={featured.away} size="lg" /><strong>{featured.away.name}</strong></div>
          </div>
          <div className="hero-match__bottom"><span>{featured.venue}, {featured.city}</span><span>Match centre <ArrowIcon /></span></div>
        </Link>
      )}
      <section className="stat-grid" aria-label="Competition statistics">
        <article><span>Matches</span><strong>{matches.length}</strong><small>{matches.filter((match) => match.status === "COMPLETED").length} completed</small></article>
        <article><span>Goals</span><strong>{matches.reduce((total, match) => total + (match.homeScore ?? 0) + (match.awayScore ?? 0), 0)}</strong><small>Across this edition</small></article>
        <article><span>Leader</span><strong className="stat-grid__name">{leader?.team.shortName ?? "TBD"}</strong><small>{leader ? `${leader.points} points` : "Knockout format"}</small></article>
        <article><span>Top scorer</span><strong className="stat-grid__name">{scorers[0]?.name.split(" ").at(-1) ?? "TBD"}</strong><small>{scorers[0]?.goals ?? 0} goals</small></article>
      </section>
      <div className="overview-columns">
        <section className="content-section">
          <div className="section-heading"><div><span className="eyebrow">Latest</span><h2>Recent results</h2></div><Link to={sectionPath(competition, editionId, "results")}>View all <ArrowIcon /></Link></div>
          <div className="match-list">{recent.map((match) => <MatchCard match={match} compact key={match.id} />)}</div>
        </section>
        <section className="content-section">
          <div className="section-heading"><div><span className="eyebrow">On the horizon</span><h2>Upcoming fixtures</h2></div><Link to={sectionPath(competition, editionId, "fixtures")}>View all <ArrowIcon /></Link></div>
          <div className="match-list">{upcoming.map((match) => <MatchCard match={match} compact key={match.id} />)}</div>
        </section>
      </div>
      <section className="quick-links">
        <Link to={sectionPath(competition, editionId, "fixtures")}><CalendarIcon /><span><strong>Full schedule</strong><small>Dates, rounds and venues</small></span><ArrowIcon /></Link>
        {competition.capabilities.hasStandings && <Link to={sectionPath(competition, editionId, "standings")}><TableIcon /><span><strong>Standings</strong><small>{competition.capabilities.hasGroups ? "Every group table" : "The latest league table"}</small></span><ArrowIcon /></Link>}
        {competition.capabilities.hasBracket && <Link to={sectionPath(competition, editionId, "bracket")}><TrophyIcon /><span><strong>Road to the final</strong><small>Track knockout progression</small></span><ArrowIcon /></Link>}
      </section>
      <p className="demo-note">{data.source === "live" ? `Competition data supplied by ${data.provider}. Live scores refresh every 60 seconds.` : "Scores and schedules are realistic demonstration data, not live sporting results."}</p>
    </div>
  );
}
