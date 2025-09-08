/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createUserByAdmin = functions.https.onCall(async (data, context) => {
  // Nur Admins dürfen diese Funktion ausführen
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Nicht angemeldet.");
  }

  const uid = context.auth.uid;
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();

  if (!userDoc.exists || !userDoc.data().isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Nicht berechtigt.");
  }

  const { email, displayName } = data;

  if (!email || !displayName) {
    throw new functions.https.HttpsError("invalid-argument", "E-Mail und Name erforderlich.");
  }

  // Generiertes Passwort
  const password = Math.random().toString(36).slice(-10); 

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    // Optional: Zusätzliche Daten in Firestore speichern
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email,
      displayName,
      isAdmin: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/*        <button id="editTourButton" onclick="renderEditForm2()">Fahrt bearbeiten</button>*/
 
function renderEditForm2() {
  const container = document.getElementById("touren");
  const tour = currentTour;
  const dateObj = tour.date.toDate ? tour.date.toDate() : new Date(tour.date);
  const isoDate = dateObj.toISOString().slice(0, 16);

  container.innerHTML = `
    <h2>Tour bearbeiten</h2>
    <form id="editTourForm" onsubmit="handleSaveTour(event)">
      <input type="text" id="editName" value="${tour.name}" required />
      <input type="datetime-local" id="editDate" value="${isoDate}" required />
      <textarea id="editDescription">${tour.description || ""}</textarea>
      <button type="submit">Speichern</button>
      <button type="button" onclick="handleCancelEdit()">Abbrechen</button>
    </form>
  `;
}