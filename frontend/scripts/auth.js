// frontend/scripts/auth.js

console.log("auth.js: Script loaded.");

function checkLoginState() {
    console.log("auth.js: checkLoginState() called.");
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'; // MODIFIED

    // Elements to toggle based on login state
    const mainNavLinks = document.getElementById('main-nav-links'); // In _header.html
    const collapsedHeaderItems = document.getElementById('collapsed-header-items'); // Added for convenience
    const nossosServicosSection = document.getElementById('nossos-servicos'); // In index.html
    const logoutButton = document.getElementById('logout-button'); // In _header.html
    const areaClienteButton = document.getElementById('login-client-area'); // In _header.html
    const inlineFormContainer = document.getElementById('inline-login-form-container'); // In index.html
    const welcomeMessageElement = document.getElementById('welcome-message-user'); // In _header.html

    console.log('Debug checkLoginState: isLoggedIn =', isLoggedIn);
    if (areaClienteButton) console.log('Debug checkLoginState: Initial areaClienteButton classes:', areaClienteButton.className); else console.log('Debug checkLoginState: areaClienteButton not found');
    if (logoutButton) console.log('Debug checkLoginState: Initial logoutButton classes:', logoutButton.className); else console.log('Debug checkLoginState: logoutButton not found');

    if (isLoggedIn) {
        console.log("auth.js: User is logged in.");

        // New logic for mainNavLinks:
        if (mainNavLinks) {
            // Ensure it's visible. Our HTML uses max-lg:tw-hidden and lg:!tw-flex.
            // Removing 'tw-hidden' is safe if it was added by the logged-out state.
            mainNavLinks.classList.remove('tw-hidden'); 
        }

        if (nossosServicosSection) nossosServicosSection.classList.remove('tw-hidden');
        
        if (logoutButton) {
            logoutButton.classList.remove('tw-hidden');
            logoutButton.classList.add('tw-flex'); // Ensure it's flex when visible
            console.log('Debug checkLoginState (isLoggedIn=true): Final logoutButton classes:', logoutButton.className);
        }
        
        if (areaClienteButton) {
            areaClienteButton.classList.add('tw-hidden');
            areaClienteButton.classList.remove('tw-flex'); // Remove flex when hidden
            console.log('Debug checkLoginState (isLoggedIn=true): Final areaClienteButton classes:', areaClienteButton.className);
        }

        if (inlineFormContainer && !inlineFormContainer.classList.contains('tw-hidden')) {
            inlineFormContainer.classList.add('tw-hidden'); // Ensure form is hidden if user is logged in
        }

        const username = localStorage.getItem('loggedInUser'); // MODIFIED
        if (welcomeMessageElement && username) {
            welcomeMessageElement.textContent = `Bem vindo, ${username}`;
            welcomeMessageElement.classList.remove('tw-hidden');
        } else if (welcomeMessageElement) { 
            welcomeMessageElement.textContent = 'Bem vindo!'; 
            welcomeMessageElement.classList.remove('tw-hidden');
        }

        // New logic for collapsedHeaderItems alignment:
        if (collapsedHeaderItems) {
            collapsedHeaderItems.classList.remove('lg:justify-end');
            collapsedHeaderItems.classList.add('lg:justify-between');
        }

    } else {
        console.log("auth.js: User is NOT logged in.");

        // New logic for mainNavLinks:
        if (mainNavLinks) {
            mainNavLinks.classList.add('tw-hidden'); // Hide for logged-out users
        }

        if (nossosServicosSection) nossosServicosSection.classList.add('tw-hidden');
        
        if (logoutButton) {
            logoutButton.classList.add('tw-hidden');
            logoutButton.classList.remove('tw-flex'); // Remove flex when hidden
            console.log('Debug checkLoginState (isLoggedIn=false): Final logoutButton classes:', logoutButton.className);
        }
        
        if (areaClienteButton) {
            areaClienteButton.classList.remove('tw-hidden');
            areaClienteButton.classList.add('tw-flex'); // Ensure it's flex when visible
            console.log('Debug checkLoginState (isLoggedIn=false): Final areaClienteButton classes:', areaClienteButton.className);
        }
        
        if (welcomeMessageElement) {
            welcomeMessageElement.classList.add('tw-hidden');
            welcomeMessageElement.textContent = ''; // Clear text on logout
        }

        // New logic for collapsedHeaderItems alignment:
        if (collapsedHeaderItems) {
            collapsedHeaderItems.classList.remove('lg:justify-between');
            collapsedHeaderItems.classList.add('lg:justify-end');
        }
    }
}

function handleLogin() {
    console.log('Debug: handleLogin() invoked.');
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

    localStorage.setItem('isLoggedIn', 'true'); // MODIFIED

    const usernameInput = document.getElementById('inline-username');
    if (usernameInput && usernameInput.value.trim() !== '') {
        localStorage.setItem('loggedInUser', usernameInput.value.trim()); // MODIFIED
        console.log("auth.js: Username stored in localStorage: " + usernameInput.value.trim()); // MODIFIED
    } else {
        localStorage.setItem('loggedInUser', 'Usuário'); // MODIFIED - Fallback username
        console.log("auth.js: Username input empty or not found, stored fallback 'Usuário' in localStorage."); // MODIFIED
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
    console.log('Debug: handleLogout() invoked.');
    console.log("auth.js: handleLogout() called.");
    localStorage.removeItem('isLoggedIn'); // MODIFIED
    localStorage.removeItem('loggedInUser'); // MODIFIED
    console.log("auth.js: Username removed from localStorage."); // MODIFIED
    
    checkLoginState();
    // Consider redirecting to home page or login page after logout
    // window.location.href = 'index.html'; // Or the main page
}

// Initial check can be useful if auth.js loads after elements are ready,
// but initializePageScripts in index.js calling checkLoginState is generally more reliable
// due to partials loading.
// checkLoginState();
