import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { useUpdateFantasyTournament } from "../services/fantasy-queries";
import type { FantasyTournament } from "../types/fantasy";
import { formatDate } from "../utils/football";
import { LabeledInput, LabeledSelect } from "../components/FormFields";
import { PageHeading } from "../components/PageSections";
import { SectionHeading } from "../components/SectionHeading";

const statusOptions: FantasyTournament["status"][] = ["UPCOMING", "LIVE", "COMPLETE"];
const statusSelectOptions = statusOptions.map((option) => ({ value: option, label: option }));

/**
 * Displays tournament-level admin setup for the private friends league.
 *
 * @returns Admin tournament setup page.
 */
export default function FantasyAdminTournamentPage() {
  const { data } = useFantasy();
  const { tournament } = data;
  const updateTournament = useUpdateFantasyTournament(data.activeParticipantId);
  const [name, setName] = useState(tournament.name);
  const [startDate, setStartDate] = useState(tournament.startDate);
  const [endDate, setEndDate] = useState(tournament.endDate);
  const [status, setStatus] = useState<FantasyTournament["status"]>(tournament.status);
  const [pollCloseMinutesBeforeKickoff, setPollCloseMinutesBeforeKickoff] = useState(String(tournament.pollCloseMinutesBeforeKickoff));
  const [scoringRulesVersion, setScoringRulesVersion] = useState(tournament.scoringRulesVersion);

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="Tournament setup" description="Control the league shell, default lock rule, and scoring version before fixtures and polls are finalized." />
      <div className="fantasy-tournament-admin">
        <section className="content-section fantasy-tournament-summary">
          <SectionHeading
            eyebrow={tournament.editionId}
            title={tournament.name}
            description={`${formatDate(tournament.startDate, true)} to ${formatDate(tournament.endDate, true)}`}
          />
          <div className="fantasy-review-summary">
            <article><span>Status</span><strong>{tournament.status}</strong></article>
            <article><span>Players</span><strong>{data.participants.length}</strong></article>
            <article><span>Matches</span><strong>{data.matches.length}</strong></article>
          </div>
          <div className="fantasy-admin-note">
            <p>Default poll closure applies to new setup decisions. Existing fixtures keep their own lock time until edited from Fixtures.</p>
          </div>
        </section>
        <section className="content-section fantasy-tournament-editor">
          <SectionHeading
            eyebrow={tournament.competitionId}
            title="League controls"
            description={`Current scoring model: ${tournament.scoringRulesVersion}`}
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              updateTournament.mutate({
                endDate,
                name,
                pollCloseMinutesBeforeKickoff: Number(pollCloseMinutesBeforeKickoff),
                scoringRulesVersion,
                startDate,
                status,
              });
            }}
          >
              <LabeledInput label="League name" value={name} onChange={setName} />
              <LabeledSelect
                label="Status"
                value={status}
                onChange={(value: string) => setStatus(value as FantasyTournament["status"])}
                options={statusSelectOptions}
              />
              <LabeledInput label="Start date" value={startDate} onChange={setStartDate} type="date" />
              <LabeledInput label="End date" value={endDate} onChange={setEndDate} type="date" />
              <LabeledInput
                label="Poll close minutes"
                value={pollCloseMinutesBeforeKickoff}
                onChange={setPollCloseMinutesBeforeKickoff}
                type="number"
                min="0"
                max="180"
              />
              <LabeledInput
                label="Scoring rules version"
                value={scoringRulesVersion}
                onChange={setScoringRulesVersion}
              />
            <button className="button button--primary" disabled={updateTournament.isPending} type="submit">
              {updateTournament.isPending ? "Saving..." : "Save tournament"}
            </button>
          </form>
          {updateTournament.isError && <p role="alert">{updateTournament.error.message}</p>}
          {updateTournament.isSuccess && <p className="fantasy-success-note">Tournament setup saved.</p>}
        </section>
      </div>
    </div>
  );
}
