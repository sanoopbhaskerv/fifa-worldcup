import type { Team } from "../types/domain";

/**
 * Renders a team crest when available, otherwise a short text badge.
 *
 * @param props - Component props.
 * @param props.team - Team identity used for crest, fallback initials, and color.
 * @param props.size - Visual badge size.
 * @returns Team badge element for cards, tables, and detail views.
 */
export const TeamBadge = ({ team, size = "md" }: { team: Team; size?: "sm" | "md" | "lg" }) => (
  <span className={`team-badge team-badge--${size}`} style={{ "--badge": team.badge } as React.CSSProperties} aria-hidden="true">
    {team.crest ? <img src={team.crest} alt="" loading="lazy" /> : team.code.slice(0, 2)}
  </span>
);
