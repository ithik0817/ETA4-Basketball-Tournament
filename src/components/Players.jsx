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
  onAddShot,
  quarter,
  role,
  usedFouls,
}) {
  const [newPlayer, setNewPlayer] = useState("");
  const [selectedActivePlayers, setSelectedActivePlayers] = useState([]);

  const [showFoulPopup, setShowFoulPopup] = useState(false);
  const [selectedFoulPlayer, setSelectedFoulPlayer] = useState(null);
  
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
    if (onAddShot && selectedFoulPlayer) {
      onAddShot({
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
                {(role === 'homeOffense' || role === 'awayOffense' || role === "admin") && (
                  <>
                    <button
                      className="mini-btn oReb"
                      onClick={() =>
                        onAddShot &&
                        onAddShot({
                          type: "offRebound",
                          playerId: p.id,
                          teamId: teamId,
                          quarter: quarter,
                          role: role,
                        })
                      }
                    >
                      OReb
                    </button>
                    <button
                      className="mini-btn to"
                      onClick={() =>
                        onAddShot &&
                        onAddShot({
                          type: "turnOver",
                          playerId: p.id,
                          teamId: teamId,
                          quarter: quarter,
                          role: role,
                        })
                      }
                    >
                      TO
                    </button>
                  </>
                )}
                {(role === "homeDefense" || role === "awayDefense" || role === "admin") && (
                  <>                    
                    <button
                      className="mini-btn dReb"
                      onClick={() =>
                        onAddShot &&
                        onAddShot({
                          type: "defRebound",
                          playerId: p.id,
                          teamId: teamId,
                          quarter: quarter,
                          role: role,
                        })
                      }
                    >
                      DReb
                    </button>
                    <button
                      className="mini-btn stl"
                      onClick={() =>
                        onAddShot &&
                        onAddShot({
                          type: "steal",
                          playerId: p.id,
                          teamId: teamId,
                          quarter: quarter,
                          role: role,
                        })
                      }
                    >
                      STL
                    </button>
                    <button
                      className="mini-btn blk"
                      onClick={() =>
                        onAddShot &&
                        onAddShot({
                          type: "block",
                          playerId: p.id,
                          teamId: teamId,
                          quarter: quarter,
                          role: role,
                        })
                      }
                    >
                      BLK
                    </button>
                  </>
                )}
                <button
                  className="mini-btn pk"
                  onClick={() => handleFoulClick(p)}>
                  PF
                </button>
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
              onClick={() => setShowFoulPopup(false)}
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
