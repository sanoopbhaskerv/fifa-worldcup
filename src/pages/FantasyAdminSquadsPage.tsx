import { useMemo, useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { LabeledCheckbox, LabeledInput, LabeledSelect } from "../components/FormFields";
import { ErrorMessage, SuccessMessage } from "../components/FeedbackMessages";
import { useFantasySquads, useImportFantasySquads, useSeedFantasyWorldCupSquads, useUpdateFantasySquadPlayer, useUpdateFantasyTeam } from "../services/fantasy-queries";
import type { FantasySquadPlayer, FantasyTeam } from "../types/fantasy";
import { fantasyTeamName } from "../utils/fantasy";
import { PageHeading } from "../components/PageSections";

const positionOptions: FantasySquadPlayer["position"][] = ["GK", "DEF", "MID", "FWD"];
const importPlaceholder = `teamName,fifaCode,group,playerName,position,shirtNumber,scorer,star,motm,boot,glove
Brazil,BRA,Group D,Vinicius Jr,FWD,7,true,true,true,true,false
Brazil,BRA,Group D,Alisson,GK,1,false,false,false,false,true`;

/**
 * Displays World Cup team and squad-player reference data for admin review and edits.
 *
 * @returns Admin teams and squads page.
 */
export default function FantasyAdminSquadsPage() {
  const { data } = useFantasy();
  const squadsQuery = useFantasySquads();
  const teams = squadsQuery.data?.teams ?? data.teams;
  const squadPlayers = squadsQuery.data?.squadPlayers ?? data.squadPlayers;
  const [activeTeamId, setActiveTeamId] = useState(teams[0]?.id ?? "");
  const [activePlayerId, setActivePlayerId] = useState("");
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? teams[0];
  const players = useMemo(
    () => squadPlayers.filter((player) => player.teamId === activeTeam?.id),
    [activeTeam?.id, squadPlayers],
  );
  const activePlayer = players.find((player) => player.id === activePlayerId) ?? players[0];

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="Teams and squads" description="Import and tune World Cup squad data that grounds AI poll options. These records are reference data, not user-owned fantasy squads." />
      <section className="fantasy-squad-admin">
        <aside className="content-section fantasy-team-list" aria-label="World Cup teams">
          {teams.map((team) => (
            <button
              className={team.id === activeTeam?.id ? "fantasy-team-button fantasy-team-button--active" : "fantasy-team-button"}
              key={team.id}
              onClick={() => {
                setActiveTeamId(team.id);
                setActivePlayerId("");
              }}
              type="button"
            >
              <strong>{team.name}</strong>
              <span>{team.group} · {team.fifaCode}</span>
            </button>
          ))}
          <SquadImportPanel />
        </aside>
        <div className="fantasy-squad-detail">
          {activeTeam && <TeamEditor key={activeTeam.id} team={activeTeam} />}
          <section className="content-section fantasy-squad-table">
            <div className="section-heading">
              <div><span className="eyebrow">{activeTeam?.fifaCode}</span><h2>{activeTeam?.name} squad</h2></div>
              <strong>{players.length} players</strong>
            </div>
            <div className="fantasy-player-grid">
              {players.map((player) => (
                <button
                  className={player.id === activePlayer?.id ? "fantasy-player-card fantasy-player-card--active" : "fantasy-player-card"}
                  key={player.id}
                  onClick={() => setActivePlayerId(player.id)}
                  type="button"
                >
                  <div>
                    <strong>{player.name}</strong>
                    <span>#{player.shirtNumber ?? "-"} · {player.position} · {fantasyTeamName(player.teamId, teams)}</span>
                  </div>
                  <div className="fantasy-candidate-flags">
                    {player.isScorerCandidate && <em>Scorer</em>}
                    {player.isStarCandidate && <em>Star</em>}
                    {player.isMotmCandidate && <em>MOTM</em>}
                    {player.isGoldenBootCandidate && <em>Boot</em>}
                    {player.isGoldenGloveCandidate && <em>Glove</em>}
                  </div>
                </button>
              ))}
            </div>
          </section>
          {activePlayer && <PlayerEditor key={activePlayer.id} player={activePlayer} teams={teams} />}
        </div>
      </section>
      {squadsQuery.isError && <ErrorMessage>{squadsQuery.error.message}</ErrorMessage>}
    </div>
  );
}

const SquadImportPanel = () => {
  const { data } = useFantasy();
  const importSquads = useImportFantasySquads(data.activeParticipantId);
  const seedSquads = useSeedFantasyWorldCupSquads(data.activeParticipantId);
  const [source, setSource] = useState("");

  return (
    <section className="fantasy-squad-import" aria-label="Squad import">
      <strong>Bundled World Cup data</strong>
      <p>Upload the checked-in 48-team, 1248-player World Cup squad reference set into backend storage.</p>
      <button disabled={seedSquads.isPending} onClick={() => seedSquads.mutate()} type="button">
        {seedSquads.isPending ? "Uploading..." : "Upload bundled squads"}
      </button>
      {seedSquads.isError && <ErrorMessage>{seedSquads.error.message}</ErrorMessage>}
      {seedSquads.isSuccess && <SuccessMessage>Uploaded {seedSquads.data.teams.length} teams and {seedSquads.data.squadPlayers.length} players.</SuccessMessage>}
      <strong>Import data</strong>
      <p>Paste CSV rows or JSON with squadPlayers. Imported teams replace only their own players.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          importSquads.mutate({ source }, { onSuccess: () => setSource("") });
        }}
      >
        <textarea onChange={(event) => setSource(event.target.value)} placeholder={importPlaceholder} value={source} />
        <button disabled={importSquads.isPending || source.trim().length === 0} type="submit">
          {importSquads.isPending ? "Importing..." : "Import squads"}
        </button>
      </form>
      {importSquads.isError && <ErrorMessage>{importSquads.error.message}</ErrorMessage>}
      {importSquads.isSuccess && <SuccessMessage>Imported {importSquads.data.squadPlayers.length} players.</SuccessMessage>}
    </section>
  );
};

