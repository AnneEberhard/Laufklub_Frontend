let currentTour = null;
let isAdmin = false;

async function init() {
  await includeHTML();
  const { user, isAdmin } = await checkUserAdminStatus();
  loadLatestTour();
  renderAdminLinks(isAdmin);
}

/**
 * loads data for the global variables
 * menuTitles, navSites, mainSites, overview, pageFunctions
 */

async function checkUserAdminStatus() {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.log("Nicht eingeloggt");
        window.location.href = "index.html";
        resolve({ user: null, isAdmin: false });
        return;
      }

      try {
        const userDoc = await db.collection("users").doc(user.uid).get();
        const isAdmin = userDoc.exists
          ? userDoc.data()?.isAdmin || false
          : false;
        console.log("Eingeloggt als:", user.email, "Admin:", isAdmin);
        resolve({ user, isAdmin });
      } catch (err) {
        console.error("Fehler beim Abrufen des Benutzerdokuments:", err);
        resolve({ user, isAdmin: false });
      }
    });
  });
}

function renderAdminLinks(isAdmin) {
  const container = document.getElementById("adminLinks");
  container.innerHTML = `
    ${
      isAdmin
        ? "<a target='_blank' class='buttonLink' href='/neu.html'>Neue Tour anlegen</a>"
        : ""
    }
    ${
      isAdmin
        ? `<button id='editTourButton' onclick="renderEditForm()">Tour bearbeiten</button>`
        : ""
    }
    ${
      isAdmin ? "<a class='buttonLink' href='/members.html'>Mitglieder</a>" : ""
    }
    `;
}

// Tour page

async function loadLatestTour() {
  try {
    const querySnapshot = await db
      .collection("tours")
      .orderBy("date", "desc")
      .limit(1)
      .get();

    if (querySnapshot.empty) return;

    const doc = querySnapshot.docs[0];
    const tour = { id: doc.id, ...doc.data() };
    currentTour = tour;
    renderTour();
  } catch (error) {
    console.error("Fehler beim Laden der Tour:", error);
  }
}

async function loadRegistrations() {
  const list = document.getElementById(`anmeldeliste`);
  let tour = currentTour;
  list.innerHTML = "<li>Wird geladen...</li>";

  db.collection("tours")
    .doc(tour.id)
    .collection("registrations")
    .get()
    .then((querySnapshot) => {
      console.log("Docs gefunden:", querySnapshot.size);
      if (querySnapshot.empty) {
        list.innerHTML = "<li>Noch niemand angemeldet</li>";
        return;
      }

      list.innerHTML = "";
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const typ = data.big ? "Große Fahrt" : "Kleine Fahrt";
        list.innerHTML += `
          <li class="registrationItem">
          <div class="registrationItemTop">
            <div><strong>- ${data.name}</strong> – ${typ}</div>
            <div><button class="red" onclick="unregisterForTour('${
              tour.id
            }', '${doc.id}')">Abmelden</button></div>
            </div>
            ${
              data.comment
                ? `<div class="registration-comment"><em>${data.comment}</em></div>`
                : ""
            }          
            </li>
            <div class="divider"></div>
        `;
      });
    })
    .catch((error) => {
      console.error("Fehler beim Laden der Anmeldungen:", error);
      list.innerHTML = "<li>Fehler beim Laden</li>";
    });
}

