// frontend/scripts/index.js (SEU ARQUIVO ATUAL, MODIFICADO)

console.log("index.js: Script carregado.");

// Variáveis que eram globais, agora serão definidas dentro de initializePageScripts
// ou podem permanecer globais se suas funções as acessarem diretamente e forem chamadas após a atribuição.
// Para segurança, vamos atribuí-las dentro da função de inicialização.
let RESPONSIVE_WIDTH = 1024;
let isHeaderCollapsed;
let collapseBtn;
let collapseHeaderItems;
let navToggle;
let navDropdown;
let themeToggleButton; // Para o botão de tema
let themeToggleIcon;   // Para o ícone do tema

// Suas funções originais: toggleHeader, onHeaderClickOutside, toggleNavDropdown
function onHeaderClickOutside(e) {
    // Garante que collapseHeaderItems exista antes de chamar .contains()
    // e que o menu esteja aberto (isHeaderCollapsed === false)
    if (collapseHeaderItems && !collapseHeaderItems.contains(e.target) && 
        collapseBtn && !collapseBtn.contains(e.target) && 
        !isHeaderCollapsed) {
        toggleHeader();
    }
}

function toggleHeader() {
    if (!collapseHeaderItems || !collapseBtn) {
        console.warn("index.js (toggleHeader): Elementos do header (collapseHeaderItems ou collapseBtn) não encontrados.");
        return;
    }

    // Sua lógica original para abrir/fechar o menu mobile
    // Recomendo usar classes para controlar a visibilidade e animações em vez de style.height direto
    if (isHeaderCollapsed) { // Se está colapsado (true), então vamos abrir
        collapseHeaderItems.classList.remove("max-lg:tw-hidden"); // Remove a classe que esconde
        // Adicione classes para animação de abertura se desejar
        collapseHeaderItems.classList.add("max-lg:!tw-opacity-100"); // Exemplo
        collapseBtn.classList.remove("bi-list");
        collapseBtn.classList.add("bi-x"); // , "max-lg:tw-fixed" // Removido max-lg:tw-fixed daqui para ver se melhora
    } else { // Se está aberto (false), então vamos fechar
        collapseHeaderItems.classList.add("max-lg:tw-hidden"); // Adiciona a classe para esconder
        collapseHeaderItems.classList.remove("max-lg:!tw-opacity-100");
        collapseBtn.classList.remove("bi-x"); // , "max-lg:tw-fixed"
        collapseBtn.classList.add("bi-list");
    }
    isHeaderCollapsed = !isHeaderCollapsed; // Alterna o estado
    console.log("index.js: toggleHeader executado, novo estado isHeaderCollapsed:", isHeaderCollapsed);
}


function toggleNavDropdown() {
    if (!navToggle || !navDropdown) {
        console.warn("index.js (toggleNavDropdown): Elementos do dropdown Soluções não encontrados.");
        return;
    }
    const isOpen = navDropdown.getAttribute('data-open') === 'true';
    if (isOpen) {
        navDropdown.setAttribute('data-open', 'false');
        navDropdown.classList.add('tw-scale-0', 'tw-opacity-0', 'max-lg:tw-h-0', 'max-lg:tw-w-0');
        navDropdown.classList.remove('max-lg:!tw-h-auto', 'max-lg:!tw-w-auto');
        navToggle.setAttribute('aria-expanded', 'false');
    } else {
        navDropdown.setAttribute('data-open', 'true');
        navDropdown.classList.remove('tw-scale-0', 'tw-opacity-0', 'max-lg:tw-h-0', 'max-lg:tw-w-0');
        navDropdown.classList.add('max-lg:!tw-h-auto', 'max-lg:!tw-w-auto');
        navToggle.setAttribute('aria-expanded', 'true');
    }
    console.log("index.js: toggleNavDropdown executado, data-open:", navDropdown.getAttribute('data-open'));
}

