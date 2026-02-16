// Edit page

/**
 * Initializes the tour editing page:
 * - Loads shared HTML
 * - Checks authentication and admin status
 * - Loads all tours for editing
 *
 * @async
 * @returns {Promise<void>}
 */
async function editPage() {
  await includeHTML();
  const { user, isAdmin } = await checkUserAdminStatus();
  loadAllTours(isAdmin);
}


/**
 * Loads a specific tour by ID and renders the edit form.
 *
 * @async
 * @param {string} tourId - The ID of the tour to edit.
 * @returns {Promise<void>}
 */
async function editTour(tourId) {
  const tour = await loadTourById(tourId);
  renderEditForm(tour);
}


/**
 * Loads a tour from Firestore by its ID.
 *
 * @async
 * @param {string} tourId - The ID of the tour.
 * @returns {Promise<Object|null>} The tour object if found, otherwise null.
 */
async function loadTourById(tourId) {
  try {
    const docRef = db.collection("tours").doc(tourId);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.warn("Keine Tour mit dieser ID gefunden:", tourId);
      return;
    }

    const tour = { id: doc.id, ...doc.data() };
    return tour;
  } catch (error) {
    console.error("Fehler beim Laden der Tour:", error);
    return null;
  }
}


/**
 * Renders the edit form for a given tour in a popup overlay.
 *
 * @param {Object} tour - The tour object.
 * @param {string} tour.id - Firestore document ID.
 * @param {string} tour.name - Tour name.
 * @param {Date|firebase.firestore.Timestamp|string} tour.date - Tour date.
 * @param {string} [tour.description] - Tour description.
 * @returns {void}
 */
function renderEditForm(tour) {
  const popup = document.getElementById("editTourBox");
  popup.classList.remove("dNone");
  popup.classList.add("popup-overlay");

  const dateObj = tour.date.toDate ? tour.date.toDate() : new Date(tour.date);
  const isoDate = formatForDateTimeLocal(dateObj);

  popup.innerHTML = `
    <form id="editTourForm" onsubmit="handleSaveTour(event, '${tour.id}')">
      <h2>Tour bearbeiten</h2>
      <input type="text" class="width90" id="editName" value="${tour.name}" required />
      <input type="datetime-local" id="editDate" value="${isoDate}" required />
      <textarea class="width90" id="editDescription">${tour.description || ""}</textarea>
      <div class="buttonBox">
        <button class="red" type="button" onclick="closeEdit()">Abbrechen</button>
        <button type="submit">Speichern</button>
      </div>
    </form>
  `;
}


/**
 * Formats a Date object to a string compatible with <input type="datetime-local">.
 *
 * @param {Date} date - The date to format.
 * @returns {string} Formatted date string in "YYYY-MM-DDTHH:MM" format.
 */
function formatForDateTimeLocal(date) {
  const pad = (n) => n.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}


/**
 * Handles the submission of the tour edit form.
 * Updates the tour in Firestore and reloads the tour list.
 *
 * @param {Event} e - The form submit event.
 * @param {string} tourId - The ID of the tour to update.
 * @returns {void}
 */
function handleSaveTour(e, tourId) {
  e.preventDefault();

  const inputValue = document.getElementById("editDate").value;
  const localDate = new Date(inputValue);

  const updatedTour = {
    name: document.getElementById("editName").value.trim(),
    date: firebase.firestore.Timestamp.fromDate(localDate),
    description: document.getElementById("editDescription").value.trim(),
  };

  db.collection("tours")
    .doc(tourId)
    .update(updatedTour)
    .then(() => {
      alert("Tour aktualisiert!");
      closeEdit();
      document.getElementById("archive").innerHTML = "";
      loadAllTours(true);
    })
    .catch((err) => {
      console.error("Fehler beim Aktualisieren:", err);
      alert("Aktualisierung fehlgeschlagen.");
    });
}


/**
 * Closes the tour edit popup.
 *
 * @returns {void}
 */
function closeEdit() {
  const popup = document.getElementById("editTourBox");
  popup.classList.add("dNone");
  popup.classList.remove("popup-overlay");
}

//New Tour

/**
 * Handles the creation of a new tour from the form input.
 * Validates required fields, adds the tour to Firestore, and redirects on success.
 *
 * @param {Event} e - The form submit event.
 * @returns {void}
 */
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
      window.location.href = "homepage.html";
    })
    .catch((error) => {
      console.error("Fehler beim Anlegen der Tour:", error);
      alert("Fehler beim Speichern.");
    });
}

// Members

/**
 * Initializes the members page:
 * - Loads shared HTML
 * - Checks authentication and admin status
 * - Loads all members
 * - Renders "Add Member" button if admin
 *
 * @async
 * @returns {Promise<void>}
 */
