/**
 * Initializes the info editing page:
 * - Loads shared HTML
 * - Checks authentication and admin status
 * - Loads all infos for editing
 *
 * @async
 * @returns {Promise<void>}
 */
async function editInfoPage() {
  await includeHTML();
  const { user, isAdmin } = await checkUserAdminStatus();
  renderNewInfoButton(isAdmin);
  loadAllInfos(isAdmin);
}

function renderNewInfoButton(isAdmin) {
  const newInfoButtonBox = document.getElementById("newInfoButtonBox");

  if(isAdmin) {
    newInfoButtonBox.innerHTML = `
    <button id='newInfoButton' onclick="renderNewInfoBox()">neue Info anlegen</button>
    `
  }
}

function renderNewInfoBox() {
  const newInfoBox = document.getElementById("newInfoBox");
    newInfoBox.innerHTML = `
    <form id="createInfoForm" onsubmit="handleCreateInfo(event)">
        <h2>Neue Info anlegen</h2>
        <input id="infoName" type="text" placeholder="Name" required />
        <input id="infoDate" type="datetime-local" required />
        <textarea id="infoDescription" placeholder="Beschreibung"></textarea>
        <div class="buttonBox">
          <a class="buttonLink red" href="/infos.html">Abbrechen</a>
          <button type="submit">Speichern</button>
        </div>
      </form>`;
}

/**
 * Handles the creation of a new info from the form input.
 * Validates required fields, adds the info to Firestore, and redirects on success.
 *
 * @param {Event} e - The form submit event.
 * @returns {void}
 */
function handleCreateInfo(e) {
  e.preventDefault();

  const name = document.getElementById("infoName").value.trim();
  const description = document.getElementById("infoDescription").value.trim();
  const date = document.getElementById("infoDate").value;

  if (!name || !date) {
    alert("Bitte fülle alle Pflichtfelder aus.");
    return;
  }

  db.collection("infos")
    .add({
      name: name,
      date: new Date(date),
      description: description,
      createdBy: firebase.auth().currentUser?.uid || null,
      createdAt: new Date().toISOString(),
    })
    .then(() => {
      alert("Info erfolgreich angelegt.");
      window.location.href = "homepage.html";
    })
    .catch((error) => {
      console.error("Fehler beim Anlegen der Info:", error);
      alert("Fehler beim Speichern.");
    });
}

/**
 * Loads all infos from Firestore and renders each info in the archive.
 *
 * @param {boolean} isAdmin - Whether the current user has admin rights.
 * @returns {void}
 */
function loadAllInfos(isAdmin) {
  db.collection("infos")
    .orderBy("date", "desc")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const info = { id: doc.id, ...doc.data() };
        renderArchiveInfo(info, isAdmin);
      });
    })
    .catch((error) => {
      console.error("Fehler beim Laden der Info:", error);
    });
}

/**
 * Renders a single info in the archive section.
 * Includes info name, date, time, description, and admin buttons if applicable.
 *
 * @param {Object} info - The info object.
 * @param {string} info.id - Firestore document ID.
 * @param {string} info.name - info name.
 * @param {Date|firebase.firestore.Timestamp|string} info.date - info date.
 * @param {string} info.description - info description.
 * @param {boolean} isAdmin - Whether the current user has admin rights.
 * @returns {void}
 */
function renderArchiveInfo(info, isAdmin) {
  const container = document.getElementById("archiveInfo");
  const dateObj = info.date.toDate ? info.date.toDate() : new Date(info.date);
  const formattedDate = dateObj.toLocaleDateString("de-DE");
  const formattedTime = dateObj.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  container.innerHTML += `
    <div class='info' id="info-${info.id}">
      <h2>${info.name}</h2>
      <div class="centerText">
      <h3>${formattedDate}</h3>
      <h4 class="info-time">${formattedTime} Uhr</h4>
      </div>
      <p>${info.description}</p>
      ${
        isAdmin
          ? `
          <div class="buttonBox">
            <button class="red" onclick="deleteInfo('${info.id}')">Löschen</button>
            <button onclick="editInfo('${info.id}')">Bearbeiten</button>
          </div>`
          : ""
      }
      <div class="divider marginTop"></div>
    </div>
  `;
}

