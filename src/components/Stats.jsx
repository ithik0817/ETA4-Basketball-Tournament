// src/components/Stats.jsx
import React from "react";
import { collection, getDocs } from "firebase/firestore";


export default function Stats({ players, shots , team }) {
  function getStats(playerId) {
    const playerShots = shots.filter((s) => s.playerId === playerId);
    
    const twosA = playerShots.filter((s) => s.points === 2).length;
    const twosM = playerShots.filter((s) => s.points === 2 && s.made).length;
    
    const threesA = playerShots.filter((s) => s.points === 3).length;
    const threesM = playerShots.filter((s) => s.points === 3 && s.made).length;
        
    const oneA = playerShots.filter((s) => s.points === 1).length;
    const oneM = playerShots.filter((s) => s.points === 1 && s.made).length;
    

    const twoPct = twosA > 0 ? ((twosM / twosA) * 100).toFixed(1) : "0.0";
    const threePct = threesA > 0 ? ((threesM / threesA) * 100).toFixed(1) : "0.0";

    const fga = playerShots.filter((s) => !s.isFreeThrow ).length;
    const fgm = playerShots.filter((s) => !s.isFreeThrow && s.made ).length;

    const fgPct = fga > 0 ? ((fgm / fga) * 100).toFixed(1) : "0.0";
    const pts = playerShots.reduce((sum, s) => sum + (s.made ? s.points : 0), 0);

    return { fga, fgm, fgPct, twoPct, threePct, twosM, twosA, threesM, threesA, pts, oneM, oneA};
  }

  return (
    <div className="team-stats-container">
    <h2>{team} Stats </h2>
    {players.length === 0 ? (
      <p>No players added yet.</p>
    ) : (
      <table className="player-stats-table">
        <thead>
          <tr className="table-header-row">
            <th>Player</th>
            <th>2PT</th>
            <th>3PT</th>
            <th>FT</th>
            <th>2PT%</th>
            <th>3PT%</th>
            <th>FG</th>
            <th>FG%</th>
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const { fgm, fga, fgPct, twoPct, twosM, twosA, threePct, threesM, threesA, pts, oneA, oneM } = getStats(p.id);              
            return (
              <tr key={p.id}>
                <td className="fixed-left-cell">#{p.number} - {p.name}</td>
                <td>{twosM}-{twosA}</td>
                <td>{threesM}-{threesA}</td>
                <td>{oneM}-{oneA}</td>
                <td>{twoPct}%</td>
                <td>{threePct}%</td>
                <td>{fgm}-{fga}</td>
                <td>{fgPct}%</td>
                <td>{pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    )}
  </div>
  );
}
