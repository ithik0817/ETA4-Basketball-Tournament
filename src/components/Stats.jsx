// src/components/Stats.jsx
import React, { useMemo } from "react";

export default function Stats({ players, shots, team }) {
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

  // 2. Build detailed stats for each player using a useMemo hook for performance.
  const playerStats = useMemo(() => {
    return players.map((p) => {
      const playerShots = shots.filter((s) => s.playerId === p.id);

      const twosA = playerShots.filter((s) => s.points === 2).length;
      const twosM = playerShots.filter((s) => s.points === 2 && s.made).length;
      const twoPct = twosA > 0 ? ((twosM / twosA) * 100).toFixed(1) : "0.0";

      const threesA = playerShots.filter((s) => s.points === 3).length;
      const threesM = playerShots.filter((s) => s.points === 3 && s.made).length;
      const threePct = threesA > 0 ? ((threesM / threesA) * 100).toFixed(1) : "0.0";

      const fgm = twosM + threesM;
      const fga = twosA + threesA;
      const fgPct = fga > 0 ? ((fgm / fga) * 100).toFixed(1) : "0.0";

      const freeThrowA = playerShots.filter((s) => s.points === 1).length;
      const freeThrowM = playerShots.filter((s) => s.points === 1 && s.made).length;
      const freeThrowPct = freeThrowA > 0 ? ((freeThrowM / freeThrowA) * 100).toFixed(1) : "0.0";

      const oReb = playerShots.filter((s) => s.type === "offRebound").length;
      const dReb = playerShots.filter((s) => s.type === "defRebound").length;
      const reb = oReb + dReb;
      const assists = shots.filter((s) => s.assistPlayerId === p.id).length;
      const stl = playerShots.filter((s) => s.type === "steal").length;
      const blk = playerShots.filter((s) => s.type === "block").length;
      const turnOver = playerShots.filter((s) => s.type === "turnOver").length;
      const pf = playerShots.filter((s) => s.type === "foul").length;
      
      const pts = playerShots.reduce((sum, s) => sum + (s.made ? s.points : 0), 0);

      return {
        ...p,

        twosA,
        twosM,
        twoPct,

        threesA,
        threesM,
        threePct,

        fgm,
        fga,
        fgPct,

        freeThrowA,
        freeThrowM,
        freeThrowPct,

        oReb,
        dReb,
        reb,
        assists,
        stl,
        blk,
        turnOver,
        pf,
        
        pts,
      };
    });
  }, [players, shots]);

  // 3. Calculate team totals from the individual player stats.
  const totals = useMemo(() => {
    return playerStats.reduce(
      (sum, p) => ({
        twosM: sum.twosM + p.twosM,
        twosA: sum.twosA + p.twosA,

        threesM: sum.threesM + p.threesM,
        threesA: sum.threesA + p.threesA,

        fgm: sum.fgm + p.fgm,
        fga: sum.fga + p.fga,

        freeThrowM: sum.freeThrowM + p.freeThrowM,
        freeThrowA: sum.freeThrowA + p.freeThrowA,

        oReb: sum.oReb + p.oReb,
        dReb: sum.dReb + p.dReb,
        reb: sum.reb + p.reb,
        assists: sum.assists + p.assists,
        stl: sum.stl + p.stl,
        blk: sum.blk + p.blk,
        turnOver: sum.turnOver + p.turnOver,
        pf: sum.pf + p.pf,
        
        pts: sum.pts + p.pts,
      }),
      { 
        twosM: 0,
        twosA: 0,

        threesM: 0,
        threesA: 0,

        fgm: 0,
        fga: 0,

        freeThrowM: 0,
        freeThrowA: 0,

        oReb: 0,
        dReb: 0,
        reb: 0,
        assists: 0,
        stl: 0,
        blk: 0,
        turnOver: 0,
        pf: 0,

        pts: 0
        }
    );
  }, [playerStats]);

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

        <td>{stats.freeThrowA ?? 0}-{stats.freeThrowA ?? 0}</td>
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
