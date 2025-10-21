// src/App.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './App.css'
import Header from './components/Header'
import Auth from './components/Auth'
import { auth, db } from './firebase'
import { collection, doc, getDoc, getDocs, addDoc, deleteDoc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'
import { fetchTeams } from './components/data/fetchTeams'
import { fetchRoster } from './components/data/fetchRoster'
import { fetchGames } from './components/data/fetchGames'
import { fetchTournaments } from './components/data/fetchTournaments'
import { Substitutions } from './components/Substitutions'
import Stats from './components/Stats'
import Court from './components/Court'
import Players from './components/Players';
import ScoreTable from './components/ScoreTable';
import { ROLES } from './constants/roles';
import RoleSelect from './components/RoleSelect';
import AdvancedStats from './components/AdvancedStats'


function App() {
  const [flipCourt, setFlipCourt] = useState(true);
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
  const [pendingBenchSubs, setPendingBenchSubs] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activeAwayPlayers, setActiveAwayPlayers] = useState(awayRoster.slice(0, 5));
  const [activeHomePlayers, setActiveHomePlayers] = useState(homeRoster.slice(0, 5));
  const [currentQuarter, setCurrentQuarter] = useState(1);
  const quarters = [1, 2, 3, 4, "OT"];
  const selectedGame = games.find((g) => g.id === selectedGameId);
  const homeTeamId = selectedGame?.homeTeamId;
  const awayTeamId = selectedGame?.awayTeamId;
  const initialActiveRef = useRef({ home: false, away: false });
  const [events, setEvents] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [courtFilter, setCourtFilter] = useState({
    team: "all",
    player: "all",
    quarter: "all"
  });

  const sortedEvents = useMemo(() => {
    if (!events || events.length === 0) {
      return [];
    }
    return [...events].sort((a, b) => {
      const dateA = a.createdAt instanceof Date 
        ? a.createdAt 
        : a.createdAt?.toDate() ?? new Date(0);
      const dateB = b.createdAt instanceof Date 
        ? b.createdAt 
        : b.createdAt?.toDate() ?? new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  }, [events]);

  const handleSub = useCallback((teamId, activePlayerIds, benchPlayerIds) => {

    console.log("APP.JSX")
    console.log("activePlayerIds", activePlayerIds)
    console.log("benchPlayerIds", benchPlayerIds)

    const setRosterState = teamId === awayTeamId ? setActiveAwayPlayers : setActiveHomePlayers;
    const fullRoster = teamId === awayTeamId ? awayRoster : homeRoster;

    setRosterState(prevRoster => {
        let newRoster = [...prevRoster];
        const playersToSubIn = benchPlayerIds.map(id => fullRoster.find(p => p.id === id));
        
        if (activePlayerIds.length !== playersToSubIn.length) {
            console.error("Mismatch in number of players for substitution.");
            return prevRoster;
        }

        activePlayerIds.forEach((outId, index) => {
            const playerIn = playersToSubIn[index];
            const playerOutIndex = newRoster.findIndex(p => p.id === outId);
            if (playerOutIndex !== -1 && playerIn) {
                newRoster[playerOutIndex] = playerIn;
            }
        });

        newRoster.sort((a, b) => a.number - b.number);
        return newRoster;
    });
  }, [awayTeamId, awayRoster, homeRoster,]);

  const homeTimeouts = events.filter(
    (e) => e.type === "timeOut" && e.teamId === homeTeamId
  ).length;

  const awayTimeouts = events.filter(
    (e) => e.type === "timeOut" && e.teamId === awayTeamId
  ).length;

  const isOvertime = currentQuarter === "OT";

  const homeFouls = events.filter(
    (e) => (e.foulType === "personal" || 
      e.foulType === "defensive" || 
      e.foulType === "technical") && 
    e.teamId === homeTeamId && 
    (isOvertime ? e.quarter === 4 || e.quarter === "OT" : e.quarter === currentQuarter)
  ).length;

  const awayFouls = events.filter(
    (e) => (e.foulType === "personal" || 
      e.foulType === "defensive" || 
      e.foulType === "technical") && 
    e.teamId === awayTeamId && 
    (isOvertime ? e.quarter === 4 || e.quarter === "OT" : e.quarter === currentQuarter)
  ).length;

  const handleUndoTimeout = async (teamId) => {

    try {
      const eventsRef = collection(
        db,
        "tournaments",
        selectedTournament.id,
        "games",
        selectedGameId,
        "events"
      );

      const q = query(eventsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const teamTimeouts = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((e) => e.type === "timeOut" && e.teamId === teamId);

      if (teamTimeouts.length === 0) {
        alert("No timeouts to undo for this team.");
        return;
      }

      const lastTimeout = teamTimeouts[0];
      await deleteDoc(
        doc(
          db,
          "tournaments",
          selectedTournament.id,
          "games",
          selectedGameId,
          "events",
          lastTimeout.id
        )
      );
      await syncEventHistory(lastTimeout, "delete");
      console.log(`Removed last timeout for team: ${teamId}`);
    } catch (error) {
      console.error("Error undoing timeout:", error);
    }
    };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setIsLoadingData(true);
      
      if (authUser) {
        // User is signed in. Fetch their custom role from Firestore.
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          // Merge Firebase Auth user data with Firestore profile data
          const userWithRole = { ...authUser, ...userData };
          setUser(userWithRole);

          if (userData.role) {
            setSelectedRole(userData.username);
          }

          const idTokenResult = await authUser.getIdTokenResult(true);
          //console.log("Custom claims from token exist:", idTokenResult.claims);
          //console.log("ROLE:", userWithRole);
        } else {
          setUser(authUser);
          const idTokenResult = await authUser.getIdTokenResult(true);
        }
      } else {
        // User is signed out. Clear all user-related state.
        setUser(null);
        setTeams([]);
        setTournaments([]);
      }
      
      setIsLoadingData(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []); // Run only once on mount to set up the listener


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
      setEvents([]);
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
      const docs = snap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        createdAt: d.data().createdAt?.toDate()
      }));
      setEvents(docs);
    }, (error) => {
      console.error("events onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, [selectedTournament, selectedGameId]);

  async function handleAddEvent(event) {
    if (!selectedGameId) {
      console.error("No selected game ID. Cannot add event.");
      return;
    }

    const eventsRef = collection(
      db,
      "tournaments",
      selectedTournament.id,
      "games",
      selectedGameId,
      "events"
    );

    try {
      const { id, ...eventDataToStore } = event;

      const docRef = await addDoc(eventsRef, {
        ...eventDataToStore,
        createdAt: new Date(),
      });

      const storedEvent = { id: docRef.id, ...eventDataToStore };
      await syncEventHistory(storedEvent, "add");

    } catch (error) {
      console.error("Error adding event:", error);
    }
  }

  async function handleUndoEvent() {
    if (events.length === 0) return;

    let eventToDelete;
    const allowedRoles = ["admin", "homeOffense", "awayOffense", "homeDefense", "awayDefense"];

    if (!allowedRoles.includes(selectedRole)) {
      alert("User role not permitted to undo events.");
      return;
    }

    if (selectedRole === "admin") {
      eventToDelete = events[events.length - 1];
    } else {
      for (let i = events.length - 1; i >= 0; i--) {
        if (events[i].role === selectedRole) {
          eventToDelete = events[i];
          break;
        }
      }

      if (!eventToDelete) {
        alert(`Role ${user.role}: has no logs to undo.`);
      }
    }

    if (selectedGameId && eventToDelete?.id) {
      try {
        const eventRef = doc(
          db,
          "tournaments",
          selectedTournament.id,
          "games",
          selectedGameId,
          "events",
          eventToDelete.id
        );

        await deleteDoc(eventRef);
        await syncEventHistory(eventToDelete, "delete");
        //console.log("Deleted event from Firestore:", eventToDelete.id);
      } catch (err) {
        console.error("Error deleting event:", err);
      }
    }
  }

  async function syncEventHistory(event, actionType) {
    try {
      const { teamId, playerId, id: eventId } = event; // Use 'id' for the original event ID

      const syncAction = async (historyRef) => {
        if (actionType === "add") {
          // Add a new document to the history
          await addDoc(historyRef, {
            ...event,
            createdAt: new Date(),
            source: "events"
          });
        } else if (actionType === "delete") {
          // Find and delete the matching history document
          const q = query(historyRef, where("id", "==", eventId)); // Query for the original event ID
          const querySnapshot = await getDocs(q);

          querySnapshot.forEach(async (docToDelete) => {
            await deleteDoc(docToDelete.ref);
          });
        }
      };

      // TEAM HISTORY
      if (teamId) {
        const teamHistoryRef = collection(db, "teams", teamId, "history");
        await syncAction(teamHistoryRef);
      }

      // PLAYER HISTORY
      if (playerId) {
        const playerHistoryRef = collection(db, "players", playerId, "history");
        await syncAction(playerHistoryRef);
      }

    } catch (err) {
      console.error("Error syncing event history:", err);
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

  const renderSubstitutions = () => {
    if (flipCourt) {
      if (selectedRole === 'awayOffense' || selectedRole === 'awayDefense') {
        return (
          <Substitutions
            teamId={awayTeamId}
            teamName={awayTeamName}
            fullRoster={awayRoster}
            activePlayers={activeAwayPlayers}
            onSub={handleSub}
            quarter={currentQuarter}
            onAddEvent={handleAddEvent}
            pendingBenchSubs={pendingBenchSubs}
            setPendingBenchSubs={setPendingBenchSubs}
            usedTimeouts={awayTimeouts}
            undoTimeout={handleUndoTimeout}
            role={selectedRole}
          />
        );
      } else if (selectedRole === 'homeOffense' || selectedRole === 'homeDefense') {
        return (
          <Substitutions
            teamId={homeTeamId}
            teamName={homeTeamName}
            fullRoster={homeRoster}
            activePlayers={activeHomePlayers}
            onSub={handleSub}
            quarter={currentQuarter}
            onAddEvent={handleAddEvent}
            pendingBenchSubs={pendingBenchSubs}
            setPendingBenchSubs={setPendingBenchSubs}
            usedTimeouts={homeTimeouts}
            undoTimeout={handleUndoTimeout}
            role={selectedRole}
          />
        );
      }
    } else { // flipCourt is false
      if (selectedRole === 'homeOffense' || selectedRole === 'homeDefense') {
        return (
          <Substitutions
            teamId={homeTeamId}
            teamName={homeTeamName}
            fullRoster={homeRoster}
            activePlayers={activeHomePlayers}
            onSub={handleSub}
            quarter={currentQuarter}
            onAddEvent={handleAddEvent}
            pendingBenchSubs={pendingBenchSubs}
            setPendingBenchSubs={setPendingBenchSubs}
            usedTimeouts={homeTimeouts}
            undoTimeout={handleUndoTimeout}
            role={selectedRole}
          />
        );
      } else if (selectedRole === 'awayOffense' || selectedRole === 'awayDefense') {
        return (
          <Substitutions
            teamId={awayTeamId}
            teamName={awayTeamName}
            fullRoster={awayRoster}
            activePlayers={activeAwayPlayers}
            onSub={handleSub}
            quarter={currentQuarter}
            onAddEvent={handleAddEvent}
            pendingBenchSubs={pendingBenchSubs}
            setPendingBenchSubs={setPendingBenchSubs}
            usedTimeouts={awayTimeouts}
            undoTimeout={handleUndoTimeout}
            role={selectedRole}
          />
        );
      }
    }
    return null;
  };

  const renderStatsForTeam = (teamId, teamName, players) => {
    return (
      <Stats
        teamId={teamId}
        teamName={teamName}
        players={players}
        events={events}
        courtFilter={courtFilter}
        role={selectedRole}
      />
    );
  };
  const renderAdvancedStatsForTeam = (teamId, teamName, players, opponentPlayers) => {
    return (
      <AdvancedStats
        teamId={teamId}
        teamName={teamName}
        players={players}
        opponentPlayers={opponentPlayers}
        events={events}
        courtFilter={courtFilter}
        role={selectedRole}
      />
    );
  };

  const renderStats = () => {
    if (selectedRole === 'awayOffense' || selectedRole === 'awayDefense') {
      return (
        <>
          {renderStatsForTeam(awayTeamId, awayTeamName, awayRoster)}
          {renderAdvancedStatsForTeam(awayTeamId, awayTeamName, awayRoster, homeRoster)}
        </>      
      );
    } else if (selectedRole === 'homeOffense' || selectedRole === 'homeDefense') {
      return (
        <>
          {renderStatsForTeam(homeTeamId, homeTeamName, homeRoster)}
          {renderAdvancedStatsForTeam(homeTeamId, homeTeamName, homeRoster, awayRoster)}
        </>        
      );
    } return null;
  };

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter((e) => {
      const matchTeam =
        !courtFilter?.team || courtFilter.team === "all" || e.teamId === courtFilter.team;
      const matchPlayer =
        !courtFilter?.player || courtFilter.player === "all" || e.playerId === courtFilter.player;
      const matchQuarter =
        !courtFilter?.quarter || courtFilter.quarter === "all" || e.quarter?.toString() === courtFilter.quarter;

      return matchTeam && matchPlayer && matchQuarter;
    });
  }, [sortedEvents, courtFilter]);

  const eventsByQuarter = useMemo(() => {
    const grouped = {};
    filteredEvents.forEach((e) => {
      const q = e.quarter || "OT";
      if (!grouped[q]) grouped[q] = [];
      grouped[q].push(e);
    });
    return grouped;
  }, [filteredEvents]);
  console.log("filteredEvents", filteredEvents)
  console.log("eventsByQuarter", eventsByQuarter)
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
          <select className="select-option"
            value={selectedGameId || ""}
            onChange={(e) => setSelectedGameId(e.target.value)}
          >
            <option className="select-option-item" value="">
              -- Select a game --
            </option>
            {games.map((g) => {
              const homeTeam = teams.find((t) => t.id === g.homeTeamId);
              const awayTeam = teams.find((t) => t.id === g.awayTeamId);
              return (
                <option className="sGameRoleSelectorelect-option-item"
                  key={g.id}
                  value={g.id}
                >
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
                  events={events}
                />
                <button className="flipCourt-control" onClick={() => setFlipCourt(prev => !prev)}>
                  {flipCourt ? "Flip Court" : "Flip to Default"}
                </button>
                <div className="quarter-control">
                  <h3>Quarter: {currentQuarter}</h3>
                  {quarters.map((q, i) => (
                    <button
                      //disabled={selectedRole === "homeOffense" || selectedRole === "awayOffense"}
                      key={i}
                      className={currentQuarter === q ? "active" : ""}
                      onClick={() => setCurrentQuarter(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`main-content-wrapper ${selectedRole !== "admin" ? "single-view" : ""}`}>
                <div className="app-container">
                  <div className="app-content"> 
                    <div className="game-layout-container">
                      {flipCourt ? (
                        <>
                          {/* Conditionally render Away players based on role */}
                          {(selectedRole === 'awayOffense' || selectedRole === 'awayDefense' || selectedRole === "admin") ? (
                            <Players
                              players={activeAwayPlayers}
                              setPlayers={setActiveAwayPlayers}
                              selectedPlayerId={selectedPlayerId}
                              setSelectedPlayerId={setSelectedPlayerId}
                              selectedTeamId={awayTeamId}
                              setSelectedTeamId={setSelectedTeamId}
                              team={awayTeamName}
                              teamId={awayTeamId}
                              onSub={handleSub}
                              onAddEvent={handleAddEvent}
                              pendingBenchSubs={pendingBenchSubs}
                              setPendingBenchSubs={setPendingBenchSubs}
                              quarter={currentQuarter}
                              role={selectedRole}
                              usedFouls={awayFouls}
                            />
                          ) : null}
                        </>
                      ) : (
                        <>
                          {/* Conditionally render Home players based on role */}
                          {(selectedRole === 'homeOffense' || selectedRole === 'homeDefense' || selectedRole === "admin") ? (
                            <Players
                              players={activeHomePlayers}
                              setPlayers={setActiveHomePlayers}
                              selectedPlayerId={selectedPlayerId}
                              setSelectedPlayerId={setSelectedPlayerId}
                              selectedTeamId={homeTeamId}
                              setSelectedTeamId={setSelectedTeamId} 
                              team={homeTeamName}
                              teamId={homeTeamId}
                              onSub={handleSub}
                              onAddEvent={handleAddEvent}
                              pendingBenchSubs={pendingBenchSubs}
                              setPendingBenchSubs={setPendingBenchSubs}
                              quarter={currentQuarter}
                              role={selectedRole}
                              usedFouls={homeFouls}
                            />
                          ) : null}
                        </>
                      )}

                      {/* The Court component logic based on offense/defense */}
                      <Court 
                        onAddEvent={handleAddEvent} 
                        selectedPlayerId={selectedPlayerId}
                        selectedTeamId={selectedTeamId}
                        onUndo={handleUndoEvent} 
                        events={events}
                        quarter={currentQuarter}
                        activeHomePlayers={activeHomePlayers}
                        activeAwayPlayers={activeAwayPlayers}
                        homeRoster={homeRoster}
                        awayRoster={awayRoster}
                        homeTeamId={homeTeamId}
                        awayTeamId={awayTeamId}
                        flipCourt={flipCourt}
                        homeTeamName={homeTeamName}
                        awayTeamName={awayTeamName}
                        role={selectedRole}
                        onFilterChange={(filters) => setCourtFilter(filters)}
                        />
                      {flipCourt ? (
                        <>
                          {/* Conditionally render Home players based on role */}
                          {(selectedRole === 'homeOffense' || selectedRole === 'homeDefense' || selectedRole === "admin") ? (
                            <Players
                              players={activeHomePlayers}
                              setPlayers={setActiveHomePlayers}
                              selectedPlayerId={selectedPlayerId}
                              setSelectedPlayerId={setSelectedPlayerId}
                              selectedTeamId={homeTeamId}
                              setSelectedTeamId={setSelectedTeamId} 
                              team={homeTeamName}
                              teamId={homeTeamId}
                              onSub={handleSub}
                              quarter={currentQuarter}
                              onAddEvent={handleAddEvent}
                              pendingBenchSubs={pendingBenchSubs}
                              setPendingBenchSubs={setPendingBenchSubs}
                              role={selectedRole}
                              usedFouls={homeFouls}
                            />
                          ) : null}
                        </>
                      ) : (
                        <>
                          {/* Conditionally render Away players based on role */}
                          {(selectedRole === 'awayOffense' || selectedRole === 'awayDefense' || selectedRole === "admin") ? (
                            <Players
                              players={activeAwayPlayers}
                              setPlayers={setActiveAwayPlayers}
                              selectedPlayerId={selectedPlayerId}
                              setSelectedPlayerId={setSelectedPlayerId}
                              selectedTeamId={awayTeamId}
                              setSelectedTeamId={setSelectedTeamId}
                              team={awayTeamName}
                              teamId={awayTeamId}
                              onSub={handleSub}
                              quarter={currentQuarter}
                              onAddEvent={handleAddEvent}
                              pendingBenchSubs={pendingBenchSubs}
                              setPendingBenchSubs={setPendingBenchSubs}
                              role={selectedRole}
                              usedFouls={awayFouls}
                            />
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
                <div className="sub-panels-wrapper">
                  {selectedRole === "admin"
                    ? (
                      <>
                        {flipCourt ? (
                          <>
                            <Substitutions
                              key="away"
                              side="away"
                              teamId={awayTeamId}
                              teamName={awayTeamName}
                              fullRoster={awayRoster}
                              activePlayers={activeAwayPlayers}
                              onSub={handleSub}
                              quarter={currentQuarter}
                              onAddEvent={handleAddEvent}
                              pendingBenchSubs={pendingBenchSubs}
                              setPendingBenchSubs={setPendingBenchSubs}
                              usedTimeouts={awayTimeouts}
                              undoTimeout={handleUndoTimeout}
                              role={selectedRole}
                            />
                            <Substitutions
                              key="home"
                              side="home"
                              teamId={homeTeamId}
                              teamName={homeTeamName}
                              fullRoster={homeRoster}
                              activePlayers={activeHomePlayers}
                              onSub={handleSub}
                              quarter={currentQuarter}
                              onAddEvent={handleAddEvent}
                              pendingBenchSubs={pendingBenchSubs}
                              setPendingBenchSubs={setPendingBenchSubs}
                              usedTimeouts={homeTimeouts}
                              undoTimeout={handleUndoTimeout}
                              role={selectedRole}
                            />
                          </>
                        ) : (
                          <>
                            <Substitutions
                              teamId={homeTeamId}
                              teamName={homeTeamName}
                              fullRoster={homeRoster}
                              activePlayers={activeHomePlayers}
                              onSub={handleSub}
                              quarter={currentQuarter}
                              onAddEvent={handleAddEvent}
                              pendingBenchSubs={pendingBenchSubs}
                              setPendingBenchSubs={setPendingBenchSubs}
                              usedTimeouts={homeTimeouts}
                              undoTimeout={handleUndoTimeout}
                              role={selectedRole}
                            />
                            <Substitutions
                              teamId={awayTeamId}
                              teamName={awayTeamName}
                              fullRoster={awayRoster}
                              activePlayers={activeAwayPlayers}
                              onSub={handleSub}
                              quarter={currentQuarter}
                              onAddEvent={handleAddEvent}
                              pendingBenchSubs={pendingBenchSubs}
                              setPendingBenchSubs={setPendingBenchSubs}
                              usedTimeouts={awayTimeouts}
                              undoTimeout={handleUndoTimeout}
                              role={selectedRole}
                            />
                          </>
                        )}
                      </>
                    )
                  : renderSubstitutions()}
                </div>
                {renderStats()}
                {(selectedRole === "admin") && (
                  <>
                    {renderStatsForTeam(awayTeamId, awayTeamName, awayRoster)}
                    {renderStatsForTeam(homeTeamId, homeTeamName, homeRoster)}
                    {renderAdvancedStatsForTeam(awayTeamId, awayTeamName, awayRoster, homeRoster)}
                    {renderAdvancedStatsForTeam(homeTeamId, homeTeamName, homeRoster, awayRoster)}
                  </>
                )}
                <div style={{ marginTop: 10, fontSize: 14, color: "#ffffff" }}>
                <h3>Play-By-Play Logs</h3>
                  {Object.entries(eventsByQuarter).map(([quarter, quarterEvents]) => (
                    <div key={quarter}>
                  <h4 style={{ marginTop: -5, marginBottom: -10, fontSize: 16, color: "#ffffff" }} >Quarter {quarter}</h4>
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {quarterEvents.map((e) => {
                      const player =
                        homeRoster.find((p) => p.id === e.playerId) ||
                        awayRoster.find((p) => p.id === e.playerId);

                      const teamName =
                        e.teamId === homeTeamId
                          ? homeTeamName
                          : e.teamId === awayTeamId
                          ? awayTeamName
                          : "Unknown";

                      return (
                        <li key={e.id} className={e.made ? "bold" : ""}>
                          {e.type === "timeOut" ? (
                            <>
                              {teamName} calls a timeout.
                            </>
                          ) : (
                            <>
                              {teamName} {player?.name || "Unknown"}{" "}
                              {e.type === "shot" && (
                                <>
                                  {e.made ? "makes a" : "misses a"}{" "}
                                  {`${Math.round(e.distFt)}-foot ${e.is3 ? "3-pointer" : "2-pointer"}`}
                                  {e.made && e.assistPlayerId && (
                                    <>
                                      {" "}
                                      (assist by{" "}
                                      <em>
                                        {homeRoster.find((p) => p.id === e.assistPlayerId)?.name ||
                                          awayRoster.find((p) => p.id === e.assistPlayerId)?.name ||
                                          "Unknown"}
                                      </em>
                                      )
                                    </>
                                  )}
                                </>
                              )}
                              {e.type === "freeThrow" && (
                                <>
                                  {e.made
                                    ? "makes a free throw for 1 point."
                                    : "misses a free throw for 1 point"}
                                </>
                              )}
                              {e.type === "offRebound" && "grabs an offensive rebound"}
                              {e.type === "defRebound" && "grabs a defensive rebound"}
                              {e.type === "turnOver" && "turns the ball over"}
                              {e.foulType === "personal" && "commits a personal foul"}
                              {e.foulType === "offensive" && "commits an offensive foul"}
                              {e.foulType === "defensive" && "commits a defensive foul"}
                              {e.foulType === "technical" && "commits a technical foul"}
                              {e.type === "steal" && "comes up with a steal."}
                              {e.type === "block" && "blocks the shot."}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                 </div>
                 ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  )
}

export default App
