import { Link } from "react-router-dom";
import { ArrowIcon, CalendarIcon, TableIcon, TrophyIcon } from "../components/Icons";
import { fantasyGameData } from "../mocks/fantasy";
import { storage } from "../utils/storage";
import { fantasyDeadlineLabel, fantasyOpenQuestions } from "../utils/fantasy";

const footballDestination = () => {
  const stored = storage.getSelection();
  return stored ? `/competitions/${stored.competitionSlug}/${stored.editionId}` : "/competitions/world-cup/2026";
};

/**
 * Displays the app launcher for fantasy and football browsing.
 *
 * @returns Minimal home page with product-area tiles.
 */
export default function HomePage() {
  const openQuestions = fantasyOpenQuestions(fantasyGameData);
  const activeRow = fantasyGameData.leaderboard.find((row) => row.participantId === fantasyGameData.activeParticipantId);
  const nextMatch = fantasyGameData.matches.find((match) => match.status === "SCHEDULED");
  const footballPath = footballDestination();

  return (
    <main className="home-shell">
      <header className="home-header">
        <Link className="brand" to="/"><span className="brand__mark">F</span><span>FULL TIME</span></Link>
        <p>Football scores and a friends prediction game in one place.</p>
      </header>

      <section className="home-launch-grid" aria-label="Choose an area">
        <Link className="home-tile home-tile--fantasy" to="/fantasy">
          <div className="home-tile__top">
            <span className="eyebrow">Fantasy prediction game</span>
            <TrophyIcon />
          </div>
          <h1>{fantasyGameData.tournament.name}</h1>
          <p>Answer World Cup polls, track your rank, and let the AI host keep the banter moving.</p>
          <dl className="home-tile__stats">
            <div><dt>Open polls</dt><dd>{openQuestions.length}</dd></div>
            <div><dt>Next lock</dt><dd>{nextMatch ? fantasyDeadlineLabel(nextMatch.pollCloseAt).replace(" lock", "") : "None"}</dd></div>
            <div><dt>Your rank</dt><dd>#{activeRow?.rank ?? "-"}</dd></div>
          </dl>
          <span className="home-tile__cta">Open fantasy <ArrowIcon /></span>
        </Link>

        <Link className="home-tile home-tile--football" to={footballPath}>
          <div className="home-tile__top">
            <span className="eyebrow">Football competitions</span>
            <CalendarIcon />
          </div>
          <h2>World Cup and live football</h2>
          <p>Browse fixtures, results, standings, scorers, brackets, and match centres.</p>
          <dl className="home-tile__stats">
            <div><dt>Default</dt><dd>WC 2026</dd></div>
            <div><dt>Sections</dt><dd>6</dd></div>
            <div><dt>Data</dt><dd>Live/demo</dd></div>
          </dl>
          <span className="home-tile__cta">Browse football <ArrowIcon /></span>
        </Link>
      </section>

      <section className="home-mini-row" aria-label="Shortcuts">
        <Link to="/fantasy/polls"><CalendarIcon /><span><strong>Polls</strong><small>Answer before lock</small></span></Link>
        <Link to="/fantasy/leaderboard"><TableIcon /><span><strong>Leaderboard</strong><small>Friends ranking</small></span></Link>
        <Link to="/fantasy/admin/results"><TrophyIcon /><span><strong>Admin</strong><small>Result review</small></span></Link>
      </section>
    </main>
  );
}
