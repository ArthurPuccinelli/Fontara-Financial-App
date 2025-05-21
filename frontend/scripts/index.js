// frontend/scripts/index.js

// --- Configuração e Funções do Auth0 ---
// (Esta parte pode vir do seu authService.js ou ser integrada aqui)
let auth0Client = null;
const auth0Config = { // Seus dados do Auth0 devem ser carregados de forma segura
  domain: "SEU_AUTH0_DOMAIN",       // Substitua pelo seu Auth0 Domain
  clientId: "SEU_AUTH0_CLIENT_ID", // Substitua pelo seu Auth0 Client ID
  authorizationParams: {
    redirect_uri: window.location.origin + "/callback.html", // Ajuste se a callback não for na raiz
    // audience: "SUA_API_AUDIENCE", // Se você protege uma API
  }
};

async function configureAuth0Client() {
  try {
    auth0Client = await auth0.createAuth0Client({ // auth0 é o objeto global do SDK do Auth0
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
      authorizationParams: auth0Config.authorizationParams
    });
  } catch (e) {
    console.error("Erro ao configurar o cliente Auth0:", e);
  }
}

async function login() {
  if (!auth0Client) {
    console.error("Auth0 client não configurado.");
    return;
  }
  try {
    await auth0Client.loginWithRedirect();
  } catch (e) {
    console.error("Erro ao tentar fazer login:", e);
  }
}

async function logout() {
  if (!auth0Client) {
    console.error("Auth0 client não configurado.");
    return;
  }
  try {
    await auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  } catch (e) {
    console.error("Erro ao tentar fazer logout:", e);
  }
}

async function updateAuthUI() {
  if (!auth0Client) return;
  try {
    const isAuthenticated = await auth0Client.isAuthenticated();
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const signupButton = document.getElementById('signup-button'); // Botão de Criar Conta

    if (loginButton) loginButton.classList.toggle('tw-hidden', isAuthenticated);
    if (signupButton) signupButton.classList.toggle('tw-hidden', isAuthenticated); // Esconde "Criar Conta" se logado
    if (logoutButton) logoutButton.classList.toggle('tw-hidden', !isAuthenticated);

    if (isAuthenticated) {
      // Opcional: buscar informações do usuário
      // const user = await auth0Client.getUser();
      // console.log(user);
      // Atualizar a UI com o nome do usuário, etc.
    }
  } catch (e) {
    console.error("Erro ao atualizar UI de autenticação:", e);
  }
}

// --- Lógica do Tema (Dark/Light Mode) ---
function toggleMode() {
  const htmlElement = document.documentElement;
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  htmlElement.classList.toggle('tw-dark');

  if (htmlElement.classList.contains('tw-dark')) {
    localStorage.setItem('theme', 'dark');
    if (themeToggleIcon) themeToggleIcon.classList.replace('bi-sun', 'bi-moon');
  } else {
    localStorage.setItem('theme', 'light');
    if (themeToggleIcon) themeToggleIcon.classList.replace('bi-moon', 'bi-sun');
  }
}

function applyInitialTheme() {
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  if (localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('tw-dark');
    if (themeToggleIcon) themeToggleIcon.classList.replace('bi-sun', 'bi-moon');
  } else {
    document.documentElement.classList.remove('tw-dark');
    if (themeToggleIcon) themeToggleIcon.classList.replace('bi-moon', 'bi-sun');
  }
}


// --- Lógica do Menu Mobile ---
function initializeMobileMenu(headerElement) {
    const menuToggleButton = headerElement.querySelector('#menu-toggle-button');
    const collapsedHeaderItems = headerElement.querySelector('#collapsed-header-items');

    if (menuToggleButton && collapsedHeaderItems) {
        menuToggleButton.addEventListener('click', () => {
            const isExpanded = menuToggleButton.getAttribute('aria-expanded') === 'true' || false;
            menuToggleButton.setAttribute('aria-expanded', !isExpanded);
            collapsedHeaderItems.classList.toggle('max-lg:tw-hidden'); // Controla a visibilidade
            // Opcional: Alterne o ícone se desejar (ex: bi-list para bi-x)
            const icon = menuToggleButton.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-list');
                icon.classList.toggle('bi-x');
            }
        });
    }
}

// --- Função de Inicialização Principal para o Header ---
// Esta função será chamada por loadPartials.js
async function initializeHeaderScripts(headerElement) {
  if (!headerElement) {
    console.warn("Elemento do header não fornecido para initializeHeaderScripts.");
    return;
  }

  // 1. Aplicar tema inicial (antes de anexar o toggle para evitar piscar)
  applyInitialTheme();

  // 2. Anexar evento ao botão de tema
  const themeButton = headerElement.querySelector('#theme-toggle-button');
  if (themeButton) {
    themeButton.addEventListener('click', toggleMode);
  }

  // 3. Configurar e inicializar Auth0 e anexar listeners
  await configureAuth0Client();
  await updateAuthUI(); // Atualiza a UI com base no estado de login inicial

  const loginButton = headerElement.querySelector('#login-button');
  if (loginButton) {
    loginButton.addEventListener('click', (e) => {
      e.preventDefault();
      login();
    });
  }

  const logoutButton = headerElement.querySelector('#logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
  
  // 4. Inicializar menu mobile
  initializeMobileMenu(headerElement);

  console.log("Header scripts e Auth0 inicializados.");
}
// Expor a função para loadPartials.js
window.initializeHeaderScripts = initializeHeaderScripts;

// --- Lógica de Callback do Auth0 ---
// (Geralmente em callback.html, mas se index.js for carregado em callback.html, pode estar aqui)
// Ou, se você tiver um script separado para callback.html
async function handleAuthCallback() {
  if (window.location.pathname.includes("/callback.html")) { // Verifica se está na página de callback
    if (!auth0Client) {
      await configureAuth0Client(); // Garante que o cliente esteja configurado
    }
    if (auth0Client) {
      try {
        await auth0Client.handleRedirectCallback();
        // Opcional: Remover parâmetros da query da URL
        // window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error("Erro no handleRedirectCallback:", e);
      } finally {
        // Redireciona para a página principal ou dashboard após o callback
        window.location.replace(window.location.origin);
      }
    }
  }
}

// --- Inicialização Geral da Página ---
// Esta função pode ser chamada diretamente se `index.js` for o ponto de entrada principal
// ou pode ser parte do que `initializePagePartials` chama
async function initializePage() {
    // Se esta página for a callback.html, processa o callback do Auth0
    await handleAuthCallback();

    // Outras inicializações que não dependem do header estar carregado
    // (ex: se o header já for carregado estaticamente nesta página e não via loadPartials)
    // Se você estiver usando loadPartials.js em TODAS as páginas, a inicialização do header
    // já é cuidada por `initializeHeaderScripts` quando `loadPartials.js` a chama.
}

// Chama a inicialização da página.
// Se você tem loadPartials.js em todas as páginas, ele cuidará de chamar initializeHeaderScripts.
// A chamada a initializePage() aqui pode ser para coisas que não dependem do header,
// ou se esta página (como callback.html) não usa loadPartials.js.
document.addEventListener('DOMContentLoaded', initializePage);
