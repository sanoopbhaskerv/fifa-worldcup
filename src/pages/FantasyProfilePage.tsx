import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { useChangeFantasyPassword, useUpdateFantasyParticipant } from "../services/fantasy-queries";
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
  const changePassword = useChangeFantasyPassword(data.activeParticipantId);
  const [name, setName] = useState(participant?.name ?? "");
  const [nickname, setNickname] = useState(participant?.nickname ?? "");
  const [emailOrPhone, setEmailOrPhone] = useState(participant?.email ?? participant?.phone ?? "");
  const [favoriteTeamId, setFavoriteTeamId] = useState(participant?.favoriteTeamId ?? data.teams[0]?.id ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
              emailOrPhone,
              name,
              nickname,
              participantId: participant.id,
            }, {
              onSuccess: ({ participant: updated }) => {
                storage.setFantasyIdentity({ email: updated.email, participantId: updated.id, nickname: updated.nickname, phone: updated.phone, role: updated.role });
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
            Email or phone
            <input autoComplete="username" onChange={(event) => setEmailOrPhone(event.target.value)} placeholder="you@example.com" value={emailOrPhone} />
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
      <section className="content-section fantasy-profile-editor">
        <div className="section-heading">
          <div><span className="eyebrow">Security</span><h2>{participant.passwordChangedAt ? "Change password" : "Set password"}</h2></div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            changePassword.mutate({
              currentPassword,
              newPassword,
              participantId: participant.id,
            }, {
              onSuccess: () => {
                setCurrentPassword("");
                setNewPassword("");
              },
            });
          }}
        >
          {participant.passwordChangedAt && (
            <label>
              Current password
              <input autoComplete="current-password" onChange={(event) => setCurrentPassword(event.target.value)} type="password" value={currentPassword} />
            </label>
          )}
          <label>
            New password
            <input autoComplete="new-password" onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" type="password" value={newPassword} />
          </label>
          <button className="button button--primary" disabled={changePassword.isPending || newPassword.length < 8 || (Boolean(participant.passwordChangedAt) && currentPassword.length === 0)} type="submit">
            {changePassword.isPending ? "Saving..." : participant.passwordChangedAt ? "Change password" : "Set password"}
          </button>
        </form>
        {changePassword.isSuccess && <p className="fantasy-success-note">Password updated.</p>}
        {changePassword.isError && <p role="alert">{changePassword.error.message}</p>}
      </section>
    </div>
  );
}
