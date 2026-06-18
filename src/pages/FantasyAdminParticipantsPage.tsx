import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { useCreateFantasyParticipant, useFantasyGroups, useFantasyParticipants, useSaveFantasyGroup, useUpdateFantasyParticipantCredentials, useUpdateFantasyParticipantRole } from "../services/fantasy-queries";
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
  const groupsQuery = useFantasyGroups();
  const createParticipant = useCreateFantasyParticipant(data.activeParticipantId);
  const updateRole = useUpdateFantasyParticipantRole(data.activeParticipantId);
  const updateCredentials = useUpdateFantasyParticipantCredentials(data.activeParticipantId);
  const saveGroup = useSaveFantasyGroup(data.activeParticipantId);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [favoriteTeamId, setFavoriteTeamId] = useState(data.teams[0]?.id ?? "");
  const [temporaryPasswords, setTemporaryPasswords] = useState<Record<string, string>>({});
  const [activeGroupId, setActiveGroupId] = useState(data.groups[0]?.id ?? "");
  const activeGroup = data.groups.find((group) => group.id === activeGroupId);
  const [groupName, setGroupName] = useState(activeGroup?.name ?? "");
  const [groupDescription, setGroupDescription] = useState(activeGroup?.description ?? "");
  const [groupParticipantIds, setGroupParticipantIds] = useState<string[]>(() =>
    data.groupMemberships.filter((membership) => membership.groupId === activeGroupId && membership.status === "ACTIVE").map((membership) => membership.participantId),
  );
  const rows: FantasyAdminParticipant[] = participantsQuery.data?.participants ?? data.participants.map((participant) => ({ ...participant }));
  const groupRows = groupsQuery.data?.groups ?? data.groups;

  const selectGroup = (groupId: string) => {
    const group = data.groups.find((item) => item.id === groupId);
    setActiveGroupId(groupId);
    setGroupName(group?.name ?? "");
    setGroupDescription(group?.description ?? "");
    setGroupParticipantIds(data.groupMemberships.filter((membership) => membership.groupId === groupId && membership.status === "ACTIVE").map((membership) => membership.participantId));
  };

  const toggleGroupParticipant = (participantId: string) => {
    setGroupParticipantIds((current) => (
      current.includes(participantId)
        ? current.filter((item) => item !== participantId)
        : [...current, participantId]
    ));
  };

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
                    <small>{participant.name} · {participant.id} · {participant.role ?? "PLAYER"} · {fantasyTeamName(participant.favoriteTeamId, data.teams)} · {predictionCount} picks</small>
                    {(participant.email || participant.phone) && <small>{participant.email ?? participant.phone}</small>}
                    {participant.temporaryPasswordSetAt && <small>Temporary password set {new Date(participant.temporaryPasswordSetAt).toLocaleString()}</small>}
                  </div>
                  <div className="fantasy-participant-actions">
                    <code>{participant.invite?.inviteCode ?? "No invite"}</code>
                    <button
                      disabled={updateCredentials.isPending && updateCredentials.variables?.participantId === participant.id}
                      onClick={() => updateCredentials.mutate({ participantId: participant.id, resetInvite: true })}
                      type="button"
                    >
                      Issue new invite
                    </button>
                    <button
                      disabled={updateRole.isPending && updateRole.variables?.participantId === participant.id}
                      onClick={() => updateRole.mutate({ participantId: participant.id, role: participant.role === "ADMIN" ? "PLAYER" : "ADMIN" })}
                      type="button"
                    >
                      {participant.role === "ADMIN" ? "Remove admin" : "Make admin"}
                    </button>
                    <form
                      className="fantasy-temp-password-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        updateCredentials.mutate(
                          { participantId: participant.id, temporaryPassword: temporaryPasswords[participant.id] ?? "" },
                          {
                            onSuccess: () => setTemporaryPasswords((current) => ({ ...current, [participant.id]: "" })),
                          },
                        );
                      }}
                    >
                      <input
                        aria-label={`Temporary password for ${participant.nickname}`}
                        autoComplete="new-password"
                        minLength={8}
                        onChange={(event) => setTemporaryPasswords((current) => ({ ...current, [participant.id]: event.target.value }))}
                        placeholder="Temporary password"
                        type="password"
                        value={temporaryPasswords[participant.id] ?? ""}
                      />
                      <button
                        disabled={
                          (updateCredentials.isPending && updateCredentials.variables?.participantId === participant.id) ||
                          (temporaryPasswords[participant.id] ?? "").length < 8
                        }
                        type="submit"
                      >
                        Set temporary
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
          {updateRole.isError && <p role="alert">{updateRole.error.message}</p>}
          {updateCredentials.isSuccess && updateCredentials.data.invite && <p className="fantasy-success-note">Invite updated: {updateCredentials.data.invite.inviteCode}</p>}
          {updateCredentials.isSuccess && !updateCredentials.data.invite && <p className="fantasy-success-note">Temporary password saved.</p>}
          {updateCredentials.isError && <p role="alert">{updateCredentials.error.message}</p>}
        </section>
        <section className="content-section fantasy-participant-list">
          <div className="section-heading"><div><span className="eyebrow">Poll groups</span><h2>{groupRows.length} groups</h2></div></div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveGroup.mutate({
                groupId: activeGroupId || undefined,
                name: groupName,
                description: groupDescription,
                participantIds: groupParticipantIds,
              });
            }}
          >
            <label>
              Existing group
              <select onChange={(event) => selectGroup(event.target.value)} value={activeGroupId}>
                <option value="">Create new group</option>
                {groupRows.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
            <label>
              Group name
              <input onChange={(event) => setGroupName(event.target.value)} placeholder="Weekend crew" value={groupName} />
            </label>
            <label>
              Description
              <input onChange={(event) => setGroupDescription(event.target.value)} placeholder="Optional note" value={groupDescription} />
            </label>
            <div className="fantasy-player-option-picker" aria-label="Group members">
              {rows.map((participant) => (
                <label key={participant.id}>
                  <input
                    checked={groupParticipantIds.includes(participant.id)}
                    onChange={() => toggleGroupParticipant(participant.id)}
                    type="checkbox"
                  />
                  <span>{participant.nickname}<small>{participant.id}</small></span>
                </label>
              ))}
            </div>
            <button className="button button--primary" disabled={saveGroup.isPending || !groupName.trim() || groupParticipantIds.length === 0} type="submit">
              {saveGroup.isPending ? "Saving..." : activeGroupId ? "Update group" : "Create group"}
            </button>
          </form>
          {saveGroup.isSuccess && <p className="fantasy-success-note">Group saved: {saveGroup.data.group.name}</p>}
          {saveGroup.isError && <p role="alert">{saveGroup.error.message}</p>}
        </section>
      </div>
    </div>
  );
}
