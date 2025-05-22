// Em: frontend/scripts/loadPartials.js

async function fetchAndInjectHTML(filePath, placeholderId) {
  try {
    const response = await fetch(filePath); 
    if (!response.ok) {
      console.error(`loadPartials.js: Erro ao carregar ${filePath}: ${response.status} ${response.statusText}`);
      const placeholder = document.getElementById(placeholderId);
      if (placeholder) {
        placeholder.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar conteúdo (${filePath}).</p>`;
      }
      return null;
    }
    const htmlText = await response.text();
    const placeholderElement = document.getElementById(placeholderId);

    if (placeholderElement) {
      placeholderElement.outerHTML = htmlText; 

      if (placeholderId === 'header-placeholder') {
        return document.getElementById('mainHeader'); // Assumindo que _header.html tem <header id="mainHeader">
      }
      if (placeholderId === 'footer-placeholder') {
        return document.querySelector('footer'); // Assumindo que _footer.html tem <footer ...> como raiz
      }
    } else {
      console.warn(`loadPartials.js: Placeholder com ID '${placeholderId}' não encontrado para ${filePath}.`);
    }
  } catch (error) {
    console.error(`loadPartials.js: Falha ao buscar e injetar ${filePath}:`, error);
    const placeholder = document.getElementById(placeholderId); 
    if (placeholder) {
      placeholder.innerHTML = `<p style="color:red; text-align:center;">Falha ao carregar conteúdo (${filePath}).</p>`;
    }
  }
  return null;
}

async function initializePagePartials() {
  console.log("loadPartials.js: Iniciando carregamento de parciais...");
  const headerInjectedElement = await fetchAndInjectHTML('./_header.html', 'header-placeholder');
  const footerInjectedElement = await fetchAndInjectHTML('./_footer.html', 'footer-placeholder');

  if (headerInjectedElement) {
    console.log("loadPartials.js: Header carregado. Chamando initializePageScripts (que agora vem do seu index.js)...");
    if (typeof window.initializePageScripts === 'function') { // Nome da função que seu index.js deve expor
      window.initializePageScripts(headerInjectedElement); 
    } else {
      console.error("loadPartials.js: ERRO CRÍTICO - Função window.initializePageScripts NÃO definida em index.js!");
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
  console.log("loadPartials.js: Carregamento de parciais concluído.");
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePagePartials);
} else {
  initializePagePartials();
}
