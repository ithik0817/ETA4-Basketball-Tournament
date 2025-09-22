// src/App.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import './App.css'
import Header from './components/Header'
import Auth from './components/Auth'
import { auth, db } from './firebase'
import { collection, doc, getDoc, getDocs, addDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from 'firebase/auth'
import { fetchTeams } from './components/data/fetchTeams'
import { fetchRoster } from './components/data/fetchRoster'
import { fetchGames } from './components/data/fetchGames'
import { fetchTournaments } from './components/data/fetchTournaments'
import { Substitutions } from './components/Substitutions'
import Stats from './components/Stats'
import Court from './components/Court'
import Players from "./components/Players";
import ScoreTable from "./components/ScoreTable";

function App() {
  const [user, setUser] = useState(null);
  const [show, setShow] = React.useState(true)
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [homeRoster, setHomeRoster] = useState([]);
  const [awayRoster, setAwayRoster] = useState([]);
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [roster, setRoster] = useState([]);
  const [pendingBenchSub, setPendingBenchSub] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activeAwayPlayers, setActiveAwayPlayers] = useState(awayRoster.slice(0, 5));
  const [activeHomePlayers, setActiveHomePlayers] = useState(homeRoster.slice(0, 5));
  const [currentQuarter, setCurrentQuarter] = useState(1);
  const quarters = [1, 2, 3, 4, "OT"];
  const selectedGame = games.find((g) => g.id === selectedGameId);
  const homeTeamId = selectedGame?.homeTeamId;
  const awayTeamId = selectedGame?.awayTeamId;
  const initialActiveRef = useRef({ home: false, away: false });
  const [shots, setShots] = useState([]);
  const sortedShots = useMemo(() => {
    if (!shots || shots.length === 0) {
      return [];
    }
    return [...shots].sort((a, b) => {
      // Safely get a Date object for both 'a' and 'b'.
      // The `instanceof` check is more reliable than optional chaining alone.
      const dateA = a.createdAt instanceof Date 
        ? a.createdAt 
        : a.createdAt?.toDate() ?? new Date(0); // Use a fallback date
        
      const dateB = b.createdAt instanceof Date 
        ? b.createdAt 
        : b.createdAt?.toDate() ?? new Date(0); // Use a fallback date
      
      // getTime() returns the numeric value corresponding to the time for the specified date
      return dateA.getTime() - dateB.getTime();
    });
  }, [shots]);

  const handleSub = (teamId, playerOutId, playerInId) => {
    const rosterToUpdate = teamId === awayTeamId ? activeAwayPlayers : activeHomePlayers;
    const setRosterState = teamId === awayTeamId ? setActiveAwayPlayers : setActiveHomePlayers;
    const fullRoster = teamId === awayTeamId ? awayRoster : homeRoster;

    const playerOut = rosterToUpdate.find(p => p.id === playerOutId);
    const playerIn = fullRoster.find(p => p.id === playerInId);

    if (playerOut && playerIn) {
        const newActiveRoster = rosterToUpdate.map(player => 
            player.id === playerOutId ? playerIn : player
        );

        newActiveRoster.sort((a, b) => a.number - b.number);
        
        setRosterState(newActiveRoster);
    }
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoadingData(true);
      setUser(currentUser);

      if (currentUser) {
        const idTokenResult = await currentUser.getIdTokenResult(true);
        console.log("Custom claims from token:", idTokenResult.claims);
      } else {
        setUser(null);
        setTeams([]);
        setTournaments([]);
      }
      setIsLoadingData(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedGameId) return;

    const game = games.find((g) => g.id === selectedGameId);
    if (!game) return;

    let unsubHomeTeam = () => {};
    let unsubHomeRoster = () => {};
    let unsubAwayTeam = () => {};
    let unsubAwayRoster = () => {};

    if (game.homeTeamId) {
      const homeTeamRef = doc(db, "teams", game.homeTeamId);
      unsubHomeTeam = onSnapshot(homeTeamRef, (snap) => {
        if (snap.exists()) setHomeTeamName(snap.data().name || "Unknown Team");
        else setHomeTeamName("Unknown Team");
      }, (err) => console.error("homeTeam onSnapshot:", err));

      const homeRosterColl = collection(homeTeamRef, "roster");
      unsubHomeRoster = onSnapshot(homeRosterColl, (snap) => {
        setHomeRoster(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("homeRoster onSnapshot:", err));
    }

    if (game.awayTeamId) {
      const awayTeamRef = doc(db, "teams", game.awayTeamId);
      unsubAwayTeam = onSnapshot(awayTeamRef, (snap) => {
        if (snap.exists()) setAwayTeamName(snap.data().name || "Unknown Team");
        else setAwayTeamName("Unknown Team");
      }, (err) => console.error("awayTeam onSnapshot:", err));

      const awayRosterColl = collection(awayTeamRef, "roster");
      unsubAwayRoster = onSnapshot(awayRosterColl, (snap) => {
        setAwayRoster(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("awayRoster onSnapshot:", err));
    }

    return () => {
      try { unsubHomeTeam(); } catch {}
      try { unsubHomeRoster(); } catch {}
      try { unsubAwayTeam(); } catch {}
      try { unsubAwayRoster(); } catch {}
    };
  }, [selectedGameId, games]);

  useEffect(() => {
    async function loadRoster() {
      if (!selectedTeamId) return;
      const fetchedRoster = await fetchRoster(db, selectedTeamId);
      setRoster(fetchedRoster);
    }
    loadRoster();
  }, [selectedTeamId]);

  useEffect(() => {
    async function loadGame() {
      if (!selectedGameId) return;
      const fetchedGame = await fetchGames(db, selectedGameId);
      setRoster(fetchedGame);
    }
    loadGame();
  }, [selectedGameId]);

  useEffect(() => {
    async function loadTournamentData() {
        const fetchedTournaments = await fetchTournaments(db);
        setTournaments(fetchedTournaments);
        if (fetchedTournaments.length > 0) {
            setSelectedTournament(fetchedTournaments[0]);
        }
    }
    loadTournamentData();
  }, []); 

  useEffect(() => {
    async function loadGamesAndTeams() {
      if (selectedTournament) {
          const fetchedGames = await fetchGames(db, selectedTournament.id);
          setGames(fetchedGames);
          const fetchedTeams = await fetchTeams(db, selectedTournament.id);
          setTeams(fetchedTeams);
      }
    }
    loadGamesAndTeams();

  }, [selectedTournament]);

  useEffect(() => {
    if (!selectedGameId) {
      setShots([]);
      setHomeRoster([]);
      setAwayRoster([]);
      setHomeTeamName("");
      setAwayTeamName("");
      setSelectedPlayerId(null);
      setSelectedTeamId(null);
    }
  }, [selectedGameId]);

  useEffect(() => {
    if (!selectedTournament || !selectedGameId) {
      setShots([]);
      return;
    }

    const shotsColl = collection(
      db,
      "tournaments",
      selectedTournament.id,
      "games",
      selectedGameId,
      "shots"
    );

    const q = query(shotsColl, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        createdAt: d.data().createdAt?.toDate()
      }));
      setShots(docs);
    }, (error) => {
      console.error("shots onSnapshot error:", error);
    });

    return () => unsubscribe();
}, [selectedTournament, selectedGameId]);

  async function handleAddShot(shot) {
    if (!selectedGameId) {
      console.error("No selected game ID. Cannot add shot.");
      return;
    }

    const shotsRef = collection(
      db,
      "tournaments",
      selectedTournament.id,
      "games",
      selectedGameId,
      "shots"
    );
    try {
      const { id, ...shotDataToStore } = shot;

      const docRef = await addDoc(shotsRef, {
        ...shotDataToStore,
        createdAt: new Date(),
      });

      console.log("Added shot to Firestore with ID:", docRef.id);

    } catch (error) {
      console.error("Error adding shot:", error);
    }
  }

  async function handleUndoShot() {
    if (shots.length === 0) return;

    const lastShot = shots[shots.length - 1];

    if (selectedGameId && lastShot?.id) {
      try {
        const shotRef = doc(
          db,
          "tournaments",
          selectedTournament.id,
          "games",
          selectedGameId,
          "shots",
          lastShot.id
        );
        await deleteDoc(shotRef);
        console.log("Deleted last shot from Firestore:", lastShot.id);
      } catch (err) {
        console.error("Error deleting last shot:", err);
      }
    }
  }

  useEffect(() => {
    initialActiveRef.current = { home: false, away: false };
  }, [selectedGameId]);

  useEffect(() => {
    if (homeRoster.length && !initialActiveRef.current.home) {
      const starters = homeRoster
        .filter(player => player.starter)
        .sort((a, b) => a.number - b.number);
      setActiveHomePlayers(starters);
      initialActiveRef.current.home = true;
    }
  }, [homeRoster]);

  useEffect(() => {
    if (awayRoster.length && !initialActiveRef.current.away) {
      const starters = awayRoster
        .filter(player => player.starter)
        .sort((a, b) => a.number - b.number);
      setActiveAwayPlayers(starters);
      initialActiveRef.current.away = true;
    }
  }, [awayRoster]);

  function formatDate(maybeTimestamp) {
    if (!maybeTimestamp) return "";
    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate().toLocaleString();
    }
    if (maybeTimestamp instanceof Date) 
      return maybeTimestamp.toLocaleString();
    return String(maybeTimestamp);
  }

  if (isLoadingData) {
    return <div>Loading...</div>;
  }

  return (
    <main className="App">
      <Header/>
      <Auth user={user} setUser={setUser} />

      {!user ? (
        <p>Please login to start tracking stats.</p>
      ) : (
        <>
          <h2>Select Game</h2>
          <select className="default-option"
            value={selectedGameId || ""}
            onChange={(e) => setSelectedGameId(e.target.value)}
          >
            <option value="">-- Select a game --</option>
            {games.map((g) => {
              const homeTeam = teams.find((t) => t.id === g.homeTeamId);
              const awayTeam = teams.find((t) => t.id === g.awayTeamId);
              return (
                <option key={g.id} value={g.id}>
                  {awayTeam?.name || g.awayTeamId} vs{" "}
                  {homeTeam?.name || g.homeTeamId} — {formatDate(g.date)}
                </option>
              );
            })}
          </select>
          {selectedGameId && (
            <>
              <div>
                <ScoreTable 
                  awayTeamId={awayTeamId}
                  homeTeamId={homeTeamId} 
                  awayTeamName={awayTeamName}
                  homeTeamName={homeTeamName} 
                  quarter={currentQuarter}
                  shots={shots}
                />
                 <div className="quarter-control">
                  <h3>Quarter: {currentQuarter}</h3>
                  {quarters.map((q, i) => (
                    <button
                      key={i}
                      className={currentQuarter === q ? "active" : ""}
                      onClick={() => setCurrentQuarter(q)} // Set the state on click
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <div className="app-container">
                    <div className="app-content"> 
                      <div className="game-layout-container">
                        {/* Pass the active players lists here */}
                        <Players
                          players={activeAwayPlayers} // Use active players
                          setPlayers={setActiveAwayPlayers}
                          selectedPlayerId={selectedPlayerId}
                          setSelectedPlayerId={setSelectedPlayerId}
                          selectedTeamId={awayTeamId}
                          setSelectedTeamId={setSelectedTeamId}
                          team={awayTeamName}
                          teamId={awayTeamId}
                          onSub={handleSub}
                          pendingBenchSub={pendingBenchSub}
                          setPendingBenchSub={setPendingBenchSub}
                        />
                        <Court 
                          onAddShot={handleAddShot} 
                          selectedPlayerId={selectedPlayerId}
                          selectedTeamId={selectedTeamId}
                          onUndo={handleUndoShot} 
                          shots={shots}
                          quarter={currentQuarter}
                        />
                        <Players
                          players={activeHomePlayers} // Use active players
                          setPlayers={setActiveHomePlayers}
                          selectedPlayerId={selectedPlayerId}
                          setSelectedPlayerId={setSelectedPlayerId}
                          selectedTeamId={homeTeamId}
                          setSelectedTeamId={setSelectedTeamId} 
                          team={homeTeamName}
                          teamId={homeTeamId}
                          onSub={handleSub}
                          pendingBenchSub={pendingBenchSub}
                          setPendingBenchSub={setPendingBenchSub}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="sub-panels-wrapper">
                    <Substitutions
                      teamId={awayTeamId}
                      teamName={awayTeamName}
                      fullRoster={awayRoster}
                      activePlayers={activeAwayPlayers}
                      onSub={handleSub}
                      setPendingBenchSub={setPendingBenchSub}
                      pendingBenchSub={pendingBenchSub}
                    />

                    <Substitutions
                      teamId={homeTeamId}
                      teamName={homeTeamName}
                      fullRoster={homeRoster}
                      activePlayers={activeHomePlayers}
                      onSub={handleSub}
                      setPendingBenchSub={setPendingBenchSub}
                      pendingBenchSub={pendingBenchSub}
                    />
                  </div>

                  {/* Stats Table Away Team*/}
                    <Stats 
                      players={awayRoster}
                      shots={shots}
                      team={awayTeamName}
                    />
                  
                  {/* Stats Table Away Home*/}
                    <Stats 
                      players={homeRoster}
                      shots={shots}
                      team={homeTeamName}
                    />
                  {/* Play-by-Play */}
                <div style={{ marginTop: 16, fontSize: 14, color: "#ffffff" }}>
                  <h3>Shots Log</h3>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                       {sortedShots.map((s) => {
                          const player =
                            homeRoster.find((p) => p.id === s.playerId) ||
                            awayRoster.find((p) => p.id === s.playerId);

                          const homeTeam = { id: homeTeamId, name: homeTeamName };
                          const awayTeam = { id: awayTeamId, name: awayTeamName };

                          let teamName = "Unknown";
                          if (s.teamId === homeTeam.id) teamName = homeTeam.name;
                          if (s.teamId === awayTeam.id) teamName = awayTeam.name;

                          return (
                            <li key={s.id} className={s.made ? "bold" : ""}>
                              {teamName} {player?.name || "Unknown"}{" "}
                              {s.made ? "makes a" : "misses a"}{" "}
                              {s.isFreeThrow
                                ? "free throw for 1 point"
                                : `${Math.round(s.distFt)}-foot ${s.is3 ? "3-pointer" : "2-pointer"}`}
                            </li>
                          );
                        })}
                    </ul>
                </div>
                </>
          )}

          
        </>
      )}
    </main>
  )
}

export default App
