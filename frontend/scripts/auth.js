// frontend/scripts/auth.js

console.log("auth.js: Script loaded.");

function checkLoginState() {
    console.log("auth.js: checkLoginState() called.");
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

    // Elements to toggle based on login state
    const mainNavLinks = document.getElementById('main-nav-links'); // In _header.html
    const nossosServicosSection = document.getElementById('nossos-servicos'); // In index.html
    const logoutButton = document.getElementById('logout-button'); // In _header.html
    const areaClienteButton = document.getElementById('login-client-area'); // In _header.html
    const inlineFormContainer = document.getElementById('inline-login-form-container'); // In index.html
    const welcomeMessageElement = document.getElementById('welcome-message-user'); // In _header.html

    if (isLoggedIn) {
        console.log("auth.js: User is logged in.");
        if (mainNavLinks) mainNavLinks.classList.remove('tw-hidden');
        if (nossosServicosSection) nossosServicosSection.classList.remove('tw-hidden');
        if (logoutButton) logoutButton.classList.remove('tw-hidden');
        if (areaClienteButton) areaClienteButton.classList.add('tw-hidden');
        if (inlineFormContainer && !inlineFormContainer.classList.contains('tw-hidden')) {
            inlineFormContainer.classList.add('tw-hidden'); // Ensure form is hidden if user is logged in
        }

        const username = sessionStorage.getItem('loggedInUser');
        if (welcomeMessageElement && username) {
            welcomeMessageElement.textContent = `Bem vindo, ${username}`;
            welcomeMessageElement.classList.remove('tw-hidden');
        } else if (welcomeMessageElement) {
            welcomeMessageElement.textContent = 'Bem vindo!';
            welcomeMessageElement.classList.remove('tw-hidden');
        }

    } else {
        console.log("auth.js: User is NOT logged in.");
        if (mainNavLinks) mainNavLinks.classList.add('tw-hidden');
        if (nossosServicosSection) nossosServicosSection.classList.add('tw-hidden');
        if (logoutButton) logoutButton.classList.add('tw-hidden');
        if (areaClienteButton) areaClienteButton.classList.remove('tw-hidden');

        if (welcomeMessageElement) {
            welcomeMessageElement.classList.add('tw-hidden');
            welcomeMessageElement.textContent = ''; // Clear text on logout
        }
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

    sessionStorage.setItem('isLoggedIn', 'true');

    const usernameInput = document.getElementById('inline-username');
    if (usernameInput && usernameInput.value.trim() !== '') {
        sessionStorage.setItem('loggedInUser', usernameInput.value.trim());
        console.log("auth.js: Username stored in session: " + usernameInput.value.trim());
    } else {
        sessionStorage.setItem('loggedInUser', 'Usuário'); // Fallback username
        console.log("auth.js: Username input empty or not found, stored fallback 'Usuário'.");
    }

    const formContainer = document.getElementById('inline-login-form-container');
    if (formContainer) {
        formContainer.classList.add('tw-hidden');
    }

    // Clear form fields (good practice)
    const passwordField = document.getElementById('inline-password');
    if (usernameInput) usernameInput.value = ''; // Already have usernameInput from above
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
    sessionStorage.removeItem('loggedInUser');
    console.log("auth.js: Username removed from session.");

    checkLoginState();
    // Consider redirecting to home page or login page after logout
    // window.location.href = 'index.html'; // Or the main page
}

// Initial check can be useful if auth.js loads after elements are ready,
// but initializePageScripts in index.js calling checkLoginState is generally more reliable
// due to partials loading.
// checkLoginState();
