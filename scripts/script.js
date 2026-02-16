let currentTour = null;
let isAdmin = false;

/**
 * Initializes the page:
 * - Loads shared HTML
 * - Checks authentication and admin status
 * - Loads next tour
 * - Renders admin links if applicable
 * @returns {Promise<void>}
 */
async function init() {
  await includeHTML();
  const { user, isAdmin } = await checkUserAdminStatus();
  loadNextTour();
  renderAdminLinks(isAdmin);
}


/**
 * Checks Firebase auth state and resolves the current user
 * together with their admin status from Firestore.
 * Redirects to index.html if not authenticated.
 *
 * @returns {Promise<{ user: firebase.User|null, isAdmin: boolean }>}
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


/* Renders admin navigation links for desktop and mobile.
 *
 * @param {boolean} isAdmin - Whether the current user has admin rights.
 * @returns {void}
 */
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


/**
 * Shows the mobile admin menu.
 * @returns {void}
 */
function openAdminLinks() {
  document.getElementById("adminLinksMobileMenu").classList.remove("dNone");
}


/**
 * Hides the mobile admin menu.
 * @returns {void}
 */
function closeMobileAdminLinks() {
  document.getElementById("adminLinksMobileMenu").classList.add("dNone");
}


/**
 * Closes the mobile admin menu and renders the edit form.
 * @returns {void}
 */
function mobileRenderEditForm() {
  document.getElementById("adminLinksMobileMenu").classList.add("dNone");
  renderEditForm();
}

// Tour page

/**
 * Loads the next upcoming tour from Firestore (date >= today),
 * sets it as `currentTour`, and renders it.
 * If no upcoming tour is found, calls `renderNoUpcomingTours()`.
 *
 * @async
 * @function loadNextTour
 * @returns {Promise<void>}
 */
async function loadNextTour() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // heute 00:00 Uhr

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

/**
 * Renders the `currentTour` in the DOM, including registration form and participant lists.
 * @function renderTour
 * @returns {void}
 */
function renderTour() {
  const tour = currentTour;
  const container = document.getElementById("touren");
  container.innerHTML = getTourTemplate(tour);
  loadRegistrations();
}


/**
 * Generates the HTML template for a tour, including:
 * - Name, date, time, description, optional map link
 * - Registration form (disabled if registration is closed)
 * - Participant lists
 *
 * @param {Object} tour - The tour object
 * @param {string} tour.name
 * @param {Date|firebase.firestore.Timestamp} tour.date
 * @param {string} tour.description
 * @param {string} [tour.link]
 * @returns {string} HTML string
 */
