// frontend/scripts/index.js (SEU ARQUIVO ATUAL, MODIFICADO)

console.log("index.js: Script carregado.");

// Variáveis globais do seu script original
// Elas serão inicializadas dentro de initializePageScripts
let RESPONSIVE_WIDTH = 1024; // Mantido global se usado em outros lugares, ou mover para dentro
let headerWhiteBg; // Será inicializado em initializePageScripts
let isHeaderCollapsed; // Será inicializado em initializePageScripts
let collapseBtn;
let collapseHeaderItems;
let navToggle; // Para o dropdown "Soluções"
let navDropdown; // Para o dropdown "Soluções"

// As funções do seu script original
function onHeaderClickOutside(e) {
    if (collapseHeaderItems && !collapseHeaderItems.contains(e.target) && collapseBtn && !collapseBtn.contains(e.target)) {
        if (!isHeaderCollapsed) { 
             toggleHeader();
        }
    }
}

function toggleHeader() {
    if (!collapseHeaderItems || !collapseBtn) {
        console.warn("index.js (toggleHeader): Elementos do header não encontrados.");
        return;
    }

    // A lógica de height e classes precisa ser cuidadosamente revisada para o menu mobile
    // Esta é a sua lógica original, pode precisar de ajustes com o novo CSS/estrutura
    if (isHeaderCollapsed) { // Se está colapsado e vai abrir
        collapseHeaderItems.classList.remove("max-lg:tw-hidden"); // Garante que não está escondido por esta classe
        collapseHeaderItems.classList.add("max-lg:!tw-opacity-100", "max-lg:tw-min-h-[90vh]"); // Use classes do Tailwind para visibilidade e altura
        // collapseHeaderItems.style.height = "90vh"; // Evite style direto se possível
        collapseBtn.classList.remove("bi-list");
        collapseBtn.classList.add("bi-x", "max-lg:tw-fixed"); // 'max-lg:tw-fixed' pode ser problemático, verifique o comportamento
    } else { // Se está aberto e vai fechar
        collapseHeaderItems.classList.add("max-lg:tw-hidden"); // Adiciona a classe para esconder
        collapseHeaderItems.classList.remove("max-lg:!tw-opacity-100", "max-lg:tw-min-h-[90vh]");
        // collapseHeaderItems.style.height = "0px";
        collapseBtn.classList.remove("bi-x", "max-lg:tw-fixed");
        collapseBtn.classList.add("bi-list");
    }
    isHeaderCollapsed = !isHeaderCollapsed; // Alterna o estado
    console.log("index.js: toggleHeader executado, isHeaderCollapsed:", isHeaderCollapsed);
}


// Função para controlar o dropdown "Soluções"
function toggleNavDropdown() {
    if (!navToggle || !navDropdown) {
        console.warn("index.js (toggleNavDropdown): Elementos do dropdown Soluções não encontrados.");
        return;
    }
    const isOpen = navDropdown.getAttribute('data-open') === 'true';
    if (isOpen) {
        navDropdown.setAttribute('data-open', 'false');
        navDropdown.classList.add('tw-scale-0', 'tw-opacity-0', 'max-lg:tw-h-0', 'max-lg:tw-w-0');
        navDropdown.classList.remove('max-lg:!tw-h-auto', 'max-lg:!tw-w-auto'); // Ajuste para mobile
        navToggle.setAttribute('aria-expanded', 'false');
    } else {
        navDropdown.setAttribute('data-open', 'true');
        navDropdown.classList.remove('tw-scale-0', 'tw-opacity-0', 'max-lg:tw-h-0', 'max-lg:tw-w-0');
        navDropdown.classList.add('max-lg:!tw-h-auto', 'max-lg:!tw-w-auto'); // Ajuste para mobile
        navToggle.setAttribute('aria-expanded', 'true');
    }
    console.log("index.js: toggleNavDropdown executado, data-open:", navDropdown.getAttribute('data-open'));
}

