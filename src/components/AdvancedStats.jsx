// src/components/AdvancedStats.jsx
import React, { useMemo } from "react";
import usePlayerStats from "../hooks/usePlayerStats";

export default function AdvancedStats({ players, opponentPlayers, shots, team }) {
  console.log("team", team);
  console.log("players", players);
  console.log("opponentPlayers", opponentPlayers);

  const { starters, bench } = useMemo(() => {
    const starters = players
      .filter((p) => p.starter)
      .sort((a, b) => a.number - b.number);
    const bench = players
      .filter((p) => !p.starter)
      .sort((a, b) => a.number - b.number);
    return { starters, bench };
  }, [players]);

  const { playerStats: teamPlayerStats, totals: teamTotals } = usePlayerStats(players, shots);

  const { playerStats: opponentPlayerStats, totals: opponentTotals } = usePlayerStats(opponentPlayers || [], shots || []);

  const trueShootingPct = teamTotals.fga + 0.44 * teamTotals.freeThrowA > 0 ? Number((teamTotals.pts / (2 * (teamTotals.fga + 0.44 * teamTotals.freeThrowA))) * 100).toFixed(1): 0;
  const effectiveFgPct = teamTotals.fga > 0 ? Number(((teamTotals.fgm + 0.5 * teamTotals.threesM) / teamTotals.fga * 100).toFixed(1)): 0;
  const assists = teamTotals.assists;
  const turnOver = teamTotals.turnOver;
  const reb = teamTotals.reb;
  const freeThrowA = teamTotals.freeThrowA;
  const fga = teamTotals.fga;
  const usageRate =  teamTotals.teamTotalUsed > 0
    ? Number((teamTotals.playerUsed / teamTotals.teamTotalUsed) * 100).toFixed(1)
    : 0;

  const possessionsUsed = teamTotals.fga + 0.44 * teamTotals.freeThrowA + teamTotals.turnOver;
    const assistRatio = possessionsUsed > 0 
      ? Number((teamTotals.assists / possessionsUsed) * 100).toFixed(1)
      : 0;
    const turnoverRatio = possessionsUsed > 0 
      ? Number((teamTotals.turnOver / possessionsUsed) * 100).toFixed(1)
      : 0;

  const teamPossessions = teamTotals.fga - teamTotals.oReb + teamTotals.turnOver + 0.44 * teamTotals.freeThrowA;
    const offensiveEfficiency = (teamPossessions > 0)
      ? ((teamTotals.pts / teamPossessions) * 100).toFixed(1)
      : 0;

  const opponentPossessions = opponentTotals.fga - opponentTotals.oReb + opponentTotals.turnOver + 0.44 * opponentTotals.freeThrowA;
    const defensiveEfficiency = (opponentPossessions > 0) 
      ? ((opponentTotals.pts / opponentPossessions) * 100).toFixed(1)
      : 0;

  const netRating = (offensiveEfficiency - defensiveEfficiency).toFixed(1)

  const renderRow = (player, isStarter = false) => {

    const stats = teamPlayerStats.find((s) => s.id === player.id) || {};

    const playerDefEff = opponentPossessions > 0
      ? (((opponentTotals.pts / opponentPossessions) * 100) *
        (1 + (stats.dReb + stats.stl + stats.blk - stats.pf) /
          (teamTotals.dReb + teamTotals.stl + teamTotals.blk + 1))).toFixed(1)
      : 0;

    const trueShootingPct = stats.fga + 0.44 * stats.freeThrowA > 0
      ? Number(((stats.pts / (2 * (stats.fga + 0.44 * stats.freeThrowA))) * 100).toFixed(1))
      : 0;

    const effectiveFgPct = stats.fga > 0
      ? Number(((stats.fgm + 0.5 * stats.threesM) / stats.fga * 100).toFixed(1))
      : 0;

    const usageRate = teamTotals.teamTotalUsed > 0 
      ? Number((stats.playerUsed / teamTotals.teamTotalUsed) * 100).toFixed(1)
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
    
    const netRating = (offensiveEfficiency - playerDefEff).toFixed(1)

    return (
      <tr key={player.id}>
        <td className="fixed-left-cell">
          {isStarter ? 
            <strong>#{player.number} - {player.name}</strong> 
            : <>#{player.number} - {player.name}</>
          }
        </td>
        <td>{trueShootingPct ?? 0}%</td>
        <td>{effectiveFgPct ?? 0}%</td>
        <td>{stats.assists ?? 0}/{stats.turnOver ?? 0}</td>
        <td>{assistRatio}</td>
        <td>{turnoverRatio}</td>
        <td>{rebPct}%</td>
        <td>{stats.freeThrowA ?? 0}/{stats.fga ?? 0}</td>
        <td>{usageRate}%</td>
        <td>{offensiveEfficiency}</td>
        <td>{playerDefEff}</td>
        <td>{netRating}</td>

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
              <th>OFFRTG</th>
              <th>DEFRTG</th>
              <th>NETRTG</th>

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
              <td>{defensiveEfficiency}</td>
              <td>{netRating}</td>
          
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
