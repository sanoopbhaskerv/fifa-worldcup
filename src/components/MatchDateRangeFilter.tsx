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

export const nextSevenDaysMatchRange = (baseDate = new Date()): MatchDateRangeValue => ({
  fromDate: dateInputValue(baseDate),
  toDate: dateInputValue(addDays(baseDate, 6)),
  groupStageOnly: false,
});

export const matchPassesDateRange = (
  match: { kickoff: string; stage?: string },
  range: MatchDateRangeValue,
) => {
  const date = match.kickoff.slice(0, 10);
  const inDateRange = (!range.fromDate || date >= range.fromDate) && (!range.toDate || date <= range.toDate);
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
  const setToday = () => {
    const today = dateInputValue(new Date());
    onChange({ fromDate: today, toDate: today, groupStageOnly: false });
  };
  const setTomorrow = () => {
    const tomorrow = dateInputValue(addDays(new Date(), 1));
    onChange({ fromDate: tomorrow, toDate: tomorrow, groupStageOnly: false });
  };
  const setNextSeven = () => onChange(nextSevenDaysMatchRange());

  return (
    <div className="match-date-range-filter">
      <div className="match-date-range-filter__fields">
        <LabeledInput label="From date" onChange={(fromDate) => onChange({ ...value, fromDate })} type="date" value={value.fromDate} />
        <LabeledInput label="To date" onChange={(toDate) => onChange({ ...value, toDate })} type="date" value={value.toDate} />
      </div>
      <div className="match-date-range-filter__actions">
        <button onClick={setToday} type="button">Today</button>
        <button onClick={setTomorrow} type="button">Tomorrow</button>
        <button onClick={setNextSeven} type="button">Next 7 days</button>
        <button onClick={() => onChange({ ...nextSevenDaysMatchRange(), groupStageOnly: true })} type="button">Group stage</button>
        <button onClick={() => onChange({ fromDate: "", toDate: "", groupStageOnly: false })} type="button">All matches</button>
      </div>
    </div>
  );
}