function getTourTemplate(tour) {
  const dateObj = tour.date.toDate ? tour.date.toDate() : new Date(tour.date);
  const formattedDate = dateObj.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const now = new Date();
  const deadline = getRegistrationDeadline(dateObj);
  const registrationClosed = now > deadline;

  return `
    <p class="centerText redText">Hinweis: Anmeldeschluss ist immer am Dienstag davor um 24 Uhr.</p>
    <h2 class="tourHeader">Unsere nächste Fahrt:</h2>
    <div class='tour'>
      <h2>${tour.name}</h2>
      <div class="centerText">
        <h3>${formattedDate}</h3>
        <h4 class="tour-time">${formattedTime} Uhr</h4>
      </div>
      <p>${tour.description}</p>
      ${tour.link ? `<a href='${tour.link}' target="_blank">Link zur Karte</a>` : ""}
      
      <form id="anmeldung-form" class="signUpForm" onsubmit="handleTourRegistration(event)">
        <h3>Anmeldung</h3>
        <input class="signUpForm" placeholder="Name" type="text" name="name" required ${registrationClosed ? "disabled" : ""}><br>
        <label><input type="radio" name="fahrt" value="big" checked ${registrationClosed ? "disabled" : ""}> Große Fahrt</label>
        <label><input type="radio" name="fahrt" value="small" ${registrationClosed ? "disabled" : ""}> Kleine Fahrt</label><br>
        <textarea class="signUpComment" placeholder="Kommentar" name="comment" ${registrationClosed ? "disabled" : ""}></textarea>
        <button type="submit" ${registrationClosed ? "disabled" : ""}>Anmelden</button>
      </form>

      ${registrationClosed ? `
        <div class="registration-closed centerText">
          <p><strong>Anmeldeschluss war am ${deadline.toLocaleDateString("de-DE")} um ${deadline.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr.</strong></p>
          <p>Bitte den Wanderwart für eine nachträgliche Anmeldung kontaktieren.</p>
        </div>` : ""}

      <h3>Bereits angemeldet:</h3>
      <div id="registrationContainer">
        <div class="registrationColumn">
          <h3>Große Fahrt</h3>
          <ul id="anmeldeliste-gross"></ul>
        </div>
        <div class="registrationColumn">
          <h3>Kleine Fahrt</h3>
          <ul id="anmeldeliste-klein"></ul>
        </div>
      </div>
    </div>
  `;
}


/**
 * Calculates the registration deadline for a tour.
 * Registration closes 3 days before the tour date at 00:00.
 *
 * @param {Date} tourDate - The date of the tour.
 * @returns {Date} The registration deadline.
 */
function getRegistrationDeadline(tourDate) {
  const deadline = new Date(tourDate);
  deadline.setDate(deadline.getDate() - 3); // Mittwoch

  deadline.setHours(0, 0, 0, 0);

  return deadline;
}


/**
 * Renders a message in the DOM when no upcoming tours are found.
 *
 * @returns {void}
 */
function renderNoUpcomingTours() {
  document.getElementById("touren").innerHTML = `
    <h2 class="tourHeader"> Keine kommenden Touren gefunden </h2>`;
}


/**
 * Loads all registrations for the current tour and renders them
 * in the respective lists (big/small rides).
 * @async
 * @function loadRegistrations
 * @returns {Promise<void>}
 */
async function loadRegistrations() {
  const listGross = document.getElementById("anmeldeliste-gross");
  const listKlein = document.getElementById("anmeldeliste-klein");
  const tour = currentTour;

  // Loading placeholders
  listGross.innerHTML = "<li>Wird geladen...</li>";
  listKlein.innerHTML = "<li>Wird geladen...</li>";

  try {
    const querySnapshot = await db
      .collection("tours")
      .doc(tour.id)
      .collection("registrations")
      .get();

    if (querySnapshot.empty) {
      listGross.innerHTML = "<li>Noch niemand angemeldet</li>";
      listKlein.innerHTML = "<li>Noch niemand angemeldet</li>";
      return;
    }

    const gross = [];
    const klein = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const entryHTML = getRegistrationEntry(data, tour.id, doc.id);
      if (data.big) gross.push(entryHTML);
      else klein.push(entryHTML);
    });

    renderRegistrationList(listGross, gross);
    renderRegistrationList(listKlein, klein);
  } catch (error) {
    console.error("Fehler beim Laden der Anmeldungen:", error);
    listGross.innerHTML = "<li>Fehler beim Laden</li>";
    listKlein.innerHTML = "<li>Fehler beim Laden</li>";
  }
}


/**
 * Generates the HTML string for a single registration entry.
 * @param {Object} data - Registration data
 * @param {string} data.name - Participant name
 * @param {string} [data.comment] - Optional comment
 * @param {boolean} data.big - Whether it is a big ride
 * @param {string} tourId - The tour ID
 * @param {string} docId - The registration document ID
 * @returns {string} HTML string for the entry
 */
