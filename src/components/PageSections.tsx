import type { MatchStatus } from "../types/domain";

type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

type EmptyStateProps = {
  title: string;
  body: string;
};

type FilterOption = {
  label: string;
  value: "ALL" | MatchStatus;
};

type MatchFiltersProps = {
  statusOptions?: FilterOption[];
  statusValue?: "ALL" | MatchStatus;
  onStatusChange?: (value: "ALL" | MatchStatus) => void;
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  stageLabel: string;
  stageValue: string;
  onStageChange: (value: string) => void;
  stageOptions: string[];
  standalone?: boolean;
};

export const PageHeading = ({ eyebrow, title, description }: PageHeadingProps) => (
  <header className="page-heading">
    <span className="eyebrow">{eyebrow}</span>
    <h1>{title}</h1>
    <p>{description}</p>
  </header>
);

export const EmptyState = ({ title, body }: EmptyStateProps) => (
  <div className="empty-state">
    <span>90:00</span>
    <h2>{title}</h2>
    <p>{body}</p>
  </div>
);

export const MatchFilters = ({
  statusOptions,
  statusValue,
  onStatusChange,
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  stageLabel,
  stageValue,
  onStageChange,
  stageOptions,
  standalone = false,
}: MatchFiltersProps) => {
  const fields = (
    <div className={`filter-fields ${standalone ? "filter-fields--standalone" : ""}`.trim()}>
      <input
        aria-label={searchLabel}
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <select
        aria-label={stageLabel}
        value={stageValue}
        onChange={(event) => onStageChange(event.target.value)}
      >
        <option value="ALL">All stages</option>
        {stageOptions.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </div>
  );

  if (!statusOptions?.length) return fields;

  return (
    <div className="filters">
      <div className="chip-row">
        {statusOptions.map((option) => (
          <button
            className={`chip ${statusValue === option.value ? "chip--active" : ""}`}
            onClick={() => onStatusChange?.(option.value)}
            key={option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
      {fields}
    </div>
  );
};