function renderTour() {
  const tour = currentTour;
  const container = document.getElementById("touren");
  const dateObj = tour.date.toDate ? tour.date.toDate() : new Date(tour.date);
  const formattedDate = dateObj.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  container.innerHTML = `
    <div class='tour'>
      <h2>${tour.name}</h2>
      <h3>${formattedDate}</h3>
      <p>${tour.description}</p>
      ${
        tour.link
          ? `<a href='${tour.link}' target="_blank">Link zur Karte</a>`
          : ""
      }
      
      <form id="anmeldung-form" class="signUpForm" onsubmit="handleTourRegistration(event)">
        <h3>Anmeldung</h3>
        <input class="signUpForm" placeholder="Name" type="text" name="name" required><br>
        <label><input type="radio" name="fahrt" value="big" checked> Große Fahrt</label>
        <label><input type="radio" name="fahrt" value="small"> Kleine Fahrt</label><br>
        <textarea class="signUpComment" placeholder="Kommentar" name="comment"></textarea>
        <button type="submit">Anmelden</button>
      </form>

      <h3>Bereits angemeldet:</h3>
      <ul id="anmeldeliste"></ul>
    </div>
  `;

  loadRegistrations();
}

function handleTourRegistration(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const comment = form.comment.value;
  const selected = form.querySelector('input[name="fahrt"]:checked').value;

  registerForTour(currentTour.id, name, selected, comment);
  form.reset();
}

// Anmelden für Tour
async function registerForTour(tourId, name, selected, comment) {
  const ref = db.collection("tours").doc(tourId).collection("registrations");
  const isBig = selected === "big";

  ref
    .add({
      name: name,
      big: isBig,
      small: !isBig,
      registeredAt: new Date().toISOString(),
      comment: comment,
    })
    .then(() => {
      alert("Anmeldung erfolgreich!");
      loadRegistrations();
    })
    .catch((error) => {
      console.error("Fehler bei der Anmeldung:", error);
      alert("Anmeldung fehlgeschlagen.");
    });
}

//Abmelden
function unregisterForTour(tourId, registrationId) {
  if (!confirm("Diese Anmeldung wirklich löschen?")) return;

  db.collection("tours")
    .doc(tourId)
    .collection("registrations")
    .doc(registrationId)
    .delete()
    .then(() => {
      alert("Abmeldung erfolgreich.");
      loadRegistrations();
    })
    .catch((error) => {
      console.error("Fehler beim Abmelden:", error);
      alert("Abmeldung fehlgeschlagen.");
    });
}

// Edit page

function renderEditForm() {
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

function handleSaveTour(e) {
  e.preventDefault();

  const updatedTour = {
    name: document.getElementById("editName").value.trim(),
    date: new Date(document.getElementById("editDate").value),
    description: document.getElementById("editDescription").value.trim(),
  };

  db.collection("tours")
    .doc(currentTour.id)
    .update(updatedTour)
    .then(() => {
      alert("Tour aktualisiert!");
      loadLatestTour();
    })
    .catch((err) => {
      console.error("Fehler beim Aktualisieren:", err);
      alert("Aktualisierung fehlgeschlagen.");
    });
}

function handleCancelEdit() {
  renderTour(currentTour);
}

//Neue Tour

function handleCreateTour(e) {
  e.preventDefault();

  const name = document.getElementById("tourName").value.trim();
  const date = document.getElementById("tourDate").value;
  const description = document.getElementById("tourDescription").value.trim();

  if (!name || !date) {
    alert("Bitte fülle alle Pflichtfelder aus.");
    return;
  }

  db.collection("tours")
    .add({
      name: name,
      date: new Date(date),
      description: description,
      createdBy: firebase.auth().currentUser?.uid || null,
      createdAt: new Date().toISOString(),
    })
    .then(() => {
      alert("Tour erfolgreich angelegt.");
      window.close();
    })
    .catch((error) => {
      console.error("Fehler beim Anlegen der Tour:", error);
      alert("Fehler beim Speichern.");
    });
}

//Archiv
async function archive() {
  await includeHTML();
  const { user, isAdmin } = await checkUserAdminStatus();
  loadAllTours(isAdmin);
}

function loadAllTours(isAdmin) {
  db.collection("tours")
    .orderBy("date", "desc")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const tour = { id: doc.id, ...doc.data() };
        renderArchiveTour(tour, isAdmin);
      });
    })
    .catch((error) => {
      console.error("Fehler beim Laden der Tour:", error);
    });
}