function getRegistrationEntry(data, tourId, docId) {
  return `
    <li class="registrationItem">
      <div class="registrationItemTop">
        <div><strong>- ${data.name}</strong></div>
        <div>
          <button onclick="openEditRegistrationModal('${tourId}', '${docId}')">
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
}


/**
 * Renders a list of registration entries into a given container.
 * If the list is empty, shows a placeholder message.
 * @param {HTMLElement} listElement - The UL element to render into
 * @param {string[]} registrations - Array of registration entry HTML strings
 * @returns {void}
 */
function renderRegistrationList(listElement, registrations) {
  if (registrations.length === 0) {
    listElement.innerHTML = "<li>Noch niemand angemeldet</li>";
  } else {
    listElement.innerHTML = registrations.join("");
  }
}


/**
 * Handles the submission of the tour registration form.
 * Prevents default form submission, reads input values, 
 * calls `registerForTour`, and resets the form.
 *
 * @param {Event} e - The form submit event.
 * @returns {void}
 */
function handleTourRegistration(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const comment = form.comment.value;
  const selected = form.querySelector('input[name="fahrt"]:checked').value;

  registerForTour(currentTour.id, name, selected, comment);
  form.reset();
}


/**
 * Opens the edit registration modal and fills it with data
 * for the given tour and registration ID.
 *
 * @param {string} tourId - The ID of the tour.
 * @param {string} registrationId - The ID of the registration.
 * @returns {void}
 */
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
        `input[name="editFahrt"][value="${data.big ? "big" : "small"}"]`,
      ).checked = true;
      document.getElementById("editComment").value = data.comment || "";

      modal.classList.remove("dNone");
    });
}


/**
 * Closes the edit registration modal.
 *
 * @returns {void}
 */
function closeEditModal() {
  document.getElementById("editRegistrationModal").classList.add("dNone");
}


/**
 * Handles the submission of the edit registration form.
 * Updates the registration in Firestore and reloads the registrations list.
 *
 * @param {Event} event - The form submit event.
 * @returns {void}
 */
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


/**
 * Registers a participant for a tour in Firestore.
 * Adds a document with name, ride type, comment, and registration timestamp.
 * Reloads the registrations list on success.
 *
 * @async
 * @param {string} tourId - The ID of the tour.
 * @param {string} name - Participant's name.
 * @param {"big"|"small"} selected - Selected ride type.
 * @param {string} comment - Optional comment.
 * @returns {Promise<void>}
 */
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


/**
 * Deletes a registration from Firestore after user confirmation.
 * Closes the edit modal and reloads the registrations list on success.
 *
 * @returns {void}
 */
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


//Archive page

/**
 * Initializes the archive page:
 * - Loads shared HTML
 * - Checks authentication and admin status
 * - Loads all tours in descending date order
 *
 * @async
 * @returns {Promise<void>}
 */
async function archive() {
  await includeHTML();
  const { user, isAdmin } = await checkUserAdminStatus();
  loadAllTours(false);
}


/**
 * Loads all tours from Firestore and renders each tour in the archive.
 *
 * @param {boolean} isAdmin - Whether the current user has admin rights.
 * @returns {void}
 */
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


/**
 * Renders a single tour in the archive section.
 * Includes tour name, date, time, description, and admin buttons if applicable.
 *
 * @param {Object} tour - The tour object.
 * @param {string} tour.id - Firestore document ID.
 * @param {string} tour.name - Tour name.
 * @param {Date|firebase.firestore.Timestamp|string} tour.date - Tour date.
 * @param {string} tour.description - Tour description.
 * @param {boolean} isAdmin - Whether the current user has admin rights.
 * @returns {void}
 */
function renderArchiveTour(tour, isAdmin) {
  const container = document.getElementById("archive");
  const dateObj = tour.date.toDate ? tour.date.toDate() : new Date(tour.date);
  const formattedDate = dateObj.toLocaleDateString("de-DE");
  const formattedTime = dateObj.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  container.innerHTML += `
    <div class='tour' id="tour-${tour.id}">
      <h2>${tour.name}</h2>
      <div class="centerText">
      <h3>${formattedDate}</h3>
      <h4 class="tour-time">${formattedTime} Uhr</h4>
      </div>
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


/**
 * Deletes a tour from Firestore after user confirmation
 * and removes it from the DOM.
 *
 * @param {string} tourId - The ID of the tour to delete.
 * @returns {void}
 */
function deleteTour(tourId) {
  if (!confirm("Möchten Sie diese Tour wirklich löschen?")) return;

  db.collection("tours")
    .doc(tourId)
    .delete()
    .then(() => {
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

/**
 * Toggles the visibility of a password input field and updates the button icon.
 *
 * @param {HTMLElement} button - The button toggling the password visibility.
 * @param {string} divId - The ID of the password input field.
 * @returns {void}
 */
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


/**
 * Performs user login with Firebase Authentication using email and password.
 * Redirects to homepage on success and displays error messages on failure.
 *
 * @returns {void}
 */
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("Eingeloggt als: " + userCredential.user.email);
      window.location.href = "homepage.html";
    })
    .catch((error) => {
      console.error("Login error:", error);

      // iOS / IndexedDB Spezialfall
      if (
        error &&
        typeof error.message === "string" &&
        (error.message.includes("Indexed Database") ||
          error.message.includes("indexeddb"))
      ) {
        document.getElementById("loginError").innerHTML =
          "Safari hatte ein temporäres Speicherproblem.<br>" +
          "Bitte die Seite neuladen und erneut versuchen.";
        return;
      }

      // normale Auth-Fehler
      document.getElementById("loginError").innerHTML =
        "Ein Fehler ist aufgetreten! Passwort vergessen?<br>" +
        "Oder ist dies die erste Anmeldung? Dann bitte die Buttons unten benutzen.";
    });
}


/**
 * Opens the modal for registering a new user.
 *
 * @returns {void}
 */
function openRegisterUserModal() {
  document.getElementById("registerUserModal").style.display = "block";
}


/**
 * Closes the modal for registering a new user and clears any error messages.
 *
 * @returns {void}
 */
function closeRegisterUserModal() {
  document.getElementById("registerUserModal").style.display = "none";
  document.getElementById("firstLoginError").innerText = "";
}


/**
 * Handles the first-time user registration process:
 * - Validates form input
 * - Checks if the user is in the pending users collection
 * - Submits registration if checks pass
 *
 * @async
 * @returns {Promise<void>}
 */
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


/**
 * Validates the first login form input.
 *
 * @param {string} email - The user's email.
 * @param {string} pw1 - The first password entry.
 * @param {string} pw2 - The second password entry (confirmation).
 * @returns {{ checkForm: boolean, message?: string }}
 *  - checkForm: true if validation passed
 *  - message: error message if validation failed
 */
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


/**
 * Checks if the given email exists in the "pendingUsers" Firestore collection.
 *
 * @param {string} email - The email to check.
 * @returns {Promise<{ pending: boolean, name?: string }>}
 *  - pending: true if the email is pending registration
 *  - name: the name of the pending user if found
 */
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


/**
 * Submits a first-time user registration:
 * - Creates a Firebase Auth user
 * - Sets the display name
 * - Adds the user to Firestore "users" collection
 * - Removes the entry from "pendingUsers"
 * - Redirects to homepage on success
 *
 * @async
 * @param {string} email - User's email.
 * @param {string} pw1 - User's password.
 * @param {string} name - User's display name.
 * @returns {Promise<void>}
 */
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


/**
 * Opens the "forgot password" modal.
 *
 * @returns {void}
 */
function openForgotModal() {
  document.getElementById("forgotModal").style.display = "block";
}


/**
 * Closes the "forgot password" modal and clears input and error messages.
 *
 * @returns {void}
 */
function closeForgotModal() {
  document.getElementById("forgotModal").style.display = "none";
  document.getElementById("forgotEmail").innerText = "";
  document.getElementById("forgotError").innerText = "";
}


/**
 * Sends a password reset email via Firebase Auth and closes the modal on success.
 *
 * @returns {void}
 */
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


/**
 * Logs out the current user via Firebase Auth and redirects to the login page.
 *
 * @returns {void}
 */
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
