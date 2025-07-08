async function init() {
  await includeHTML();
  await checkLogIn();
  loadLatestTour();
}

/**
 * loads data for the global variables
 * menuTitles, navSites, mainSites, overview, pageFunctions
 */
async function checkLogIn() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("Aktueller Benutzer:", user.email);
    } else {
      console.log("Nicht eingeloggt");
    }
  });
}

// Daten laden
function loadLatestTour() {
  db.collection("tours")
    .orderBy("date", "desc")
    .limit(1)
    .get()
    .then((querySnapshot) => {
      console.log("Docs gefunden:", querySnapshot.size);
      querySnapshot.forEach((doc) => {
        const tour = { id: doc.id, ...doc.data() };
        firebase.auth().onAuthStateChanged((user) => {
          if (user) {
            db.collection("users")
              .doc(user.uid)
              .get()
              .then((userDoc) => {
                const isAdmin = userDoc.data()?.isAdmin || false;
                renderTour(tour, isAdmin);
                renderAdminLinks(tour, isAdmin);
              })
              .catch((error) => {
                console.error(
                  "Fehler beim Abrufen des Benutzerdokuments:",
                  error
                );
                renderTour(tour, false); // Fallback
              });
          } else {
            renderTour(tour, false);
          }
        });
      });
    })
    .catch((error) => {
      console.error("Fehler beim Laden der Tour:", error);
    });
}

async function loadRegistrations(tour) {
  const list = document.getElementById("anmeldeliste");
  list.innerHTML = "<li>Wird geladen...</li>";
  console.log("Lade Anmeldungen für Tour-ID:", tour.id);

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
            <li>
              ${data.name} (${typ})
              <button class="red" onclick="unregisterForTour('${tour.id}', '${doc.id}')">Abmelden</button>
            </li>
          `;
      });
    })
    .catch((error) => {
      console.error("Fehler beim Laden der Anmeldungen:", error);
      list.innerHTML = "<li>Fehler beim Laden</li>";
    });
}

// Tour anzeigen
function renderTour(tour, isAdmin) {
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
      <form id="anmeldung-form">
      <h3>Anmeldung</h3>
        <input placeholder="Name" type="text" name="name" required><br>
        <label><input type="radio" name="fahrt" value="big" checked> Große Fahrt</label>
        <label><input type="radio" name="fahrt" value="small"> Kleine Fahrt</label><br>

        <button type="submit">Anmelden</button>
      </form>

      <h3>Bereits angemeldet:</h3>
      <ul id="anmeldeliste"></ul>
    </div>
  `;
  document
    .getElementById("anmeldung-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const name = this.name.value.trim();
      const selected = document.querySelector(
        'input[name="fahrt"]:checked'
      ).value;

      registerForTour(tour.id, name, selected); // Übergibt ganze Tour und Auswahl
    });

  loadRegistrations(tour);
}

function renderAdminLinks(tour, isAdmin) {
  const container = document.getElementById("adminLinks");
  container.innerHTML = `
  ${isAdmin ? "<a target='_blank' class='buttonLink' href='/neu.html'>Neue Tour anlegen</a>" : ""}
  ${isAdmin ? "<button id='editTourButton'>Tour bearbeiten</button>" : ""}`;
  document
    .getElementById("editTourButton")
    .addEventListener("click", function () {
      renderEditForm(tour);
    });
}

