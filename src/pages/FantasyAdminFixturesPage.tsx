import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { useFantasyFixtures, useSyncFantasyFixtures, useUpdateFantasyFixture } from "../services/fantasy-queries";
import type { FantasyMatch } from "../types/fantasy";
import { fantasyDeadlineLabel, fantasyMatchTitle } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";
import { PageHeading } from "../components/PageSections";

const importanceOptions: FantasyMatch["importance"][] = ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"];
const statusOptions: FantasyMatch["status"][] = ["SCHEDULED", "LOCKED", "COMPLETED"];

/**
 * Displays admin fixture controls for match importance and poll lock timing.
 *
 * @returns Admin fixtures page.
 */
export default function FantasyAdminFixturesPage() {
  const { data } = useFantasy();
  const fixturesQuery = useFantasyFixtures();
  const fixtures = fixturesQuery.data?.fixtures ?? data.matches;
  const [activeMatchId, setActiveMatchId] = useState(fixtures[0]?.id ?? "");
  const activeMatch = fixtures.find((match) => match.id === activeMatchId) ?? fixtures[0];
  const syncFixtures = useSyncFantasyFixtures(data.activeParticipantId);

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="Fixtures" description="Tune match importance and lock timing before AI drafts are generated." />
      <div className="fantasy-admin-fixtures">
        <aside className="content-section fantasy-match-list" aria-label="Fixtures">
          <div className="fantasy-squad-import">
            <strong>Live fixture data</strong>
            <p>Replace fantasy fixtures with the latest World Cup matches from the backend provider.</p>
            <button disabled={syncFixtures.isPending} onClick={() => syncFixtures.mutate()} type="button">
              {syncFixtures.isPending ? "Syncing..." : "Sync live fixtures"}
            </button>
            {syncFixtures.isSuccess && <p className="fantasy-success-note">Synced {syncFixtures.data.fixtures.length} fixtures.</p>}
            {syncFixtures.isError && <p role="alert">{syncFixtures.error.message}</p>}
          </div>
          {fixtures.map((match) => (
            <button className={match.id === activeMatch?.id ? "fantasy-match-button fantasy-match-button--active" : "fantasy-match-button"} key={match.id} onClick={() => setActiveMatchId(match.id)} type="button">
              <strong>{fantasyMatchTitle(match, data.teams)}</strong>
              <span>{match.importance.replace("_", " ")} · {formatKickoff(match.kickoff)}</span>
            </button>
          ))}
        </aside>
        {activeMatch && <FixtureEditor key={activeMatch.id} match={activeMatch} />}
      </div>
    </div>
  );
}

const FixtureEditor = ({ match }: { match: FantasyMatch }) => {
  const { data } = useFantasy();
  const updateFixture = useUpdateFantasyFixture(data.activeParticipantId);
  const [stage, setStage] = useState(match.stage);
  const [kickoff, setKickoff] = useState(match.kickoff);
  const [pollCloseAt, setPollCloseAt] = useState(match.pollCloseAt);
  const [importance, setImportance] = useState<FantasyMatch["importance"]>(match.importance);
  const [status, setStatus] = useState<FantasyMatch["status"]>(match.status);

  return (
    <section className="content-section fantasy-fixture-editor">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{status}</span>
          <h2>{fantasyMatchTitle(match, data.teams)}</h2>
          <p>{formatDate(kickoff, true)} · {fantasyDeadlineLabel(pollCloseAt)}</p>
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          updateFixture.mutate({ importance, kickoff, matchId: match.id, pollCloseAt, stage, status });
        }}
      >
        <label>
          Stage
          <input onChange={(event) => setStage(event.target.value)} value={stage} />
        </label>
        <label>
          Kickoff ISO
          <input onChange={(event) => setKickoff(event.target.value)} value={kickoff} />
        </label>
        <label>
          Poll close ISO
          <input onChange={(event) => setPollCloseAt(event.target.value)} value={pollCloseAt} />
        </label>
        <label>
          Importance
          <select onChange={(event) => setImportance(event.target.value as FantasyMatch["importance"])} value={importance}>
            {importanceOptions.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
          </select>
        </label>
        <label>
          Status
          <select onChange={(event) => setStatus(event.target.value as FantasyMatch["status"])} value={status}>
            {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <button className="button button--primary" disabled={updateFixture.isPending} type="submit">
          {updateFixture.isPending ? "Saving..." : "Save fixture"}
        </button>
      </form>
      {updateFixture.isError && <p role="alert">{updateFixture.error.message}</p>}
      {updateFixture.isSuccess && <p className="fantasy-success-note">Fixture saved for {fantasyMatchTitle(updateFixture.data.fixture, data.teams)}.</p>}
    </section>
  );
};
