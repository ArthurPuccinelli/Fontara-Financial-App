// Em: frontend/scripts/loadPartials.js
async function fetchAndInjectHTML(filePath, placeholderId) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      console.error(`loadPartials.js: Erro ao carregar ${filePath}: ${response.status} ${response.statusText}`);
      const placeholder = document.getElementById(placeholderId);
      if (placeholder) placeholder.innerHTML = `<p style="color:red; text-align:center;">Erro (${filePath})</p>`;
      return null;
    }
    const htmlText = await response.text();
    const placeholderElement = document.getElementById(placeholderId);
    if (placeholderElement) {
      placeholderElement.outerHTML = htmlText;
      if (placeholderId === 'header-placeholder') return document.getElementById('mainHeader');
      if (placeholderId === 'footer-placeholder') return document.querySelector('footer');
    }
  } catch (error) {
    console.error(`loadPartials.js: Falha ao injetar ${filePath}:`, error);
    const placeholder = document.getElementById(placeholderId);
    if (placeholder) placeholder.innerHTML = `<p style="color:red; text-align:center;">Falha (${filePath})</p>`;
  }
  return null;
}

async function initializePagePartials() {
  console.log("loadPartials.js: Carregando parciais...");
  const headerInjectedElement = await fetchAndInjectHTML('./_header.html', 'header-placeholder');
  const footerInjectedElement = await fetchAndInjectHTML('./_footer.html', 'footer-placeholder');

  if (headerInjectedElement) {
    console.log("loadPartials.js: Header carregado. Chamando initializePageScripts...");
    if (typeof window.initializePageScripts === 'function') {
      window.initializePageScripts(headerInjectedElement);
    } else {
      console.error("loadPartials.js: ERRO: window.initializePageScripts NÃO definida em index.js!");
    }
  } else {
    console.error("loadPartials.js: Header não carregado.");
  }

  if (footerInjectedElement) {
    const yearSpan = footerInjectedElement.querySelector('#current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  } else {
    console.error("loadPartials.js: Footer não carregado.");
  }

  if (typeof window.initializePageSpecificScripts === 'function') {
    console.log("loadPartials.js: Chamando initializePageSpecificScripts...");
    window.initializePageSpecificScripts();
  }
  console.log("loadPartials.js: Parciais concluídos.");
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePagePartials);
} else {
  initializePagePartials();
}
