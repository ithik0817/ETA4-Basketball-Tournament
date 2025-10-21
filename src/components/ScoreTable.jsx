// src/components/ScoreTable.jsx
import React, { useMemo } from "react";

const quarterLabels = [1, 2, 3, 4, "OT"];

export default function ScoreTable({ awayTeamId, homeTeamId, awayTeamName, homeTeamName, events }) {

  const { 
    homeScoresByQuarter,
    awayScoresByQuarter,
    totalHomeScore,
    totalAwayScore,
    hasOT
  } = useMemo(() => {
    
    const homeScoresByQuarter = {};
    const awayScoresByQuarter = {};
    let totalHomeScore = 0;
    let totalAwayScore = 0;

    [1, 2, 3, 4].forEach(q => {
      homeScoresByQuarter[q] = 0;
      awayScoresByQuarter[q] = 0;
    });

    homeScoresByQuarter["OT"] = 0;
    awayScoresByQuarter["OT"] = 0;

    events.forEach((event) => {
      if (event.made) {
        const quarter = event.quarter || "OT";
        const points = event.points || 0;

        if (event.teamId === homeTeamId) {
          homeScoresByQuarter[quarter] =
            (homeScoresByQuarter[quarter] || 0) + points;
          totalHomeScore += points;
        } else if (event.teamId === awayTeamId) {
          awayScoresByQuarter[quarter] =
            (awayScoresByQuarter[quarter] || 0) + points;
          totalAwayScore += points;
        }
      }
    });

    const hasOT = 
      homeScoresByQuarter["OT"] > 0 || awayScoresByQuarter["OT"] > 0;

    return {
      homeScoresByQuarter,
      awayScoresByQuarter,
      totalHomeScore,
      totalAwayScore,
      hasOT
    };
  }, [events, homeTeamId, awayTeamId]);

  const visibleQuarters = hasOT ? [1, 2, 3, 4, "OT"] : [1, 2, 3, 4];

  return (
    <div className="score-table-container">
      <table className="score-table">
        <thead>
          <tr className="table-header-row">
            <th>Team</th>
            {visibleQuarters.map((q) => (
              <th key={q}>{q}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="team-name">{awayTeamName || "Away Team"}</td>
            {visibleQuarters.map((q) => (
              <td key={q}>{awayScoresByQuarter[q]}</td>
            ))}
            <td className="score-total">{totalAwayScore}</td>
          </tr>
          <tr>
            <td className="team-name">{homeTeamName || "Home Team"}</td>
            {visibleQuarters.map((q) => (
              <td key={q}>{homeScoresByQuarter[q]}</td>
            ))}
            <td className="score-total">{totalHomeScore}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
