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
      window.location.href = "homepage.html";;
    })
    .catch((error) => {
      console.error("Fehler beim Anlegen der Tour:", error);
      alert("Fehler beim Speichern.");
    });
}

// Members
async function members() {
  await includeHTML();
  const { user, isAdmin } = await checkUserAdminStatus();
  loadMembers(isAdmin);
  if (isAdmin) {
    renderAddMember(isAdmin);
  }
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

function closePopup() {
  const popup = document.querySelector(".popup-overlay");
  if (popup) popup.remove();
}

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

function renderAddMember(isAdmin) {
  renderAddMemberForm();
  loadPendingMembers(isAdmin);
}

function renderAddMemberForm() {
  document.getElementById(
    "addMemberForm"
  ).innerHTML = `        
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
