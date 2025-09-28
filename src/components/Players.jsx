// src/components/Players.jsx
import React, { useState } from "react";
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
  pendingBenchSub,
  setPendingBenchSub,
}) {
  const [newPlayer, setNewPlayer] = useState("");

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
  
  return (
    <div className="players-container">
      <h3 style={{ marginTop: 0, marginBottom: 0, textAlign: "center" }}>{team}</h3>
      <h4 style={{ marginTop: 0, textAlign: "center" }}>Players (On Floor)</h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {players.map((p) => {
          const selected = selectedPlayerId === p.id;
          const canClick = pendingBenchSub?.teamId === teamId;
          return (
            <li
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                alignContent: "center",
                gap: 8,
                marginBottom: 20,
                padding: 2,
                justifyContent: "center"
              }}
            >
              <button
                onClick={() => {
                  if (!canClick) return;
                  if (pendingBenchSub) {
                    onSub(teamId, p.id, pendingBenchSub.id);
                    setPendingBenchSub(null);
                  } else {
                    setSelectedPlayerId(p.id);
                    setSelectedTeamId(teamId);
                  }
                }}
                className={`active-player-btn ${selected ? "selected" : ""} ${!canClick ? "disabled" : ""}`}
                disabled={!canClick}
                title={!canClick ? "Select a bench player from this team first" : undefined}
              >
                #{p.number} - {p.name}
              </button>
            </li>
          );
        })}
        {players.length === 0 && <li style={{ color: "#666" }}>No players yet.</li>}
      </ul>
    </div>
  );
}
