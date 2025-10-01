// src/components/Substitutions.jsx
import React, { useState } from "react";

export const Substitutions = ({
  teamName,
  fullRoster,
  activePlayers,
  onSub,
  teamId,
  setPendingBenchSubs, // Changed from single to multiple subs
  pendingBenchSubs, // Changed from single to multiple subs
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

  return (
    <div className="sub-container">
      <h3 style={{ 
        textAlign: "center", 
        marginTop: 0, 
        marginBottom: 10
      }}>
        {teamName} Bench
      </h3>
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
