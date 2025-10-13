// src/components/Substitutions.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export const Substitutions = ({
  teamName,
  fullRoster,
  activePlayers,
  onSub,
  teamId,
  setPendingBenchSubs,
  pendingBenchSubs,
  onAddShot,
  quarter,
  usedTimeouts,
  undoTimeout,
  role,
}) => {
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [selectedBenchPlayers, setSelectedBenchPlayers] = useState([]);
  console.log("Substrituions.jsx")

  const benchPlayers = fullRoster
    .filter((player) => !activePlayers.some((p) => p.id === player.id))
    .sort((a, b) => a.number - b.number);
  
  const handleBenchClick = (player) => {
 
    if (pendingBenchSubs.length > 0 && pendingBenchSubs[0].teamId !== teamId) {
      alert("Please unselect players from the other team first.");
      return;
    }

    if (pendingBenchSubs.some((p) => p.id === player.id)) {
      setPendingBenchSubs((prev) => prev.filter((p) => p.id !== player.id));
    } else if (pendingBenchSubs.length < 5) {
      setPendingBenchSubs((prev) => [...prev, { ...player, teamId }]);
    } else {
      alert("You can select a maximum of 5 bench players.");
    }
  };

  useEffect(() => {
    if (pendingBenchSubs.length === 5) {
      setShowConfirmPopup(true);
    }
  }, [pendingBenchSubs]);

  const handleConfirmSubAll = () => {
    console.log("Sub All clicked!");

    console.log("Active:", activePlayers);
    console.log("Bench (selected):", pendingBenchSubs);

    onSub(teamId, activePlayers.map(p => p.id), pendingBenchSubs.map(p => p.id));

    console.log("teamId", {teamId})
    
    setPendingBenchSubs([]);
    setShowConfirmPopup(false);
  };

  const handleCancel = () => {
    setShowConfirmPopup(false);
  };

  const handleTimeout = () => {
    if (usedTimeouts >= 6) {
      alert("No more timeouts available for this team.");
      return;
    }

    const newTimeout = {
      type: "timeOut",
      teamId,
      quarter,
      createdAt: new Date(),
      role,
      message: `Timeout called by ${teamName}`, 
    };

    if (onAddShot) {
      onAddShot(newTimeout);
    }
  };

  return (
    <div className="sub-container">
      <h3 style={{ 
        textAlign: "center", 
        marginTop: 0, 
        marginBottom: 0
      }}>
        {teamName} Bench
      </h3>
      <div className="timeout-controls">
        <span className="timeout-count">
          Timeout: {usedTimeouts} / 6
        </span>
        <button
          className="timeout-btn undo"
          onClick={() => undoTimeout(teamId)}
          disabled={usedTimeouts === 0}
        >
          -
        </button>
        <button
          className="timeout-btn"
          onClick={handleTimeout}
          disabled={usedTimeouts >= 6}
        >
          +
        </button>
      </div>
      <div className="bench-players">
        {benchPlayers.map((player) => {
          const isSelected = pendingBenchSubs.some((p) => p.id === player.id);
          return (
            <li key={player.id}>
              <button disabled={role === "homeOffense" || role === "awayOffense"}
                className={`bench-player-btn ${isSelected ? "selected" : ""}`}
                onClick={() => handleBenchClick(player)}
              >
                #{player.number} - {player.name}
              </button>
            </li>
          );
        })}
      </div>

      {showConfirmPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h4>Substitute All Active Players?</h4>
            <p>
              You’ve selected 5 bench players. Do you want to sub out all
              active players?
            </p>
            <div className="popup-buttons">
              <button className="confirm-btn" onClick={handleConfirmSubAll}>
                Yes
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