async function members() {
  await includeHTML();
  const { user, isAdmin } = await checkUserAdminStatus();
  loadMembers(isAdmin);
  if (isAdmin) {
    renderAddMember(isAdmin);
  }
}


/**
 * Loads all users from Firestore and renders each member.
 *
 * @param {boolean} isAdmin - Whether the current user has admin rights.
 * @returns {void}
 */
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


/**
 * Renders a single member in the members list.
 * Includes edit and delete buttons if the current user is admin.
 *
 * @param {Object} user - The user object.
 * @param {string} user.id - Firestore document ID.
 * @param {string} user.name - User's display name.
 * @param {string} user.email - User's email.
 * @param {boolean} user.isAdmin - Whether the user is an admin.
 * @param {boolean} isAdmin - Whether the current user has admin rights.
 * @returns {void}
 */
function renderMember(user, isAdmin) {
  const container = document.getElementById("members");
  container.innerHTML += `
    <div class="member" id="member-${user.id}">
      <p>Name: ${user.name || "-"} ${
        user.isAdmin ? "<strong>(Admin)</strong>" : ""
      }</p>
      <p>Email: ${user.email}</p>
      ${
        isAdmin
          ? `<button onclick="editMember('${user.id}', '${user.name}', '${user.email}', ${user.isAdmin})">
               <img src="assets/img/edit.png" alt="Edit">
             </button>
             <button onclick="deleteMember('${user.id}')">
               <img src="assets/img/delete.png" alt="Delete">
             </button>`
          : ""
      }
      <div class="divider marginTop"></div>
    </div>
  `;
}


/**
 * Opens a popup to edit a member's details.
 *
 * @param {string} userId - The ID of the member.
 * @param {string} currentName - Current name of the member.
 * @param {string} currentEmail - Current email of the member.
 * @param {boolean} isAdmin - Whether the member is an admin.
 * @returns {void}
 */
