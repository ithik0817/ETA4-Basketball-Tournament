// src/components/Players.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, collection, addDoc, deleteDoc } from "firebase/firestore";

export default function Players({
  players,
  setPlayers,
  selectedPlayerId,
  setSelectedPlayerId,
  selectedTeamId,
  setSelectedTeamId,
  team,
  teamId,
  onSub,
  pendingBenchSubs,
  setPendingBenchSubs,
  onAddEvent,
  quarter,
  role,
  usedFouls,
}) {
  const [newPlayer, setNewPlayer] = useState("");
  const [selectedActivePlayers, setSelectedActivePlayers] = useState([]);

  const [showFoulPopup, setShowFoulPopup] = useState(false);
  const [selectedFoulPlayer, setSelectedFoulPlayer] = useState(null);

  const [pendingAction, setPendingAction] = useState(null);
  const [showPlayerPopup, setShowPlayerPopup] = useState(false);

  const actionDisplayNames = {
    defRebound: "Defensive Rebound",
    offRebound: "Offensive Rebound",
    foul: "Foul",
    steal: "Steal",
    block: "Block",
    turnOver: "Turnover",
    shot: "Shot Attempt",
    freeThrow: "Free Throw",
    timeOut: "Timeout",
  };
  
  useEffect(() => {
    const benchPlayerIds = pendingBenchSubs.map((p) => p.id);
    const activePlayerIds = selectedActivePlayers.map((p) => p.id);

    if (
      benchPlayerIds.length > 0 &&
      benchPlayerIds.length === activePlayerIds.length
    ) {
      onSub(teamId, activePlayerIds, benchPlayerIds);
      setPendingBenchSubs([]);
      setSelectedActivePlayers([]);
    }
  }, [pendingBenchSubs, selectedActivePlayers, onSub, teamId, setPendingBenchSubs]);

  async function handleAdd() {
    const Name = newPlayer.trim();
    if (!Name) return;
    const dup = players.some((p) => p.Name?.toLowerCase() === Name.toLowerCase());
    if (dup) {
      alert(`Player "${Name}" already exists.`);
      return;
    }
    try {
      const rosterColRef = collection(db, "teams", selectedTeamId, "roster");
      const docRef = await addDoc(rosterColRef, { Name });
      const newP = { id: docRef.id, Name };
      setPlayers((prev) => [...prev, newP]);
      setNewPlayer("");
      console.log("Added player with ID:", newP.id);
    } catch (error) {
      console.error("Error adding player:", error);
    }
  }

  async function handleRemove(id) {
    const playerRef = doc(db, "teams", selectedTeamId, "roster", id);
    await deleteDoc(playerRef);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlayerId === id) {
      setSelectedPlayerId(null);
    }
    console.log("Remove:", id);
  }

  const handleActivePlayerClick = (activePlayer) => {


    if (pendingBenchSubs.length === 0 || pendingBenchSubs[0].teamId !== teamId) {
      return;
    }

    if (selectedActivePlayers.some((p) => p.id === activePlayer.id)) {
      setSelectedActivePlayers((prev) => prev.filter((p) => p.id !== activePlayer.id));
    } else {
      setSelectedActivePlayers((prev) => [...prev, activePlayer]);
    }
  };

  const handleFoulClick = (player) => {
    setSelectedFoulPlayer(player);
    setShowFoulPopup(true);
  };

  const handleFoulTypeSelect = (type) => {
    if (onAddEvent && selectedFoulPlayer) {
      onAddEvent({
        type: "foul",
        foulType: type,
        playerId: selectedFoulPlayer.id,
        teamId: teamId,
        quarter: quarter,
        role: role,
      });
    }
    setShowFoulPopup(false);
    setSelectedFoulPlayer(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {   
      const key = e.code;

      if (e.key === "Escape") {
        setShowPlayerPopup(false);
        setShowFoulPopup(false);
        setPendingAction(null);
        setSelectedFoulPlayer(null);
        return;
      }


      const isDefense = role === "homeDefense" || role === "awayDefense";
      const isOffense = role === "homeOffense" || role === "awayOffense";
      if (!isDefense && !isOffense) 
        return;
      
      if (showFoulPopup)
        return;

      if (!pendingAction) {
        if (isDefense) {
          switch (key) {
            case "Digit1":
            case "Numpad1":
              setPendingAction("defRebound");
              setShowPlayerPopup(true);
              break;
            case "Digit2":
            case "Numpad2":
              setPendingAction("foul");
              setShowPlayerPopup(true);
              break;
            case "Digit3":
            case "Numpad3":
              setPendingAction("steal");
              setShowPlayerPopup(true);
              break;
            case "Digit4":
            case "Numpad4":
              setPendingAction("block");
              setShowPlayerPopup(true);
              break;
            default:
              break;
          }
        } else if (isOffense) {
          switch (key) {
            case "Digit1":
            case "Numpad1":
              setPendingAction("offRebound");
              setShowPlayerPopup(true);
              break;
            case "Digit2":
            case "Numpad2":
              setPendingAction("turnOver");
              setShowPlayerPopup(true);
              break;
            case "Digit3":
            case "Numpad3":
              setPendingAction("foul");
              setShowPlayerPopup(true);
              break;
            default:
              break;
          }
        }
      }
      
      else if (showPlayerPopup) {
        const playerIndex = parseInt(e.key) - 1;
        if (!isNaN(playerIndex) && players[playerIndex]) {1
          const player = players[playerIndex];
          if (pendingAction === "foul") {
            setSelectedFoulPlayer(player);
            setShowFoulPopup(true);
          } else {
            onAddEvent &&
              onAddEvent({
                type: pendingAction,
                playerId: player.id,
                teamId,
                quarter,
                role,
              });
          }
          setPendingAction(null);
          setShowPlayerPopup(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [players, pendingAction, showPlayerPopup, showFoulPopup, teamId, quarter, role, onAddEvent]);


  useEffect(() => {
    if (!showFoulPopup) return;

    const handleFoulKey = (e) => {
      const key = e.key;

      const options = (() => {
        if (role === "admin") return ["personal", "offensive", "defensive", "technical"];
        if (role === "homeDefense" || role === "awayDefense")
          return ["personal", "defensive", "technical"];
        if (role === "homeOffense" || role === "awayOffense")
          return ["personal", "offensive", "technical"];
        return [];
      })();

      const index = parseInt(key) - 1;
      if (index >= 0 && index < options.length) {
        e.preventDefault();
        handleFoulTypeSelect(options[index]);
      }
    };

    window.addEventListener("keydown", handleFoulKey);
    return () => window.removeEventListener("keydown", handleFoulKey);
  }, [showFoulPopup, role, handleFoulTypeSelect]);

  const handleCancelAll = () => {
    setShowPlayerPopup(false);
    setShowFoulPopup(false);
    setPendingAction(null);
  };

  return (
    <div className="players-container">
      <h3 style={{ marginTop: 0, marginBottom: -5, textAlign: "center" }}>{team}</h3>
      <h4 style={{ marginTop: 0, marginBottom: 0, textAlign: "center" }}>Players (On Floor)</h4>
      <span className="teamFouls-count">
        Team Fouls: {usedFouls} / 4
        {usedFouls >= 5 && (
          <span className="bonus-indicator">
            (Bonus)
          </span>
        )}
      </span>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {players.map((p) => {
          const isSelected = selectedActivePlayers.some((ap) => ap.id === p.id);
          const canClick = pendingBenchSubs.length > 0 && pendingBenchSubs[0].teamId === teamId;
          const isDisabled = !canClick;

          return (
            <li
              key={p.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                marginBottom: 10,
                padding: 0,
                justifyContent: "center",
              }}
            >
              {/* Main player button */}
              <button
                onClick={() => handleActivePlayerClick(p)}
                className={`active-player-btn ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                disabled={isDisabled}
                title={isDisabled? "Select bench players from this team first" : undefined
                }
              >
                #{p.number} - {p.name}
              </button>

              {/* Inline action buttons */}
              <div style={{ display: "flex", gap: 6 }}>
                {role === "admin" ? (
                  <>
                    {/* Combine both sets for admin */}
                    <button
                      className="mini-btn oReb"
                      onClick={() =>
                        onAddEvent &&
                        onAddEvent({
                          type: "offRebound",
                          playerId: p.id,
                          teamId,
                          quarter,
                          role,
                        })
                      }
                    >
                      OReb
                    </button>
                    <button
                      className="mini-btn dReb"
                      onClick={() =>
                        onAddEvent &&
                        onAddEvent({
                          type: "defRebound",
                          playerId: p.id,
                          teamId,
                          quarter,
                          role,
                        })
                      }
                    >
                      DReb
                    </button>
                    <button
                      className="mini-btn to"
                      onClick={() =>
                        onAddEvent &&
                        onAddEvent({
                          type: "turnOver",
                          playerId: p.id,
                          teamId,
                          quarter,
                          role,
                        })
                      }
                    >
                      TO
                    </button>
                    <button className="mini-btn pk" onClick={() => handleFoulClick(p)}>
                      PF
                    </button>
                    <button
                      className="mini-btn stl"
                      onClick={() =>
                        onAddEvent &&
                        onAddEvent({
                          type: "steal",
                          playerId: p.id,
                          teamId,
                          quarter,
                          role,
                        })
                      }
                    >
                      STL
                    </button>
                    <button
                      className="mini-btn blk"
                      onClick={() =>
                        onAddEvent &&
                        onAddEvent({
                          type: "block",
                          playerId: p.id,
                          teamId,
                          quarter,
                          role,
                        })
                      }
                    >
                      BLK
                    </button>
                  </>
                ) : role === "homeOffense" || role === "awayOffense" ? (
                  <>
                    <button
                      className="mini-btn oReb"
                      onClick={() =>
                        onAddEvent &&
                        onAddEvent({
                          type: "offRebound",
                          playerId: p.id,
                          teamId,
                          quarter,
                          role,
                        })
                      }
                    >
                      OReb
                    </button>
                    <button
                      className="mini-btn to"
                      onClick={() =>
                        onAddEvent &&
                        onAddEvent({
                          type: "turnOver",
                          playerId: p.id,
                          teamId,
                          quarter,
                          role,
                        })
                      }
                    >
                      TO
                    </button>
                    <button className="mini-btn pk" onClick={() => handleFoulClick(p)}>
                      PF
                    </button>
                  </>
                ) : role === "homeDefense" || role === "awayDefense" ? (
                  <>
                    <button
                      className="mini-btn dReb"
                      onClick={() =>
                        onAddEvent &&
                        onAddEvent({
                          type: "defRebound",
                          playerId: p.id,
                          teamId,
                          quarter,
                          role,
                        })
                      }
                    >
                      DReb
                    </button>
                    <button className="mini-btn pk" onClick={() => handleFoulClick(p)}>
                      PF
                    </button>
                    <button
                      className="mini-btn stl"
                      onClick={() =>
                        onAddEvent &&
                        onAddEvent({
                          type: "steal",
                          playerId: p.id,
                          teamId,
                          quarter,
                          role,
                        })
                      }
                    >
                      STL
                    </button>
                    <button
                      className="mini-btn blk"
                      onClick={() =>
                        onAddEvent &&
                        onAddEvent({
                          type: "block",
                          playerId: p.id,
                          teamId,
                          quarter,
                          role,
                        })
                      }
                    >
                      BLK
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {/* 🟩 Foul type popup */}
      {showFoulPopup && (
        <div
          className="foul-popup-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="foul-popup"
            style={{
              background: "#191E31",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              textAlign: "center",
              border: "4px solid #ccc",
            }}
          >
            <h3>Select Foul Type</h3>
            {/* 🧩 Filter foul types by role */}
            {(() => {
              let foulOptions = [];
              if (role === "admin") {
                foulOptions = ["personal", "offensive", "defensive", "technical"];
              } else if (role === "homeDefense" || role === "awayDefense") {
                foulOptions = ["personal", "defensive", "technical"];
              } else if (role === "homeOffense" || role === "awayOffense") {
                foulOptions = ["personal", "offensive", "technical"];
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {foulOptions.map((type) => (
                    <button
                      key={type}
                      onClick={() => handleFoulTypeSelect(type)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        cursor: "pointer",
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)} Foul
                    </button>
                  ))}
                </div>
              );
            })()}
            <button
              onClick={handleCancelAll}
              style={{
                marginTop: "10px",
                padding: "8px 16px",
                border: "1px solid #ccc",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 🟦 Player selection popup */}
      {showPlayerPopup && (
        <div
          className="popup-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            className="popup-content"
            style={{
              background: "#191E31",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              textAlign: "center",
              border: "4px solid #ccc",
            }}
          >
            <h3>Select Player for {actionDisplayNames[pendingAction] || pendingAction}</h3>
            {players.slice(0, 5).map((p, idx) => (
              <button
                key={p.id}
                onClick={() => {
                  onAddEvent &&
                    onAddEvent({
                      type: pendingAction,
                      playerId: p.id,
                      teamId,
                      quarter,
                      role,
                    });
                  setPendingAction(null);
                  setShowPlayerPopup(false);
                }}
                style={{
                  display: "block",
                  margin: "6px auto",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                #{p.number} - {p.name}
              </button>
            ))}
            <button
              onClick={handleCancelAll}
              style={{
                marginTop: "10px",
                padding: "8px 16px",
                border: "1px solid #ccc",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
