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
        renderTour(tour);
        console.log(tour);
      });
    })
    .catch((error) => {
      console.error("Fehler beim Laden der Tour:", error);
    });
}

// Tour anzeigen
function renderTour(tour) {
  const container = document.getElementById("touren");
  container.innerHTML = `
  <div class='tour'>
    <h2>${tour.name}</h2>
     <h3>${tour.date}</h3>
    <p>${tour.description}</p>
      ${
        tour.link
          ? `<a href='${tour.link}' target="_blank">Link zur Karte</a>`
          : ""
      }
      <form id="anmeldung-form">
        <label>Name: <input type="text" name="name" required></label><br><br>
        <label><input type="radio" name="fahrt" value="big" checked> Große Fahrt</label><br>
        <label><input type="radio" name="fahrt" value="small"> Kleine Fahrt</label><br><br>

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

      register(tour, name, selected); // Übergibt ganze Tour und Auswahl
    });
  loadRegistrations(tour);
}

// Beispiel-Funktion zur Anmeldung
async function register(tour, name, selected) {
  const ref = db.collection("tours").doc(tour).collection("registrations");

  ref
    .add({
      name: name,
      big: isBig,
      small: !isBig,
      registeredAt: new Date().toISOString(),
    })
    .then(() => {
      alert("Anmeldung erfolgreich!");
      loadRegistrations(tourId);
    })
    .catch((error) => {
      console.error("Fehler bei der Anmeldung:", error);
      alert("Anmeldung fehlgeschlagen.");
    });
}

async function loadRegistrations(tour) {
  const list = document.getElementById("anmeldeliste");
  list.innerHTML = "<li>Wird geladen...</li>";
  console.log("Lade Anmeldungen für Tour-ID:", tour.id);

  db.collection("tours")
    .doc(tour.id)
    .collection("registration")
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
        list.innerHTML += `<li>${data.name} (${typ})</li>`;
      });
    })
    .catch((error) => {
      console.error("Fehler beim Laden der Anmeldungen:", error);
      list.innerHTML = "<li>Fehler beim Laden</li>";
    });
}

// Login, logout, register, forgot

  function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
       window.location.href = "index.html";
       console.log("Eingeloggt als: " + userCredential.user.email);
      })
      .catch((error) => {
        alert("Fehler beim Einloggen: " + error.message);
      });
  }

  function register() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        alert("Registrierung erfolgreich! Eingeloggt als: " + userCredential.user.email);
        window.location.href = "index.html";
      })
      .catch((error) => {
        alert("Registrierungsfehler: " + error.message);
      });
  }

  function resetPassword() {
    const email = document.getElementById("email").value;

    auth.sendPasswordResetEmail(email)
      .then(() => {
        alert("Passwort-Zurücksetzungs-E-Mail gesendet");
      })
      .catch((error) => {
        alert("Fehler beim Zurücksetzen: " + error.message);
      });
  }

  function logout() {
  firebase.auth().signOut()
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