function renderArchiveTour(tour, isAdmin) {
  const container = document.getElementById("archive");
  const dateObj = tour.date.toDate ? tour.date.toDate() : new Date(tour.date);
  const formattedDate = dateObj.toLocaleDateString("de-DE");

  container.innerHTML += `
    <div class='tour' id="tour-${tour.id}">
      <h2>${tour.name}</h2>
      <h3>${formattedDate}</h3>
      <p>${tour.description}</p>
      ${
        isAdmin
          ? `<button onclick="deleteTour('${tour.id}')">Löschen</button>`
          : ""
      }
      <div class="divider marginTop"></div>
    </div>
  `;
}

function deleteTour(tourId) {
  if (!confirm("Möchten Sie diese Tour wirklich löschen?")) return;

  db.collection("tours")
    .doc(tourId)
    .delete()
    .then(() => {
      // Tour aus DOM entfernen
      const tourElement = document.getElementById(`tour-${tourId}`);
      if (tourElement) tourElement.remove();
      alert("Tour erfolgreich gelöscht.");
    })
    .catch((err) => {
      console.error("Fehler beim Löschen der Tour:", err);
      alert("Löschen fehlgeschlagen.");
    });
}

// Login, logout, register, forgot

function togglePassword(button, divId) {
  const input = document.getElementById(divId);
  if (input.type === "password") {
    input.type = "text";
    button.textContent = "🙈";
  } else {
    input.type = "password";
    button.textContent = "👁️";
  }
}

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      window.location.href = "touren.html";
      console.log("Eingeloggt als: " + userCredential.user.email);
    })
    .catch((error) => {
      alert("Fehler beim Einloggen: " + error.message);
    });
}

function openRegisterModal() {
  document.getElementById("registerModal").style.display = "block";
}

function closeRegisterModal() {
  document.getElementById("registerModal").style.display = "none";
  document.getElementById("firstLoginError").innerText = "";
}
function checkFirstLoginInForm(email, pw1, pw2) {
  let message = "";
  if (!email || !pw1 || !pw2) {
    message = "Bitte fülle alle Felder aus.";
    return { checkForm: false, message };
  }

  if (pw1.length < 8) {
    message = "Passwort muss mindestens 8 Zeichen lang sein.";
    return { checkForm: false, message };
  }

  if (pw1 !== pw2) {
    message = "Passwörter stimmen nicht überein.";
    return { checkForm: false, message };
  }
  return { checkForm: true };
}

function checkPendingUser(email) {
  const errorBox = document.getElementById("firstLoginError");
  return db
    .collection("pendingUsers")
    .where("email", "==", email)
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        return { pending: false };
      } else {
        const userDoc = querySnapshot.docs[0];
        const data = userDoc.data();
        return { pending: true, name: data.name };
      }
    })
    .catch((error) => {
      console.error("Fehler beim Prüfen von pendingUsers:", error);
      errorBox.innerText = "Fehler beim Prüfen.";
      return { pending: false };
    });
}

async function firstLogin() {
  const email = document.getElementById("firstLoginEmail").value.trim();
  const pw1 = document.getElementById("firstLoginPassword1").value;
  const pw2 = document.getElementById("firstLoginPassword2").value;
  const errorBox = document.getElementById("firstLoginError");

  const { checkForm, message } = await checkFirstLoginInForm(email, pw1, pw2);
  if (!checkForm) {
    errorBox.textContent = message;
    return;
  }

  const { pending, name } = await checkPendingUser(email);
  if (!pending) {
    errorBox.textContent =
      "Sie sind nicht für die Registrierung berechtigt. Bitte kontaktieren Sie uns.";
    return;
  }

  submitRegistration(email, pw1, name);
}

