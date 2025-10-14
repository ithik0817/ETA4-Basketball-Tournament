// src/components/AdvancedStats.jsx
import React, { useMemo } from "react";
import usePlayerStats from "../hooks/usePlayerStats";

export default function AdvancedStats({ players, shots, team }) {
  // 1. Separate players into starters and bench based on the `starter` property.
  const { starters, bench } = useMemo(() => {
    const starters = players
      .filter((p) => p.starter)
      .sort((a, b) => a.number - b.number);
    const bench = players
      .filter((p) => !p.starter)
      .sort((a, b) => a.number - b.number);
    return { starters, bench };
  }, [players]);

  const { playerStats, totals } = usePlayerStats(players, shots);

  const trueShootingPct = totals.fga + 0.44 * totals.freeThrowA > 0 ? Number((totals.pts / (2 * (totals.fga + 0.44 * totals.freeThrowA))) * 100).toFixed(1): 0;
  const effectiveFgPct = totals.fga > 0 ? Number(((totals.fgm + 0.5 * totals.threesM) / totals.fga * 100).toFixed(1)): 0;
  const assists = totals.assists;
  const turnOver = totals.turnOver;
  const reb = totals.reb;
  const freeThrowA = totals.freeThrowA;
  const fga = totals.fga;
  const usageRate =  totals.teamTotalUsed > 0
    ? Number((totals.playerUsed / totals.teamTotalUsed) * 100).toFixed(1)
    : 0;

  const possessionsUsed = totals.fga + 0.44 * totals.freeThrowA + totals.turnOver;
    const assistRatio = possessionsUsed > 0 
      ? Number((totals.assists / possessionsUsed) * 100).toFixed(1)
      : 0;
    const turnoverRatio = possessionsUsed > 0 
      ? Number((totals.turnOver / possessionsUsed) * 100).toFixed(1)
      : 0;

  const teamPossessions = totals.fga - totals.oReb + totals.turnOver + 0.44 * totals.freeThrowA;

    const offensiveEfficiency = (teamPossessions > 0)
      ? ((totals.pts / teamPossessions) * 100).toFixed(1)
      : 0;

  const renderRow = (player, isStarter = false) => {

    const stats = playerStats.find((s) => s.id === player.id) || {};
    const usageRate = totals.teamTotalUsed > 0 
      ? Number((stats.playerUsed / totals.teamTotalUsed) * 100).toFixed(1)
      : 0;
    const rebPct = reb > 0 ? Number((stats.reb / reb) * 100).toFixed(1): 0;

    const possessionsUsed = stats.fga + 0.44 * stats.freeThrowA + stats.turnOver;
      const assistRatio = possessionsUsed > 0 
        ? Number((stats.assists / possessionsUsed) * 100).toFixed(1)
        : 0;
      const turnoverRatio = possessionsUsed > 0 
        ? Number((stats.turnOver / possessionsUsed) * 100).toFixed(1)
        : 0;

      const offensiveEfficiency = (possessionsUsed > 0)
      ? ((stats.pts / possessionsUsed) * 100).toFixed(1)
      : 0;
    return (
      <tr key={player.id}>
        <td className="fixed-left-cell">
          {isStarter ? 
            <strong>#{player.number} - {player.name}</strong> 
            : <>#{player.number} - {player.name}</>
          }
        </td>
        <td>{stats.trueShootingPct ?? 0}%</td>
        <td>{stats.effectiveFgPct ?? 0}%</td>
        <td>{stats.assists ?? 0}/{stats.turnOver ?? 0}</td>
        <td>{assistRatio}</td>
        <td>{turnoverRatio}</td>
        <td>{rebPct}%</td>
        <td>{stats.freeThrowA ?? 0}/{stats.fga ?? 0}</td>
        <td>{usageRate}%</td>
        <td>{offensiveEfficiency}</td>
        
      </tr>
    );
  };

  return (
    <div className="team-stats-container">
      <h2>{team} Advanced Stats</h2>
      {players.length === 0 ? (
        <p>No players added yet.</p>
      ) : (
        <table className="player-stats-table">
          <thead>
            <tr className="table-header-row">
              <th>Player</th>
              <th>TS%</th>
              <th>eFG%</th>
              <th>AST/TO</th>
              <th>AST Ratio</th>
              <th>TO Ratio</th>
              <th>REB%</th>
              <th>FTA Rate</th>
              <th>USG%</th>
              <th>OER</th>
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

              <td>{trueShootingPct}%</td>
              <td>{effectiveFgPct}%</td>
              <td>{assists}/{turnOver}</td>
              <td>{assistRatio}</td>
              <td>{turnoverRatio}</td>
              <td>{reb}</td>
              <td>{freeThrowA}/{fga}</td>
              <td>{usageRate}%</td>
              <td>{offensiveEfficiency}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