/**
 * Loads a specific info by ID and renders the edit form.
 *
 * @async
 * @param {string} infoId - The ID of the info to edit.
 * @returns {Promise<void>}
 */
async function editInfo(infoId) {
  const info = await loadInfoById(infoId);
  renderEditForm(info);
}

/**
 * Loads a info from Firestore by its ID.
 *
 * @async
 * @param {string} infoId - The ID of the info.
 * @returns {Promise<Object|null>} The info object if found, otherwise null.
 */
async function loadInfoById(infoId) {
  try {
    const docRef = db.collection("infos").doc(infoId);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.warn("Keine Info mit dieser ID gefunden:", infoId);
      return;
    }

    const info = { id: doc.id, ...doc.data() };
    return info;
  } catch (error) {
    console.error("Fehler beim Laden der info:", error);
    return null;
  }
}

/**
 * Renders the edit form for a given info in a popup overlay.
 *
 * @param {Object} info - The info object.
 * @param {string} info.id - Firestore document ID.
 * @param {string} info.name - info name.
 * @param {Date|firebase.firestore.Timestamp|string} info.date - info date.
 * @param {string} [info.description] - info description.
 * @returns {void}
 */
function renderEditForm(info) {
  const popup = document.getElementById("editInfoBox");
  popup.classList.remove("dNone");
  popup.classList.add("popup-overlay");

  const dateObj = info.date.toDate ? info.date.toDate() : new Date(info.date);
  const isoDate = formatForDateTimeLocal(dateObj);

  popup.innerHTML = `
    <form id="editInfoForm" onsubmit="handleSaveInfo(event, '${info.id}')">
      <h2>Info bearbeiten</h2>
      <input type="text" class="width90" id="editName" value="${info.name}" required />
      <input type="datetime-local" id="editDate" value="${isoDate}" required />
      <textarea class="width90" id="editDescription">${info.description || ""}</textarea>
      <div class="buttonBox">
        <button class="red" type="button" onclick="closeEditInfo()">Abbrechen</button>
        <button type="submit">Speichern</button>
      </div>
    </form>
  `;
}

/**
 * Deletes a info from Firestore after user confirmation
 * and removes it from the DOM.
 *
 * @param {string} infoId - The ID of the info to delete.
 * @returns {void}
 */
function deleteInfo(infoId) {
  if (!confirm("Möchten Sie diese Info wirklich löschen?")) return;

  db.collection("infos")
    .doc(infoId)
    .delete()
    .then(() => {
      const infoElement = document.getElementById(`info-${infoId}`);
      if (infoElement) infoElement.remove();
      alert("Info erfolgreich gelöscht.");
    })
    .catch((err) => {
      console.error("Fehler beim Löschen der Info:", err);
      alert("Löschen fehlgeschlagen.");
    });
}

/**
 * Handles the submission of the info edit form.
 * Updates the info in Firestore and reloads the info list.
 *
 * @param {Event} e - The form submit event.
 * @param {string} infoId - The ID of the info to update.
 * @returns {void}
 */
function handleSaveInfo(e, infoId) {
  e.preventDefault();

  const inputValue = document.getElementById("editDate").value;
  const localDate = new Date(inputValue);

  const updatedInfo = {
    name: document.getElementById("editName").value.trim(),
    date: firebase.firestore.Timestamp.fromDate(localDate),
    description: document.getElementById("editDescription").value.trim(),
  };

  db.collection("infos")
    .doc(infoId)
    .update(updatedInfo)
    .then(() => {
      alert("Info aktualisiert!");
      closeEditInfo();
      document.getElementById("archiveInfo").innerHTML = "";
      loadAllInfos(true);
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
function closeEditInfo() {
  const popup = document.getElementById("editInfoBox");
  popup.classList.add("dNone");
  popup.classList.remove("popup-overlay");
}

