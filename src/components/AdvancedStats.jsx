// src/components/AdvancedStats.jsx
import React, { useMemo } from "react";
import usePlayerStats from "../hooks/usePlayerStats";

export default function AdvancedStats({ players, opponentPlayers, events, team }) {

  const { starters, bench } = useMemo(() => {
    const starters = players
      .filter((p) => p.starter)
      .sort((a, b) => a.number - b.number);
    const bench = players
      .filter((p) => !p.starter)
      .sort((a, b) => a.number - b.number);
    return { starters, bench };
  }, [players]);

  {/* Teams Advanced Stats */}
  const { playerStats: teamPlayerStats, totals: teamTotals } = usePlayerStats(players, events);
  const { playerStats: opponentPlayerStats, totals: opponentTotals } = usePlayerStats(opponentPlayers || [], events || []);

  const teamPossessionsRating = teamTotals.fga - teamTotals.oReb + teamTotals.turnOver + 0.44 * teamTotals.freeThrowA;
  const teamOffensiveRating = teamPossessionsRating > 0
    ? ((teamTotals.pts / teamPossessionsRating) * 100).toFixed(1)
    : 0;

  const opponentTeamPossessionsRating = opponentTotals.fga - opponentTotals.oReb + opponentTotals.turnOver + 0.44 * opponentTotals.freeThrowA;
  const teamDefensiveRating = (opponentTeamPossessionsRating > 0) 
    ? ((opponentTotals.pts / opponentTeamPossessionsRating) * 100).toFixed(1)
    : 0;

  const teamNetRating = (teamOffensiveRating - teamDefensiveRating).toFixed(1)

  const teamAssistPct = (teamTotals.assists > 0)
    ? (teamTotals.assists / teamTotals.assists * 100).toFixed(0)
    : 0;

  const teamAssistsTurnOverRatio = (teamTotals.assists > 0)
    ? (teamTotals.assists / teamTotals.turnOver).toFixed(1)
    : 0;

  const teamPossessionsAssist = teamTotals.fga + 0.44 * teamTotals.freeThrowA + teamTotals.turnOver;
  const teamAssistRatio  = teamPossessionsAssist > 0
    ? ((teamTotals.assists * 100) / teamPossessionsAssist).toFixed(1)
    : 0;

  const teamORebPct = (teamTotals.oReb > 0)
    ? (teamTotals.oReb / teamTotals.oReb * 100).toFixed(0)
    : 0;

  const teamDRebPct = (teamTotals.dReb > 0)
    ? (teamTotals.dReb / teamTotals.dReb * 100).toFixed(0)
    : 0;

  const teamRebPct = (teamTotals.reb > 0)
    ? (teamTotals.reb / teamTotals.reb * 100).toFixed(0)
    : 0;

  const teamPossessionsTurnover = teamTotals.fga + 0.44 * teamTotals.freeThrowA + teamTotals.assists + teamTotals.turnOver;
  const teamTurnoverRatio = teamPossessionsTurnover > 0
    ? ((teamTotals.turnOver * 100) / teamPossessionsTurnover).toFixed(1)
    : 0;

  const teamEffectiveFgPct = teamTotals.fga > 0 
    ? Number(((teamTotals.fgm + 0.5 * teamTotals.threesM) / teamTotals.fga * 100).toFixed(1))
    : 0;

  const teamTrueShootingPct = teamTotals.fga + 0.44 * teamTotals.freeThrowA > 0
    ? Number((teamTotals.pts / (2 * (teamTotals.fga + 0.44 * teamTotals.freeThrowA))) * 100).toFixed(1)
    : 0;

  const teamUsageRate =  teamTotals.teamTotalUsed > 0
    ? Number((teamTotals.playerUsed / teamTotals.teamTotalUsed) * 100).toFixed(1)
    : 0;

  const teamPace = (teamPossessionsRating);

  const gamePieDenominator = (teamTotals.pieNumerator || 0) + (opponentTotals?.pieNumerator || 0);
  const teamPiePct = teamTotals.pieNumerator && gamePieDenominator > 0
    ? Number((teamTotals.pieNumerator / gamePieDenominator * 100).toFixed(1))
    : 0;

  const teamFreeThrowRate = (teamTotals.freeThrowA > 0)
    ? (teamTotals.freeThrowA / teamTotals.fga).toFixed(1)
    : 0;
 
  const renderRow = (player, isStarter = false) => {
    {/* Players Advanced Stats */}

    const stats = teamPlayerStats.find((s) => s.id === player.id) || {};

    const possession = (stats.fga + 0.44 * stats.freeThrowA + stats.turnOver).toFixed(1);
    const offensiveRating = (possession > 0)
      ? ((stats.pts / possession) * 100).toFixed(1)
      : 0;

    const baseTeamDefRating = (opponentTeamPossessionsRating > 0)
      ? ((opponentTotals.pts / opponentTeamPossessionsRating) * 100)
      : 0;

    const defImpactWeight = (stats.dReb + stats.stl + stats.blk) /
      (teamTotals.dReb + teamTotals.stl + teamTotals.blk || 1);

    const defensiveRating = (baseTeamDefRating * (1 - 0.3 * defImpactWeight)).toFixed(1);

    const netRating = (offensiveRating - defensiveRating).toFixed(1)

    const assistPct = (stats.assists > 0)
      ?(stats.assists / teamTotals.assists * 100).toFixed(1)
      : 0;

    const assistTurnOverRatio = stats.turnOver > 0
      ? (stats.assists / stats.turnOver).toFixed(1)
      : 0;

    const assistRatio = possession > 0 
        ? ((stats.assists / possession) * 100).toFixed(1)
        : 0;

    const oRebPct = stats.oReb > 0 ? 
      Number((stats.oReb / teamTotals.oReb) * 100).toFixed(1): 0;

    const dRebPct = stats.dReb > 0 ? 
      Number((stats.dReb / teamTotals.dReb) * 100).toFixed(1): 0;

    const rebPct = stats.reb > 0 ? 
      Number((stats.reb / teamTotals.reb) * 100).toFixed(1): 0;

    const possessionTurnOver = stats.fga + 0.44 * stats.freeThrowA + stats.assists + stats.turnOver;
    const turnoverRatio = possessionTurnOver > 0 
      ? Number((stats.turnOver / possessionTurnOver) * 100).toFixed(1)
      : 0;

    const effectiveFgPct = stats.fga > 0
      ? Number(((stats.fgm + 0.5 * stats.threesM) / stats.fga * 100).toFixed(1))
      : 0;

    const trueShootingPct = stats.fga + 0.44 * stats.freeThrowA > 0
      ? (((stats.pts / (2 * (stats.fga + 0.44 * stats.freeThrowA))) * 100).toFixed(1))
      : 0;

    const usageRate = teamTotals.teamTotalUsed > 0 
      ? ((stats.playerUsed / teamTotals.teamTotalUsed) * 100).toFixed(1)
      : 0;

    const pace = stats.fga - stats.oReb + stats.turnOver + 0.44 * stats.freeThrowA;

    const piePctGame = (stats.pieNumerator && gamePieDenominator > 0)
    ? Number((stats.pieNumerator / gamePieDenominator * 100).toFixed(1))
    : 0;

    const piePctTeam = (teamTotals.pieNumerator > 0)
      ? Number((stats.pieNumerator / teamTotals.pieNumerator * 100).toFixed(1))
      : 0;

    const freeThrowRate = stats.freeThrowA > 0
      ? (stats.freeThrowA / stats.fga).toFixed(1)
      : 0;
    

    return (
      <tr key={player.id}>
        {/* Players Advanced Stats Data */}
        <td className="fixed-left-cell">
          {isStarter ? 
            <strong>#{player.number} - {player.name}</strong> 
            : <>#{player.number} - {player.name}</>
          }
        </td>

        <td>{offensiveRating}</td>

        <td>{defensiveRating}</td>

        <td>{netRating}</td>

        <td>{assistPct}%</td>

        <td>{assistTurnOverRatio}</td>

        <td>{assistRatio}</td>

        <td>{oRebPct}%</td>

        <td>{dRebPct}%</td>

        <td>{rebPct}%</td>

        <td>{turnoverRatio}</td>

        <td>{effectiveFgPct ?? 0}%</td>

        <td>{trueShootingPct ?? 0}%</td>

        <td>{usageRate}%</td>

        {/* <td>{pace}</td> */}

        <td>{piePctGame}</td>

        <td>{possession}</td>

        <td>{freeThrowRate}</td>

      </tr>
    );
  };

  return (
    <div className="team-stats-container">
      {/* Advanced Stats Row Header*/}
      <h2>{team} Advanced Stats</h2>
      {players.length === 0 ? (
        <p>No players added yet.</p>
      ) : (
        <table className="player-stats-table">
          <thead>
            <tr className="table-header-row">

              <th>Player</th>

              <th>OFFRTG</th>

              <th>DEFRTG</th>

              <th>NETRTG*</th>

              <th>AST%</th>

              <th>AST/TO</th>

              <th>AST Ratio</th>

              <th>OREB%</th>

              <th>DREB%</th>

              <th>REB%</th>

              <th>TO Ratio</th>

              <th>eFG%</th>

              <th>TS%</th>

              <th>USG%</th>

              {/*<th>PACE</th>*/}

              <th>PIE</th>

              <th>POSS</th>

              <th>FT Rate</th>

              

            </tr>
          </thead>
          <tbody>
            {/* Starters */}
            {starters.map((p) => renderRow(p, true))}

            {/* Bench */}
            {bench.map((p) => renderRow(p, false))}

            {/* Totals */}
            <tr className="team-totals-row">
              {/* Teams Advanced Stats Data */}
              <td className="fixed-left-cell"><strong>Team Total</strong></td>

              <td>{teamOffensiveRating}</td>

              <td>{teamDefensiveRating}</td>

              <td>{teamNetRating}</td>

              <td>{teamAssistPct}%</td>

              <td>{teamAssistsTurnOverRatio}</td>

              <td>{teamAssistRatio}</td>

              <td>{teamORebPct}%</td>

              <td>{teamDRebPct}%</td>

              <td>{teamRebPct}%</td>

              <td>{teamTurnoverRatio}</td>

              <td>{teamEffectiveFgPct}%</td>

              <td>{teamTrueShootingPct}%</td>

              <td>{teamUsageRate}%</td>

              {/* <td>{teamPace}</td> */}

              <td>{teamPiePct}</td>

              <td>{teamPossessionsRating}</td>

              <td>{teamFreeThrowRate}</td>
              
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
