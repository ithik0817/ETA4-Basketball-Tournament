// src/hooks/usePlayerStats.js
import { useMemo } from "react";

export default function usePlayerStats(players = [], events = []) {
  const playerStats = useMemo(() => {
    return players.map((p) => {
      const playerEvents = events.filter((e) => e.playerId === p.id);

      const twosA = playerEvents.filter((e) => e.points === 2).length;
      const twosM = playerEvents.filter((e) => e.points === 2 && e.made).length;
      const threesA = playerEvents.filter((e) => e.points === 3).length;
      const threesM = playerEvents.filter((e) => e.points === 3 && e.made).length;

      const fgm = twosM + threesM;
      const fga = twosA + threesA;

      const freeThrowA = playerEvents.filter((e) => e.points === 1).length;
      const freeThrowM = playerEvents.filter((e) => e.points === 1 && e.made).length;

      const oReb = playerEvents.filter((e) => e.type === "offRebound").length;
      const dReb = playerEvents.filter((e) => e.type === "defRebound").length;
      const reb = oReb + dReb;

      const assists = events.filter((e) => e.assistPlayerId === p.id).length;
      const stl = playerEvents.filter((e) => e.type === "steal").length;
      const blk = playerEvents.filter((e) => e.type === "block").length;
      const turnOver = playerEvents.filter((e) => e.type === "turnOver").length;
      const pf = playerEvents.filter((e) => e.type === "foul").length;

      const pts = playerEvents.reduce((sum, e) => sum + (e.made ? e.points : 0), 0);

      const twoPct = twosA > 0 ? Number((twosM / twosA) * 100).toFixed(1) : 0;
      const threePct = threesA > 0 ? Number((threesM / threesA) * 100).toFixed(1) : 0;
      const fgPct = fga > 0 ? Number((fgm / fga) * 100).toFixed(1) : 0;
      const freeThrowPct = freeThrowA > 0 ? Number((freeThrowM / freeThrowA) * 100).toFixed(1) : 0;

      const playerUsed = fga + 0.44 * freeThrowA + turnOver;

      const pieNumerator = 
        Number(pts || 0)
        + Number(fgm || 0)
        + Number(freeThrowM || 0)
        - Number(fga || 0)
        - Number(freeThrowA || 0)
        + Number(oReb || 0)
        + Number(dReb || 0)
        + Number(stl || 0)
        + Number(blk || 0)
        + Number(assists || 0)
        - Number(pf || 0)
        - Number(turnOver || 0);

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
        
        playerUsed,
        pieNumerator,
      };
    });
  }, [players, events]);

  

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
      pieNumerator: sum.pieNumerator + (p.pieNumerator || 0),
      
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
      pieNumerator: 0,
    });

    total.teamTotalUsed = total.playerUsed;


    return total;
  }, [playerStats]);

  return { playerStats, totals };
}
