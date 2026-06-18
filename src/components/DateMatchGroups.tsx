import type { Match } from "../types/domain";
import { formatDate } from "../utils/football";
import { MatchCard } from "../features/matches/MatchCard";

type DateMatchGroupsProps = {
  groupedEntries: [string, Match[]][];
  countLabel: string;
  targetDate?: string;
  sectionIdPrefix?: string;
  currentLabel?: string;
};

export const DateMatchGroups = ({
  groupedEntries,
  countLabel,
  targetDate,
  sectionIdPrefix,
  currentLabel = "Current",
}: DateMatchGroupsProps) => (
  <>
    {groupedEntries.map(([date, dateMatches]) => (
      <section
        className="date-group"
        id={sectionIdPrefix ? `${sectionIdPrefix}-${date}` : undefined}
        key={date}
      >
        <h2>
          <span>
            {date === targetDate && <em className="date-group__anchor">{currentLabel}</em>}
            {formatDate(date, true)}
          </span>
          <small>{dateMatches?.length} {countLabel}</small>
        </h2>
        <div className="match-list">
          {dateMatches?.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>
    ))}
  </>
);