// --- Lógica de Tema (Adicionada para funcionar com o header) ---
function applyInitialTheme() {
  console.log("index.js: Aplicando tema inicial...");
  const htmlElement = document.documentElement;
  // themeToggleIcon é definido em initializePageScripts
  const storedTheme = localStorage.getItem('theme');

  if (storedTheme === 'dark') {
    htmlElement.classList.add('tw-dark');
    if (themeToggleIcon) {
      themeToggleIcon.classList.remove('bi-sun');
      themeToggleIcon.classList.add('bi-moon');
    }
  } else { 
    htmlElement.classList.remove('tw-dark');
    if (themeToggleIcon) {
      themeToggleIcon.classList.remove('bi-moon');
      themeToggleIcon.classList.add('bi-sun');
    }
  }
  console.log("index.js: Tema inicial aplicado.");
}

function toggleMode() { 
  console.log("index.js: Alternando tema...");
  const htmlElement = document.documentElement;
  // themeToggleIcon é definido em initializePageScripts
  htmlElement.classList.toggle('tw-dark');

  if (htmlElement.classList.contains('tw-dark')) {
    localStorage.setItem('theme', 'dark');
    if (themeToggleIcon) {
      themeToggleIcon.classList.remove('bi-sun');
      themeToggleIcon.classList.add('bi-moon');
    }
  } else {
    localStorage.setItem('theme', 'light');
    if (themeToggleIcon) {
      themeToggleIcon.classList.remove('bi-moon');
      themeToggleIcon.classList.add('bi-sun');
    }
  }
  console.log("index.js: Modo de tema alternado.");
}


// --- Função de Inicialização Principal (Chamada por loadPartials.js) ---
function initializePageScripts(headerElement) {
    console.log("index.js: initializePageScripts chamada com headerElement:", headerElement ? "encontrado" : "NÃO encontrado");
    if (!headerElement) {
        console.error("index.js: Elemento do header não fornecido. Funcionalidades do header não serão iniciadas.");
        return;
    }

    // ATRIBUIÇÃO DAS VARIÁVEIS GLOBAIS (ou do escopo do módulo)
    // Seleciona os elementos DENTRO do headerElement injetado
    collapseBtn = headerElement.querySelector("#collapse-btn"); 
    collapseHeaderItems = headerElement.querySelector("#collapsed-header-items");
    navToggle = headerElement.querySelector("#nav-dropdown-toggle-0");
    navDropdown = headerElement.querySelector("#nav-dropdown-list-0");
    themeToggleButton = headerElement.querySelector('#theme-toggle'); // Botão de tema no _header.html
    themeToggleIcon = headerElement.querySelector('#toggle-mode-icon'); // Ícone dentro do botão de tema

    // Inicializa o estado do menu mobile
    isHeaderCollapsed = true; // Começa colapsado em mobile por padrão
    if (collapseHeaderItems) {
        if (window.innerWidth >= RESPONSIVE_WIDTH) { // Se desktop
            isHeaderCollapsed = false; // Começa aberto em desktop
            collapseHeaderItems.classList.remove("max-lg:tw-hidden");
        } else { // Se mobile
            collapseHeaderItems.classList.add("max-lg:tw-hidden");
        }
    } else {
        console.warn("index.js: #collapsed-header-items não encontrado para estado inicial.");
    }
    if (collapseBtn && isHeaderCollapsed) { // Ajusta o ícone do botão hamburguer
        collapseBtn.classList.remove("bi-x");
        collapseBtn.classList.add("bi-list");
    }


    // Anexar event listeners do seu index.js original
    if (collapseBtn) {
        collapseBtn.addEventListener('click', toggleHeader);
        console.log("index.js: Listener para toggleHeader anexado ao #collapse-btn.");
    } else {
        console.warn("index.js: #collapse-btn (botão hamburguer) não encontrado no header injetado.");
    }

    if (navToggle && navDropdown) {
        navToggle.addEventListener('click', (event) => {
            event.stopPropagation(); // Importante para não fechar imediatamente
            toggleNavDropdown();
        });
        console.log("index.js: Listener para toggleNavDropdown anexado ao #nav-dropdown-toggle-0.");

        // Fechar dropdown Soluções ao clicar fora (lógica similar à anterior)
        document.addEventListener('click', (event) => {
            if (navDropdown && navDropdown.getAttribute('data-open') === 'true' && 
                !navToggle.contains(event.target) && !navDropdown.contains(event.target)) {
                toggleNavDropdown(); 
            }
        });
         // Fechar o dropdown com a tecla Escape
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
                toggleNavDropdown();
            }
        });
    } else {
        console.warn("index.js: Elementos do dropdown Soluções (#nav-dropdown-toggle-0 ou #nav-dropdown-list-0) não encontrados.");
    }
    
    // Lógica de Tema
    if (themeToggleButton && themeToggleIcon) { // Verifica ambos
        applyInitialTheme(); 
        themeToggleButton.addEventListener('click', toggleMode);
        console.log("index.js: Listener para toggleMode anexado ao #theme-toggle.");
    } else {
        if(!themeToggleButton) console.warn("index.js: Botão de tema (#theme-toggle) não encontrado.");
        if(!themeToggleIcon) console.warn("index.js: Ícone de tema (#toggle-mode-icon) não encontrado.");
    }
    
    // Anexar listener para fechar header mobile ao clicar fora
    // document.addEventListener('click', onHeaderClickOutside); // Removido temporariamente para simplificar

    // Chamada para inicializar FAQ (do seu index.js original)
    initializeFaqAccordions(); 

    console.log("index.js: initializePageScripts concluída.");
}
// Expor a função para loadPartials.js
window.initializePageScripts = initializePageScripts;


