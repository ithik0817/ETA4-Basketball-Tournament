// src/components/data/fetchGames.jsx
import { collection, getDocs } from "firebase/firestore";

export async function fetchGames(database, tournamentId) {
    const gamesCollection = collection(database, "tournaments", tournamentId, "games");
    const querySnapshot = await getDocs(gamesCollection);
  
    const games = [];
    
    querySnapshot.forEach(doc => {
        games.push({ id: doc.id, ...doc.data() });
    });

    return games;
}
