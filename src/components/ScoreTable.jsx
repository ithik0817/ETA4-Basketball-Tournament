import React, { useMemo } from "react";

// Define possible quarter labels, including overtime
const quarterLabels = [1, 2, 3, 4, "OT"];

export default function ScoreTable({
  awayTeamId, 
  homeTeamId, 
  awayTeamName, 
  homeTeamName, 
  events 
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

    events.forEach(event => {
      if (event.made) {
        if (event.teamId === homeTeamId) {
          homeScoresByQuarter[event.quarter] =
            (homeScoresByQuarter[event.quarter] || 0) + event.points;
          totalHomeScore += event.points;
        } else if (event.teamId === awayTeamId) {
          awayScoresByQuarter[event.quarter] =
            (awayScoresByQuarter[event.quarter] || 0) + event.points;
          totalAwayScore += event.points;
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
