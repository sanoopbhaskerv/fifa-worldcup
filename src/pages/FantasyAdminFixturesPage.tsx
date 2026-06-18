import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { useFantasyFixtures, useSyncFantasyFixtures, useUpdateFantasyFixture } from "../services/fantasy-queries";
import type { FantasyMatch } from "../types/fantasy";
import { fantasyDeadlineLabel, fantasyMatchTitle } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";
import { LabeledInput, LabeledSelect } from "../components/FormFields";
import { PageHeading } from "../components/PageSections";
import { SectionHeading } from "../components/SectionHeading";

const importanceOptions: FantasyMatch["importance"][] = ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"];
const statusOptions: FantasyMatch["status"][] = ["SCHEDULED", "LOCKED", "COMPLETED"];
const importanceSelectOptions = importanceOptions.map((option) => ({
  value: option,
  label: option.replace("_", " "),
}));
const statusSelectOptions = statusOptions.map((option) => ({
  value: option,
  label: option,
}));

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
      <SectionHeading
        eyebrow={status}
        title={fantasyMatchTitle(match, data.teams)}
        description={`${formatDate(kickoff, true)} · ${fantasyDeadlineLabel(pollCloseAt)}`}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          updateFixture.mutate({ importance, kickoff, matchId: match.id, pollCloseAt, stage, status });
        }}
      >
        <LabeledInput label="Stage" value={stage} onChange={setStage} />
        <LabeledInput label="Kickoff ISO" value={kickoff} onChange={setKickoff} />
        <LabeledInput label="Poll close ISO" value={pollCloseAt} onChange={setPollCloseAt} />
        <LabeledSelect
          label="Importance"
          value={importance}
          onChange={(value: string) => setImportance(value as FantasyMatch["importance"])}
          options={importanceSelectOptions}
        />
        <LabeledSelect
          label="Status"
          value={status}
          onChange={(value: string) => setStatus(value as FantasyMatch["status"])}
          options={statusSelectOptions}
        />
        <button className="button button--primary" disabled={updateFixture.isPending} type="submit">
          {updateFixture.isPending ? "Saving..." : "Save fixture"}
        </button>
      </form>
      {updateFixture.isError && <p role="alert">{updateFixture.error.message}</p>}
      {updateFixture.isSuccess && <p className="fantasy-success-note">Fixture saved for {fantasyMatchTitle(updateFixture.data.fixture, data.teams)}.</p>}
    </section>
  );
};