// Lógica do FAQ Accordion (do seu index.js original)
function initializeFaqAccordions() {
    // Seu código original do FAQ aqui...
    const accordions = document.querySelectorAll('.faq-accordion');
    if (accordions.length > 0) {
        console.log("index.js: Inicializando FAQ accordions.");
        accordions.forEach(accordion => {
            // Verifica se já tem listener para não duplicar
            if (accordion.dataset.faqInitialized) return;
            accordion.dataset.faqInitialized = 'true';

            accordion.addEventListener('click', function() {
                const content = this.nextElementSibling;
                const icon = this.querySelector('i.bi');

                if (!content) return;

                if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                    content.style.maxHeight = '0px';
                    // Adiciona um pequeno delay para a transição de padding ocorrer após o maxHeight
                    setTimeout(() => {
                        content.style.paddingTop = '0px';
                        content.style.paddingBottom = '0px';
                        content.style.overflow = 'hidden';
                    }, 300); // Tempo da transição do maxHeight
                    if (icon) icon.classList.replace('bi-dash', 'bi-plus');
                } else {
                    content.style.paddingTop = '10px'; 
                    content.style.paddingBottom = '10px';
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.style.overflow = 'visible'; // Permite ver o conteúdo durante a transição
                    if (icon) icon.classList.replace('bi-plus', 'bi-dash');
                }
            });
        });
    } else {
        console.log("index.js: Nenhum FAQ accordion encontrado para inicializar.");
    }
}

// Lógica de inicialização geral da página que NÃO DEPENDE do header/footer
// ou que precisa rodar sempre, como o FAQ se ele não estiver em parciais.
document.addEventListener("DOMContentLoaded", function() {
    console.log("index.js: DOMContentLoaded evento disparado.");
    
    // A inicialização do FAQ pode ser chamada aqui se o FAQ estiver sempre no corpo principal da página
    // e não dentro do header/footer carregados dinamicamente.
    // Se `loadPartials.js` já chama `initializePageScripts` que por sua vez chama `initializeFaqAccordions`,
    // esta chamada aqui pode ser redundante ou causar dupla inicialização se o FAQ estiver fora dos parciais.
    // Vamos deixar `initializePageScripts` cuidar disso por enquanto.
    // if (typeof initializeFaqAccordions === 'function') {
    //     initializeFaqAccordions();
    // }

    // Suas outras inicializações globais como GSAP, ScrollTrigger, Typed.js devem vir aqui,
    // após verificar se as bibliotecas estão carregadas.
    // Exemplo:
    // if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    //   gsap.registerPlugin(ScrollTrigger);
    //   // Sua lógica GSAP aqui
    // }
    // if (typeof Typed !== 'undefined') {
    //   // Sua lógica Typed.js aqui
    // }
});