function renderEditForm(tour) {
  const container = document.getElementById("touren");
  const dateObj = tour.date.toDate ? tour.date.toDate() : new Date(tour.date);
  const isoDate = dateObj.toISOString().slice(0, 16); // Für <input type="datetime-local">

  container.innerHTML = `
    <h2>Tour bearbeiten</h2>
    <form id="editTourForm">
      <input type="text" id="editName" value="${tour.name}" required />
      <input type="datetime-local" id="editDate" value="${isoDate}" required />
      <textarea id="editDescription">${tour.description || ""}</textarea>
      <input type="text" id="editLink" value="${
        tour.link || ""
      }" placeholder="Link zur Karte" />

      <button type="submit">Speichern</button>
      <button type="button" id="cancelEdit">Abbrechen</button>
    </form>
  `;

  document
    .getElementById("editTourForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const updatedTour = {
        name: document.getElementById("editName").value.trim(),
        date: new Date(document.getElementById("editDate").value),
        description: document.getElementById("editDescription").value.trim(),
        link: document.getElementById("editLink").value.trim(),
      };

      db.collection("tours")
        .doc(tour.id)
        .update(updatedTour)
        .then(() => {
          alert("Tour aktualisiert!");
          loadLatestTour(); // Neu laden
        })
        .catch((err) => {
          console.error("Fehler beim Aktualisieren:", err);
          alert("Aktualisierung fehlgeschlagen.");
        });
    });

  document.getElementById("cancelEdit").addEventListener("click", function () {
    renderTour(tour); // Zurück zur Anzeige
  });
}

// Anmelden für Tour
async function registerForTour(tourId, name, selected) {
  const ref = db.collection("tours").doc(tourId).collection("registrations");
  const isBig = selected === "big";

  ref
    .add({
      name: name,
      big: isBig,
      small: !isBig,
      registeredAt: new Date().toISOString(),
    })
    .then(() => {
      alert("Anmeldung erfolgreich!");
      loadRegistrations({ id: tourId });
    })
    .catch((error) => {
      console.error("Fehler bei der Anmeldung:", error);
      alert("Anmeldung fehlgeschlagen.");
    });
}

//Abmelden
function unregisterForTour(tourId, registrationId) {
  if (!confirm("Willst du diese Anmeldung wirklich löschen?")) return;

  db.collection("tours")
    .doc(tourId)
    .collection("registrations")
    .doc(registrationId)
    .delete()
    .then(() => {
      alert("Abmeldung erfolgreich.");
      loadRegistrations({ id: tourId }); // Neu laden
    })
    .catch((error) => {
      console.error("Fehler beim Abmelden:", error);
      alert("Abmeldung fehlgeschlagen.");
    });
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
  await checkLogIn();
  loadAllTours();
}

function loadAllTours() {
  db.collection("tours")
    .orderBy("date", "desc")
    .get()
    .then((querySnapshot) => {
      console.log("Docs gefunden:", querySnapshot.size);
      querySnapshot.forEach((doc) => {
        const tour = { id: doc.id, ...doc.data() };
        renderArchiveTour(tour);
        console.log(tour);
      });
    })
    .catch((error) => {
      console.error("Fehler beim Laden der Tour:", error);
    });
}

function renderArchiveTour(tour) {
  const container = document.getElementById("archive");
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
    </div>
  `;
}

// Login, logout, register, forgot

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
  document.getElementById("regError").innerText = "";
}

// Wird vom Modal aus aufgerufen
function submitRegistration() {
  const email = document.getElementById("regEmail").value.trim();
  const pw1 = document.getElementById("regPassword1").value;
  const pw2 = document.getElementById("regPassword2").value;
  const errorBox = document.getElementById("regError");

  if (!email || !pw1 || !pw2) {
    errorBox.innerText = "Bitte fülle alle Felder aus.";
    return;
  }

  if (pw1.length < 8) {
    errorBox.innerText = "Passwort muss mindestens 8 Zeichen lang sein.";
    return;
  }

  if (pw1 !== pw2) {
    errorBox.innerText = "Passwörter stimmen nicht überein.";
    return;
  }

  // Registrierung durchführen
  auth
    .createUserWithEmailAndPassword(email, pw1)
    .then((userCredential) => {
      const user = userCredential.user;
      return db
        .collection("users")
        .doc(user.uid)
        .set({
          email: user.email,
          isAdmin: false,
          createdAt: new Date().toISOString(),
        })
        .then(() => {
          alert("Registrierung erfolgreich! Eingeloggt als: " + user.email);
          window.location.href = "touren.html";
        });
    })
    .catch((error) => {
      console.error("Fehler bei Registrierung:", error);
      errorBox.innerText = "Fehler: " + error.message;
    });
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
      window.location.href = "login.html";
    })
    .catch((error) => {
      console.error("Fehler beim Logout:", error);
      alert("Fehler beim Logout");
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
