// frontend/scripts/index.js (SEU ARQUIVO, ADAPTADO)

console.log("index.js: Script carregado.");

// Variáveis que eram globais no seu script original.
// Serão atribuídas dentro de initializePageScripts após o header ser carregado.
let RESPONSIVE_WIDTH = 1024;
let isHeaderCollapsed; // Estado do menu mobile
let collapseBtn;       // Botão hamburguer
let collapseHeaderItems; // O contêiner do menu que colapsa
let navToggle;         // Botão que abre o dropdown "Soluções"
let navDropdown;       // A lista de itens do dropdown "Soluções"
let themeToggleButton; // Botão para alternar tema
let themeToggleIcon;   // Ícone dentro do botão de tema (sol/lua)

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

                // Lógica para fechar outros accordions (opcional)
                // accordions.forEach(otherAccordion => {
                //   if (otherAccordion !== this) {
                //     const otherContent = otherAccordion.nextElementSibling;
                //     const otherIcon = otherAccordion.querySelector('i.bi');
                //     if (otherContent && otherIcon && otherContent.style.maxHeight !== '0px') {
                //       otherContent.style.maxHeight = '0px';
                //       otherContent.style.paddingTop = '0px';
                //       otherContent.style.paddingBottom = '0px';
                //       otherIcon.classList.replace('bi-dash', 'bi-plus');
                //     }
                //   }
                // });

                if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                    content.style.maxHeight = '0px';
                    setTimeout(() => { // Delay para transição suave do padding
                        content.style.paddingTop = '0px';
                        content.style.paddingBottom = '0px';
                    }, 300); // Deve corresponder à duração da sua transição CSS se houver
                    icon.classList.replace('bi-dash', 'bi-plus');
                } else {
                    content.style.paddingTop = '10px'; // Ajuste conforme necessário
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
  // themeToggleIcon é atribuído em initializePageScripts
  const storedTheme = localStorage.getItem('theme');

  if (themeToggleIcon) { // Verifica se o ícone existe
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
    // Fallback se o ícone não for encontrado, apenas aplica a classe ao html
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
  // themeToggleIcon é atribuído em initializePageScripts
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

    // 1. Selecionar elementos do header AQUI, DENTRO do headerElement
    collapseBtn = headerElement.querySelector("#collapse-btn"); 
    collapseHeaderItems = headerElement.querySelector("#collapsed-header-items");
    navToggle = headerElement.querySelector("#nav-dropdown-toggle-0"); // Para dropdown "Soluções"
    navDropdown = headerElement.querySelector("#nav-dropdown-list-0"); // Para dropdown "Soluções"
    themeToggleButton = headerElement.querySelector('#theme-toggle'); // Botão de tema
    themeToggleIcon = headerElement.querySelector('#toggle-mode-icon'); // Ícone do tema

    // 2. Estado inicial do menu mobile
    if (collapseHeaderItems && collapseBtn) {
        isHeaderCollapsed = true; // Começa colapsado por padrão
        if (window.innerWidth >= RESPONSIVE_WIDTH) { // Desktop
            isHeaderCollapsed = false;
            collapseHeaderItems.classList.remove("max-lg:tw-hidden");
            collapseBtn.classList.add("lg:tw-hidden"); // Esconde hamburguer no desktop
            collapseBtn.classList.remove("bi-x");
            collapseBtn.classList.add("bi-list");
        } else { // Mobile
            collapseHeaderItems.classList.add("max-lg:tw-hidden");
            collapseBtn.classList.remove("lg:tw-hidden"); // Mostra hamburguer no mobile
            collapseBtn.classList.remove("bi-x");
            collapseBtn.classList.add("bi-list");
        }
    } else {
        console.warn("index.js: #collapse-btn ou #collapsed-header-items não encontrado para estado inicial.");
    }

    // 3. Anexar event listeners
    if (collapseBtn) {
        if (collapseBtn.dataset.listenerAttached !== 'true') { // Evita duplicar listener
            collapseBtn.addEventListener('click', toggleHeader);
            collapseBtn.dataset.listenerAttached = 'true';
            console.log("index.js: Listener para toggleHeader anexado ao #collapse-btn.");
        }
    } else {
        console.warn("index.js: #collapse-btn (botão hamburguer) não encontrado.");
    }

    if (navToggle && navDropdown) {
        if (navToggle.dataset.listenerAttached !== 'true') { // Evita duplicar listener
            navToggle.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleNavDropdown();
            });
            navToggle.dataset.listenerAttached = 'true';
            console.log("index.js: Listener para toggleNavDropdown anexado ao #nav-dropdown-toggle-0.");
        }
         // Fechar dropdown Soluções ao clicar fora (deve ser anexado apenas uma vez)
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
        // Fechar o dropdown com a tecla Escape (deve ser anexado apenas uma vez)
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
    
    // 4. Lógica de Tema
    if (themeToggleButton && themeToggleIcon) {
        applyInitialTheme(); 
        if (themeToggleButton.dataset.listenerAttached !== 'true') { // Evita duplicar listener
            themeToggleButton.addEventListener('click', toggleMode);
            themeToggleButton.dataset.listenerAttached = 'true';
            console.log("index.js: Listener para toggleMode anexado ao #theme-toggle.");
        }
    } else {
        if(!themeToggleButton) console.warn("index.js: Botão de tema (#theme-toggle) não encontrado.");
        if(!themeToggleIcon) console.warn("index.js: Ícone de tema (#toggle-mode-icon) não encontrado.");
        // Mesmo sem o botão, aplica o tema inicial ao HTML
        applyInitialTheme(); 
    }
    
    // 5. Outras inicializações que dependem do header
    // Ex: window.addEventListener("click", onHeaderClickOutside); // Sua lógica original, revise se ainda é necessária

    // 6. Integração com auth.js (Listeners para botões no header)
    const areaClienteButton = headerElement.querySelector('#login-client-area');
    if (areaClienteButton) {
        if (areaClienteButton.dataset.listenerAttached !== 'true') {
            areaClienteButton.addEventListener('click', function(event) {
                event.preventDefault();
                if (typeof handleLogin === 'function') {
                    handleLogin(); // Esta função agora mostra o formulário inline
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

    // 7. Listeners para o formulário de login inline (no corpo do documento)
    const inlineLoginForm = document.getElementById('inline-login-form');
    if (inlineLoginForm) {
        if (inlineLoginForm.dataset.listenerAttached !== 'true') {
            inlineLoginForm.addEventListener('submit', function(event) {
                // event.preventDefault() é chamado dentro de handleInlineFormSubmit em auth.js
                if (typeof handleInlineFormSubmit === 'function') {
                    handleInlineFormSubmit(event);
                } else {
                    console.warn("index.js: handleInlineFormSubmit function (from auth.js) not found.");
                }
            });
            inlineLoginForm.dataset.listenerAttached = 'true';
            console.log("index.js: Listener para handleInlineFormSubmit anexado ao #inline-login-form.");
        }
    } else {
        // Este aviso pode aparecer em páginas que não têm o formulário inline, o que é normal.
        // console.warn("index.js: #inline-login-form não encontrado no documento. Isso é esperado se a página não for index.html.");
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
    } else {
        // Este aviso pode aparecer em páginas que não têm o formulário inline.
        // console.warn("index.js: #inline-login-close-button não encontrado no documento. Isso é esperado se a página não for index.html.");
    }

    // 8. Chamada final para checkLoginState para garantir que a UI reflita o estado atual
    if (typeof checkLoginState === 'function') {
        checkLoginState();
    } else {
        console.warn("index.js: checkLoginState function (from auth.js) not found. Ensure auth.js is loaded before index.js and defines this function globally.");
    }

    console.log("index.js: initializePageScripts CONCLUÍDA.");
}
// Expor a função para loadPartials.js
window.initializePageScripts = initializePageScripts;


// O código do FAQ e outras inicializações que não dependem do header podem ficar aqui
// e serem chamadas no DOMContentLoaded se não forem chamadas por initializePageScripts.
// O seu `index.js` original tem o listener DOMContentLoaded para o FAQ.
// É melhor que `initializePageScripts` chame `initializeFaqAccordions` se o FAQ
// puder estar em páginas que usam o header componentizado.
// Se o FAQ sempre estiver fora dos parciais, o DOMContentLoaded original para ele é ok.

document.addEventListener("DOMContentLoaded", function() {
    console.log("index.js: DOMContentLoaded evento disparado.");
    // Se initializeFaqAccordions não for chamada por initializePageScripts (porque o FAQ não está no header)
    // e você quiser que ela rode em todas as páginas, chame aqui.
    // Mas, para evitar dupla chamada, é melhor centralizar.
    // Se o FAQ estiver no corpo principal da página, pode ser chamado aqui independentemente
    // de `loadPartials.js`.
    if (!document.querySelector('#header-placeholder')) { // Se não for uma página componentizada
        initializeFaqAccordions(); // Exemplo: só inicializa FAQ se header não for dinâmico
    } else {
        // Para páginas componentizadas, `initializePageScripts` já chama `initializeFaqAccordions`
        // se você adicionou a chamada lá. Caso contrário, adicione:
        // if (typeof initializeFaqAccordions === 'function') { initializeFaqAccordions(); }
        // A versão de initializePageScripts acima já chama initializeFaqAccordions.
    }

    // Outras inicializações do seu index.js original que são globais
    // e não dependem do header ter sido carregado.
});
