// src/Substitutions.jsx
import React, { useState } from "react";

export const Substitutions = ({
  teamName,
  fullRoster,
  activePlayers,
  onSub,
  teamId,
  setPendingBenchSub,
  pendingBenchSub
}) => {

  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState(null);

  const benchPlayers = fullRoster
    .filter((player) => !activePlayers.some((p) => p.id === player.id))
    .sort((a, b) => a.number - b.number);

  const handleBenchClick = (player) => {
    if (pendingBenchSub && pendingBenchSub.id === player.id) {
      setPendingBenchSub(null);
    } else {
      setPendingBenchSub(player);
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
        {benchPlayers.map((player) => (
          <li key={player.id}>
            <button
              className={`bench-player-btn ${
                pendingBenchSub?.id === player.id ? "selected" : ""
              }`}
              onClick={() => handleBenchClick(player)}
            >
              #{player.number} - {player.name}
            </button>
          </li>
        ))}
      </div>
    </div>
  );
};