// Lógica de Tema (PRECISA SER ADICIONADA SE QUISER MANTER - Exemplo abaixo)
function applyInitialTheme(headerElement) {
  const htmlElement = document.documentElement;
  const themeToggleIcon = headerElement.querySelector('#toggle-mode-icon'); // ID do ícone dentro do botão #theme-toggle
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

function toggleMode(headerElement) { // Passar headerElement para encontrar o ícone
  const htmlElement = document.documentElement;
  const themeToggleIcon = headerElement.querySelector('#toggle-mode-icon');
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


// Função que será chamada por loadPartials.js
// Esta função é o PONTO CENTRAL para inicializar tudo que depende do header
function initializePageScripts(headerElement) {
    console.log("index.js: initializePageScripts chamada com headerElement:", headerElement ? "encontrado" : "NÃO encontrado");
    if (!headerElement) {
        console.error("index.js: Elemento do header não foi fornecido. Funcionalidades do header não serão iniciadas.");
        return;
    }

    // Re-seleciona os elementos DENTRO do headerElement injetado ou usa IDs globais se forem únicos
    // Os IDs de #collapse-btn e #collapsed-header-items são do _header.html
    collapseBtn = headerElement.querySelector("#collapse-btn"); // Botão hamburguer no _header.html
    collapseHeaderItems = headerElement.querySelector("#collapsed-header-items"); // Conteúdo colapsável no _header.html

    // IDs para o dropdown "Soluções" (nav-dropdown-toggle-0, nav-dropdown-list-0)
    navToggle = headerElement.querySelector("#nav-dropdown-toggle-0");
    navDropdown = headerElement.querySelector("#nav-dropdown-list-0");

    // Inicializa o estado do menu mobile
    isHeaderCollapsed = window.innerWidth < RESPONSIVE_WIDTH;
    if (collapseHeaderItems) { // Garante que existe antes de tentar modificar
        if(isHeaderCollapsed){ // Se mobile, começa escondido
            collapseHeaderItems.classList.add("max-lg:tw-hidden");
        } else { // Se desktop, começa visível
            collapseHeaderItems.classList.remove("max-lg:tw-hidden");
        }
    }


    // Anexar event listeners que estavam no seu index.js original
    if (collapseBtn) {
        collapseBtn.addEventListener('click', toggleHeader);
        console.log("index.js: Listener para toggleHeader anexado ao #collapse-btn.");
    } else {
        console.warn("index.js: #collapse-btn (botão hamburguer) não encontrado no header injetado.");
    }

    if (navToggle && navDropdown) {
        navToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleNavDropdown();
        });
        console.log("index.js: Listener para toggleNavDropdown anexado ao #nav-dropdown-toggle-0.");

        // Fechar dropdown Soluções ao clicar fora
        document.addEventListener('click', (event) => {
            if (navDropdown && navDropdown.getAttribute('data-open') === 'true' && 
                !navToggle.contains(event.target) && !navDropdown.contains(event.target)) {
                toggleNavDropdown(); // Fecha o dropdown
            }
        });
    } else {
        console.warn("index.js: Elementos do dropdown Soluções (#nav-dropdown-toggle-0 ou #nav-dropdown-list-0) não encontrados.");
    }
    
    // Lógica de Tema (se você adicionou as funções applyInitialTheme e toggleMode acima)
    const themeToggleButton = headerElement.querySelector('#theme-toggle'); // ID do botão de tema no _header.html
    if (themeToggleButton) {
        applyInitialTheme(headerElement); // Aplica o tema inicial
        themeToggleButton.addEventListener('click', () => toggleMode(headerElement));
        console.log("index.js: Listener para toggleMode anexado ao #theme-toggle.");
    } else {
        console.warn("index.js: Botão de tema (#theme-toggle) não encontrado.");
    }


    // Listener para fechar header mobile se clicar fora dele (sua lógica original)
    // Removido document.addEventListener('click', onHeaderClickOutside); daqui
    // Porque onHeaderClickOutside chama toggleHeader(), que agora depende de `isHeaderCollapsed`
    // e outros elementos. É melhor controlar isso de forma mais contida ou garantir que `isHeaderCollapsed`
    // seja atualizado corretamente. O clique fora do dropdown já foi tratado.

    // Scroll reveal e outras inicializações do seu index.js original que não dependem do header
    // podem permanecer fora desta função ou serem chamadas separadamente.
    // Por exemplo, a lógica do FAQ:
    initializeFaqAccordions(); // Se esta função existir e for global

    console.log("index.js: initializePageScripts concluída.");
}
// Expor a função para loadPartials.js
window.initializePageScripts = initializePageScripts;


// Lógica do FAQ Accordion (do seu index.js original, movida para ser uma função)
function initializeFaqAccordions() {
    const accordions = document.querySelectorAll('.faq-accordion');
    if (accordions.length > 0) {
        console.log("index.js: Inicializando FAQ accordions.");
        accordions.forEach(accordion => {
            accordion.addEventListener('click', function() {
                const content = this.nextElementSibling;
                const icon = this.querySelector('i.bi');

                // Fechar outros accordions abertos (opcional)
                // accordions.forEach(otherAccordion => {
                //     if (otherAccordion !== this) {
                //         const otherContent = otherAccordion.nextElementSibling;
                //         const otherIcon = otherAccordion.querySelector('i.bi');
                //         otherContent.style.maxHeight = '0px';
                //         otherContent.style.paddingTop = '0px';
                //         otherContent.style.paddingBottom = '0px';
                //         if (otherIcon) otherIcon.classList.replace('bi-dash', 'bi-plus');
                //     }
                // });

                if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                    content.style.maxHeight = '0px';
                    content.style.paddingTop = '0px';
                    content.style.paddingBottom = '0px';
                    if (icon) icon.classList.replace('bi-dash', 'bi-plus');
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.style.paddingTop = '10px'; // Ajuste o padding conforme necessário
                    content.style.paddingBottom = '10px';
                    if (icon) icon.classList.replace('bi-plus', 'bi-dash');
                }
            });
        });
    } else {
        console.log("index.js: Nenhum FAQ accordion encontrado para inicializar.");
    }
}

// Lógica de inicialização geral da página que NÃO DEPENDE do header/footer
// (ex: scroll reveal, animações gerais da página)
// Esta parte do seu index.js original pode ser chamada no DOMContentLoaded
document.addEventListener("DOMContentLoaded", function() {
    console.log("index.js: DOMContentLoaded - Inicializando scripts gerais da página.");

    // Se a lógica do FAQ não depende do header, pode ser chamada aqui também.
    // No entanto, se o FAQ estiver dentro de um parcial, é melhor que loadPartials.js a chame
    // ou que initializePageScripts a chame.
    // Por segurança, se FAQ pode estar em qualquer página, mesmo sem parciais, chamamos aqui.
    if (typeof initializeFaqAccordions === 'function' && !document.querySelector('#header-placeholder')) {
        // Só chama aqui se NÃO estivermos usando o sistema de parciais (header-placeholder não existe)
        initializeFaqAccordions();
    }

    // Adicione aqui outras inicializações do seu index.js original que são globais
    // e não dependem especificamente do header/footer terem sido carregados.
    // Ex: ScrollReveal, Typed.js, etc.
    // (Lembre-se de incluir as bibliotecas GSAP, ScrollTrigger, Typed.js no seu HTML se for usá-las)
});
