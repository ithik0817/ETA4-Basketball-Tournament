import React, { useMemo } from "react";

// Define possible quarter labels, including overtime
const quarterLabels = [1, 2, 3, 4, "OT"];

export default function ScoreTable({
  awayTeamId, 
  homeTeamId, 
  awayTeamName, 
  homeTeamName, 
  shots 
}) {
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

    shots.forEach(shot => {
      if (shot.made) {
        if (shot.teamId === homeTeamId) {
          homeScoresByQuarter[shot.quarter] =
            (homeScoresByQuarter[shot.quarter] || 0) + shot.points;
          totalHomeScore += shot.points;
        } else if (shot.teamId === awayTeamId) {
          awayScoresByQuarter[shot.quarter] =
            (awayScoresByQuarter[shot.quarter] || 0) + shot.points;
          totalAwayScore += shot.points;
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
  }, [shots, homeTeamId, awayTeamId]);

  const quarterLabels = hasOT ? [1, 2, 3, 4, "OT"] : [1, 2, 3, 4];

  return (
    <div className="score-table-container">
      <table className="score-table">
        <thead>
          <tr className="table-header-row">
            <th>Team</th>
            {quarterLabels.map(q => (
              <th key={q}>{q}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="team-name">{awayTeamName || "Away Team"}</td>
            {quarterLabels.map(q => (
              <td key={q}>{awayScoresByQuarter[q]}</td>
            ))}
            <td className="score-total">{totalAwayScore}</td>
          </tr>
          <tr>
            <td className="team-name">{homeTeamName || "Home Team"}</td>
            {quarterLabels.map(q => (
              <td key={q}>{homeScoresByQuarter[q]}</td>
            ))}
            <td className="score-total">{totalHomeScore}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
