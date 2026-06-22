import type { ReactNode } from "react";
import { useState } from "react";
import { fantasyMatchTitle, fantasyDeadlineLabel } from "../../utils/fantasy";
import { formatDate, formatKickoff } from "../../utils/football";
import type { FantasyMatch } from "../../types/fantasy";

// ── Shared primitives ─────────────────────────────────────────────────────────

export const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      width: 16,
      height: 16,
      flexShrink: 0,
      transition: "transform 0.2s ease",
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
    }}
  >
    <polyline points="4 6 8 10 12 6" />
  </svg>
);

export type ChipVariant = "default" | "success" | "warning" | "muted";

export interface ChipDef {
  label: string;
  variant?: ChipVariant;
}

export const SummaryChip = ({ label, variant = "default" }: ChipDef) => (
  <span className={`poll-group-chip poll-group-chip--${variant}`}>{label}</span>
);

// ── Generic collapsible shell ─────────────────────────────────────────────────

interface CollapsibleMatchGroupProps {
  match: FantasyMatch;
  chips: ChipDef[];
  children: ReactNode;
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  defaultExpanded?: boolean;
}

export function CollapsibleMatchGroup({
  match,
  chips,
  children,
  eyebrow,
  heading,
  subheading,
  defaultExpanded = false,
}: CollapsibleMatchGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className="content-section fantasy-poll-group">
      <button
        className="poll-group-toggle"
        onClick={() => setExpanded((v) => !v)}
        type="button"
        aria-expanded={expanded}
      >
        <div className="poll-group-toggle__meta">
          <span className="eyebrow">{eyebrow ?? match.stage}</span>
          <h2>{heading ?? fantasyMatchTitle(match, [] /* caller overrides */)}</h2>
          <p className="poll-group-toggle__sub">
            {subheading ??
              `${formatDate(match.kickoff, true)} · kickoff ${formatKickoff(match.kickoff)} · ${fantasyDeadlineLabel(match.pollCloseAt)}`}
          </p>
        </div>
        <div className="poll-group-toggle__right">
          <div className="poll-group-chips">
            {chips.map((chip, i) => (
              <SummaryChip key={i} {...chip} />
            ))}
          </div>
          <ChevronIcon open={expanded} />
        </div>
      </button>

      {expanded && <div className="poll-group-body">{children}</div>}
    </section>
  );
}
