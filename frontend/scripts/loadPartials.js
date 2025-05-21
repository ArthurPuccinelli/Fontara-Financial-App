// scripts/loadPartials.js
async function fetchAndInjectHTML(filePath, placeholderId) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      console.error(`Erro ao carregar ${filePath}: ${response.status} ${response.statusText}`);
      const placeholder = document.getElementById(placeholderId);
      if(placeholder) placeholder.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar conteúdo (${filePath}).</p>`;
      return null;
    }
    const text = await response.text();
    const placeholder = document.getElementById(placeholderId);
    if (placeholder) {
      placeholder.outerHTML = text; // Substitui o placeholder pelo conteúdo do header/footer
      // Tenta encontrar o elemento injetado pelo seu ID original se precisar retornar uma referência
      if (placeholderId === 'header-placeholder') return document.getElementById('mainHeader');
      if (placeholderId === 'footer-placeholder') return document.querySelector('footer'); // Assume que há apenas um footer
    }
  } catch (error) {
    console.error(`Falha ao buscar e injetar ${filePath}:`, error);
    const placeholder = document.getElementById(placeholderId);
    if(placeholder) placeholder.innerHTML = `<p style="color:red; text-align:center;">Falha ao carregar conteúdo (${filePath}).</p>`;
  }
  return null;
}

async function initializePagePartials() {
  const headerElement = await fetchAndInjectHTML('./_header.html', 'header-placeholder');
  await fetchAndInjectHTML('./_footer.html', 'footer-placeholder');

  // Após o header ser injetado, tentamos (re)inicializar funcionalidades que dependem dele
  if (headerElement) {
    if (typeof window.initializeHeaderScripts === 'function') {
      window.initializeHeaderScripts();
    } else if (typeof initializeHeaderScripts === 'function') { // Se não estiver no window
        initializeHeaderScripts();
    }
     // O ano no footer também precisa ser atualizado se o footer é carregado dinamicamente
     const yearSpanInFooter = document.querySelector('#footer-placeholder footer #current-year') || document.querySelector('footer #current-year');
     if (yearSpanInFooter) {
        yearSpanInFooter.textContent = new Date().getFullYear();
     }
  }
   // Inicializa outros componentes globais que não dependem do header/footer, se necessário
   if (typeof window.initializePageSpecificScripts === 'function') {
    window.initializePageSpecificScripts(); // Para scripts da página atual
  }
}

// Garante que os parciais sejam carregados e os scripts reinicializados
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePagePartials);
} else {
    initializePagePartials(); // Já carregado
}
