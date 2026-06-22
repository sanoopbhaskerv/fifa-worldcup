import { Link } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { MatchPollGroup } from "../features/fantasy/MatchPollGroup";
import { ArrowIcon, CloseIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { LabeledSelect } from "../components/FormFields";
import { MatchFilterControls, type MatchFilterValue, useMatchFilters } from "../components/MatchFilterControls";
import { fantasyPublishedQuestions, fantasyQuestionsForGroup, fantasyQuestionsForMatch } from "../utils/fantasy";
import { PageHeading } from "../components/PageSections";
import { nextSevenDaysMatchRange } from "../components/MatchDateRangeFilter";

const FilterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, pointerEvents: "none" }}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

/**
 * Displays match and tournament prediction polls.
 * Each match group is collapsible; the collapsed state shows a summary of
 * answered questions and scored points.
 */
export default function FantasyPollsPage() {
  const { data } = useFantasy();
  const [groupId, setGroupId] = useState(data.groups[0]?.id ?? "group-main");
  const [matchFilter, setMatchFilter] = useState<MatchFilterValue>(() => ({ matchId: "", dateRange: nextSevenDaysMatchRange() }));
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const groupQuestions = fantasyQuestionsForGroup(groupId, data.questions);
  const tournamentQuestions = fantasyPublishedQuestions(groupQuestions).filter((q) => !q.matchId);

  const pollMatches = data.matches
    .map((match) => ({ match, questions: fantasyQuestionsForMatch(match.id, groupQuestions) }))
    .filter(({ questions }) => questions.length > 0);

  const { dateFilteredItems: dateFilteredPollMatches, filteredItems: filteredPollMatches, resolvedMatchId } = useMatchFilters({
    items: pollMatches,
    value: matchFilter,
    getMatch: ({ match }) => match,
  });

  const groupOptions = data.groups.map((g) => ({ value: g.id, label: g.name }));

  const activeFilterCount =
    (resolvedMatchId ? 1 : 0) +
    (matchFilter.dateRange.fromDate || matchFilter.dateRange.toDate || matchFilter.dateRange.groupStageOnly ? 1 : 0) +
    (groupId !== (data.groups[0]?.id ?? "group-main") ? 1 : 0);

  const showTournamentGroup =
    tournamentQuestions.length > 0 &&
    !resolvedMatchId &&
    !matchFilter.dateRange.fromDate &&
    !matchFilter.dateRange.toDate &&
    !matchFilter.dateRange.groupStageOnly;

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Prediction polls" title="Published polls" description="Answer open match polls before lock time. Drafts stay hidden until an admin publishes them." />

      <div className="fantasy-page-actions">
        {data.groups.length > 1 && (
          <div className="fantasy-page-actions__group-select">
            <LabeledSelect
              label="League"
              onChange={(value) => { setGroupId(value); setMatchFilter((c) => ({ ...c, matchId: "" })); }}
              options={groupOptions}
              value={groupId}
            />
          </div>
        )}
        <div className="fantasy-page-actions__inline-filters">
          <MatchFilterControls
            matches={dateFilteredPollMatches.map(({ match }) => match)}
            onChange={setMatchFilter}
            showMatchSelect={pollMatches.length > 1}
            teams={data.teams}
            value={{ ...matchFilter, matchId: resolvedMatchId }}
          />
        </div>
        <button className="fantasy-page-actions__filter-trigger" onClick={() => setIsFilterOpen(true)} type="button">
          <FilterIcon />
          <span>Filters</span>
          {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
        </button>
        <Link to="/fantasy/create-poll">Create poll <ArrowIcon /></Link>
      </div>

      <div className="fantasy-poll-groups">
        {pollMatches.length === 0 && (
          <section className="content-section fantasy-poll-group">
            <div className="section-heading">
              <div><span className="eyebrow">Setup pending</span><h2>No published polls yet</h2><p>Sync fixtures, generate drafts, then publish the polls from admin.</p></div>
            </div>
          </section>
        )}
        {filteredPollMatches.length === 0 && pollMatches.length > 0 && (
          <section className="content-section fantasy-poll-group">
            <div className="section-heading">
              <div><span className="eyebrow">No matches</span><h2>No polls in this range</h2><p>Choose a wider date range or use All matches.</p></div>
            </div>
          </section>
        )}

        {filteredPollMatches.map(({ match, questions }) => (
          <MatchPollGroup key={match.id} match={match} questions={questions} eyebrow={match.stage} />
        ))}

        {showTournamentGroup && (
          <MatchPollGroup
            key="tournament"
            match={{ id: "tournament", status: "SCHEDULED", kickoff: data.tournament.startDate, pollCloseAt: data.tournament.startDate, stage: "Tournament", homeTeamId: "", awayTeamId: "", tournamentId: data.tournament.id, importance: "NORMAL" }}
            questions={tournamentQuestions}
            eyebrow="Tournament-long"
            heading="Big calls"
            subheading="These lock before the tournament starts and carry higher points."
          />
        )}
      </div>

      {isFilterOpen && createPortal(
        <motion.div
          className="dialog-backdrop fantasy-filter-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onMouseDown={() => setIsFilterOpen(false)}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="fantasy-poll-filter-title"
            className="fantasy-filter-dialog"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="picker-header">
              <div>
                <span className="eyebrow">Prediction polls</span>
                <h2 id="fantasy-poll-filter-title">Filter polls</h2>
              </div>
              <button className="icon-button" onClick={() => setIsFilterOpen(false)} aria-label="Close filters" type="button">
                <CloseIcon />
              </button>
            </header>
            <div className="fantasy-filter-dialog-body">
              <MatchFilterControls
                matches={dateFilteredPollMatches.map(({ match }) => match)}
                onChange={setMatchFilter}
                showMatchSelect={pollMatches.length > 1}
                teams={data.teams}
                value={{ ...matchFilter, matchId: resolvedMatchId }}
              />
            </div>
            <footer className="fantasy-filter-dialog-footer">
              <button className="button button--primary" onClick={() => setIsFilterOpen(false)} type="button">
                Apply Filters
              </button>
            </footer>
          </motion.section>
        </motion.div>,
        document.body,
      )}
    </div>
  );
}
