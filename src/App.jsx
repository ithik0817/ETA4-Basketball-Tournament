// src/App.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './App.css'
import Header from './components/Header'
import Auth from './components/Auth'
import { db } from './firebase'
import { collection, doc, getDoc, getDocs, addDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { fetchRoster } from './components/data/fetchRoster'
import { fetchGames } from './components/data/fetchGames'
import { Substitutions } from './components/Substitutions'
import Stats from './components/Stats'
import Court from './components/Court'
import Players from './components/Players';
import ScoreTable from './components/ScoreTable';
import { ROLES } from './constants/roles';
import RoleSelect from './components/RoleSelect';
import AdvancedStats from './components/AdvancedStats'
import useAuthManager from "./hooks/useAuthManager";
import useTournamentManager from "./hooks/useTournamentManager";
import useEventManager from "./hooks/useEventManager";
import useRosterManager from "./hooks/useRosterManager";

function App() {
  const [flipCourt, setFlipCourt] = useState(true);
  const [show, setShow] = React.useState(true)
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [roster, setRoster] = useState([]);
  const [pendingBenchSubs, setPendingBenchSubs] = useState([]);
  const [currentQuarter, setCurrentQuarter] = useState(1);
  const quarters = [1, 2, 3, 4, "OT"];
  const [courtFilter, setCourtFilter] = useState({
    team: "all",
    player: "all",
    quarter: "all"
  });
  const handleFilterChange = useCallback(filters => setCourtFilter(filters), []);
  const { user, isLoadingData, selectedRole, setUser } = useAuthManager();
  
  const {
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
  } = useTournamentManager(selectedRole, user);

  const {
    handleAddEvent,
    handleUndoEvent,
    sortedEvents,
    syncEventHistory,
  } = useEventManager(
    selectedTournament, 
    selectedGameId, 
    selectedRole, 
    events, 
    setEvents
  );

  const {
    activeHomePlayers,
    activeAwayPlayers,
    setActiveAwayPlayers,
    setActiveHomePlayers,
    handleSub,
  } = useRosterManager(
    selectedGameId, 
    selectedTeamId, 
    awayTeamId, 
    homeTeamId, 
    awayRoster, 
    homeRoster
  );


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
    async function loadGame() {
      if (!selectedGameId) return;
      const fetchedGame = await fetchGames(db, selectedGameId);
      setRoster(fetchedGame);
    }
    loadGame();
  }, [selectedGameId]);

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
                        onFilterChange={handleFilterChange}
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
