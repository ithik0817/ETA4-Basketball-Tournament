import React, { useMemo } from "react";

// Define possible quarter labels, including overtime
const quarterLabels = [1, 2, 3, 4, "OT"];

export default function ScoreTable({ awayTeamId, homeTeamId, awayTeamName, homeTeamName, shots }) {
  // Use useMemo to re-calculate scores only when the 'shots' array changes
  const { homeScoresByQuarter, awayScoresByQuarter, totalHomeScore, totalAwayScore } = useMemo(() => {
    // Initialize quarter-by-quarter score objects
    const homeScoresByQuarter = {};
    const awayScoresByQuarter = {};
    let totalHomeScore = 0;
    let totalAwayScore = 0;

    // Initialize all quarters to a score of 0
    quarterLabels.forEach(q => {
      homeScoresByQuarter[q] = 0;
      awayScoresByQuarter[q] = 0;
    });

    // Loop through all made shots and tally scores by team and quarter
    shots.forEach(shot => {
      if (shot.made) {
        if (shot.teamId === homeTeamId) {
          homeScoresByQuarter[shot.quarter] += shot.points;
          totalHomeScore += shot.points;
        } else if (shot.teamId === awayTeamId) {
          awayScoresByQuarter[shot.quarter] += shot.points;
          totalAwayScore += shot.points;
        }
      }
    });

    return {
      homeScoresByQuarter,
      awayScoresByQuarter,
      totalHomeScore,
      totalAwayScore,
    };
  }, [shots, homeTeamId, awayTeamId]); // Dependency array includes team IDs

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
            <td>{totalAwayScore}</td>
          </tr>
          <tr>
            <td className="team-name">{homeTeamName || "Home Team"}</td>
            {quarterLabels.map(q => (
              <td key={q}>{homeScoresByQuarter[q]}</td>
            ))}
            <td>{totalHomeScore}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
