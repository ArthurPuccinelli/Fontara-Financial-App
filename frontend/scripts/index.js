// frontend/scripts/index.js

// ... (Todo o código anterior de Auth0, Tema, etc., permanece o mesmo) ...
// console.log("index.js: Script carregado.");
// let auth0Client = null;
// const auth0Config = { ... };
// async function configureAuth0Client() { ... }
// async function login() { ... }
// async function logout() { ... }
// async function updateAuthUI(headerElement) { ... }
// function applyInitialTheme() { ... }
// function toggleMode() { ... }
// function initializeMobileMenu(headerElement) { ... }


// --- Lógica para Dropdown "Soluções" ---
function initializeSolucoesDropdown(headerElement) {
    const solucoesToggle = headerElement.querySelector('#solucoes-dropdown-toggle');
    const solucoesList = headerElement.querySelector('#solucoes-dropdown-list');

    if (solucoesToggle && solucoesList) {
        console.log("index.js: Inicializando dropdown Soluções.");
        solucoesToggle.addEventListener('click', (event) => {
            event.stopPropagation(); // Previne que o clique feche imediatamente se houver um listener global
            const isExpanded = solucoesToggle.getAttribute('aria-expanded') === 'true';
            solucoesToggle.setAttribute('aria-expanded', !isExpanded);
            solucoesList.classList.toggle('tw-hidden'); // Controla a visibilidade
            // Adicione/remova outras classes para animação se desejar (ex: opacity, scale)
            // solucoesList.classList.toggle('tw-opacity-0');
            // solucoesList.classList.toggle('tw-scale-95'); // Exemplo de classes de animação
            console.log("index.js: Dropdown Soluções alternado.");
        });

        // Fechar o dropdown se clicar fora dele
        document.addEventListener('click', (event) => {
            if (!solucoesToggle.contains(event.target) && !solucoesList.contains(event.target)) {
                if (solucoesToggle.getAttribute('aria-expanded') === 'true') {
                    solucoesToggle.setAttribute('aria-expanded', 'false');
                    solucoesList.classList.add('tw-hidden');
                    // solucoesList.classList.add('tw-opacity-0');
                    // solucoesList.classList.add('tw-scale-95');
                    console.log("index.js: Dropdown Soluções fechado por clique externo.");
                }
            }
        });

        // Fechar o dropdown com a tecla Escape
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && solucoesToggle.getAttribute('aria-expanded') === 'true') {
                solucoesToggle.setAttribute('aria-expanded', 'false');
                solucoesList.classList.add('tw-hidden');
                // solucoesList.classList.add('tw-opacity-0');
                // solucoesList.classList.add('tw-scale-95');
                console.log("index.js: Dropdown Soluções fechado com ESC.");
            }
        });

    } else {
        if (!solucoesToggle) console.warn("index.js: Botão do dropdown Soluções (#solucoes-dropdown-toggle) não encontrado.");
        if (!solucoesList) console.warn("index.js: Lista do dropdown Soluções (#solucoes-dropdown-list) não encontrada.");
    }
}


// --- Função de Inicialização Principal para o Header (MODIFICADA) ---
async function initializeHeaderScripts(headerElement) {
  console.log("index.js: initializeHeaderScripts chamada com headerElement:", headerElement ? "encontrado" : "NÃO encontrado");
  if (!headerElement) {
    console.error("index.js: Elemento do header não foi fornecido para initializeHeaderScripts. Abortando inicialização do header.");
    return;
  }

  applyInitialTheme(); // Cuida do tema

  const themeButton = headerElement.querySelector('#theme-toggle-button');
  if (themeButton) {
    themeButton.addEventListener('click', toggleMode);
  } else {
    console.warn("index.js: Botão de tema (#theme-toggle-button) não encontrado no header.");
  }

  // Configura Auth0 e atualiza UI de login/logout
  await configureAuth0Client(); 
  await updateAuthUI(headerElement); 

  const loginButton = headerElement.querySelector('#login-button');
  if (loginButton) {
    loginButton.addEventListener('click', (e) => {
      e.preventDefault();
      login();
    });
  } else {
    console.warn("index.js: Botão de login (#login-button) não encontrado no header.");
  }

  const logoutButton = headerElement.querySelector('#logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  } else {
    console.warn("index.js: Botão de logout (#logout-button) não encontrado no header.");
  }
  
  initializeMobileMenu(headerElement); // Cuida do menu hamburguer

  initializeSolucoesDropdown(headerElement); // NOVA LINHA: Inicializa o dropdown "Soluções"

  console.log("index.js: Scripts do Header (incluindo dropdown Soluções) e Auth0 FINALIZADOS.");
}
// Expor a função para loadPartials.js (como antes)
window.initializeHeaderScripts = initializeHeaderScripts; 

// ... (Resto do seu index.js: handleAuthCallback, initializePage, etc., permanecem como antes) ...
// async function handleAuthCallback() { ... }
// async function initializePage() { ... }
// document.addEventListener('DOMContentLoaded', initializePage);
