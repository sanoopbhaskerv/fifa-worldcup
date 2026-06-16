import type { Team } from "../types/domain";

export const TeamBadge = ({ team, size = "md" }: { team: Team; size?: "sm" | "md" | "lg" }) => (
  <span className={`team-badge team-badge--${size}`} style={{ "--badge": team.badge } as React.CSSProperties} aria-hidden="true">
    {team.crest ? <img src={team.crest} alt="" loading="lazy" /> : team.code.slice(0, 2)}
  </span>
);
