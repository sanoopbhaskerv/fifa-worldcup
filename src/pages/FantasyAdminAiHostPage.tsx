import { useMemo, useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { ErrorMessage, SuccessMessage } from "../components/FeedbackMessages";
import { LabeledSelect } from "../components/FormFields";
import { PageHeading } from "../components/PageSections";
import { SectionHeading } from "../components/SectionHeading";
import { useDiscardFantasyAiMessage, useDraftFantasyAiMessage, useFantasyAiMessages, usePublishFantasyAiMessage, useRegenerateFantasyAiMessage, useTestFantasyAiProvider, useUpdateFantasyAiMessage } from "../services/fantasy-queries";
import type { FantasyAiMessage, FantasyAiMessageType } from "../types/fantasy";
import { fantasyMatchTitle } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";

const messageTypeOptions: Array<{ value: FantasyAiMessageType; label: string }> = [
  { value: "REMINDER", label: "Poll reminder" },
  { value: "RECAP", label: "Match recap" },
  { value: "LEADERBOARD_SUMMARY", label: "Leaderboard pulse" },
];

/**
 * Manages zero-cost AI host message drafts and publishing.
 *
 * @returns Admin page for AI host message generation.
 */
export default function FantasyAdminAiHostPage() {
  const { data } = useFantasy();
  const messagesQuery = useFantasyAiMessages();
  const draftMessage = useDraftFantasyAiMessage(data.activeParticipantId);
  const testProvider = useTestFantasyAiProvider(data.activeParticipantId);
  const [type, setType] = useState<FantasyAiMessageType>("REMINDER");
  const [groupId, setGroupId] = useState(data.groups[0]?.id ?? "group-main");
  const [matchId, setMatchId] = useState(data.matches.find((match) => match.status !== "COMPLETED")?.id ?? data.matches[0]?.id ?? "");
  const groupOptions = data.groups.map((group) => ({ value: group.id, label: group.name }));
  const matchOptions = data.matches.map((match) => ({
    value: match.id,
    label: `${fantasyMatchTitle(match, data.teams)} - ${formatDate(match.kickoff, true)}`,
  }));
  const visibleMessages = useMemo(() => (
    (messagesQuery.data?.aiMessages ?? data.aiMessages)
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  ), [data.aiMessages, messagesQuery.data?.aiMessages]);
  const selectedMatch = data.matches.find((match) => match.id === matchId);

  const createDraft = () => {
    draftMessage.mutate({
      actorId: data.activeParticipantId,
      groupId: type === "LEADERBOARD_SUMMARY" ? undefined : groupId,
      matchId: type === "LEADERBOARD_SUMMARY" ? undefined : matchId,
      type,
    });
  };

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="AI host" description="Create host message drafts from structured match, poll, and leaderboard data. Assisted mode can call the configured external AI provider within daily guardrails." />
      <div className="fantasy-ai-host">
        <section className="content-section fantasy-ai-host-composer">
          <SectionHeading eyebrow="Draft" title="Generate host message" />
          <div className="fantasy-ai-host-form">
            <LabeledSelect
              label="Message type"
              onChange={(value) => setType(value as FantasyAiMessageType)}
              options={messageTypeOptions}
              value={type}
            />
            {data.groups.length > 1 && type !== "LEADERBOARD_SUMMARY" && (
              <LabeledSelect label="League" onChange={setGroupId} options={groupOptions} value={groupId} />
            )}
            {type !== "LEADERBOARD_SUMMARY" && (
              <LabeledSelect label="Match" onChange={setMatchId} options={matchOptions} value={matchId} />
            )}
            {selectedMatch && type !== "LEADERBOARD_SUMMARY" && (
              <div className="fantasy-ai-host-context">
                <span>{selectedMatch.status.toLowerCase()} · {selectedMatch.importance.replace("_", " ")}</span>
                <strong>{formatKickoff(selectedMatch.kickoff)}</strong>
                <small>{formatDate(selectedMatch.kickoff, true)}</small>
              </div>
            )}
            <button className="button button--primary" disabled={draftMessage.isPending || (type !== "LEADERBOARD_SUMMARY" && !matchId)} onClick={createDraft} type="button">
              {draftMessage.isPending ? "Drafting..." : "Generate draft"}
            </button>
            <button
              className="button"
              disabled={testProvider.isPending}
              onClick={() => testProvider.mutate({ actorId: data.activeParticipantId })}
              type="button"
            >
              {testProvider.isPending ? "Testing..." : "Test external AI"}
            </button>
            {draftMessage.isSuccess && <SuccessMessage>Draft ready: {draftMessage.data.message.title}</SuccessMessage>}
            {draftMessage.isError && <ErrorMessage>{draftMessage.error.message}</ErrorMessage>}
            {testProvider.isSuccess && (
              <SuccessMessage>
                External AI responded: {testProvider.data.message.title}. Today: {testProvider.data.usage.calls} call(s), {testProvider.data.usage.estimatedCostCents}c estimated.
              </SuccessMessage>
            )}
            {testProvider.isError && <ErrorMessage>{testProvider.error.message}</ErrorMessage>}
          </div>
        </section>

        <section className="content-section fantasy-ai-host-list">
          <SectionHeading eyebrow={`${visibleMessages.length} messages`} title="Host message queue" />
          {messagesQuery.isError && <ErrorMessage>{messagesQuery.error.message}</ErrorMessage>}
          {visibleMessages.length === 0 && <p className="fantasy-empty-state">No AI host messages yet. Generate a reminder, recap, or leaderboard pulse.</p>}
          {visibleMessages.map((message) => (
            <AiHostMessageCard data={data} key={message.id} message={message} />
          ))}
        </section>
      </div>
    </div>
  );
}

