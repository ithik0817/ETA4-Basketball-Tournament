// src/hooks/useRosterManager.js
import { useState, useEffect , useRef, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot, 
} from "firebase/firestore";
import { fetchRoster } from '../components/data/fetchRoster';

export default function useRosterManager(
    selectedGameId,
    selectedTeamId,
    awayTeamId,
    homeTeamId,
    awayRoster,
    homeRoster
) {
    const initialActiveRef = useRef({ home: false, away: false });
    const [activeHomePlayers, setActiveHomePlayers] = useState(homeRoster.slice(0, 5));
    const [activeAwayPlayers, setActiveAwayPlayers] = useState(awayRoster.slice(0, 5));

    useEffect(() => {
        async function loadRoster() {
          if (!selectedTeamId) return;
          const fetchedRoster = await fetchRoster(db, selectedTeamId);
          setRoster(fetchedRoster);
        }
        loadRoster();
      }, [selectedTeamId]);

    const handleSub = useCallback(
        (teamId, activePlayerIds, benchPlayerIds) => {
        const isAway = teamId === awayTeamId;
        const fullRoster = isAway ? awayRoster : homeRoster;
        const setActive = isAway ? setActiveAwayPlayers : setActiveHomePlayers;

        setActive((prev) => {
            let newRoster = [...prev];
            const playersIn = benchPlayerIds.map((id) =>
            fullRoster.find((p) => p.id === id)
            );
            activePlayerIds.forEach((outId, i) => {
            const playerIn = playersIn[i];
            const idx = newRoster.findIndex((p) => p.id === outId);
            if (idx !== -1 && playerIn) newRoster[idx] = playerIn;
            });
            return newRoster.sort((a, b) => a.number - b.number);
        });
        },
        [awayTeamId, awayRoster, homeRoster]
    );

    useEffect(() => {
        initialActiveRef.current = {
        home: false,
        away: false };
    }, [selectedGameId]);

    useEffect(() => {
        if (homeRoster.length && !initialActiveRef.current.home) {
        const starters = homeRoster
            .filter((p) => p.starter);
        setActiveHomePlayers(starters
            .sort((a, b) => a.number - b.number));
        initialActiveRef.current.home = true;
        }
    }, [homeRoster]);

    useEffect(() => {
        if (awayRoster.length && !initialActiveRef.current.away) {
        const starters = awayRoster
            .filter((p) => p.starter);
        setActiveAwayPlayers(starters
            .sort((a, b) => a.number - b.number));
        initialActiveRef.current.away = true;
        }
    }, [awayRoster]);
    
    return {
        setActiveAwayPlayers,
        setActiveHomePlayers,
        activeHomePlayers,
        activeAwayPlayers,
        handleSub,
    }
}