// src/hooks/useTournamentManager.js
import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { fetchTeams } from "../components/data/fetchTeams";
import { fetchGames } from "../components/data/fetchGames";
import { fetchTournaments } from "../components/data/fetchTournaments";

export default function useTournamentManager(selectedRole, user) {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [games, setGames] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [events, setEvents] = useState([]);

  const [homeRoster, setHomeRoster] = useState([]);
  const [awayRoster, setAwayRoster] = useState([]);
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");

  const selectedGame = games.find((g) => g.id === selectedGameId);
  const homeTeamId = selectedGame?.homeTeamId;
  const awayTeamId = selectedGame?.awayTeamId;

  useEffect(() => {
    async function loadTournaments() {
      const fetched = await fetchTournaments(db);
      setTournaments(fetched);
      if (fetched.length > 0) setSelectedTournament(fetched[0]);
    }
    loadTournaments();
  }, []);

  useEffect(() => {
    if (!selectedTournament) return;
    async function loadGamesAndTeams() {
      const [fetchedGames, fetchedTeams] = await Promise.all([
        fetchGames(db, selectedTournament.id),
        fetchTeams(db, selectedTournament.id),
      ]);
      setGames(fetchedGames);
      setTeams(fetchedTeams);
    }
    loadGamesAndTeams();
  }, [selectedTournament]);

  useEffect(() => {
    if (!selectedGameId) return;
    const game = games.find((g) => g.id === selectedGameId);
    if (!game) return;

    let unsubHomeTeam = () => {};
    let unsubAwayTeam = () => {};
    let unsubHomeRoster = () => {};
    let unsubAwayRoster = () => {};

    if (game.homeTeamId) {
      const homeRef = doc(db, "teams", game.homeTeamId);
      unsubHomeTeam = onSnapshot(homeRef, (snap) => {
        setHomeTeamName(snap.exists() ? snap.data().name : "Unknown Team");
      });
      const homeRosterColl = collection(homeRef, "roster");
      unsubHomeRoster = onSnapshot(homeRosterColl, (snap) => {
        setHomeRoster(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    }

    if (game.awayTeamId) {
      const awayRef = doc(db, "teams", game.awayTeamId);
      unsubAwayTeam = onSnapshot(awayRef, (snap) => {
        setAwayTeamName(snap.exists() ? snap.data().name : "Unknown Team");
      });
      const awayRosterColl = collection(awayRef, "roster");
      unsubAwayRoster = onSnapshot(awayRosterColl, (snap) => {
        setAwayRoster(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    }

    return () => {
      unsubHomeTeam();
      unsubAwayTeam();
      unsubHomeRoster();
      unsubAwayRoster();
    };
  }, [selectedGameId, games]);

  useEffect(() => {
    if (!selectedTournament || !selectedGameId) {
      setEvents([]);
      return;
    }

    const eventsColl = collection(
      db,
      "tournaments",
      selectedTournament.id,
      "games",
      selectedGameId,
      "events"
    );

    const q = query(eventsColl, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setEvents(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate(),
        }))
      );
    });

    return () => unsubscribe();
  }, [selectedTournament, selectedGameId]);

  return {
    selectedTournament,
    games,
    teams,
    selectedGameId,
    setSelectedGameId,
    events,
    setEvents,
    homeRoster,
    setHomeRoster,
    awayRoster,
    setAwayRoster,
    homeTeamName,
    setHomeTeamName,
    awayTeamName,
    setAwayTeamName,
    homeTeamId,
    awayTeamId,
  };
}
