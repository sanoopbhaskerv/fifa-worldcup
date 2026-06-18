import { Link } from "react-router-dom";
import { ArrowIcon, CalendarIcon, TableIcon, TrophyIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { FantasyLeaderboard } from "../features/fantasy/FantasyLeaderboard";
import { fantasyDeadlineLabel, fantasyMatchTitle, fantasyOpenQuestions, fantasyPredictionForQuestion, fantasyQuestionsForMatch, fantasySquadCandidates, fantasyTeamName } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";

/**
 * Displays the fantasy prediction game dashboard.
 *
 * @returns Fantasy home page.
 */
export default function FantasyHomePage() {
  const { data } = useFantasy();
  const activeRow = data.leaderboard.find((row) => row.participantId === data.activeParticipantId);
  const nextMatch = data.matches.find((match) => match.status !== "COMPLETED" && fantasyQuestionsForMatch(match.id, data.questions).length > 0);
  const openQuestions = fantasyOpenQuestions(data);
  const nextQuestions = nextMatch ? fantasyQuestionsForMatch(nextMatch.id, data.questions) : [];
  const homeCandidates = nextMatch ? fantasySquadCandidates(nextMatch.homeTeamId, data.squadPlayers).slice(0, 3) : [];
  const awayCandidates = nextMatch ? fantasySquadCandidates(nextMatch.awayTeamId, data.squadPlayers).slice(0, 3) : [];

  return (
    <div className="page fantasy-page">
      <section className="fantasy-hero">
        <div>
          <span className="eyebrow">Friends prediction game</span>
          <h1>{data.tournament.name}</h1>
          <p>Answer football polls before kickoff, let the AI host keep the banter moving, and climb the friends leaderboard after every result.</p>
        </div>
        <div className="fantasy-score-card">
          <span>Your rank</span>
          <strong>#{activeRow?.rank ?? "-"}</strong>
          <small>{activeRow?.totalPoints ?? 0} total points</small>
          <Link to="/fantasy/profile">Edit nickname <ArrowIcon /></Link>
        </div>
      </section>

      <section className="fantasy-stat-grid" aria-label="Fantasy summary">
        <article><span>Open picks</span><strong>{openQuestions.length}</strong><small>{nextMatch ? fantasyDeadlineLabel(nextMatch.pollCloseAt) : "No active polls"}</small></article>
        <article><span>Today</span><strong>{activeRow?.todayPoints ?? 0}</strong><small>points from scored polls</small></article>
        <article><span>Streak</span><strong>{activeRow?.streak ?? 0}</strong><small>correct winners in a row</small></article>
        <article><span>Badge</span><strong>{activeRow?.badges[0] ?? "None"}</strong><small>current fun title</small></article>
      </section>

      {nextMatch ? (
        <section className="fantasy-feature-match">
          <div className="section-heading">
            <div><span className="eyebrow">Next poll set</span><h2>{fantasyMatchTitle(nextMatch, data.teams)}</h2></div>
            <Link to="/fantasy/polls">Answer polls <ArrowIcon /></Link>
          </div>
          <div className="fantasy-match-panel">
            <div>
              <span>{nextMatch.stage} · {nextMatch.importance.replace("_", " ")}</span>
              <strong>{formatKickoff(nextMatch.kickoff)}</strong>
              <small>{formatDate(nextMatch.kickoff, true)} · locks {formatKickoff(nextMatch.pollCloseAt)}</small>
            </div>
            <div className="fantasy-question-preview">
              {nextQuestions.slice(0, 3).map((question) => {
                const prediction = fantasyPredictionForQuestion(question.id, data.activeParticipantId, data);
                return <span key={question.id}>{prediction ? "Picked" : "Open"} · {question.text}</span>;
              })}
            </div>
          </div>
          <div className="fantasy-squad-context">
            {[...homeCandidates, ...awayCandidates].map((player) => (
              <span key={player.id}>{player.name}<small>{fantasyTeamName(player.teamId, data.teams)} · {player.position}</small></span>
            ))}
          </div>
        </section>
      ) : (
        <section className="content-section fantasy-feature-match">
          <div className="section-heading">
            <div><span className="eyebrow">Next poll set</span><h2>No published polls yet</h2></div>
            <Link to="/fantasy/admin/polls">Open admin <ArrowIcon /></Link>
          </div>
          <p>Sync fixtures, generate drafts, then publish the first match polls.</p>
        </section>
      )}

      <div className="fantasy-columns">
        <section className="content-section">
          <div className="section-heading"><div><span className="eyebrow">Table</span><h2>Friends leaderboard</h2></div><Link to="/fantasy/leaderboard">Full table <TableIcon /></Link></div>
          <FantasyLeaderboard rows={data.leaderboard.slice(0, 3)} activeParticipantId={data.activeParticipantId} />
        </section>
        <section className="content-section fantasy-recap">
          <div className="section-heading"><div><span className="eyebrow">AI host</span><h2>Latest recap</h2></div><Link to="/fantasy/results">Results <TrophyIcon /></Link></div>
          <h3>{data.recaps[0]?.title}</h3>
          <p>{data.recaps[0]?.body}</p>
        </section>
      </div>

      <section className="quick-links fantasy-quick-links">
        <Link to="/fantasy/polls"><CalendarIcon /><span><strong>Upcoming polls</strong><small>Match questions and deadlines</small></span><ArrowIcon /></Link>
        <Link to="/fantasy/predictions"><TrophyIcon /><span><strong>My predictions</strong><small>Open, locked, and scored answers</small></span><ArrowIcon /></Link>
        <Link to="/fantasy/rules"><TableIcon /><span><strong>Scoring rules</strong><small>Points, locks, and edge cases</small></span><ArrowIcon /></Link>
      </section>
    </div>
  );
}