const TeamEditor = ({ team }: { team: FantasyTeam }) => {
  const { data } = useFantasy();
  const updateTeam = useUpdateFantasyTeam(data.activeParticipantId);
  const [name, setName] = useState(team.name);
  const [fifaCode, setFifaCode] = useState(team.fifaCode);
  const [group, setGroup] = useState(team.group);
  const [rankingSeed, setRankingSeed] = useState(String(team.rankingSeed ?? ""));

  return (
    <section className="content-section fantasy-team-editor">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Team</span>
          <h2>{team.name}</h2>
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          updateTeam.mutate({
            fifaCode,
            group,
            name,
            rankingSeed: rankingSeed ? Number(rankingSeed) : undefined,
            teamId: team.id,
          });
        }}
      >
        <LabeledInput label="Team name" onChange={setName} value={name} />
        <LabeledInput label="FIFA code" maxLength={3} onChange={(value) => setFifaCode(value.toUpperCase())} value={fifaCode} />
        <LabeledInput label="Group" onChange={setGroup} value={group} />
        <LabeledInput label="Ranking seed" min="1" onChange={setRankingSeed} type="number" value={rankingSeed} />
        <button className="button button--primary" disabled={updateTeam.isPending} type="submit">
          {updateTeam.isPending ? "Saving..." : "Save team"}
        </button>
      </form>
      {updateTeam.isError && <ErrorMessage>{updateTeam.error.message}</ErrorMessage>}
      {updateTeam.isSuccess && <SuccessMessage>Team saved.</SuccessMessage>}
    </section>
  );
};

const PlayerEditor = ({ player, teams }: { player: FantasySquadPlayer; teams: FantasyTeam[] }) => {
  const { data } = useFantasy();
  const updatePlayer = useUpdateFantasySquadPlayer(data.activeParticipantId);
  const [teamId, setTeamId] = useState(player.teamId);
  const [name, setName] = useState(player.name);
  const [position, setPosition] = useState<FantasySquadPlayer["position"]>(player.position);
  const [shirtNumber, setShirtNumber] = useState(String(player.shirtNumber ?? ""));
  const [flags, setFlags] = useState({
    isGoldenBootCandidate: player.isGoldenBootCandidate,
    isGoldenGloveCandidate: player.isGoldenGloveCandidate,
    isMotmCandidate: player.isMotmCandidate,
    isScorerCandidate: player.isScorerCandidate,
    isStarCandidate: player.isStarCandidate,
  });
  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }));
  const positionSelectOptions = positionOptions.map((option) => ({ value: option, label: option }));

  const updateFlag = (flag: keyof typeof flags, checked: boolean) => setFlags((current) => ({ ...current, [flag]: checked }));

  return (
    <section className="content-section fantasy-player-editor">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Player</span>
          <h2>{player.name}</h2>
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          updatePlayer.mutate({
            ...flags,
            name,
            playerId: player.id,
            position,
            shirtNumber: shirtNumber ? Number(shirtNumber) : undefined,
            teamId,
          });
        }}
      >
        <LabeledInput label="Player name" onChange={setName} value={name} />
        <LabeledSelect label="Team" onChange={setTeamId} options={teamOptions} value={teamId} />
        <LabeledSelect
          label="Position"
          onChange={(value: string) => setPosition(value as FantasySquadPlayer["position"])}
          options={positionSelectOptions}
          value={position}
        />
        <LabeledInput label="Shirt number" min="1" onChange={setShirtNumber} type="number" value={shirtNumber} />
        <div className="fantasy-flag-editor">
          {[
            ["isScorerCandidate", "Scorer"],
            ["isStarCandidate", "Star"],
            ["isMotmCandidate", "MOTM"],
            ["isGoldenBootCandidate", "Boot"],
            ["isGoldenGloveCandidate", "Glove"],
          ].map(([flag, label]) => (
            <LabeledCheckbox
              checked={flags[flag as keyof typeof flags]}
              key={flag}
              label={label}
              onChange={(checked) => updateFlag(flag as keyof typeof flags, checked)}
            />
          ))}
        </div>
        <button className="button button--primary" disabled={updatePlayer.isPending} type="submit">
          {updatePlayer.isPending ? "Saving..." : "Save player"}
        </button>
      </form>
      {updatePlayer.isError && <ErrorMessage>{updatePlayer.error.message}</ErrorMessage>}
      {updatePlayer.isSuccess && <SuccessMessage>Player saved.</SuccessMessage>}
    </section>
  );
};
