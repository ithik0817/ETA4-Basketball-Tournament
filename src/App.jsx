// src/App.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './App.css'
import Header from './components/Header'
import Auth from './components/Auth'
import { auth, db } from './firebase'
import { collection, doc, getDoc, getDocs, addDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
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
  const [shots, setShots] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  const sortedShots = useMemo(() => {
    if (!shots || shots.length === 0) {
      return [];
    }
    return [...shots].sort((a, b) => {
      const dateA = a.createdAt instanceof Date 
        ? a.createdAt 
        : a.createdAt?.toDate() ?? new Date(0);
      const dateB = b.createdAt instanceof Date 
        ? b.createdAt 
        : b.createdAt?.toDate() ?? new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  }, [shots]);

  const handleSub = useCallback((teamId, activePlayerIds, benchPlayerIds) => {
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
  }, [awayTeamId, awayRoster, homeRoster]);

  const homeTimeouts = shots.filter(
    (s) => s.type === "timeOut" && s.teamId === homeTeamId
  ).length;

  const awayTimeouts = shots.filter(
    (s) => s.type === "timeOut" && s.teamId === awayTeamId
  ).length;

  const homeFouls = shots.filter(
    (s) => s.type === "foul" && 
    s.teamId === homeTeamId && 
    s.quarter === currentQuarter && 
    (s.role === 'awayDefense' || s.role === 'homeDefense')
  ).length;

  const awayFouls = shots.filter(
    (s) => s.type === "foul" && 
    s.teamId === awayTeamId && 
    s.quarter === currentQuarter && 
    (s.role === 'awayDefense' || s.role === 'homeDefense')
  ).length;

  const handleUndoTimeout = async (teamId) => {

    console.log ("handleUndoTimeout,teamId", teamId)

    try {
      const shotsRef = collection(
        db,
        "tournaments",
        selectedTournament.id,
        "games",
        selectedGameId,
        "shots"
      );

      const q = query(shotsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const teamTimeouts = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((s) => s.type === "timeOut" && s.teamId === teamId);

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
          "shots",
          lastTimeout.id
        )
      );

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
          console.log("Custom claims from token exist:", idTokenResult.claims);
          console.log("ROLE:", userWithRole);
        } else {
          // Fallback if the user profile document is not found
          setUser(authUser);
          const idTokenResult = await authUser.getIdTokenResult(true);
          console.log("Custom claims from token not exist:", idTokenResult.claims);
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

      console.log("Added shot to Firestore with ID:", docRef.id, shot.type, shot.role);

    } catch (error) {
      console.error("Error adding shot:", error);
    }
  }

  async function handleUndoShot() {
    if (shots.length === 0) return;

    console.log("INSIDE handleUndoShot");
    console.log("shots", shots);
    console.log("selectedRole", selectedRole);

    // ✅ Only allow certain roles
    const allowedRoles = ["admin", "homeOffense", "awayOffense", "homeDefense", "awayDefense"];
    if (!allowedRoles.includes(selectedRole)) {
      alert("User role not permitted to undo shots:", selectedRole);
    }

    // ✅ ADMIN can undo the very last shot (anyone’s)
    let shotToDelete;
    if (selectedRole === "admin") {
      shotToDelete = shots[shots.length - 1];
    } else {
      // ✅ Find the last shot created by this role
      for (let i = shots.length - 1; i >= 0; i--) {
        if (shots[i].role === selectedRole) {
          shotToDelete = shots[i];
          break;
        }
      }

      if (!shotToDelete) {
        alert(`No shots found for role: ${selectedRole}`);
      }
    }

    console.log("Deleting shot:", shotToDelete);

    if (selectedGameId && shotToDelete?.id) {
      try {
        const shotRef = doc(
          db,
          "tournaments",
          selectedTournament.id,
          "games",
          selectedGameId,
          "shots",
          shotToDelete.id
        );

        await deleteDoc(shotRef);
        console.log("Deleted shot from Firestore:", shotToDelete.id);
      } catch (err) {
        console.error("Error deleting shot:", err);
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
            onAddShot={handleAddShot}
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
            onAddShot={handleAddShot}
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
            onAddShot={handleAddShot}
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
            onAddShot={handleAddShot}
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

  const renderStats = () => {
    if (selectedRole === 'awayOffense' || selectedRole === 'awayDefense') {
      return (
        <Stats 
          players={awayRoster}
          shots={shots}
          team={awayTeamName}
        />
      );
    } else if (selectedRole === 'homeOffense' || selectedRole === 'homeDefense') {
      return (
        <Stats 
          players={homeRoster}
          shots={shots}
          team={homeTeamName}
        />
      );
    } return null;
  };


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
                  quarter={currentQuarter}
                  shots={shots}
                />
                <button className="flipCourt-control" onClick={() => setFlipCourt(prev => !prev)}>
                  {flipCourt ? "Flip Court" : "Flip to Default"}
                </button>
                <div className="quarter-control">
                  <h3>Quarter: {currentQuarter}</h3>
                  {quarters.map((q, i) => (
                    <button
                      key={i}
                      className={currentQuarter === q ? "active" : ""}
                      onClick={() => setCurrentQuarter(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <div className="main-content-wrapper">
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
                              onAddShot={handleAddShot}
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
                              onAddShot={handleAddShot}
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
                        onAddShot={handleAddShot} 
                        selectedPlayerId={selectedPlayerId}
                        selectedTeamId={selectedTeamId}
                        onUndo={handleUndoShot} 
                        shots={shots}
                        quarter={currentQuarter}
                        activeHomePlayers={activeHomePlayers}
                        activeAwayPlayers={activeAwayPlayers}
                        homeTeamId={homeTeamId}
                        awayTeamId={awayTeamId}
                        flipCourt={flipCourt}
                        homeTeamName={homeTeamName}
                        awayTeamName={awayTeamName}
                        role={selectedRole}
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
                              onAddShot={handleAddShot}
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
                              onAddShot={handleAddShot}
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
                  {renderSubstitutions()}
                  {(selectedRole === "admin") && (
                    <>
                    {flipCourt ? (
                        <>
                          {/* Away bench players lists here */}
                          <Substitutions
                            teamId={awayTeamId}
                            teamName={awayTeamName}
                            fullRoster={awayRoster}
                            activePlayers={activeAwayPlayers}
                            onSub={handleSub}
                            quarter={currentQuarter}
                            onAddShot={handleAddShot}
                            pendingBenchSubs={pendingBenchSubs}
                            setPendingBenchSubs={setPendingBenchSubs}
                            usedTimeouts={awayTimeouts}
                            undoTimeout={handleUndoTimeout}
                            role={selectedRole}
                          />
                          {/* Home bench players lists here */}
                          <Substitutions
                            teamId={homeTeamId}
                            teamName={homeTeamName}
                            fullRoster={homeRoster}
                            activePlayers={activeHomePlayers}
                            onSub={handleSub}
                            quarter={currentQuarter}
                            onAddShot={handleAddShot}
                            pendingBenchSubs={pendingBenchSubs}
                            setPendingBenchSubs={setPendingBenchSubs}
                            usedTimeouts={homeTimeouts}
                            undoTimeout={handleUndoTimeout}
                            role={selectedRole}
                          />
                        </>
                      ) : (
                        <>
                          {/* Home bench players lists here */}
                          <Substitutions
                            teamId={homeTeamId}
                            teamName={homeTeamName}
                            fullRoster={homeRoster}
                            activePlayers={activeHomePlayers}
                            onSub={handleSub}
                            quarter={currentQuarter}
                            onAddShot={handleAddShot}
                            pendingBenchSubs={pendingBenchSubs}
                            setPendingBenchSubs={setPendingBenchSubs}
                            usedTimeouts={homeTimeouts}
                            undoTimeout={handleUndoTimeout}
                            role={selectedRole}
                          />
                          {/* Away bench players lists here */}
                          <Substitutions
                            teamId={awayTeamId}
                            teamName={awayTeamName}
                            fullRoster={awayRoster}
                            activePlayers={activeAwayPlayers}
                            onSub={handleSub}
                            quarter={currentQuarter}
                            onAddShot={handleAddShot}
                            pendingBenchSubs={pendingBenchSubs}
                            setPendingBenchSubs={setPendingBenchSubs}
                            usedTimeouts={awayTimeouts}
                            undoTimeout={handleUndoTimeout}
                            role={selectedRole}
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
                {renderStats()}
                {(selectedRole === "admin") && (
                  <>
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
                    </>
                  )}
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
                          {s.type === "timeOut" ? (
                            <>
                              {teamName} calls a timeout.
                            </>
                          ) : (
                            <>
                          {teamName} {player?.name || "Unknown"}{" "}

                          {s.type === "shot" && (
                              <>
                                  {s.made ? "makes a" : "misses a"}{" "}
                                  {`${Math.round(s.distFt)}-foot ${s.is3 ? "3-pointer" : 
                                    "2-pointer"}`}
                                  {s.made && s.assistPlayerId && (
                                      <>
                                          {" "}
                                          (assist by{" "}
                                          <em>
                                              {homeRoster.find(p => p.id === s.assistPlayerId)?.name ||
                                              awayRoster.find(p => p.id === s.assistPlayerId)?.name ||
                                              "Unknown"}
                                          </em>
                                          )
                                      </>
                                  )}
                              </>
                          )}
                          {s.type === "freeThrow" && (
                              <>
                                  {s.made ? "makes a free throw for 1 point." : 
                                  "misses a free throw for 1 point"}{" "}
                              </>
                          )}

                          {s.type === "offRebound" && "grabs an offensive rebound"}
                          {s.type === "defRebound" && "grabs a defensive rebound"}
                          {s.type === "turnOver" && "turns the ball over"}
                          {s.type === "foul" && "commits a foul"}
                          {s.type === "steal" && "comes up with a steal."}
                          {s.type === "block" && "blocks the shot."}
                          </>
                          )} 
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
