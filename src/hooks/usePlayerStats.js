// src/hooks/usePlayerStats.js
import { useMemo } from "react";

export default function usePlayerStats(players, shots) {
  const playerStats = useMemo(() => {
    return players.map((p) => {
      const playerShots = shots.filter((s) => s.playerId === p.id);

      const twosA = playerShots.filter((s) => s.points === 2).length;
      const twosM = playerShots.filter((s) => s.points === 2 && s.made).length;
      const threesA = playerShots.filter((s) => s.points === 3).length;
      const threesM = playerShots.filter((s) => s.points === 3 && s.made).length;

      const fgm = twosM + threesM;
      const fga = twosA + threesA;

      const freeThrowA = playerShots.filter((s) => s.points === 1).length;
      const freeThrowM = playerShots.filter((s) => s.points === 1 && s.made).length;

      const oReb = playerShots.filter((s) => s.type === "offRebound").length;
      const dReb = playerShots.filter((s) => s.type === "defRebound").length;
      const reb = oReb + dReb;

      const assists = shots.filter((s) => s.assistPlayerId === p.id).length;
      const stl = playerShots.filter((s) => s.type === "steal").length;
      const blk = playerShots.filter((s) => s.type === "block").length;
      const turnOver = playerShots.filter((s) => s.type === "turnOver").length;
      const pf = playerShots.filter((s) => s.type === "foul").length;

      const pts = playerShots.reduce((sum, s) => sum + (s.made ? s.points : 0), 0);

      const twoPct = twosA > 0 ? Number((twosM / twosA) * 100).toFixed(1) : 0;
      const threePct = threesA > 0 ? Number((threesM / threesA) * 100).toFixed(1) : 0;
      const fgPct = fga > 0 ? Number((fgm / fga) * 100).toFixed(1) : 0;

      const freeThrowPct = freeThrowA > 0 ? Number((freeThrowM / freeThrowA) * 100).toFixed(1) : 0;

      const trueShootingPct = fga + 0.44 * freeThrowA > 0 ? Number(((pts / (2 * (fga + 0.44 * freeThrowA))) * 100).toFixed(1)): 0;

      const effectiveFgPct = fga > 0 ? Number(((fgm + 0.5 * threesM) / fga * 100).toFixed(1)): 0;

      const playerUsed = fga + 0.44 * freeThrowA + turnOver;


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
        
        trueShootingPct,
        effectiveFgPct,
        playerUsed,
      };
    });
  }, [players, shots]);

  const totals = useMemo(() => {
    const total = playerStats.reduce(
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
      playerUsed: sum.playerUsed + p.playerUsed,
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
      
      pts: 0,
      playerUsed: 0,
    });

    total.teamTotalUsed = total.playerUsed;

    return total;
  }, [playerStats]);

  return { playerStats, totals };
}
