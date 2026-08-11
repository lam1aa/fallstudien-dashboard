/**
 * @file layout.js
 * @description Handles dynamic loading of global UI components like the navigation bar and footer.
 */

// Automatically load components when the script is parsed
document.addEventListener("DOMContentLoaded", () => {
  loadNavbar();
  loadFooter();
});

/**
 * Injects the navigation bar HTML into the page and sets the active navigation link based on the current URL.
 */
function loadNavbar() {
  const navbarHTML = `
  <nav class="navbar navbar-expand-lg">
    <div class="container d-flex justify-content-between align-items-center">
      <a class="navbar-brand d-flex align-items-center" href="index.html">
        <img src="QUADRIGALogo1.png" alt="QUADRIGA Logo" height="62">
      </a>
      <ul class="navbar-nav flex-row gap-2">
        <li class="nav-item">
          <a class="nav-link" href="index.html" id="nav-index">OER Fallstudien</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="community.html" id="nav-community">Community & Kommunikation</a>
        </li>
      </ul>
    </div>
  </nav>
  `;

  const placeholder = document.getElementById('navbar-placeholder');
  if (placeholder) {
    placeholder.innerHTML = navbarHTML;
    
    // Set active class based on current URL
    const path = window.location.pathname;
    if (path.includes('community.html')) {
      document.getElementById('nav-community').classList.add('active');
    } else {
      // Default to index being active if not on community
      document.getElementById('nav-index').classList.add('active');
    }
  }
}

/**
 * Injects the footer HTML with the current year into the page.
 */
function loadFooter() {
  const year = new Date().getFullYear();
  const footerHTML = `
  <footer class="text-center py-3 mt-5 small text-muted" style="border-top: 1px solid #e5e9f0;">
    © <span>${year}</span> QUADRIGA Berlin-Brandenburgisches Datenkompetenzzentrum
  </footer>
  `;

  const placeholder = document.getElementById('footer-placeholder');
  if (placeholder) {
    placeholder.innerHTML = footerHTML;
  }
}
