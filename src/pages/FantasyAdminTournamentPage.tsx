import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { useUpdateFantasyTournament } from "../services/fantasy-queries";
import type { FantasyTournament } from "../types/fantasy";
import { formatDate } from "../utils/football";
import { PageHeading } from "../components/PageSections";
import { SectionHeading } from "../components/SectionHeading";

const statusOptions: FantasyTournament["status"][] = ["UPCOMING", "LIVE", "COMPLETE"];

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
            <label>
              League name
              <input onChange={(event) => setName(event.target.value)} value={name} />
            </label>
            <label>
              Status
              <select onChange={(event) => setStatus(event.target.value as FantasyTournament["status"])} value={status}>
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>
              Start date
              <input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
            </label>
            <label>
              End date
              <input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
            </label>
            <label>
              Poll close minutes
              <input min="0" max="180" onChange={(event) => setPollCloseMinutesBeforeKickoff(event.target.value)} type="number" value={pollCloseMinutesBeforeKickoff} />
            </label>
            <label>
              Scoring rules version
              <input onChange={(event) => setScoringRulesVersion(event.target.value)} value={scoringRulesVersion} />
            </label>
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
