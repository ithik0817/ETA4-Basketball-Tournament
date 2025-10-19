const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Trigger when a shot is created or updated within a game
exports.mirrorPlayerStats = functions.firestore
  .document("tournaments/{tournamentId}/games/{gameId}/shots/{shotId}")
  .onWrite(async (change, context) => {
    const { tournamentId, gameId } = context.params;
    const newData = change.after.exists ? change.after.data() : null;

    if (!newData || !newData.playerId) {
      console.log("No valid player data — skipping.");
      return;
    }

    const playerId = newData.playerId;

    if (!newData) {
      // If deleted, clean up mirrored record
      console.log(`🗑️ Removing stats for ${playerId} in ${gameId}`);
      await db.doc(`players/${playerId}/stats/${gameId}`).delete().catch(() => {});
      return;
    }

    // Build mirrored data
    const mirroredData = {
      tournamentId,
      gameId,
      shotId: context.params.shotId, // fixed variable name
      teamId: newData.teamId || null,
      points: newData.points || 0,
      offRebound: newData.type === "offRebound" ? 1 : 0,
      assistPlayerId: newData.assistPlayerId || null,
      offEff: newData.offEff || 0,
      defEff: newData.defEff || 0,
      date: newData.timestamp || new Date().toISOString(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db
      .doc(`players/${playerId}/stats/${gameId}`)
      .set(mirroredData, { merge: true });

    console.log(`✅ Synced stats for player ${playerId} (game ${gameId})`);
  });
