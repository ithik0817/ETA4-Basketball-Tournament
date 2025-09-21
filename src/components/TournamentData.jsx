// src/components/TournamentData.jsx
import React from "react";
import { Timestamp } from "firebase/firestore";

export default function TournamentData({ tournaments, games, teams }) {
  return (
    <div>
      <h2>Tournaments</h2>
      <ul className="no-bullets">
        {tournaments.map(tournament => (
          <li key={tournament.id}>
            {tournament.name}
          </li>
        ))}
      </ul>
      <h2>Games</h2>
      <ul className="no-bullets">
        {games.map(game => (
          <li key={game.id}>
            Game on {" "} 
            {game.date instanceof Timestamp ? game.date.toDate().toLocaleString() : game.date} {" "} 
            at {game.location} 
          </li>
        ))}
      </ul>
      <h2>Teams</h2>
      <ul className="no-bullets">
        {teams.map(team => (
          <li key={team.id}>
            {team.name} from {team.location}
          </li>
        ))}
      </ul>
    </div>
  );
}
