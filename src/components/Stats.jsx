// src/components/Stats.jsx
import React, { useMemo } from "react";
import usePlayerStats from "../hooks/usePlayerStats";

export default function Stats({ players, shots, team }) {
  const { playerStats, totals } = usePlayerStats(players, shots);
  const { starters, bench } = useMemo(() => {
    const starters = players
      .filter((p) => p.starter)
      .sort((a, b) => a.number - b.number);
    const bench = players
      .filter((p) => !p.starter)
      .sort((a, b) => a.number - b.number);
    return { starters, bench };
  }, [players]);

  const teamTwoPct = totals.twosA > 0 ? ((totals.twosM / totals.twosA) * 100).toFixed(1) : "0.0";
  const teamThreePct = totals.threesA > 0 ? ((totals.threesM / totals.threesA) * 100).toFixed(1) : "0.0";
  const teamFgPct = totals.fga > 0 ? ((totals.fgm / totals.fga) * 100).toFixed(1) : "0.0";
  const freeThrowPct = totals.freeThrowA > 0 ? ((totals.freeThrowM / totals.freeThrowA) * 100).toFixed(1) : "0.0";

  // Helper to render a player stats row.
  const renderRow = (player, isStarter = false) => {
    const stats = playerStats.find((s) => s.id === player.id) || {};
    return (
      <tr key={player.id}>
        <td className="fixed-left-cell">
          {isStarter ? 
            <strong>#{player.number} - {player.name}</strong> 
            : <>#{player.number} - {player.name}</>
          }
        </td>
        <td>{stats.twosM ?? 0}-{stats.twosA ?? 0}</td>
        <td>{stats.twoPct ?? "0.0"}%</td>

        <td>{stats.threesM ?? 0}-{stats.threesA ?? 0}</td>
        <td>{stats.threePct ?? "0.0"}%</td>

        <td>{stats.fgm ?? 0}-{stats.fga ?? 0}</td>
        <td>{stats.fgPct ?? "0.0"}%</td>

        <td>{stats.freeThrowM ?? 0}-{stats.freeThrowA ?? 0}</td>
        <td>{stats.freeThrowPct ?? "0.0"}%</td>

        <td>{stats.oReb ?? 0}</td>
        <td>{stats.dReb ?? 0}</td>
        <td>{stats.reb ?? 0}</td>
        <td>{stats.assists ?? 0}</td>
        <td>{stats.stl ?? 0}</td>
        <td>{stats.blk ?? 0}</td>
        <td>{stats.turnOver ?? 0}</td>
        <td>{stats.pf ?? 0}</td>

        <td>{stats.pts ?? 0}</td>
      </tr>
    );
  };

  return (
    <div className="team-stats-container">
      <h2>{team} Stats</h2>
      {players.length === 0 ? (
        <p>No players added yet.</p>
      ) : (
        <table className="player-stats-table">
          <thead>
            <tr className="table-header-row">
              <th>Player</th>

              <th>2PT</th>
              <th>2PT%</th>

              <th>3PT</th>
              <th>3PT%</th>

              <th>FG</th>
              <th>FG%</th>

              <th>FT</th>
              <th>FT%</th>

              <th>OREB</th>
              <th>DREB</th>
              <th>REB</th>
              <th>AST</th>
              <th>STL</th>
              <th>BLK</th>
              <th>TO</th>
              <th>PF</th>
              
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            {/* Starters */}
            {starters.map((p) => renderRow(p, true))}

            {/* Bench */}
            {bench.map((p) => renderRow(p, false))}

            {/* Totals */}
            <tr className="team-totals-row">
              <td className="fixed-left-cell"><strong>Team Total</strong></td>
              <td>{totals.twosM}-{totals.twosA}</td>
              <td>{teamTwoPct}%</td>

              <td>{totals.threesM}-{totals.threesA}</td>
              <td>{teamThreePct}%</td>

              <td>{totals.fgm}-{totals.fga}</td>
              <td>{teamFgPct}%</td>

              <td>{totals.freeThrowM}-{totals.freeThrowA}</td>
              <td>{freeThrowPct}%</td>
              
              <td>{totals.oReb}</td>
              <td>{totals.dReb}</td>
              <td>{totals.reb}</td>
              <td>{totals.assists}</td>
              <td>{totals.stl}</td>
              <td>{totals.blk}</td>
              <td>{totals.turnOver}</td>
              <td>{totals.pf}</td>
              
              <td>{totals.pts}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
