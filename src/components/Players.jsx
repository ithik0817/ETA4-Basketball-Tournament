// src/components/Players.jsx
import React, { useState, useEffect  } from "react";
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
  pendingBenchSubs, // Changed from single to multiple subs
  setPendingBenchSubs, // Changed from single to multiple subs
  onAddShot,
  quarter,
}) {
  const [newPlayer, setNewPlayer] = useState("");
  const [selectedActivePlayers, setSelectedActivePlayers] = useState([]);
  
  // 🔥 Auto execute substitution when counts match
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
    // Check if the correct team's bench players are selected
    if (pendingBenchSubs.length === 0 || pendingBenchSubs[0].teamId !== teamId) {
      return;
    }

    // Toggle the selected active player
    if (selectedActivePlayers.some((p) => p.id === activePlayer.id)) {
      setSelectedActivePlayers((prev) => prev.filter((p) => p.id !== activePlayer.id));
    } else {
      setSelectedActivePlayers((prev) => [...prev, activePlayer]);
    }
  };
  
  return (
    <div className="players-container">
      <h3 style={{ marginTop: 0, marginBottom: 0, textAlign: "center" }}>{team}</h3>
      <h4 style={{ marginTop: 0, textAlign: "center" }}>Players (On Floor)</h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {players.map((p) => {
          const isSelected = selectedActivePlayers.some((ap) => ap.id === p.id);
          const canClick =
            pendingBenchSubs.length > 0 && pendingBenchSubs[0].teamId === teamId;
          const isDisabled = !canClick;

          return (
  <li
    key={p.id}
    style={{
      display: "flex",
      flexDirection: "column", // so main button on top, sub-buttons below
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
      className={`active-player-btn ${isSelected ? "selected" : ""} ${
        isDisabled ? "disabled" : ""
      }`}
      disabled={isDisabled}
      title={
        isDisabled
          ? "Select bench players from this team first"
          : undefined
      }
    >
      #{p.number} - {p.name}
    </button>

    {/* Inline action buttons */}
    <div style={{ display: "flex", gap: 6 }}>
  <button
    className="mini-btn reb"
    onClick={() =>
      onAddShot &&
      onAddShot({
        type: "offRebound",
        playerId: p.id,
        teamId: teamId,
        quarter: quarter, // optional, if you want
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
        type: "turnover",
        playerId: p.id,
        teamId: teamId,
        quarter: quarter,
      })
    }
  >
    TO
  </button>
</div>
  </li>
);
        })}
      </ul>
    </div>
  );
}
