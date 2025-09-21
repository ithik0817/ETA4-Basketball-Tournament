// src/components/data/fetchGameData.jsx
import { collection, getDocs } from "firebase/firestore";

export async function fetchGameData(database, tournamentId, gameId) {
    const gameDataCollection = collection(database, "tournaments", tournamentId, "games");
    const querySnapshot = await getDocs(gameDataCollection);
  
    const gameData = [];
    querySnapshot.forEach(doc => {
        gameData.push({ id: doc.id, ...doc.data() });
    });

    return gameData;
}