async function submitRegistration(email, pw1, name) {
  const errorBox = document.getElementById("firstLoginError");
  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, pw1);
    const user = cred.user;

    await user.updateProfile({ displayName: name });

    await db.collection("users").doc(user.uid).set({
      email: user.email,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      name: name
    });

    alert("Registrierung erfolgreich! Eingeloggt als: " + name);
    window.location.href = "touren.html";

  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      errorBox.textContent =
        "Diese Email ist bereits registriert. Bitte verwenden Sie den normalen Login oder 'Passwort vergessen'.";
    } else {
      console.error("Fehler bei der Registrierung:", err);
      errorBox.textContent = "Fehler: " + err.message;
    }
  }
}

function resetPassword() {
  const email = document.getElementById("email").value;

  auth
    .sendPasswordResetEmail(email)
    .then(() => {
      alert("Passwort-Zurücksetzungs-E-Mail gesendet");
    })
    .catch((error) => {
      alert("Fehler beim Zurücksetzen: " + error.message);
    });
}

function logout() {
  firebase
    .auth()
    .signOut()
    .then(() => {
      console.log("Erfolgreich ausgeloggt.");
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Fehler beim Logout:", error);
      alert("Fehler beim Logout");
    });
}

// Members
async function members() {
  await includeHTML();
  const { user, isAdmin } = await checkUserAdminStatus();
  loadMembers(isAdmin);
}

function loadMembers(isAdmin) {
  db.collection("users")
    .orderBy("email")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const user = { id: doc.id, ...doc.data() };
        renderMember(user, isAdmin);
      });
    })
    .catch((error) => {
      console.error("Fehler beim Laden der Mitglieder:", error);
    });
}

function renderMember(user, isAdmin) {
  const container = document.getElementById("members");
  container.innerHTML += `
    <div class="member" id="member-${user.id}">
      <p>Name: ${user.name || "-"}</p>
      <p>Email: ${user.email}</p>
      ${user.isAdmin ? "<strong>(Admin)</strong>" : ""}
      ${
        isAdmin
          ? `<button onclick="deleteUser('${user.id}')">Löschen</button>`
          : ""
      }
      <div class="divider marginTop"></div>
    </div>
  `;
}

function addMember() {
  const name = document.getElementById("memberName").value.trim();
  const email = document.getElementById("memberEmail").value.trim();
  const msg = document.getElementById("memberMsg");

  msg.textContent = "";

  if (!name || !email) {
    msg.textContent = "Bitte Name und Email eingeben.";
    return;
  }

  // prüfen, ob E-Mail bereits in pendingUsers existiert
  db.collection("pendingUsers")
    .where("email", "==", email)
    .get()
    .then((snapshot) => {
      if (!snapshot.empty) {
        msg.textContent = "Diese Email ist bereits vorgemerkt.";
        return;
      }

      // neuen pendingUser eintragen
      return db.collection("pendingUsers").add({
        name: name,
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    })
    .then((docRef) => {
      if (docRef) {
        msg.textContent = "Mitglied erfolgreich vorgemerkt!";
        document.getElementById("memberName").value = "";
        document.getElementById("memberEmail").value = "";
      }
    })
    .catch((error) => {
      console.error("Fehler beim Hinzufügen: ", error);
      msg.textContent = "Fehler beim Hinzufügen: " + error.message;
    });
}

/**
 * includes the HTML templates
 */
async function includeHTML() {
  var z, i, elmnt, file, xhttp;
  z = document.getElementsByTagName("*");
  for (i = 0; i < z.length; i++) {
    elmnt = z[i];
    file = elmnt.getAttribute("w3-include-html");
    if (file) {
      await fetch(file)
        .then((response) => response.text())
        .then((data) => {
          elmnt.innerHTML = data;
          elmnt.removeAttribute("w3-include-html");
        })
        .catch((error) => {
          console.error(`Error fetching HTML: ${error}`);
        });
    }
  }
}

/**
 * scrolls to top of the page
 */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
