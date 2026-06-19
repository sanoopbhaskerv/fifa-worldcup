import { LabeledInput } from "./FormFields";

export type MatchDateRangeValue = {
  fromDate: string;
  toDate: string;
  groupStageOnly: boolean;
};

type MatchDateRangeFilterProps = {
  value: MatchDateRangeValue;
  onChange: (value: MatchDateRangeValue) => void;
};

const dateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const matchDateValue = (kickoff: string) => {
  const isoDate = kickoff.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  return isoDate ?? dateInputValue(new Date(kickoff));
};

export const nextSevenDaysMatchRange = (baseDate = new Date()): MatchDateRangeValue => ({
  fromDate: dateInputValue(baseDate),
  toDate: dateInputValue(addDays(baseDate, 6)),
  groupStageOnly: false,
});

export const matchPassesDateRange = (
  match: { kickoff: string; stage?: string },
  range: MatchDateRangeValue,
) => {
  const date = matchDateValue(match.kickoff);
  const [fromDate, toDate] = range.fromDate && range.toDate && range.fromDate > range.toDate
    ? [range.toDate, range.fromDate]
    : [range.fromDate, range.toDate];
  const inDateRange = (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  const inStage = !range.groupStageOnly || String(match.stage ?? "").toLowerCase().includes("group");
  return inDateRange && inStage;
};

/**
 * Reusable match date-range and quick-filter control for fantasy match lists.
 *
 * @param props - Controlled filter state.
 * @returns Date range filter controls.
 */
export function MatchDateRangeFilter({ value, onChange }: MatchDateRangeFilterProps) {
  const today = dateInputValue(new Date());
  const tomorrow = dateInputValue(addDays(new Date(), 1));
  const nextSeven = nextSevenDaysMatchRange();
  const isTodaySelected = value.fromDate === today && value.toDate === today && !value.groupStageOnly;
  const isTomorrowSelected = value.fromDate === tomorrow && value.toDate === tomorrow && !value.groupStageOnly;
  const isNextSevenSelected = value.fromDate === nextSeven.fromDate && value.toDate === nextSeven.toDate && !value.groupStageOnly;
  const isGroupStageSelected = value.fromDate === nextSeven.fromDate && value.toDate === nextSeven.toDate && value.groupStageOnly;
  const isAllMatchesSelected = !value.fromDate && !value.toDate && !value.groupStageOnly;
  const setToday = () => {
    onChange({ fromDate: today, toDate: today, groupStageOnly: false });
  };
  const setTomorrow = () => {
    onChange({ fromDate: tomorrow, toDate: tomorrow, groupStageOnly: false });
  };
  const setNextSeven = () => onChange(nextSeven);

  return (
    <div className="match-date-range-filter">
      <div className="match-date-range-filter__fields">
        <LabeledInput label="From date" onChange={(fromDate) => onChange({ ...value, fromDate })} type="date" value={value.fromDate} />
        <LabeledInput label="To date" onChange={(toDate) => onChange({ ...value, toDate })} type="date" value={value.toDate} />
      </div>
      <div className="match-date-range-filter__actions">
        <button aria-pressed={isTodaySelected} onClick={setToday} type="button">Today</button>
        <button aria-pressed={isTomorrowSelected} onClick={setTomorrow} type="button">Tomorrow</button>
        <button aria-pressed={isNextSevenSelected} onClick={setNextSeven} type="button">Next 7 days</button>
        <button aria-pressed={isGroupStageSelected} onClick={() => onChange({ ...nextSeven, groupStageOnly: true })} type="button">Group stage</button>
        <button aria-pressed={isAllMatchesSelected} onClick={() => onChange({ fromDate: "", toDate: "", groupStageOnly: false })} type="button">All matches</button>
      </div>
    </div>
  );
}
