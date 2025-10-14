// src/components/Substitutions.jsx
import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export const Substitutions = ({
  side,
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
  const clickSideRef = useRef(null);

  const isHome = side === "home";
  const isAway = side === "away";

  const benchPlayers = fullRoster
    .filter((player) => !activePlayers.some((p) => p.id === player.id))
    .sort((a, b) => a.number - b.number);

  const handleBenchClick = (player) => {
    console.log("side", side);
    clickSideRef.current = side;

    // Prevent cross-team selection
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

  // ✅ Only open popup when this team's bench has 5 selected
  useEffect(() => {
    const thisTeamSelectedCount = pendingBenchSubs.filter(
      (p) => p.teamId === teamId
    ).length;
    setShowConfirmPopup(thisTeamSelectedCount === 5);
  }, [pendingBenchSubs, teamId]);

  const handleConfirmSubAll = () => {
    console.log("Sub All clicked!");
    console.log("role", role);
    console.log("side", side);
    console.log("clickSide", clickSideRef.current);

    const thisTeamPending = pendingBenchSubs.filter((p) => p.teamId === teamId);

    onSub(teamId, activePlayers.map((p) => p.id), thisTeamPending.map((p) => p.id));

    // Remove only this team's pending subs
    setPendingBenchSubs((prev) => prev.filter((p) => p.teamId !== teamId));
    setShowConfirmPopup(false);
  };

  const handleCancel = () => {
    setPendingBenchSubs((prev) => prev.filter((p) => p.teamId !== teamId));
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
      <h3 style={{ textAlign: "center", marginTop: 0, marginBottom: 0 }}>
        {teamName} Bench
      </h3>

      <div className="timeout-controls">
        <span className="timeout-count">Timeout: {usedTimeouts} / 6</span>
        <button
          className="timeout-btn undo"
          onClick={() => undoTimeout(teamId)}
          disabled={usedTimeouts === 0 || role === "homeOffense" || role === "awayOffense"}
        >
          -
        </button>
        <button
          className="timeout-btn"
          onClick={handleTimeout}
          disabled={usedTimeouts >= 6 || role === "homeOffense" || role === "awayOffense"}
        >
          +
        </button>
      </div>

      <div className="bench-players">
        {benchPlayers.map((player) => {
          const isSelected = pendingBenchSubs.some((p) => p.id === player.id);
          return (
            <li key={player.id}>
              <button
                disabled={role === "homeOffense" || role === "awayOffense"}
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
