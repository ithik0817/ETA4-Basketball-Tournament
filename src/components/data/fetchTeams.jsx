// src/components/data/fetchTeams.jsx
import { collection, getDocs } from "firebase/firestore";

export async function fetchTeams(database) {
  const teamsCollection = collection(database, "teams");
  const querySnapshot = await getDocs(teamsCollection);
  
  const teams = [];
  querySnapshot.forEach(doc => {
    teams.push({ id: doc.id, ...doc.data() });
  });
  
  return teams;
}