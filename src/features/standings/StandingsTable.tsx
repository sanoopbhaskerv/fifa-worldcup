import type { Standing } from "../../types/domain";
import { TeamBadge } from "../../components/TeamBadge";

const zoneLabels: Record<Standing["zone"], string> = {
  champion: "Champion",
  qualified: "Qualified",
  playoff: "Playoff",
  eliminated: "Eliminated",
  relegated: "Relegated",
  none: "",
};

/**
 * Renders one standings table with sticky team column and zone labels.
 *
 * @param props - Component props.
 * @param props.standings - Ordered standings rows for one league table or group.
 * @returns Scrollable standings table.
 */
export const StandingsTable = ({ standings }: { standings: Standing[] }) => (
  <div className="table-wrap">
    <table className="standings-table">
      <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Form</th></tr></thead>
      <tbody>
        {standings.map((row) => (
          <tr key={row.team.id}>
            <td><span className={`position position--${row.zone}`}>{row.position}</span></td>
            <th scope="row">
              <span className="table-team"><TeamBadge team={row.team} size="sm" /><span><strong>{row.team.name}</strong>{zoneLabels[row.zone] && <small>{zoneLabels[row.zone]}</small>}</span></span>
            </th>
            <td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td>
            <td>{row.goalsFor}</td><td>{row.goalsAgainst}</td><td>{row.goalsFor - row.goalsAgainst}</td>
            <td><strong>{row.points}</strong></td>
            <td><span className="form">{row.form.map((result, index) => <i className={`form__${result.toLowerCase()}`} key={index}>{result}</i>)}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
