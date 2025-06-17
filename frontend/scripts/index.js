// frontend/scripts/index.js (SEU ARQUIVO, ADAPTADO)

console.log("index.js: Script carregado.");

if (typeof window.FONTARA_INDEX_SCRIPT_EXECUTED === 'undefined') {
    window.FONTARA_INDEX_SCRIPT_EXECUTED = true;
    console.log("index.js: Executing script content for the first time.");

    // Variáveis que eram globais no seu script original.
    // Serão atribuídas dentro de initializePageScripts após o header ser carregado.
    var isHeaderCollapsed; // Estado do menu mobile
    var collapseBtn;       // Botão hamburguer
    var collapseHeaderItems; // O contêiner do menu que colapsa
    var navToggle;         // Botão que abre o dropdown "Soluções"
    var navDropdown;       // A lista de itens do dropdown "Soluções"
    var themeToggleButton; // Botão para alternar tema
    var themeToggleIcon;   // Ícone dentro do botão de tema (sol/lua)

    // --- FUNÇÕES AUXILIARES (Definidas ANTES de serem usadas) ---

    // Sua função original para o menu mobile
    function toggleHeader() {
        if (!collapseHeaderItems || !collapseBtn) {
            console.warn("index.js (toggleHeader): Elementos do header (collapseHeaderItems ou collapseBtn) não encontrados.");
            return;
        }
        if (isHeaderCollapsed) { // Se está colapsado (true), então vamos abrir
            collapseHeaderItems.classList.remove("max-lg:tw-hidden");
            collapseHeaderItems.classList.add("max-lg:!tw-opacity-100", "max-lg:tw-min-h-[90vh]"); // Usar classes para altura em mobile
            collapseBtn.classList.remove("bi-list");
            collapseBtn.classList.add("bi-x");
        } else { // Se está aberto (false), então vamos fechar
            collapseHeaderItems.classList.add("max-lg:tw-hidden");
            collapseHeaderItems.classList.remove("max-lg:!tw-opacity-100", "max-lg:tw-min-h-[90vh]");
            collapseBtn.classList.remove("bi-x");
            collapseBtn.classList.add("bi-list");
        }
        isHeaderCollapsed = !isHeaderCollapsed;
        console.log("index.js: toggleHeader executado, novo estado isHeaderCollapsed:", isHeaderCollapsed);
    }

    // Sua função original para o dropdown "Soluções"
    function toggleNavDropdown() {
        if (!navToggle || !navDropdown) {
            console.warn("index.js (toggleNavDropdown): Elementos do dropdown Soluções não encontrados.");
            return;
        }
        const isOpen = navDropdown.getAttribute('data-open') === 'true';
        if (isOpen) {
            navDropdown.setAttribute('data-open', 'false');
            navDropdown.classList.add('tw-scale-0', 'tw-opacity-0'); // Classes para esconder/animar
            navDropdown.classList.add('max-lg:tw-h-0'); // Encolhe em mobile
            navToggle.setAttribute('aria-expanded', 'false');
        } else {
            navDropdown.setAttribute('data-open', 'true');
            navDropdown.classList.remove('tw-scale-0', 'tw-opacity-0');
            navDropdown.classList.remove('max-lg:tw-h-0'); // Expande em mobile
            navToggle.setAttribute('aria-expanded', 'true');
        }
        console.log("index.js: toggleNavDropdown executado, data-open:", navDropdown.getAttribute('data-open'));
    }

    // Sua função original para o FAQ
    function initializeFaqAccordions() {
        const accordions = document.querySelectorAll('.faq-accordion');
        if (accordions.length > 0) {
            console.log("index.js: Inicializando FAQ accordions.");
            accordions.forEach(accordion => {
                if (accordion.dataset.faqInitialized === 'true') return; // Evita re-inicializar
                accordion.dataset.faqInitialized = 'true';

                accordion.addEventListener('click', function() {
                    const content = this.nextElementSibling;
                    const icon = this.querySelector('i.bi');
                    if (!content || !icon) return;

                    if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                        content.style.maxHeight = '0px';
                        setTimeout(() => {
                            content.style.paddingTop = '0px';
                            content.style.paddingBottom = '0px';
                        }, 300);
                        icon.classList.replace('bi-dash', 'bi-plus');
                    } else {
                        content.style.paddingTop = '10px';
                        content.style.paddingBottom = '10px';
                        content.style.maxHeight = content.scrollHeight + "px";
                        icon.classList.replace('bi-plus', 'bi-dash');
                    }
                });
            });
        }
    }

    // --- LÓGICA DE TEMA (Adicionada/Revisada) ---
    function applyInitialTheme() {
      console.log("index.js: Aplicando tema inicial...");
      const htmlElement = document.documentElement;
      const storedTheme = localStorage.getItem('theme');

      if (themeToggleIcon) {
        if (storedTheme === 'dark') {
          htmlElement.classList.add('tw-dark');
          themeToggleIcon.classList.remove('bi-sun');
          themeToggleIcon.classList.add('bi-moon');
          console.log("index.js: Tema escuro aplicado (localStorage).");
        } else {
          htmlElement.classList.remove('tw-dark');
          themeToggleIcon.classList.remove('bi-moon');
          themeToggleIcon.classList.add('bi-sun');
          console.log("index.js: Tema claro aplicado (padrão ou localStorage).");
        }
      } else {
        if (storedTheme === 'dark') {
          htmlElement.classList.add('tw-dark');
        } else {
          htmlElement.classList.remove('tw-dark');
        }
        console.warn("index.js: Ícone de tema não encontrado, tema aplicado apenas ao HTML element.");
      }
    }

    function toggleMode() {
      console.log("index.js: Alternando tema...");
      const htmlElement = document.documentElement;
      if (!themeToggleButton || !themeToggleIcon) {
          console.warn("index.js (toggleMode): Botão de tema ou ícone não encontrado.");
          return;
      }
      htmlElement.classList.toggle('tw-dark');

      if (htmlElement.classList.contains('tw-dark')) {
        localStorage.setItem('theme', 'dark');
        themeToggleIcon.classList.remove('bi-sun');
        themeToggleIcon.classList.add('bi-moon');
        console.log("index.js: Tema alterado para escuro.");
      } else {
        localStorage.setItem('theme', 'light');
        themeToggleIcon.classList.remove('bi-moon');
        themeToggleIcon.classList.add('bi-sun');
        console.log("index.js: Tema alterado para claro.");
      }
    }

    // --- FUNÇÃO DE INICIALIZAÇÃO PRINCIPAL (Chamada por loadPartials.js) ---
    function initializePageScripts(headerElement) {
        console.log("index.js: initializePageScripts INICIADA com headerElement:", headerElement ? "encontrado" : "NÃO encontrado");
        if (!headerElement) {
            console.error("index.js: Elemento do header não fornecido. Funcionalidades do header não serão iniciadas.");
            return;
        }

        collapseBtn = headerElement.querySelector("#collapse-btn");
        collapseHeaderItems = headerElement.querySelector("#collapsed-header-items");
        navToggle = headerElement.querySelector("#nav-dropdown-toggle-0");
        navDropdown = headerElement.querySelector("#nav-dropdown-list-0");
        themeToggleButton = headerElement.querySelector('#theme-toggle');
        themeToggleIcon = headerElement.querySelector('#toggle-mode-icon');

        if (collapseHeaderItems && collapseBtn) {
            isHeaderCollapsed = true;
            if (window.innerWidth >= RESPONSIVE_WIDTH) {
                isHeaderCollapsed = false;
                collapseHeaderItems.classList.remove("max-lg:tw-hidden");
                collapseBtn.classList.add("lg:tw-hidden");
                collapseBtn.classList.remove("bi-x");
                collapseBtn.classList.add("bi-list");
            } else {
                collapseHeaderItems.classList.add("max-lg:tw-hidden");
                collapseBtn.classList.remove("lg:tw-hidden");
                collapseBtn.classList.remove("bi-x");
                collapseBtn.classList.add("bi-list");
            }
        } else {
            console.warn("index.js: #collapse-btn ou #collapsed-header-items não encontrado para estado inicial.");
        }

        if (collapseBtn) {
            if (collapseBtn.dataset.listenerAttached !== 'true') {
                collapseBtn.addEventListener('click', toggleHeader);
                collapseBtn.dataset.listenerAttached = 'true';
                console.log("index.js: Listener para toggleHeader anexado ao #collapse-btn.");
            }
        } else {
            console.warn("index.js: #collapse-btn (botão hamburguer) não encontrado.");
        }

        if (navToggle && navDropdown) {
            if (navToggle.dataset.listenerAttached !== 'true') {
                navToggle.addEventListener('click', (event) => {
                    event.stopPropagation();
                    toggleNavDropdown();
                });
                navToggle.dataset.listenerAttached = 'true';
                console.log("index.js: Listener para toggleNavDropdown anexado ao #nav-dropdown-toggle-0.");
            }
            if (!document.body.dataset.clickOutsideDropdownListener) {
                document.addEventListener('click', (event) => {
                    if (navDropdown && navDropdown.getAttribute('data-open') === 'true' &&
                        navToggle && !navToggle.contains(event.target) &&
                        !navDropdown.contains(event.target)) {
                        toggleNavDropdown();
                    }
                });
                document.body.dataset.clickOutsideDropdownListener = 'true';
            }
            if (!document.body.dataset.escapeDropdownListener) {
                document.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape' && navToggle && navToggle.getAttribute('aria-expanded') === 'true') {
                        toggleNavDropdown();
                    }
                });
                document.body.dataset.escapeDropdownListener = 'true';
            }
        } else {
            if(!navToggle) console.warn("index.js: #nav-dropdown-toggle-0 não encontrado.");
            if(!navDropdown) console.warn("index.js: #nav-dropdown-list-0 não encontrado.");
        }

        if (themeToggleButton && themeToggleIcon) {
            applyInitialTheme();
            if (themeToggleButton.dataset.listenerAttached !== 'true') {
                themeToggleButton.addEventListener('click', toggleMode);
                themeToggleButton.dataset.listenerAttached = 'true';
                console.log("index.js: Listener para toggleMode anexado ao #theme-toggle.");
            }
        } else {
            if(!themeToggleButton) console.warn("index.js: Botão de tema (#theme-toggle) não encontrado.");
            if(!themeToggleIcon) console.warn("index.js: Ícone de tema (#toggle-mode-icon) não encontrado.");
            applyInitialTheme();
        }

        const areaClienteButton = headerElement.querySelector('#login-client-area');
        if (areaClienteButton) {
            console.log('Debug initializePageScripts: Attaching click listener to areaClienteButton to call handleLogin.');
            if (areaClienteButton.dataset.listenerAttached !== 'true') {
                areaClienteButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    if (typeof handleLogin === 'function') {
                        handleLogin();
                    } else {
                        console.warn("index.js: handleLogin function (from auth.js) not found.");
                    }
                });
                areaClienteButton.dataset.listenerAttached = 'true';
                console.log("index.js: Listener para handleLogin (abrir form inline) anexado ao #login-client-area.");
            }
        } else {
            console.warn("index.js: #login-client-area (botão Área do Cliente) não encontrado no header.");
        }

        const logoutButton = headerElement.querySelector('#logout-button');
        if (logoutButton) {
            console.log('Debug initializePageScripts: Attaching click listener to logoutButton to call handleLogout.');
            if (logoutButton.dataset.listenerAttached !== 'true') {
                logoutButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    if (typeof handleLogout === 'function') {
                        handleLogout();
                    } else {
                        console.warn("index.js: handleLogout function (from auth.js) not found.");
                    }
                });
                logoutButton.dataset.listenerAttached = 'true';
                console.log("index.js: Listener para handleLogout anexado ao #logout-button.");
            }
        } else {
            console.warn("index.js: #logout-button não encontrado no header.");
        }

        const inlineLoginForm = document.getElementById('inline-login-form');
        if (inlineLoginForm) {
            if (inlineLoginForm.dataset.listenerAttached !== 'true') {
                inlineLoginForm.addEventListener('submit', function(event) {
                    if (typeof handleInlineFormSubmit === 'function') {
                        handleInlineFormSubmit(event);
                    } else {
                        console.warn("index.js: handleInlineFormSubmit function (from auth.js) not found.");
                    }
                });
                inlineLoginForm.dataset.listenerAttached = 'true';
                console.log("index.js: Listener para handleInlineFormSubmit anexado ao #inline-login-form.");
            }
        }

        const inlineLoginCloseButton = document.getElementById('inline-login-close-button');
        if (inlineLoginCloseButton) {
            if (inlineLoginCloseButton.dataset.listenerAttached !== 'true') {
                inlineLoginCloseButton.addEventListener('click', function() {
                    if (typeof closeInlineLoginForm === 'function') {
                        closeInlineLoginForm();
                    } else {
                        console.warn("index.js: closeInlineLoginForm function (from auth.js) not found.");
                    }
                });
                inlineLoginCloseButton.dataset.listenerAttached = 'true';
                console.log("index.js: Listener para closeInlineLoginForm anexado ao #inline-login-close-button.");
            }
        }

        console.log('Debug initializePageScripts: About to call checkLoginState() for initial UI setup.');
        if (typeof checkLoginState === 'function') {
            checkLoginState();
        } else {
            console.warn("index.js: checkLoginState function (from auth.js) not found. Ensure auth.js is loaded before index.js and defines this function globally.");
        }

        console.log("index.js: initializePageScripts CONCLUÍDA.");
    }

    window.initializePageScripts = initializePageScripts;

    document.addEventListener("DOMContentLoaded", function() {
        console.log("index.js: DOMContentLoaded evento disparado.");
        if (!document.querySelector('#header-placeholder')) {
            initializeFaqAccordions();
        }
    });

} else {
    console.warn("index.js: Script execution attempted again, but blocked by FONTARA_INDEX_SCRIPT_EXECUTED flag.");
}
