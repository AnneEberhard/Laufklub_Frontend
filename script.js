async function init() {
  await includeHTML();
  await checkLogIn();
  await loadGeneralData();
}

/**
 * loads data for the global variables
 * menuTitles, navSites, mainSites, overview, pageFunctions
 */
async function checkLogIn() {}

/**
 * loads data for the global variables
 * menuTitles, navSites, mainSites, overview, pageFunctions
 */
async function loadGeneralData() {}

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

/**
 * opens the mobile menu
 */
function showMobileMenu() {
  const mobileNav = document.getElementById("mobileNav");
  mobileNav.classList.remove("dNone");
}

/**
 * closes the mobile menu
 */
function closeMobileMenu() {
  const mobileNav = document.getElementById("mobileNav");
  mobileNav.classList.add("dNone");
}
