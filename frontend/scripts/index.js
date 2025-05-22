// Em: frontend/scripts/index.js

// ... (outras funções como configureAuth0Client, login, logout, initializeMobileMenu, initializeSolucoesDropdown etc., permanecem como antes) ...

// --- Lógica do Tema (Dark/Light Mode) ---
function applyInitialTheme() {
  console.log("index.js: Aplicando tema inicial...");
  const htmlElement = document.documentElement;
  // O ID 'theme-toggle-icon' deve corresponder ao ID do ícone no seu _header.html
  // No _header.html que recriamos na Turn 12, o botão de tema é #theme-toggle e o ícone dentro dele é #toggle-mode-icon
  const themeToggleIcon = document.getElementById('toggle-mode-icon'); 
  const storedTheme = localStorage.getItem('theme');

  if (storedTheme === 'dark') {
    htmlElement.classList.add('tw-dark');
    if (themeToggleIcon) {
      themeToggleIcon.classList.remove('bi-sun'); 
      themeToggleIcon.classList.add('bi-moon');   
    }
    console.log("index.js: Tema escuro aplicado (localStorage).");
  } else { 
    // Aplica o modo claro se storedTheme === 'light' OU se storedTheme for null (nenhum tema salvo)
    htmlElement.classList.remove('tw-dark');
    if (themeToggleIcon) {
      themeToggleIcon.classList.remove('bi-moon'); 
      themeToggleIcon.classList.add('bi-sun');    
    }
    console.log("index.js: Tema claro aplicado (padrão ou localStorage).");
  }
}

function toggleMode() { // Esta função é chamada pelo event listener no botão de tema
  console.log("index.js: Alternando tema...");
  const htmlElement = document.documentElement;
  // No _header.html que recriamos na Turn 12, o ícone de tema tem id 'toggle-mode-icon'
  const themeToggleIcon = document.getElementById('toggle-mode-icon'); 
  htmlElement.classList.toggle('tw-dark');

  if (htmlElement.classList.contains('tw-dark')) {
    localStorage.setItem('theme', 'dark');
    if (themeToggleIcon) {
      themeToggleIcon.classList.remove('bi-sun');
      themeToggleIcon.classList.add('bi-moon');
    }
    console.log("index.js: Tema alterado para escuro.");
  } else {
    localStorage.setItem('theme', 'light');
    if (themeToggleIcon) {
      themeToggleIcon.classList.remove('bi-moon');
      themeToggleIcon.classList.add('bi-sun');
    }
    console.log("index.js: Tema alterado para claro.");
  }
}

// A função initializePageScripts (que é chamada por loadPartials.js)
// deve chamar applyInitialTheme e anexar o listener para toggleMode.
// (O restante da função initializePageScripts e outras funções em index.js permanecem como na orientação anterior - Turn 11)

// --- Função de Inicialização Principal para o Header (Chama as auxiliares) ---
// (Esta é a função que initializePageScripts do seu index.js adaptado na Turn 12 deve se parecer)
function initializePageScripts(headerElement) { // Renomeada de initializeHeaderScripts para ser mais genérica
    console.log("index.js: initializePageScripts chamada com headerElement:", headerElement ? "encontrado" : "NÃO encontrado");
    if (!headerElement) {
        console.error("index.js: Elemento do header não foi fornecido. Funcionalidades do header não serão iniciadas.");
        return;
    }

    // Re-seleciona os elementos DENTRO do headerElement injetado
    collapseBtn = headerElement.querySelector("#collapse-btn");
    collapseHeaderItems = headerElement.querySelector("#collapsed-header-items");
    navToggle = headerElement.querySelector("#nav-dropdown-toggle-0");
    navDropdown = headerElement.querySelector("#nav-dropdown-list-0");

    // Estado inicial do menu mobile (conforme seu index.js original)
    isHeaderCollapsed = window.innerWidth < RESPONSIVE_WIDTH; // RESPONSIVE_WIDTH deve estar definido
    if (collapseHeaderItems) {
        if(isHeaderCollapsed){ 
            collapseHeaderItems.classList.add("max-lg:tw-hidden");
        } else { 
            collapseHeaderItems.classList.remove("max-lg:tw-hidden");
        }
    }

    // Anexar event listeners do seu index.js original
    if (collapseBtn) {
        collapseBtn.addEventListener('click', toggleHeader); // toggleHeader é do seu index.js original
    } else {
        console.warn("index.js: #collapse-btn (botão hamburguer) não encontrado no header injetado.");
    }

    if (navToggle && navDropdown) {
        navToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleNavDropdown(); // toggleNavDropdown é do seu index.js original
        });
        document.addEventListener('click', (event) => { // Fechar ao clicar fora
            if (navDropdown && navDropdown.getAttribute('data-open') === 'true' && 
                !navToggle.contains(event.target) && !navDropdown.contains(event.target)) {
                toggleNavDropdown(); 
            }
        });
    } else {
        console.warn("index.js: Elementos do dropdown Soluções não encontrados.");
    }
    
    // Lógica de Tema
    const themeToggleButton = headerElement.querySelector('#theme-toggle'); // Botão de tema no _header.html
    if (themeToggleButton) {
        applyInitialTheme(); // Aplica o tema inicial ao carregar
        themeToggleButton.addEventListener('click', toggleMode); // Anexa o toggle ao clique
    } else {
        console.warn("index.js: Botão de tema (#theme-toggle) não encontrado.");
    }

    // Lógica de Auth0 (se reintegrada)
    // await configureAuth0Client(); 
    // await updateAuthUI(headerElement); 
    // Adicionar listeners aos botões de login/logout do Auth0 se existirem.

    initializeFaqAccordions(); // Função do seu index.js original para o FAQ

    console.log("index.js: initializePageScripts concluída.");
}
// Expor para loadPartials.js
window.initializePageScripts = initializePageScripts;


// Suas funções originais de index.js (toggleHeader, toggleNavDropdown, onHeaderClickOutside, initializeFaqAccordions, etc.)
// devem estar definidas aqui, como você me forneceu.
// Exemplo:
// let RESPONSIVE_WIDTH = 1024;
// let isHeaderCollapsed; 
// let collapseBtn; 
// let collapseHeaderItems; 
// let navToggle; 
// let navDropdown; 
// function toggleHeader() { ... }
// function toggleNavDropdown() { ... }
// function initializeFaqAccordions() { ... }

// ... (resto do seu index.js, incluindo as definições de toggleHeader, toggleNavDropdown, initializeFaqAccordions, etc.)
// ... (e a chamada a initializeFaqAccordions no DOMContentLoaded se o FAQ não estiver no header/footer)

// Lembre-se de que as variáveis como `collapseBtn`, `navToggle` etc.,
// que eram selecionadas globalmente no seu `index.js` original,
// agora são inicializadas DENTRO de `initializePageScripts` após o header ser carregado.
// Suas funções `toggleHeader` e `toggleNavDropdown` usarão essas variáveis já atribuídas.
