// Em: frontend/scripts/loadPartials.js

/**
 * Busca o conteúdo de um arquivo HTML e o injeta no lugar de um elemento placeholder.
 * @param {string} filePath Caminho para o arquivo HTML a ser carregado.
 * @param {string} placeholderId ID do elemento placeholder que será substituído.
 * @returns {Promise<Element|null>} O elemento principal injetado (ex: o <header> ou <footer>) ou null em caso de falha.
 */
async function fetchAndInjectHTML(filePath, placeholderId) {
  try {
    const response = await fetch(filePath); // Caminho relativo ao Documento HTML
    if (!response.ok) {
      console.error(`Erro ao carregar ${filePath}: ${response.status} ${response.statusText}`);
      const placeholder = document.getElementById(placeholderId);
      if (placeholder) {
        placeholder.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar conteúdo (${filePath}).</p>`;
      }
      return null;
    }
    const htmlText = await response.text();
    const placeholderElement = document.getElementById(placeholderId);

    if (placeholderElement) {
      placeholderElement.outerHTML = htmlText; // Substitui o placeholder

      if (placeholderId === 'header-placeholder') {
        return document.getElementById('mainHeader'); 
      }
      if (placeholderId === 'footer-placeholder') {
        return document.querySelector('footer'); 
      }
    } else {
      console.warn(`Placeholder com ID '${placeholderId}' não encontrado para ${filePath}.`);
    }
  } catch (error) {
    console.error(`Falha ao buscar e injetar ${filePath}:`, error);
    const placeholder = document.getElementById(placeholderId); 
    if (placeholder) {
      placeholder.innerHTML = `<p style="color:red; text-align:center;">Falha ao carregar conteúdo (${filePath}).</p>`;
    }
  }
  return null;
}

/**
 * Inicializa os parciais da página (header e footer) e os scripts associados.
 */
async function initializePagePartials() {
  console.log("loadPartials.js: Iniciando carregamento de parciais...");
  const headerInjectedElement = await fetchAndInjectHTML('./_header.html', 'header-placeholder');
  const footerInjectedElement = await fetchAndInjectHTML('./_footer.html', 'footer-placeholder');

  if (headerInjectedElement) {
    console.log("loadPartials.js: Header carregado. Chamando initializeHeaderScripts...");
    if (typeof window.initializeHeaderScripts === 'function') {
      window.initializeHeaderScripts(headerInjectedElement); 
    } else {
      console.error("loadPartials.js: Função window.initializeHeaderScripts NÃO definida em index.js!");
    }
  } else {
    console.error("loadPartials.js: Header não pôde ser carregado ou injetado.");
  }

  if (footerInjectedElement) {
    console.log("loadPartials.js: Footer carregado.");
    const yearSpanInFooter = footerInjectedElement.querySelector('#current-year'); 
    if (yearSpanInFooter) {
      yearSpanInFooter.textContent = new Date().getFullYear();
    }
  } else {
    console.error("loadPartials.js: Footer não pôde ser carregado ou injetado.");
  }

  if (typeof window.initializePageSpecificScripts === 'function') {
    console.log("loadPartials.js: Chamando initializePageSpecificScripts...");
    window.initializePageSpecificScripts();
  } else {
    console.log("loadPartials.js: initializePageSpecificScripts não definida para esta página.");
  }
  console.log("loadPartials.js: Carregamento de parciais concluído.");
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePagePartials);
} else {
  initializePagePartials();
}
