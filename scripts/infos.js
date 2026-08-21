
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
  renderNewInfoBox();
  loadAllInfos(isAdmin);
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
          <a class="buttonLink red" href="/homepage.html">Abbrechen</a>
          <button type="submit">Speichern</button>
        </div>
      </form>`
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
  const container = document.getElementById("archive");
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
            <button class="red" onclick="deleteinfo('${info.id}')">Löschen</button>
            <button onclick="editinfo('${info.id}')">Bearbeiten</button>
          </div>`
          : ""
      }
      <div class="divider marginTop"></div>
    </div>
  `;
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
      <h2>info bearbeiten</h2>
      <input type="text" class="width90" id="editName" value="${info.name}" required />
      <input type="datetime-local" id="editDate" value="${isoDate}" required />
      <textarea class="width90" id="editDescription">${info.description || ""}</textarea>
      <div class="buttonBox">
        <button class="red" type="button" onclick="closeEdit()">Abbrechen</button>
        <button type="submit">Speichern</button>
      </div>
    </form>
  `;
}