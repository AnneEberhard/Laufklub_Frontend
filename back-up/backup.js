function renderEditForm() {
  const container = document.getElementById("touren");
  let tour = currentTour;
  const dateObj = tour.date.toDate ? tour.date.toDate() : new Date(tour.date);
  const isoDate = dateObj.toISOString().slice(0, 16); // Für <input type="datetime-local">

  container.innerHTML = `
    <h2>Tour bearbeiten</h2>
    <form id="editTourForm">
      <input type="text" id="editName" value="${tour.name}" required />
      <input type="datetime-local" id="editDate" value="${isoDate}" required />
      <textarea id="editDescription">${tour.description || ""}</textarea>
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


//async function loadRegistrations(tour) {
//  const list = document.getElementById(`anmeldeliste-${tour.id}`);
//  list.innerHTML = "<p>Wird geladen...</p>";
//  console.log("Lade Anmeldungen für Tour-ID:", tour.id);
//
//  try {
//    const querySnapshot = await db
//      .collection("tours")
//      .doc(tour.id)
//      .collection("registrations")
//      .orderBy("createdAt", "asc")
//      .get();
//
//    if (querySnapshot.empty) {
//      list.innerHTML = "<p>Noch niemand angemeldet</p>";
//      return;
//    }
//
//    list.innerHTML = "";
//    querySnapshot.forEach((doc) => {
//      const data = doc.data();
//      const typ =
//        data.fahrt === "big" ? "Große Fahrt" : "Kleine Fahrt";
//      const comment = data.comment ? `<p class="comment">💬 ${data.comment}</p>` : "";
//
//      const item = document.createElement("div");
//      item.className = "registration-card";
//      item.innerHTML = `
//        <strong>${data.name}</strong> <span class="fahrt">${typ}</span>
//        ${comment}
//        <button class="red" onclick="unregisterForTour('${tour.id}', '${doc.id}')">Abmelden</button>
//      `;
//
//      list.appendChild(item);
//    });
//  } catch (error) {
//    console.error("Fehler beim Laden der Anmeldungen:", error);
//    list.innerHTML = "<p>Fehler beim Laden</p>";
//  }
//}

//function renderAdminLinks(tour, isAdmin) {
//  const container = document.getElementById("adminLinks");
//  container.innerHTML = `
//  ${isAdmin ? "<a target='_blank' class='buttonLink' href='/neu.html'>Neue Tour anlegen</a>" : ""}
//  ${isAdmin ? "<button id='editTourButton'>Tour bearbeiten</button>" : ""}`;
//  document
//    .getElementById("editTourButton")
//    .addEventListener("click", function () {
//      renderEditForm(tour);
//    });
//}

function renderTour() {
  let tour = currentTour;
  const container = document.getElementById("touren");
  const dateObj = tour.date.toDate ? tour.date.toDate() : new Date(tour.date);
  const formattedDate = dateObj.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  container.innerHTML = `
  <div class='tour' >
    <h2>${tour.name}</h2>
     <h3>${formattedDate}</h3>
    <p>${tour.description}</p>
      ${
        tour.link
          ? `<a href='${tour.link}' target="_blank">Link zur Karte</a>`
          : ""
      }
      <form id="anmeldung-form" class="signUpForm">
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
  document
    .getElementById("anmeldung-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const name = this.name.value.trim();
      const comment = this.comment.value;
      const selected = document.querySelector(
        'input[name="fahrt"]:checked'
      ).value;

      registerForTour(tour.id, name, selected, comment);
    });

  loadRegistrations();
}


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
  container.innerHTML += `
  <div class='tour' id="tour-${tour.id}">
    <h2>${tour.name}</h2>
     <h3>${formattedDate}</h3>
    <p>${tour.description}</p>
    ${isAdmin ? `<button onclick="deleteTour('${tour.id}')">Löschen</button>` : ""}
    </div>
  `;
}

async function checkLogIn() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("Aktueller Benutzer:", user.email);
    } else {
      console.log("Nicht eingeloggt");
      window.location.href = "index.html";
    }
  });
}

function loadLatestTour(isAdmin) {
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
                isAdmin = userDoc.data()?.isAdmin || false;
                currentTour = tour;
                renderTour();
                renderAdminLinks(isAdmin);
              })
              .catch((error) => {
                console.error(
                  "Fehler beim Abrufen des Benutzerdokuments:",
                  error
                );
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


function firstLogin() {
  const email = document.getElementById("firstLoginEmail").value.trim();
  const pw1 = document.getElementById("firstLoginPassword1").value;
  const pw2 = document.getElementById("firstLoginPassword2").value;
  const errorBox = document.getElementById("firstLoginError");
  
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
  try {
    const cred = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, pw1);
    await cred.user.updateProfile({ displayName: name });
    errorBox.textContent = "Registrierung erfolgreich! Herzlich Willkommen " + name + "!";
  } catch (err) {
    if (
      err.message ==
      "Firebase: The email address is already in use by another account. (auth/email-already-in-use)."
    ) {
      errorBox.textContent =
        "Diese Email ist bereits registriert. Bitte verwenden Sie den normalen Login oder Passwort vergessen";
    } else {
      console.error("Fehler bei der Registrierung:", err);
      errorBox.textContent = "Fehler: " + err.message;
    }
  }
}


async function submitRegistration(email, pw1, name) {
  const errorBox = document.getElementById("firstLoginError");
  try {
    const cred = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, pw1);
    const user = cred.user;

    await user.updateProfile({ displayName: name });

    await db.collection("users").doc(user.uid).set({
      email: user.email,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      name: name,
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
            <div><strong>${data.name}</strong> – ${typ}</div>
            <div><button class="red" onclick="unregisterForTour('${
              tour.id
            }', '${doc.id}')">Abmelden</button></div>
            </div>
            ${
              data.comment
                ? `<div class="registrationComment"><em>${data.comment}</em></div>`
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