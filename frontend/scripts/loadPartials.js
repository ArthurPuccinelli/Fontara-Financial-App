// Em: frontend/scripts/loadPartials.js

// Helper function to load a script dynamically
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false; // Ensure sequential execution relative to other async scripts if needed, though await handles this here
        script.onload = () => {
            console.log(`loadPartials.js: Script ${src} carregado com sucesso.`);
            resolve();
        };
        script.onerror = () => {
            console.error(`loadPartials.js: Falha ao carregar o script ${src}.`);
            reject(new Error(`Failed to load script ${src}`));
        };
        document.head.appendChild(script);
    });
}

async function fetchAndInjectHTML(filePath, placeholderId) {
  try {
    // USA CAMINHO ABSOLUTO A PARTIR DA RAIZ DO SITE
    const absoluteFilePath = new URL(filePath, window.location.origin).pathname;
    const response = await fetch(absoluteFilePath); 
    if (!response.ok) {
      console.error(`loadPartials.js: Erro ao carregar ${absoluteFilePath}: ${response.status} ${response.statusText}`);
      const placeholder = document.getElementById(placeholderId);
      if (placeholder) placeholder.innerHTML = `<p style="color:red; text-align:center;">Erro (${filePath}).</p>`;
      return null;
    }
    const htmlText = await response.text();
    const placeholderElement = document.getElementById(placeholderId);

    if (placeholderElement) {
      placeholderElement.outerHTML = htmlText; 

      if (placeholderId === 'header-placeholder') {
        return document.getElementById('mainHeader'); 
      }
      if (placeholderId === 'footer-placeholder') {
        return document.querySelector('footer'); 
      }
    } else {
      console.warn(`loadPartials.js: Placeholder com ID '${placeholderId}' não encontrado para ${filePath}.`);
    }
  } catch (error) {
    console.error(`loadPartials.js: Falha ao buscar e injetar ${filePath}:`, error);
    const placeholder = document.getElementById(placeholderId); 
    if (placeholder) placeholder.innerHTML = `<p style="color:red; text-align:center;">Falha (${filePath}).</p>`;
  }
  return null;
}

async function initializePagePartials() {
  console.log("loadPartials.js: Iniciando carregamento de parciais...");

  try {
    // Load auth.js first
    // Path assumes frontend/scripts/auth.js is accessible as /scripts/auth.js from the web root
    await loadScript('/scripts/auth.js'); 
  } catch (error) {
    console.error("loadPartials.js: ERRO CRÍTICO - Não foi possível carregar auth.js. Funcionalidades de autenticação podem não funcionar.", error);
    // Decide if you want to stop further execution or show a message to the user
    // For now, it will log the error and continue, potentially leading to other errors if auth.js functions are undefined
  }

  // CAMINHOS ABSOLUTOS DA RAIZ DO SITE
  const headerInjectedElement = await fetchAndInjectHTML('/_header.html', 'header-placeholder');
  const footerInjectedElement = await fetchAndInjectHTML('/_footer.html', 'footer-placeholder');

  if (headerInjectedElement) {
    console.log("loadPartials.js: Header carregado. Chamando initializePageScripts...");
    if (typeof window.initializePageScripts === 'function') {
      window.initializePageScripts(headerInjectedElement); 
    } else {
      console.error("loadPartials.js: ERRO CRÍTICO - Função window.initializePageScripts NÃO definida em index.js!");
    }
  } else {
    console.error("loadPartials.js: Header não pôde ser carregado ou injetado.");
  }

  if (footerInjectedElement) {
    console.log("loadPartials.js: Footer carregado.");
    const yearSpan = footerInjectedElement.querySelector('#current-year'); 
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  } else {
    console.error("loadPartials.js: Footer não pôde ser carregado ou injetado.");
  }

  if (typeof window.initializePageSpecificScripts === 'function') {
    console.log("loadPartials.js: Chamando initializePageSpecificScripts...");
    window.initializePageSpecificScripts();
  } else {
    console.log("loadPartials.js: initializePageSpecificScripts não definida para esta página (isso é opcional).");
  }
  console.log("loadPartials.js: Carregamento de parciais concluído.");
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePagePartials);
} else {
  initializePagePartials();
}
