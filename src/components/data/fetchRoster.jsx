// src/components/data/fetchRoster.jsx
import { collection, getDocs } from "firebase/firestore";

export async function fetchRoster(database, teamId) {
  const rosterCollection = collection(database, "teams", teamId, "roster");
  const querySnapshot = await getDocs(rosterCollection);
  
  const roster = [];
  querySnapshot.forEach(doc => {
    roster.push({ id: doc.id, ...doc.data() });
  });

  return roster;
}
