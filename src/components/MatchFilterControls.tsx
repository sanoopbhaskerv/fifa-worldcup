import { useMemo } from "react";
import { fantasyMatchTitle } from "../utils/fantasy";
import { formatDate } from "../utils/football";
import type { FantasyMatch, FantasyTeam } from "../types/fantasy";
import { LabeledSelect } from "./FormFields";
import { MatchDateRangeFilter, type MatchDateRangeValue, matchPassesDateRange } from "./MatchDateRangeFilter";

export type MatchFilterValue = {
  matchId: string;
  dateRange: MatchDateRangeValue;
};

type UseMatchFiltersOptions<T> = {
  items: T[];
  value: MatchFilterValue;
  getMatch: (item: T) => FantasyMatch;
};

type MatchFilterControlsProps = {
  matches: FantasyMatch[];
  teams: FantasyTeam[];
  value: MatchFilterValue;
  onChange: (value: MatchFilterValue) => void;
  allMatchesLabel?: string;
  order?: "date-first" | "match-first";
  showMatchSelect?: boolean;
};

export const compareMatchesByKickoff = (left: Pick<FantasyMatch, "kickoff">, right: Pick<FantasyMatch, "kickoff">) =>
  left.kickoff.localeCompare(right.kickoff);

export function useMatchFilters<T>({
  items,
  value,
  getMatch,
}: UseMatchFiltersOptions<T>) {
  const dateFilteredItems = useMemo(() => (
    items
      .filter((item) => matchPassesDateRange(getMatch(item), value.dateRange))
      .sort((left, right) => compareMatchesByKickoff(getMatch(left), getMatch(right)))
  ), [getMatch, items, value.dateRange]);
  const resolvedMatchId = value.matchId && dateFilteredItems.some((item) => getMatch(item).id === value.matchId)
    ? value.matchId
    : "";
  const filteredItems = useMemo(() => (
    resolvedMatchId ? dateFilteredItems.filter((item) => getMatch(item).id === resolvedMatchId) : dateFilteredItems
  ), [dateFilteredItems, getMatch, resolvedMatchId]);

  return { dateFilteredItems, filteredItems, resolvedMatchId };
}

/**
 * Reusable match selector plus date range controls for fantasy match lists.
 *
 * @param props - Controlled match/date filter props.
 * @returns Filter controls for match lists.
 */
export function MatchFilterControls({
  matches,
  teams,
  value,
  onChange,
  allMatchesLabel = "All matches",
  order = "match-first",
  showMatchSelect = matches.length > 1,
}: MatchFilterControlsProps) {
  const sortedMatches = useMemo(() => [...matches].sort(compareMatchesByKickoff), [matches]);
  const matchOptions = sortedMatches.map((match) => ({
    value: match.id,
    label: `${fantasyMatchTitle(match, teams)} - ${formatDate(match.kickoff, true)}`,
  }));
  const matchSelect = showMatchSelect ? (
    <LabeledSelect
      label="Match"
      onChange={(matchId) => onChange({ ...value, matchId })}
      options={[{ value: "", label: allMatchesLabel }, ...matchOptions]}
      value={value.matchId}
    />
  ) : null;
  const dateRange = (
    <MatchDateRangeFilter
      onChange={(nextDateRange) => onChange({ ...value, dateRange: nextDateRange })}
      value={value.dateRange}
    />
  );

  return (
    <>
      {order === "date-first" ? dateRange : matchSelect}
      {order === "date-first" ? matchSelect : dateRange}
    </>
  );
}