function editMember(userId, currentName, currentEmail, isAdmin) {
  const popup = document.createElement("div");
  popup.classList.add("popup-overlay");
  popup.innerHTML = `
    <div class="popup">
      <h3>Mitglied bearbeiten</h3>
      <label>Name:</label><br>
      <input class="width90" type="text" id="editName" value="${
        currentName || ""
      }"><br><br>
      <label>Email:</label><br>
      <input class="width90" type="email" id="editEmail" value="${
        currentEmail || ""
      }"><br><br>
      <label>
        <input type="checkbox" id="editIsAdmin" ${
          isAdmin ? "checked" : ""
        }> Admin
      </label><br><br>
      <div class="buttonBox">
        <button onclick="saveMember('${userId}')">Speichern</button>
        <button onclick="closePopup()">Abbrechen</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
}


/**
 * Saves the edited member details to Firestore.
 *
 * @param {string} userId - The ID of the member to update.
 * @returns {void}
 */
function saveMember(userId) {
  const newName = document.getElementById("editName").value.trim();
  const newEmail = document.getElementById("editEmail").value.trim();
  const newIsAdmin = document.getElementById("editIsAdmin").checked;

  db.collection("users")
    .doc(userId)
    .update({
      name: newName,
      email: newEmail,
      isAdmin: newIsAdmin,
    })
    .then(() => {
      alert("Änderungen gespeichert!");
      closePopup();
      location.reload(); // oder nur den Member neu rendern
    })
    .catch((err) => {
      console.error("Fehler beim Speichern:", err);
      alert("Fehler: " + err.message);
    });
}


/**
 * Closes the currently open popup (used for editing members or tours).
 *
 * @returns {void}
 */
function closePopup() {
  const popup = document.querySelector(".popup-overlay");
  if (popup) popup.remove();
}


/**
 * Deletes a member from Firestore after user confirmation and removes them from the DOM.
 *
 * @async
 * @param {string} userId - The ID of the member to delete.
 * @returns {Promise<void>}
 */
async function deleteMember(userId) {
  if (!confirm("Soll dieses Mitglied wirklich gelöscht werden?")) return;
  try {
    await db.collection("users").doc(userId).delete();
    document.getElementById(`member-${userId}`).remove();
    alert("Mitglied gelöscht.");
  } catch (err) {
    console.error("Fehler beim Löschen:", err);
    alert("Fehler: " + err.message);
  }
}


/**
 * Renders the "Add Member" form and loads the list of pending members.
 *
 * @param {boolean} isAdmin - Whether the current user has admin rights.
 * @returns {void}
 */
function renderAddMember(isAdmin) {
  renderAddMemberForm();
  loadPendingMembers(isAdmin);
}


/**
 * Renders the HTML form for adding a new pending member.
 *
 * @returns {void}
 */
function renderAddMemberForm() {
  document.getElementById("addMemberForm").innerHTML = `        
        <br>
        <h3>Neues Mitglied hinzufügen</h3>
        <i>Hinweis: wird ein neues Mitglied hinzugefügt, so landet es in der Liste der 
          vorgemerkten Mitglieder, bis dieses Mitglied sich zum ersten Mal über "Erstanmeldung" registriert hat.</i><br>
        <input type="text" id="memberName" placeholder="Name" required /><br />
        <input
          type="email"
          id="memberEmail"
          placeholder="Email"
          required
        /><br />
        <button onclick="addMember()">Hinzufügen</button>
        <p id="memberMsg"></p>`;
}


/**
 * Adds a new pending member to Firestore after validation.
 * Checks if the email is already pending and shows messages accordingly.
 *
 * @returns {void}
 */
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
        window.location.reload();
      }
    })
    .catch((error) => {
      console.error("Fehler beim Hinzufügen: ", error);
      msg.textContent = "Fehler beim Hinzufügen: " + error.message;
    });
}


/**
 * Loads all pending members from Firestore and renders them.
 *
 * @param {boolean} isAdmin - Whether the current user has admin rights.
 * @async
 * @returns {Promise<void>}
 */
async function loadPendingMembers(isAdmin) {
  const container = document.getElementById("pendingMembers");
  container.innerHTML = "<h3>Vorgemerkte Mitglieder</h3>";

  try {
    const snapshot = await db.collection("pendingUsers").get();
    snapshot.forEach((doc) => {
      const user = { id: doc.id, ...doc.data() };
      renderPendingMember(user, isAdmin);
    });
  } catch (err) {
    console.error("Fehler beim Laden der Pending Users:", err);
  }
}


/**
 * Renders a single pending member in the pending members list.
 * Shows edit and delete buttons if the current user is admin.
 *
 * @param {Object} user - The pending user object.
 * @param {string} user.id - Firestore document ID.
 * @param {string} user.name - Name of the pending user.
 * @param {string} user.email - Email of the pending user.
 * @param {boolean} isAdmin - Whether the current user has admin rights.
 * @returns {void}
 */
function renderPendingMember(user, isAdmin) {
  const container = document.getElementById("pendingMembers");
  container.innerHTML += `
    <div class="pending-member" id="pending-${user.id}">
      <p>Name: ${user.name || "-"}</p>
      <p>Email: ${user.email}</p>
      ${
        isAdmin
          ? `<button onclick="editPendingUser('${user.id}', '${user.name}', '${user.email}')">
               <img src="assets/img/edit.png" alt="Edit">
             </button>
             <button onclick="deletePendingUser('${user.id}')">
               <img src="assets/img/delete.png" alt="Delete">
             </button>`
          : ""
      }
      <div class="divider marginTop"></div>
    </div>
  `;
}


/**
 * Opens a popup to edit a pending member's details.
 *
 * @param {string} userId - The ID of the pending user.
 * @param {string} currentName - Current name of the pending user.
 * @param {string} currentEmail - Current email of the pending user.
 * @returns {void}
 */
function editPendingUser(userId, currentName, currentEmail) {
  const popup = document.createElement("div");
  popup.classList.add("popup-overlay");
  popup.innerHTML = `
    <div class="popup">
      <h3>Pending-Mitglied bearbeiten</h3>
      <label>Name:</label><br>
      <input class="width90" type="text" id="editPendingName" value="${
        currentName || ""
      }"><br><br>
      <label>Email:</label><br>
      <input type="email" class="width90" id="editPendingEmail" value="${
        currentEmail || ""
      }"><br><br>
      <div class="buttonBox">
        <button onclick="savePendingUser('${userId}')">Speichern</button>
        <button onclick="closePopup()">Abbrechen</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
}


/**
 * Saves changes to a pending user in Firestore and reloads the page.
 *
 * @param {string} userId - The ID of the pending user to update.
 * @returns {void}
 */
function savePendingUser(userId) {
  const newName = document.getElementById("editPendingName").value.trim();
  const newEmail = document.getElementById("editPendingEmail").value.trim();

  db.collection("pendingUsers")
    .doc(userId)
    .update({
      name: newName,
      email: newEmail,
    })
    .then(() => {
      alert("Änderungen gespeichert!");
      closePopup();
      location.reload();
    })
    .catch((err) => {
      console.error("Fehler beim Speichern:", err);
      alert("Fehler: " + err.message);
    });
}


/**
 * Deletes a pending user from Firestore after user confirmation
 * and removes them from the DOM.
 *
 * @async
 * @param {string} userId - The ID of the pending user to delete.
 * @returns {Promise<void>}
 */
async function deletePendingUser(userId) {
  if (!confirm("Soll dieser vorgemerkte Nutzer wirklich gelöscht werden?"))
    return;
  try {
    await db.collection("pendingUsers").doc(userId).delete();
    document.getElementById(`pending-${userId}`).remove();
    alert("Pending User gelöscht.");
  } catch (err) {
    console.error("Fehler beim Löschen:", err);
    alert("Fehler: " + err.message);
  }
}