const AiHostMessageCard = ({ data, message }: { data: ReturnType<typeof useFantasy>["data"]; message: FantasyAiMessage }) => {
  const updateMessage = useUpdateFantasyAiMessage(data.activeParticipantId);
  const regenerateMessage = useRegenerateFantasyAiMessage(data.activeParticipantId);
  const publishMessage = usePublishFantasyAiMessage(data.activeParticipantId);
  const discardMessage = useDiscardFantasyAiMessage(data.activeParticipantId);
  const [title, setTitle] = useState(message.title);
  const [body, setBody] = useState(message.body);
  const match = message.matchId ? data.matches.find((item) => item.id === message.matchId) : undefined;
  const group = message.groupId ? data.groups.find((item) => item.id === message.groupId) : undefined;
  const isBusy = updateMessage.isPending || regenerateMessage.isPending || publishMessage.isPending || discardMessage.isPending;
  const canEdit = message.status !== "DISCARDED";

  return (
    <article className={`fantasy-ai-host-card fantasy-ai-host-card--${message.status.toLowerCase()}`}>
      <header>
        <div>
          <span className="eyebrow">{message.type.replaceAll("_", " ")} · {message.status}</span>
          <h3>{message.title}</h3>
          <p>{[group?.name, match ? fantasyMatchTitle(match, data.teams) : undefined].filter(Boolean).join(" · ") || "Global leaderboard"}</p>
        </div>
        <strong>{message.source.replace("_", " ")}</strong>
      </header>
      <label className="fantasy-ai-host-field">
        <span>Title</span>
        <input disabled={!canEdit} onChange={(event) => setTitle(event.target.value)} value={title} />
      </label>
      <label className="fantasy-ai-host-field">
        <span>Body</span>
        <textarea disabled={!canEdit} onChange={(event) => setBody(event.target.value)} rows={4} value={body} />
      </label>
      <footer>
        <button disabled={isBusy || !canEdit || !title.trim() || !body.trim()} onClick={() => updateMessage.mutate({ actorId: data.activeParticipantId, body, messageId: message.id, title })} type="button">Save copy</button>
        <button disabled={isBusy || !canEdit} onClick={() => regenerateMessage.mutate({ actorId: data.activeParticipantId, messageId: message.id })} type="button">Regenerate</button>
        <button disabled={isBusy || !canEdit} onClick={() => publishMessage.mutate({ actorId: data.activeParticipantId, messageId: message.id })} type="button">Publish</button>
        <button disabled={isBusy || message.status === "DISCARDED"} onClick={() => discardMessage.mutate({ actorId: data.activeParticipantId, messageId: message.id })} type="button">Discard</button>
      </footer>
      {(updateMessage.isSuccess || regenerateMessage.isSuccess || publishMessage.isSuccess || discardMessage.isSuccess) && <SuccessMessage>Message updated.</SuccessMessage>}
      {updateMessage.isError && <ErrorMessage>{updateMessage.error.message}</ErrorMessage>}
      {regenerateMessage.isError && <ErrorMessage>{regenerateMessage.error.message}</ErrorMessage>}
      {publishMessage.isError && <ErrorMessage>{publishMessage.error.message}</ErrorMessage>}
      {discardMessage.isError && <ErrorMessage>{discardMessage.error.message}</ErrorMessage>}
    </article>
  );
};
