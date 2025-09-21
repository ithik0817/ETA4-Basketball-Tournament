// src/components/data/fetchTournaments.jsx
import { collection, getDocs } from "firebase/firestore";

export async function fetchTournaments(database) {
  const tournamentsCollection = collection(database, "tournaments");
  const querySnapshot = await getDocs(tournamentsCollection);
  
  const tournaments = [];
  querySnapshot.forEach(doc => {
    tournaments.push({ id: doc.id, ...doc.data() });
  });
  
  return tournaments;
}