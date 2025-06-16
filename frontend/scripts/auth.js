// frontend/scripts/auth.js

console.log("auth.js: Script loaded.");

function checkLoginState() {
    console.log("auth.js: checkLoginState() called.");
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

    // Elements to toggle based on login state
    const mainNavLinks = document.getElementById('main-nav-links'); // In _header.html
    const nossosServicosSection = document.getElementById('nossos-servicos'); // In index.html
    // const loginButton = document.getElementById('login-button'); // REMOVED as button is removed
    const logoutButton = document.getElementById('logout-button'); // In _header.html
    const areaClienteButton = document.getElementById('login-client-area'); // In _header.html
    const inlineFormContainer = document.getElementById('inline-login-form-container'); // In index.html

    if (isLoggedIn) {
        console.log("auth.js: User is logged in.");
        if (mainNavLinks) mainNavLinks.classList.remove('tw-hidden');
        if (nossosServicosSection) nossosServicosSection.classList.remove('tw-hidden');
        // if (loginButton) loginButton.classList.add('tw-hidden'); // REMOVED
        if (logoutButton) logoutButton.classList.remove('tw-hidden');
        if (areaClienteButton) areaClienteButton.classList.add('tw-hidden');
        if (inlineFormContainer && !inlineFormContainer.classList.contains('tw-hidden')) {
            inlineFormContainer.classList.add('tw-hidden'); // Ensure form is hidden if user is logged in
        }
    } else {
        console.log("auth.js: User is NOT logged in.");
        if (mainNavLinks) mainNavLinks.classList.add('tw-hidden');
        if (nossosServicosSection) nossosServicosSection.classList.add('tw-hidden');
        // if (loginButton) loginButton.classList.remove('tw-hidden'); // REMOVED
        if (logoutButton) logoutButton.classList.add('tw-hidden');
        if (areaClienteButton) areaClienteButton.classList.remove('tw-hidden');
    }
}

function handleLogin() {
    console.log("auth.js: handleLogin() called.");
    // Show the inline login form instead of redirecting
    const formContainer = document.getElementById('inline-login-form-container');
    if (formContainer) {
        formContainer.classList.remove('tw-hidden');
    } else {
        console.error('auth.js: Inline login form container not found.');
    }
}

function handleInlineFormSubmit(event) {
    if (event) event.preventDefault(); // Prevent actual form submission
    console.log("auth.js: handleInlineFormSubmit() called.");

    // For simulation, we don't need to get form values (username/password)
    // In a real app, you would get and validate them here.

    sessionStorage.setItem('isLoggedIn', 'true');

    const formContainer = document.getElementById('inline-login-form-container');
    if (formContainer) {
        formContainer.classList.add('tw-hidden');
    }

    // Clear form fields (optional, but good practice)
    const usernameField = document.getElementById('inline-username');
    const passwordField = document.getElementById('inline-password');
    if (usernameField) usernameField.value = '';
    if (passwordField) passwordField.value = '';

    checkLoginState(); // Update the rest of the UI
}

function closeInlineLoginForm() {
    console.log("auth.js: closeInlineLoginForm() called.");
    const formContainer = document.getElementById('inline-login-form-container');
    if (formContainer) {
        formContainer.classList.add('tw-hidden');
    }
    // Clear form fields when closing without submitting (optional)
    const usernameField = document.getElementById('inline-username');
    const passwordField = document.getElementById('inline-password');
    if (usernameField) usernameField.value = '';
    if (passwordField) passwordField.value = '';
}

function handleLogout() {
    console.log("auth.js: handleLogout() called.");
    sessionStorage.removeItem('isLoggedIn');
    // Optionally, also clear other session-related data
    checkLoginState();
    // Consider redirecting to home page or login page after logout
    // window.location.href = 'index.html'; // Or the main page
}

// Initial check can be useful if auth.js loads after elements are ready,
// but initializePageScripts in index.js calling checkLoginState is generally more reliable
// due to partials loading.
// checkLoginState();
