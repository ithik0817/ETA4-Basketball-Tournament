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

  const benchPlayers = fullRoster.filter(
    (player) => !activePlayers.some((p) => p.id === player.id)
  );

  const handleBenchClick = (benchPlayer) => {
    setSelectedBenchPlayer(benchPlayer);
  };

  const handleActiveClick = (activePlayer) => {
    if (selectedBenchPlayer) {
      onSub(teamId, activePlayer.id, selectedBenchPlayer.id);
      setSelectedBenchPlayer(null); // reset after sub
    }
  };

  return (
    <div className="sub-container">
      <h3 style={{ textAlign: "center", marginTop: 5}}>{teamName} Bench</h3>
      {/*
      <div className="active-players">
        <h4>On the floor:</h4>
        {activePlayers.map((player) => (
          <button
            key={player.id}
            className="active-player-btn"
            onClick={() => handleActiveClick(player)}
          >
            {player.Name}
          </button>
        ))}
      </div>
      */}

      <div className="bench-players">
        {benchPlayers.map((player) => (
          <li key={player.id}>
            <button
              className={`bench-player-btn ${
                pendingBenchSub?.id === player.id ? "selected" : ""
              }`}
              onClick={() => setPendingBenchSub(player)}
            >
              #{player.number} - {player.name}
            </button>
          </li>
        ))}
      </div>
    </div>
  );
};
