// frontend/scripts/index.js

console.log("index.js: Script carregado.");

// --- Configuração Auth0 (Globais ao Módulo) ---
let auth0Client = null;
const auth0Config = {
  domain: "dev-fontara.us.auth0.com",       // CONFIRME SEU DOMÍNIO
  clientId: "m3gMCfS53fWzPa2924N6x536YJgQx5gX", // CONFIRME SEU CLIENT ID
  authorizationParams: {
    redirect_uri: window.location.origin + "/callback.html", 
  }
};

// --- Funções Auxiliares (Definidas ANTES de serem usadas por initializeHeaderScripts) ---

// --- Lógica do Tema (Dark/Light Mode) ---
function applyInitialTheme() {
  console.log("index.js: Aplicando tema inicial...");
  const htmlElement = document.documentElement;
  const themeToggleIcon = document.getElementById('theme-toggle-icon'); 
  const storedTheme = localStorage.getItem('theme');

  if (storedTheme === 'dark') {
    htmlElement.classList.add('tw-dark');
    if (themeToggleIcon) {
      themeToggleIcon.classList.remove('bi-sun');
      themeToggleIcon.classList.add('bi-moon');
    }
    console.log("index.js: Tema escuro aplicado (localStorage).");
  } else { 
    htmlElement.classList.remove('tw-dark');
    if (themeToggleIcon) {
      themeToggleIcon.classList.remove('bi-moon');
      themeToggleIcon.classList.add('bi-sun');
    }
    console.log("index.js: Tema claro aplicado (padrão ou localStorage).");
  }
}

function toggleMode() {
  console.log("index.js: Alternando tema...");
  const htmlElement = document.documentElement;
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
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

// --- Lógica do Menu Mobile ---
function initializeMobileMenu(headerElement) {
    console.log("index.js: Inicializando menu mobile...");
    const menuToggleButton = headerElement.querySelector('#menu-toggle-button');
    const collapsedHeaderItems = headerElement.querySelector('#collapsed-header-items');

    if (menuToggleButton && collapsedHeaderItems) {
        menuToggleButton.addEventListener('click', () => {
            const isExpanded = menuToggleButton.getAttribute('aria-expanded') === 'true' || false;
            menuToggleButton.setAttribute('aria-expanded', !isExpanded);
            collapsedHeaderItems.classList.toggle('max-lg:tw-hidden');
            const icon = menuToggleButton.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-list');
                icon.classList.toggle('bi-x');
            }
            console.log("index.js: Menu mobile alternado.");
        });
    } else {
        if (!menuToggleButton) console.warn("index.js: Botão do menu mobile (#menu-toggle-button) não encontrado.");
        if (!collapsedHeaderItems) console.warn("index.js: Container do menu mobile (#collapsed-header-items) não encontrado.");
    }
}

// --- Lógica para Dropdown "Soluções" ---
function initializeSolucoesDropdown(headerElement) {
    const solucoesToggle = headerElement.querySelector('#solucoes-dropdown-toggle');
    const solucoesList = headerElement.querySelector('#solucoes-dropdown-list');

    if (solucoesToggle && solucoesList) {
        console.log("index.js: Inicializando dropdown Soluções.");
        solucoesToggle.addEventListener('click', (event) => {
            event.stopPropagation(); 
            const isExpanded = solucoesToggle.getAttribute('aria-expanded') === 'true';
            solucoesToggle.setAttribute('aria-expanded', !isExpanded);
            solucoesList.classList.toggle('tw-hidden');
            console.log("index.js: Dropdown Soluções alternado.");
        });

        document.addEventListener('click', (event) => {
            if (!solucoesToggle.contains(event.target) && !solucoesList.contains(event.target)) {
                if (solucoesToggle.getAttribute('aria-expanded') === 'true') {
                    solucoesToggle.setAttribute('aria-expanded', 'false');
                    solucoesList.classList.add('tw-hidden');
                    console.log("index.js: Dropdown Soluções fechado por clique externo.");
                }
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && solucoesToggle.getAttribute('aria-expanded') === 'true') {
                solucoesToggle.setAttribute('aria-expanded', 'false');
                solucoesList.classList.add('tw-hidden');
                console.log("index.js: Dropdown Soluções fechado com ESC.");
            }
        });
    } else {
        if (!solucoesToggle) console.warn("index.js: Botão do dropdown Soluções (#solucoes-dropdown-toggle) não encontrado.");
        if (!solucoesList) console.warn("index.js: Lista do dropdown Soluções (#solucoes-dropdown-list) não encontrada.");
    }
}

// --- Funções Auth0 ---
async function configureAuth0Client() {
  console.log("index.js: Configurando cliente Auth0...");
  try {
    if (typeof auth0 !== 'undefined' && typeof auth0.createAuth0Client === 'function') {
        auth0Client = await auth0.createAuth0Client({
        domain: auth0Config.domain,
        clientId: auth0Config.clientId,
        authorizationParams: auth0Config.authorizationParams
      });
      console.log("index.js: Cliente Auth0 configurado.");
    } else {
      console.error("index.js: SDK do Auth0 (auth0.createAuth0Client) não está disponível globalmente. Verifique se o SDK foi carregado no HTML.");
    }
  } catch (e) {
    console.error("index.js: Erro ao configurar o cliente Auth0:", e);
  }
}

