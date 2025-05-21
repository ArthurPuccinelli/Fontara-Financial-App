// frontend/scripts/index.js

console.log("index.js: Script carregado.");

// --- Configuração e Funções do Auth0 ---
let auth0Client = null;
const auth0Config = {
  domain: "dev-fontara.us.auth0.com",       // CONFIRME SE ESTE É SEU DOMÍNIO CORRETO
  clientId: "m3gMCfS53fWzPa2924N6x536YJgQx5gX", // CONFIRME SE ESTE É SEU CLIENT ID CORRETO
  authorizationParams: {
    redirect_uri: window.location.origin + "/callback.html", 
  }
};

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
      console.error("index.js: SDK do Auth0 (auth0.createAuth0Client) não está disponível globalmente. Verifique se o SDK foi carregado.");
    }
  } catch (e) {
    console.error("index.js: Erro ao configurar o cliente Auth0:", e);
  }
}

async function login() {
  if (!auth0Client) {
    console.error("index.js: Auth0 client não configurado para login.");
    await configureAuth0Client(); // Tenta configurar se não estiver pronto
    if (!auth0Client) return; // Sai se ainda não estiver pronto
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
    console.error("index.js: Auth0 client não configurado para logout.");
    await configureAuth0Client();
    if (!auth0Client) return;
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
    return;
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

// --- Função de Inicialização Principal para o Header ---
async function initializeHeaderScripts(headerElement) {
  console.log("index.js: initializeHeaderScripts chamada com headerElement:", headerElement ? "encontrado" : "NÃO encontrado");
  if (!headerElement) {
    console.error("index.js: Elemento do header não foi fornecido para initializeHeaderScripts. Abortando inicialização do header.");
    return;
  }

  applyInitialTheme();

  const themeButton = headerElement.querySelector('#theme-toggle-button');
  if (themeButton) {
    themeButton.addEventListener('click', toggleMode);
  } else {
    console.warn("index.js: Botão de tema (#theme-toggle-button) não encontrado no header.");
  }

  await configureAuth0Client(); // Garante que o cliente está configurado
  await updateAuthUI(headerElement); // Atualiza a UI com base no estado de login

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

  console.log("index.js: Scripts do Header e Auth0 FINALIZADOS.");
}
window.initializeHeaderScripts = initializeHeaderScripts; // Crucial para loadPartials.js

// --- Lógica de Callback do Auth0 ---
async function handleAuthCallback() {
  // Somente executa se estiver na página de callback
  if (window.location.pathname.includes("/callback.html") || 
      (window.location.search.includes("code=") && window.location.search.includes("state="))) {
    console.log("index.js: Página de callback detectada ou parâmetros de auth na URL.");
    if (!auth0Client) {
      await configureAuth0Client(); 
    }
    if (auth0Client && typeof auth0Client.handleRedirectCallback === 'function') {
      try {
        console.log("index.js: Processando callback do Auth0...");
        await auth0Client.handleRedirectCallback();
        console.log("index.js: Callback do Auth0 processado.");
      } catch (e) {
        console.error("index.js: Erro no handleRedirectCallback:", e);
      } finally {
        // Limpa a URL e redireciona
        let targetUrl = window.location.origin;
        const appState = await auth0Client.handleRedirectCallback(); // Pega o appState se houver
        if (appState && appState.targetUrl) {
            targetUrl = appState.targetUrl;
        }
        console.log("index.js: Redirecionando para:", targetUrl);
        window.history.replaceState({}, document.title, "/"); // Limpa a URL antes de redirecionar
        window.location.replace(targetUrl);
      }
    } else {
        console.error("index.js: auth0Client não está pronto ou handleRedirectCallback não é uma função para processar callback.");
    }
  }
}

// --- Inicialização Geral da Página ---
async function initializePage() {
    console.log("index.js: initializePage chamada.");
    // Se a página for callback.html ou tiver os parâmetros de auth, o handleAuthCallback será invocado.
    // Não é necessário chamar initializeHeaderScripts aqui se loadPartials.js estiver em uso,
    // pois loadPartials.js já faz essa chamada após injetar o header.
    await handleAuthCallback(); 
    console.log("index.js: initializePage concluída.");
}

// A inicialização principal da página (handleAuthCallback) deve ocorrer quando o DOM estiver pronto.
// `initializeHeaderScripts` será chamada por `loadPartials.js`.
document.addEventListener('DOMContentLoaded', initializePage);
