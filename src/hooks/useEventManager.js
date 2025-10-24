// src/hooks/useEventManager.js
import { useState, useMemo } from "react";
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
export default function useEventManager(selectedTournament, selectedGameId, selectedRole, events, user) {

const sortedEvents = useMemo(() => {
    if (!events.length) return [];
    return [...events].sort((a, b) => {
      const dateA =
        a.createdAt instanceof Date
          ? a.createdAt
          : a.createdAt?.toDate?.() ?? new Date(0);
      const dateB =
        b.createdAt instanceof Date
          ? b.createdAt
          : b.createdAt?.toDate?.() ?? new Date(0);
      return dateA - dateB;
    });
  }, [events]);

  async function handleAddEvent(event) {
      if (!selectedTournament || !selectedGameId) return;
      const eventsRef = collection(
        db,
        "tournaments",
        selectedTournament.id,
        "games",
        selectedGameId,
        "events"
      );
  
      const { id, ...data } = event;
      const docRef = await addDoc(eventsRef, { ...data, createdAt: new Date() });
      await syncEventHistory({ id: docRef.id, ...data }, "add");
    }

  async function handleUndoEvent() {
    if (events.length === 0) return;
    console.log("selectedRole 2", selectedRole)

    const allowedRoles = ["admin", "homeOffense", "awayOffense", "homeDefense", "awayDefense"];
    if (!allowedRoles.includes(selectedRole)) {
      alert("User role not permitted to undo events.");
      return;
    }

    let eventToDelete;

    if (selectedRole === "admin") {
      eventToDelete = events[events.length - 1];
    } else {
      for (let i = events.length - 1; i >= 0; i--) {
        if (events[i].role === selectedRole) {
          eventToDelete = events[i];
          break;
        }
      }

      if (!eventToDelete) {
        alert(`${user.role} role: has no logs to undo.`);
        return;
      }
    }

    if (selectedGameId && eventToDelete?.id) {
      try {
        const eventRef = doc(
          db,
          "tournaments",
          selectedTournament.id,
          "games",
          selectedGameId,
          "events",
          eventToDelete.id
        );

        await deleteDoc(eventRef);
        await syncEventHistory(eventToDelete, "delete");
        console.log("Deleted event:", eventToDelete.id);
      } catch (err) {
        console.error("Error deleting event:", err);
      }
    }
  }

  async function syncEventHistory(event, actionType) {
    const { teamId, playerId, id } = event;
    const syncAction = async (ref) => {
      if (actionType === "add")
        await addDoc(ref, { ...event, createdAt: new Date(), source: "events" });
      else if (actionType === "delete") {
        const q = query(ref, where("id", "==", id));
        const snap = await getDocs(q);
        snap.forEach((d) => deleteDoc(d.ref));
      }
    };
    if (teamId) await syncAction(collection(db, "teams", teamId, "history"));
    if (playerId) await syncAction(collection(db, "players", playerId, "history"));
  }

    return {
        events,
        sortedEvents,
        handleAddEvent,
        handleUndoEvent,
        syncEventHistory,
    }
}