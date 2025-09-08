let currentTour = null;
let isAdmin = false;

async function init() {
  await includeHTML();
  const { user, isAdmin } = await checkUserAdminStatus();
  loadNextTour();
  renderAdminLinks(isAdmin);
}

/**
 *
 *
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
  const containerMobile = document.getElementById("adminLinksMobile");
  container.innerHTML = `
  ${
    isAdmin
      ? `
        <a class="buttonLink" href="/tours.html">Fahrten bearbeiten</a>
        <a class="buttonLink" href="/members.html">Mitglieder</a>
      `
      : ""
  }
`;
  containerMobile.innerHTML = `
    ${
      isAdmin
        ? `<button id='editTourButton' onclick="openAdminLinks()">Admin</button>`
        : ""
    }`;
}

function openAdminLinks() {
  document.getElementById("adminLinksMobileMenu").classList.remove("dNone");
}

function closeMobileAdminLinks() {
  document.getElementById("adminLinksMobileMenu").classList.add("dNone");
}

function mobileRenderEditForm() {
  document.getElementById("adminLinksMobileMenu").classList.add("dNone");
  renderEditForm();
}

// Tour page

async function loadNextTour() {
  try {
    const today = new Date();

    const querySnapshot = await db
      .collection("tours")
      .where("date", ">=", today)
      .orderBy("date", "asc")
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      console.warn("Keine kommenden Touren gefunden.");
      renderNoUpcomingTours();
      return;
    }

    const doc = querySnapshot.docs[0];
    const tour = { id: doc.id, ...doc.data() };
    currentTour = tour;
    renderTour();
  } catch (error) {
    console.error("Fehler beim Laden der nächsten Tour:", error);
  }
}


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
  <h2 class="tourHeader"> Unsere nächste Fahrt: </h2>
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

function renderNoUpcomingTours() {
  document.getElementById("touren").innerHTML = `
    <h2 class="tourHeader"> Keine kommenden Touren gefunden </h2>`
  
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
              <div>
                <button onclick="openEditRegistrationModal('${tour.id}', '${
          doc.id
        }')">
                  Bearbeiten
                </button>
              </div>
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

function handleTourRegistration(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const comment = form.comment.value;
  const selected = form.querySelector('input[name="fahrt"]:checked').value;

  registerForTour(currentTour.id, name, selected, comment);
  form.reset();
}

function openEditRegistrationModal(tourId, registrationId) {
  const modal = document.getElementById("editRegistrationModal");

  db.collection("tours")
    .doc(tourId)
    .collection("registrations")
    .doc(registrationId)
    .get()
    .then((doc) => {
      if (!doc.exists) return;

      const data = doc.data();

      document.getElementById("editTourId").value = tourId;
      document.getElementById("editRegistrationId").value = registrationId;

      document.getElementById("editName").value = data.name || "";
      document.querySelector(
        `input[name="editFahrt"][value="${data.big ? "big" : "small"}"]`
      ).checked = true;
      document.getElementById("editComment").value = data.comment || "";

      modal.classList.remove("dNone");
    });
}

function closeEditModal() {
  document.getElementById("editRegistrationModal").classList.add("dNone");
}

function handleEditRegistration(event) {
  event.preventDefault();

  const tourId = document.getElementById("editTourId").value;
  const registrationId = document.getElementById("editRegistrationId").value;

  const name = document.getElementById("editName").value.trim();
  const fahrt = document.querySelector('input[name="editFahrt"]:checked').value;
  const comment = document.getElementById("editComment").value.trim();

  db.collection("tours")
    .doc(tourId)
    .collection("registrations")
    .doc(registrationId)
    .update({
      name: name,
      big: fahrt === "big",
      comment: comment,
    })
    .then(() => {
      alert("Änderungen gespeichert.");
      closeEditModal();
      loadRegistrations();
    })
    .catch((err) => {
      console.error("Fehler beim Aktualisieren:", err);
      alert("Fehler beim Speichern.");
    });
}

function deleteRegistration() {
  const tourId = document.getElementById("editTourId").value;
  const registrationId = document.getElementById("editRegistrationId").value;

  if (!confirm("Diese Person wirklich von der Fahrt abmelden?")) return;

  db.collection("tours")
    .doc(tourId)
    .collection("registrations")
    .doc(registrationId)
    .delete()
    .then(() => {
      alert("Abgemeldet.");
      closeEditModal();
      loadRegistrations();
    })
    .catch((err) => {
      console.error("Fehler beim Löschen:", err);
      alert("Fehler beim Abmelden.");
    });
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

//Archiv
async function archive() {
  await includeHTML();
  const { user, isAdmin } = await checkUserAdminStatus();
  loadAllTours(false);
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
          ? `
          <div class="buttonBox">
            <button class="red" onclick="deleteTour('${tour.id}')">Löschen</button>
            <button onclick="editTour('${tour.id}')">Bearbeiten</button>
          </div>`
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
      window.location.href = "homepage.html";
      console.log("Eingeloggt als: " + userCredential.user.email);
    })
    .catch((error) => {
      console.log(error.message);
      document.getElementById("loginError").innerHTML =
        "Ein Fehler ist aufgetreten! Passwort vergessen? Oder ist dies die erste Anmeldung? <br> Dann bitte die Buttons unten benutzen.";
    });
}

function openRegisterModal() {
  document.getElementById("registerModal").style.display = "block";
}

function closeRegisterModal() {
  document.getElementById("registerModal").style.display = "none";
  document.getElementById("firstLoginError").innerText = "";
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
    errorBox.innerHTML = `
    Sie sind nicht für die Registrierung berechtigt. Bitte kontaktieren Sie uns. <br> 
    Oder sind Sie schon registriert? Dann bitte den normalen Login nutzen.`;
    return;
  }

  submitRegistration(email, pw1, name);
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

async function submitRegistration(email, pw1, name) {
  const errorBox = document.getElementById("firstLoginError");
  try {
    // 1. Firebase-User anlegen
    const cred = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, pw1);
    const user = cred.user;

    await user.updateProfile({ displayName: name });

    // 2. Firestore-Eintrag in "users"
    await db.collection("users").doc(user.uid).set({
      email: user.email,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      name: name,
    });

    // 3. pendingUser löschen
    const pendingQuery = await db
      .collection("pendingUsers")
      .where("email", "==", email)
      .get();

    if (!pendingQuery.empty) {
      const pendingDoc = pendingQuery.docs[0];
      await db.collection("pendingUsers").doc(pendingDoc.id).delete();
      console.log("Pending-User gelöscht:", email);
    }

    alert("Registrierung erfolgreich! Eingeloggt als: " + name);
    window.location.href = "homepage.html";
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

function openForgotModal() {
  document.getElementById("forgotModal").style.display = "block";
}

function closeForgotModal() {
  document.getElementById("forgotModal").style.display = "none";
  document.getElementById("forgotEmail").innerText = "";
  document.getElementById("forgotError").innerText = "";
}

function resetPassword() {
  const email = document.getElementById("forgotEmail").value;

  auth
    .sendPasswordResetEmail(email)
    .then(() => {
      alert("Passwort-Zurücksetzungs-E-Mail gesendet");
      closeForgotModal();
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