async function login() {
  if (!auth0Client) {
    console.error("index.js: Auth0 client não configurado para login. Tentando configurar...");
    await configureAuth0Client(); 
    if (!auth0Client) {
        console.error("index.js: Falha ao configurar Auth0 client para login.");
        return; 
    }
  }
  try {
    console.log("index.js: Tentando login com redirecionamento...");
    await auth0Client.loginWithRedirect();
  } catch (e) {
    console.error("index.js: Erro ao tentar fazer login:", e);
  }
}

async function logout() {
  if (!auth0Client) {
    console.error("index.js: Auth0 client não configurado para logout. Tentando configurar...");
    await configureAuth0Client();
    if (!auth0Client) {
        console.error("index.js: Falha ao configurar Auth0 client para logout.");
        return;
    }
  }
  try {
    console.log("index.js: Tentando logout...");
    await auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  } catch (e) {
    console.error("index.js: Erro ao tentar fazer logout:", e);
  }
}

async function updateAuthUI(headerElement) {
  if (!auth0Client) {
    console.log("index.js: updateAuthUI chamado, mas cliente Auth0 não pronto.");
    await configureAuth0Client(); // Tenta configurar se não estiver pronto
    if (!auth0Client) { // Verifica novamente
        console.error("index.js: Auth0 client ainda não pronto após tentativa de reconfiguração em updateAuthUI.");
        return;
    }
  }
  if (!headerElement) {
    console.warn("index.js: updateAuthUI chamado sem headerElement.");
    return;
  }
  try {
    const isAuthenticated = await auth0Client.isAuthenticated();
    console.log("index.js: Estado de autenticação:", isAuthenticated);
    const loginButton = headerElement.querySelector('#login-button');
    const logoutButton = headerElement.querySelector('#logout-button');
    const signupButton = headerElement.querySelector('#signup-button');

    if (loginButton) loginButton.classList.toggle('tw-hidden', isAuthenticated);
    if (signupButton) signupButton.classList.toggle('tw-hidden', isAuthenticated);
    if (logoutButton) logoutButton.classList.toggle('tw-hidden', !isAuthenticated);

  } catch (e) {
    console.error("index.js: Erro ao atualizar UI de autenticação:", e);
  }
}


// --- Função de Inicialização Principal para o Header (Chama as auxiliares) ---
async function initializeHeaderScripts(headerElement) {
  console.log("index.js: initializeHeaderScripts chamada com headerElement:", headerElement ? "encontrado" : "NÃO encontrado");
  if (!headerElement) {
    console.error("index.js: Elemento do header não foi fornecido para initializeHeaderScripts. Abortando inicialização do header.");
    return;
  }

  // As funções auxiliares agora estão definidas acima
  applyInitialTheme(); 

  const themeButton = headerElement.querySelector('#theme-toggle-button');
  if (themeButton) {
    themeButton.addEventListener('click', toggleMode);
  } else {
    console.warn("index.js: Botão de tema (#theme-toggle-button) não encontrado no header.");
  }

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
  
  initializeMobileMenu(headerElement); 
  initializeSolucoesDropdown(headerElement);

  console.log("index.js: Scripts do Header (incluindo dropdown Soluções) e Auth0 FINALIZADOS.");
}
// Expor a função para loadPartials.js 
window.initializeHeaderScripts = initializeHeaderScripts; 

// --- Lógica de Callback do Auth0 ---
async function handleAuthCallback() {
  if (window.location.pathname.includes("/callback.html") || 
      (window.location.search.includes("code=") && window.location.search.includes("state="))) {
    console.log("index.js: Página de callback detectada ou parâmetros de auth na URL.");
    if (!auth0Client) {
      await configureAuth0Client(); 
    }
    if (auth0Client && typeof auth0Client.handleRedirectCallback === 'function') {
      try {
        console.log("index.js: Processando callback do Auth0...");
        const result = await auth0Client.handleRedirectCallback();
        console.log("index.js: Callback do Auth0 processado. Resultado:", result);
        
        let targetUrl = window.location.origin;
        if (result && result.appState && result.appState.targetUrl) {
            targetUrl = result.appState.targetUrl;
        }
        console.log("index.js: Redirecionando para:", targetUrl);
        window.history.replaceState({}, document.title, "/"); 
        window.location.replace(targetUrl);

      } catch (e) {
        console.error("index.js: Erro no handleRedirectCallback:", e);
        window.location.replace(window.location.origin); 
      }
    } else {
        console.error("index.js: auth0Client não está pronto ou handleRedirectCallback não é uma função para processar callback.");
        window.location.replace(window.location.origin); 
    }
  }
}

// --- Inicialização Geral da Página ---
async function initializePage() {
    console.log("index.js: initializePage chamada.");
    await handleAuthCallback(); 
    console.log("index.js: initializePage concluída.");
}

document.addEventListener('DOMContentLoaded', initializePage);
