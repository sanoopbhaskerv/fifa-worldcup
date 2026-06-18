import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { useCreateFantasyUserPoll } from "../services/fantasy-queries";
import type { FantasyUserPollKind } from "../types/fantasy";
import { fantasyDeadlineLabel, fantasyMatchTitle, fantasyTeamName } from "../utils/fantasy";
import { fantasyUserPollDefinitions, fantasyUserPollOptions } from "../utils/fantasy-user-polls";
import { formatDate, formatKickoff } from "../utils/football";
import { PageHeading } from "../components/PageSections";

/**
 * Displays the player-facing poll creation workflow.
 *
 * @returns Create poll page.
 */
export default function FantasyCreatePollPage() {
  const { data } = useFantasy();
  const createPoll = useCreateFantasyUserPoll(data.activeParticipantId);
  const [groupId, setGroupId] = useState(data.groups[0]?.id ?? "group-main");
  const upcomingMatches = data.matches
    .filter((match) => match.status === "SCHEDULED")
    .sort((left, right) => left.kickoff.localeCompare(right.kickoff));
  const [matchId, setMatchId] = useState(upcomingMatches[0]?.id ?? "");
  const [kind, setKind] = useState<FantasyUserPollKind>("MATCH_WINNER");
  const [selectedPlayerOptions, setSelectedPlayerOptions] = useState<string[]>([]);
  const activeMatch = upcomingMatches.find((match) => match.id === matchId) ?? upcomingMatches[0];
  const definition = fantasyUserPollDefinitions.find((item) => item.kind === kind) ?? fantasyUserPollDefinitions[0];
  const options = activeMatch ? fantasyUserPollOptions(activeMatch, kind, data) : [];
  const matchSquad = activeMatch
    ? data.squadPlayers.filter((player) => [activeMatch.homeTeamId, activeMatch.awayTeamId].includes(player.teamId))
    : [];
  const isPlayerPoll = definition.type === "PLAYER";
  const selectedOptions = isPlayerPoll && selectedPlayerOptions.length > 0 ? selectedPlayerOptions : undefined;
  const previewOptions = selectedOptions
    ? [
      ...selectedOptions,
      ...(kind === "FIRST_GOAL_SCORER" ? ["Own Goal", "No goal", "Other"] : ["Other"]),
    ].filter((option, index, values) => values.indexOf(option) === index)
    : options;

  const updateKind = (nextKind: FantasyUserPollKind) => {
    setKind(nextKind);
    setSelectedPlayerOptions([]);
  };

  const updateMatchId = (nextMatchId: string) => {
    setMatchId(nextMatchId);
    setSelectedPlayerOptions([]);
  };

  const togglePlayerOption = (playerName: string) => {
    setSelectedPlayerOptions((current) => (
      current.includes(playerName)
        ? current.filter((item) => item !== playerName)
        : [...current, playerName].slice(0, 12)
    ));
  };

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Create poll" title="Add a match poll" description="Pick an upcoming fixture and a poll type. Player options come from the stored World Cup squads." />
      <div className="fantasy-create-poll">
        <section className="content-section fantasy-user-poll-form">
          <div className="section-heading"><div><span className="eyebrow">Step 1</span><h2>Select match</h2></div></div>
          {upcomingMatches.length === 0 ? (
            <p>No upcoming synced fixtures are available for new polls.</p>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!activeMatch) return;
                createPoll.mutate({
                  groupId,
                  kind,
                  matchId: activeMatch.id,
                  options: selectedOptions,
                  participantId: data.activeParticipantId,
                });
              }}
            >
              <label>
                Group
                <select onChange={(event) => setGroupId(event.target.value)} value={groupId}>
                  {data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </label>
              <label>
                Match
                <select onChange={(event) => updateMatchId(event.target.value)} value={activeMatch?.id ?? ""}>
                  {upcomingMatches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {fantasyMatchTitle(match, data.teams)} · {formatKickoff(match.kickoff)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Poll
                <select onChange={(event) => updateKind(event.target.value as FantasyUserPollKind)} value={kind}>
                  {fantasyUserPollDefinitions.map((item) => (
                    <option key={item.kind} value={item.kind}>{item.label}</option>
                  ))}
                </select>
              </label>
              {activeMatch && (
                <div className="fantasy-create-match-summary">
                  <strong>{fantasyMatchTitle(activeMatch, data.teams)}</strong>
                  <span>{formatDate(activeMatch.kickoff, true)} · locks {fantasyDeadlineLabel(activeMatch.pollCloseAt)}</span>
                </div>
              )}
              <button className="button button--primary" disabled={createPoll.isPending || !activeMatch || (definition.type !== "EXACT_SCORE" && options.length < 2)} type="submit">
                {createPoll.isPending ? "Publishing..." : "Publish poll"}
              </button>
            </form>
          )}
          {createPoll.isSuccess && (
            <p className="fantasy-success-note">
              Poll published. <Link to="/fantasy/polls">View polls <ArrowIcon /></Link>
            </p>
          )}
          {createPoll.isError && <p role="alert">{createPoll.error.message}</p>}
        </section>

        <section className="content-section fantasy-user-poll-preview">
          <div className="section-heading">
            <div><span className="eyebrow">Step 2</span><h2>Preview options</h2></div>
            <strong>{definition.points} pts</strong>
          </div>
          <article className="fantasy-draft-card">
            <header>
              <span className="eyebrow">{kind.replaceAll("_", " ")}</span>
              <strong>{definition.type.replaceAll("_", " ")}</strong>
            </header>
            <h3>{definition.text}</h3>
            {definition.type === "EXACT_SCORE" ? (
              <div className="fantasy-score-preview">Free answer · 0-0 · Brazil 3 Germany 4</div>
            ) : (
              <div className="fantasy-draft-options">
                {previewOptions.map((option) => <span key={option}>{option}</span>)}
                {options.length === 0 && <span>No valid options for this poll type</span>}
              </div>
            )}
          </article>
          {isPlayerPoll && activeMatch && (
            <div className="fantasy-player-option-picker" aria-label="Player options">
              {matchSquad.filter((player) => kind === "FIRST_GOAL_SCORER" ? player.isScorerCandidate : player.isMotmCandidate).map((player) => (
                <label key={player.id}>
                  <input
                    checked={selectedPlayerOptions.includes(player.name)}
                    onChange={() => togglePlayerOption(player.name)}
                    type="checkbox"
                  />
                  <span>{player.name}<small>{fantasyTeamName(player.teamId, data.teams)} · {player.position}</small></span>
                </label>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
