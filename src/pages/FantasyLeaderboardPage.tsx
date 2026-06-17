import { useFantasy } from "../app/fantasy-context";
import { FantasyLeaderboard } from "../features/fantasy/FantasyLeaderboard";
import { PageHeading } from "./FixturesPage";

/**
 * Displays the full friends-league leaderboard and awards.
 *
 * @returns Leaderboard page.
 */
export default function FantasyLeaderboardPage() {
  const { data } = useFantasy();

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Friends league" title="Leaderboard" description="Rank movement, daily points, streaks, and friendly awards keep the group checking back." />
      <FantasyLeaderboard rows={data.leaderboard} activeParticipantId={data.activeParticipantId} />
      <section className="content-section fantasy-awards">
        <div className="section-heading"><div><span className="eyebrow">Today</span><h2>Fun awards</h2></div></div>
        <div className="fantasy-award-grid">
          {data.badges.map((badge) => {
            const participant = data.participants.find((item) => item.id === badge.participantId);
            return <article key={badge.id}><strong>{badge.label}</strong><span>{participant?.nickname}</span><p>{badge.reason}</p></article>;
          })}
        </div>
      </section>
    </div>
  );
}
