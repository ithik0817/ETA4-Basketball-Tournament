// src/Players.jsx
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
    const dup = players.some((p) => p.Name.toLowerCase() === Name.toLowerCase());
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

      {/*
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Enter player name"
          value={newPlayer}
          onChange={(e) => setNewPlayer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          style={{ flex: 1, padding: 6 }}
        />
        <button onClick={handleAdd}>Add Player</button>
      </div>
      */}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {players.map((p) => {
          const selected = selectedPlayerId === p.id;
          return (
            <li
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                alignContent: "center",
                gap: 8,
                marginBottom: 4,
                padding: 2,
                borderRadius: 6,
                justifyContent: "center"
              }}
            >
              <button
                onClick={() => {
                  if (pendingBenchSub) {
                    // swap with bench player
                    onSub(teamId, p.id, pendingBenchSub.id);
                    setPendingBenchSub(null);
                  } else {
                    // normal selection
                    setSelectedPlayerId(p.id);
                    setSelectedTeamId(selectedTeamId);
                  }
                }}
                className={`active-player-btn ${selected ? "selected" : ""}`}
              >
                #{p.number} - {p.name}
              </button>
              {/*
              <button 
                style={{ 
                  padding: "4px 8px"
                }}
                title="Remove"
                onClick={() => handleRemove(p.id)}>
                ❌
              </button>
              */}
            </li>
          );
        })}
        {players.length === 0 && <li style={{ color: "#666" }}>No players yet.</li>}
      </ul>
      {/*
      <div style={{ marginTop: 8, fontStyle: "italic", color: "#444" }}>
        Selected Player:{" "}
        <strong>{players.find((p) => p.id === selectedPlayerId)?.Name || "None"}</strong>
      </div>
      */}
    </div>
  );
}
