// frontend/scripts/auth.js

console.log("auth.js: Script loaded.");

function checkLoginState() {
    console.log("auth.js: checkLoginState() called.");
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

    // Elements to toggle based on login state
    const mainNavLinks = document.getElementById('main-nav-links'); // In _header.html
    const nossosServicosSection = document.getElementById('nossos-servicos'); // In index.html
    const loginButton = document.getElementById('login-button'); // In _header.html
    const logoutButton = document.getElementById('logout-button'); // In _header.html
    // Add other elements like "Área do Cliente" if its visibility should change.
    // For now, "Área do Cliente" remains visible as per current plan.

    if (isLoggedIn) {
        console.log("auth.js: User is logged in.");
        if (mainNavLinks) mainNavLinks.classList.remove('tw-hidden');
        if (nossosServicosSection) nossosServicosSection.classList.remove('tw-hidden');
        if (loginButton) loginButton.classList.add('tw-hidden');
        if (logoutButton) logoutButton.classList.remove('tw-hidden');
    } else {
        console.log("auth.js: User is NOT logged in.");
        if (mainNavLinks) mainNavLinks.classList.add('tw-hidden');
        if (nossosServicosSection) nossosServicosSection.classList.add('tw-hidden');
        if (loginButton) loginButton.classList.remove('tw-hidden');
        if (logoutButton) logoutButton.classList.add('tw-hidden');
    }
}

function handleLogin() {
    console.log("auth.js: handleLogin() called.");
    // In a real scenario, this would involve form submission, validation, and server communication.
    // For this simulation, we'll redirect to login.html which will then set the flag.
    // Or, for an even simpler simulation without a separate page, we could just set the flag here:
    // sessionStorage.setItem('isLoggedIn', 'true');
    // checkLoginState();
    // window.location.href = 'index.html'; // Or refresh current page

    // As per plan step 5, login.html will handle setting the session storage.
    // So, this function's primary role is to initiate that process.
    window.location.href = 'login.html'; // Or the correct path to login.html from the current page
}

function handleLogout() {
    console.log("auth.js: handleLogout() called.");
    sessionStorage.removeItem('isLoggedIn');
    // Optionally, also clear other session-related data
    checkLoginState();
    // Consider redirecting to home page or login page after logout
    // window.location.href = 'index.html';
}

// Expose functions to be called from other scripts if necessary,
// though direct calls from HTML event attributes are also possible if functions are global.
// For better modularity, it's often good to have an init function in each script.
// For now, these will be global and called by index.js or inline event handlers.

// Initial check when script loads (optional, as index.js will also call it)
// However, this won't work correctly if elements are not yet loaded (e.g. header via loadPartials)
// checkLoginState();
