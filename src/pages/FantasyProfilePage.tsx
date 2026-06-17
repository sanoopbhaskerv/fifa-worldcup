import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { useUpdateFantasyParticipant } from "../services/fantasy-queries";
import { storage } from "../utils/storage";
import { PageHeading } from "./FixturesPage";

/**
 * Displays the active fantasy participant profile editor.
 *
 * @returns Profile editing page.
 */
export default function FantasyProfilePage() {
  const { data } = useFantasy();
  const participant = data.participants.find((item) => item.id === data.activeParticipantId);
  const updateParticipant = useUpdateFantasyParticipant(data.activeParticipantId);
  const [name, setName] = useState(participant?.name ?? "");
  const [nickname, setNickname] = useState(participant?.nickname ?? "");
  const [favoriteTeamId, setFavoriteTeamId] = useState(participant?.favoriteTeamId ?? data.teams[0]?.id ?? "");

  if (!participant) {
    return (
      <div className="page fantasy-page">
        <PageHeading eyebrow="Profile" title="Player not found" description="Choose or create a player again from the fantasy entry screen." />
      </div>
    );
  }

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Profile" title="Display name" description="Edit how your name appears in polls, predictions, and the friends leaderboard." />
      <section className="content-section fantasy-profile-editor">
        <div className="section-heading">
          <div><span className="eyebrow">{participant.avatar ?? "P"}</span><h2>{participant.nickname}</h2></div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            updateParticipant.mutate({
              favoriteTeamId,
              name,
              nickname,
              participantId: participant.id,
            }, {
              onSuccess: ({ participant: updated }) => {
                storage.setFantasyIdentity({ participantId: updated.id, nickname: updated.nickname });
              },
            });
          }}
        >
          <label>
            Name
            <input onChange={(event) => setName(event.target.value)} value={name} />
          </label>
          <label>
            Display name
            <input onChange={(event) => setNickname(event.target.value)} value={nickname} />
          </label>
          <label>
            Favorite team
            <select onChange={(event) => setFavoriteTeamId(event.target.value)} value={favoriteTeamId}>
              {data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
          <button className="button button--primary" disabled={updateParticipant.isPending || !name.trim() || !nickname.trim()} type="submit">
            {updateParticipant.isPending ? "Saving..." : "Save profile"}
          </button>
        </form>
        {updateParticipant.isSuccess && <p className="fantasy-success-note">Profile saved.</p>}
        {updateParticipant.isError && <p role="alert">{updateParticipant.error.message}</p>}
      </section>
    </div>
  );
}
