import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { useCreateFantasyParticipant, useFantasyParticipants } from "../services/fantasy-queries";
import type { FantasyAdminParticipant } from "../types/fantasy";
import { fantasyTeamName } from "../utils/fantasy";
import { PageHeading } from "./FixturesPage";

/**
 * Displays friend participant administration and invite codes.
 *
 * @returns Admin participants page.
 */
export default function FantasyAdminParticipantsPage() {
  const { data } = useFantasy();
  const participantsQuery = useFantasyParticipants();
  const createParticipant = useCreateFantasyParticipant(data.activeParticipantId);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [favoriteTeamId, setFavoriteTeamId] = useState(data.teams[0]?.id ?? "");
  const rows: FantasyAdminParticipant[] = participantsQuery.data?.participants ?? data.participants.map((participant) => ({ ...participant }));

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="Participants" description="Manage your friends list and share invite codes. First release uses invite identity instead of Cognito." />
      <div className="fantasy-participants-admin">
        <section className="content-section fantasy-participant-create">
          <div className="section-heading"><div><span className="eyebrow">Invite friend</span><h2>Add participant</h2></div></div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createParticipant.mutate(
                { favoriteTeamId, name, nickname },
                {
                  onSuccess: () => {
                    setName("");
                    setNickname("");
                  },
                },
              );
            }}
          >
            <label>
              Name
              <input onChange={(event) => setName(event.target.value)} placeholder="Friend name" value={name} />
            </label>
            <label>
              Nickname
              <input onChange={(event) => setNickname(event.target.value)} placeholder="Leaderboard nickname" value={nickname} />
            </label>
            <label>
              Favorite team
              <select onChange={(event) => setFavoriteTeamId(event.target.value)} value={favoriteTeamId}>
                {data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <button className="button button--primary" disabled={createParticipant.isPending || !name.trim() || !nickname.trim()} type="submit">
              {createParticipant.isPending ? "Creating..." : "Create invite"}
            </button>
          </form>
          {createParticipant.isError && <p role="alert">{createParticipant.error.message}</p>}
          {createParticipant.isSuccess && <p className="fantasy-success-note">Invite created: {createParticipant.data.invite.inviteCode}</p>}
        </section>
        <section className="content-section fantasy-participant-list">
          <div className="section-heading"><div><span className="eyebrow">Friends</span><h2>{rows.length} participants</h2></div></div>
          <div className="fantasy-participant-rows">
            {rows.map((participant) => {
              const predictionCount = data.predictions.filter((prediction) => prediction.participantId === participant.id).length;
              return (
                <article className="fantasy-participant-row" key={participant.id}>
                  <span>{participant.avatar ?? participant.nickname.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{participant.nickname}</strong>
                    <small>{participant.name} · {fantasyTeamName(participant.favoriteTeamId, data.teams)} · {predictionCount} picks</small>
                  </div>
                  <code>{participant.invite?.inviteCode ?? "No invite"}</code>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
