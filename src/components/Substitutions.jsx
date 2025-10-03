// src/components/Substitutions.jsx
import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export const Substitutions = ({
  teamName,
  fullRoster,
  activePlayers,
  onSub,
  teamId,
  setPendingBenchSubs, // Changed from single to multiple subs
  pendingBenchSubs, // Changed from single to multiple subs
  onAddShot,
  quarter,
  usedTimeouts,
}) => {

  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState(null);

  const benchPlayers = fullRoster
    .filter((player) => !activePlayers.some((p) => p.id === player.id))
    .sort((a, b) => a.number - b.number);
  
  const handleBenchClick = (player) => {
    // Check if a bench player from the other team is already selected
    if (pendingBenchSubs.length > 0 && pendingBenchSubs[0].teamId !== teamId) {
      alert("Please unselect players from the other team first.");
      return;
    }

    // Toggle player selection
    if (pendingBenchSubs.some((p) => p.id === player.id)) {
      // Remove player if already selected
      setPendingBenchSubs((prev) => prev.filter((p) => p.id !== player.id));
    } else if (pendingBenchSubs.length < 5) {
      // Add player if less than 5 are already selected
      setPendingBenchSubs((prev) => [...prev, { ...player, teamId }]);
    } else {
      alert("You can select a maximum of 5 bench players.");
    }
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
        <button
          className="timeout-btn"
          onClick={handleTimeout}
          disabled={usedTimeouts >= 6}
        >
          Timeout
        </button>
        <span className="timeout-count">
          Used: {usedTimeouts} / 6
        </span>
      </div>
      <div className="bench-players">
        {benchPlayers.map((player) => {
          const isSelected = pendingBenchSubs.some((p) => p.id === player.id);
          return (
            <li key={player.id}>
              <button
                className={`bench-player-btn ${isSelected ? "selected" : ""}`}
                onClick={() => handleBenchClick(player)}
              >
                #{player.number} - {player.name}
              </button>
            </li>
          );
        })}
      </div>
    </div>
  );
};
