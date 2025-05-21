// scripts/index.js

// --- Variáveis Globais e Constantes (se necessário) ---
const RESPONSIVE_WIDTH = 1024;
let headerWhiteBg = false; // Parece não estar sendo usada, mas mantenho por enquanto
let isHeaderCollapsed = window.innerWidth < RESPONSIVE_WIDTH;

// As funções toggleMode e toggleHeader são chamadas por onclick no HTML do header,
// então elas precisam estar no escopo global (o que já acontece por padrão em scripts de navegador).

function toggleMode() {
  const toggleModeIcon = document.getElementById("toggle-mode-icon");
  document.documentElement.classList.toggle("tw-dark");
  if (document.documentElement.classList.contains("tw-dark")) {
    localStorage.setItem("color-mode", "dark");
    if (toggleModeIcon) {
      toggleModeIcon.classList.remove("bi-sun");
      toggleModeIcon.classList.add("bi-moon-stars-fill");
    }
  } else {
    localStorage.setItem("color-mode", "light");
    if (toggleModeIcon) {
      toggleModeIcon.classList.remove("bi-moon-stars-fill");
      toggleModeIcon.classList.add("bi-sun");
    }
  }
}

function toggleHeader() {
  const collapseHeaderItems = document.getElementById("collapsed-header-items");
  const collapseBtn = document.getElementById("collapse-btn");

  if (!collapseHeaderItems || !collapseBtn) {
    console.warn("Elementos do header (collapseHeaderItems ou collapseBtn) não encontrados para toggleHeader.");
    return;
  }

  if (isHeaderCollapsed) {
    collapseHeaderItems.classList.add("max-lg:!tw-opacity-100", "tw-min-h-[90vh]");
    collapseHeaderItems.style.height = "90vh";
    collapseBtn.classList.remove("bi-list");
    collapseBtn.classList.add("bi-x", "max-lg:tw-fixed");
    document.body.classList.add("modal-open");
    setTimeout(() => window.addEventListener("click", onHeaderClickOutside), 1);
    isHeaderCollapsed = false;
  } else {
    collapseHeaderItems.classList.remove("max-lg:!tw-opacity-100", "tw-min-h-[90vh]");
    collapseHeaderItems.style.height = "0vh";
    collapseBtn.classList.remove("bi-x", "max-lg:tw-fixed");
    collapseBtn.classList.add("bi-list");
    document.body.classList.remove("modal-open");
    window.removeEventListener("click", onHeaderClickOutside);
    isHeaderCollapsed = true;
  }
}

function onHeaderClickOutside(e) {
  const collapseHeaderItems = document.getElementById("collapsed-header-items");
  const collapseBtn = document.getElementById("collapse-btn");
  // Garante que os elementos existam e que o menu esteja efetivamente aberto (não colapsado)
  if (collapseHeaderItems && collapseBtn && !isHeaderCollapsed) {
      if (!collapseHeaderItems.contains(e.target) && !collapseBtn.contains(e.target)) {
          toggleHeader(); // Fecha o menu
      }
  }
}


// --- Funções de Inicialização para Componentes do Header ---

function initializeHeaderDropdowns() {
  const navToggle = document.querySelector("#nav-dropdown-toggle-0");
  const navDropdown = document.querySelector("#nav-dropdown-list-0");
  // console.log("Tentando inicializar dropdowns. Toggle:", navToggle, "Dropdown:", navDropdown);

  if (navToggle && navDropdown) {
    // Remove listeners antigos para evitar duplicação se chamada múltiplas vezes
    navToggle.removeEventListener("click", toggleNavDropdown);
    navToggle.removeEventListener("mouseenter", openNavDropdownDesktop);
    navToggle.removeEventListener("mouseleave", navMouseLeaveDesktop);
    navDropdown.removeEventListener("mouseleave", navMouseLeaveDesktop);
    document.removeEventListener('click', handleClickOutsideNavDropdown);


    navToggle.addEventListener("click", toggleNavDropdown);
    if (window.innerWidth > RESPONSIVE_WIDTH) {
      navToggle.addEventListener("mouseenter", openNavDropdownDesktop);
      navToggle.addEventListener("mouseleave", navMouseLeaveDesktop);
      navDropdown.addEventListener("mouseleave", navMouseLeaveDesktop);
    }
    // Adiciona um listener para fechar o dropdown se clicar fora dele (no desktop)
    document.addEventListener('click', handleClickOutsideNavDropdown);
  } else {
    console.warn("Elementos do dropdown de navegação (navToggle ou navDropdown) não encontrados.");
  }
}

function setupInitialThemeState() {
  const toggleModeIcon = document.getElementById("toggle-mode-icon");
  const storedTheme = localStorage.getItem('color-mode');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let applyDarkTheme = false;

  if (window.location.pathname.includes('/agradecimento/')) {
    document.documentElement.classList.remove('tw-dark');
  } else {
    if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
      applyDarkTheme = true;
    }
  }

  if (applyDarkTheme) {
    document.documentElement.classList.add('tw-dark');
  } else {
    document.documentElement.classList.remove('tw-dark');
  }
  
  if (toggleModeIcon) {
    if (document.documentElement.classList.contains("tw-dark")) {
        toggleModeIcon.classList.remove("bi-sun");
        toggleModeIcon.classList.add("bi-moon-stars-fill");
    } else {
        toggleModeIcon.classList.add("bi-sun");
        toggleModeIcon.classList.remove("bi-moon-stars-fill");
    }
  }
}


/**
 * Função global para ser chamada por loadPartials.js APÓS o header ser injetado.
 * Ela agrupa todas as inicializações que dependem de elementos do header.
 */
window.initializeHeaderScripts = function() {
  console.log("Global: initializeHeaderScripts chamada.");
  
  // Recaptura os elementos do header pois eles foram injetados agora
  const currentCollapseBtn = document.getElementById("collapse-btn");
  const currentCollapseHeaderItems = document.getElementById("collapsed-header-items");
  isHeaderCollapsed = window.innerWidth < RESPONSIVE_WIDTH; // Recalcula estado inicial

  // Se os onclicks no HTML chamam toggleHeader() e toggleMode(), elas já são globais.
  // Precisamos garantir que os event listeners para o dropdown e o estado do tema sejam reconfigurados.
  initializeHeaderDropdowns();
  setupInitialThemeState(); // Configura o estado inicial do tema e do ícone

  // Adiciona o listener de resize para a lógica responsiva do header
  // Remova o listener antigo primeiro para evitar duplicação se esta função for chamada múltiplas vezes
  window.removeEventListener("resize", headerResponsiveLogic);
  window.addEventListener("resize", headerResponsiveLogic);
  headerResponsiveLogic(); // Chama uma vez para ajustar ao carregar
};

// Lógica responsiva específica do header
function headerResponsiveLogic() {
  const navToggle = document.querySelector("#nav-dropdown-toggle-0");
  const navDropdown = document.querySelector("#nav-dropdown-list-0");
  const currentCollapseHeaderItems = document.getElementById("collapsed-header-items"); // Re-seleciona

  if (!currentCollapseHeaderItems || !navToggle || !navDropdown) {
    return; 
  }

  if (window.innerWidth > RESPONSIVE_WIDTH) {
    // Desktop
    if (!isHeaderCollapsed && currentCollapseHeaderItems.style.height === "90vh") { // Se o menu mobile estava aberto
        toggleHeader(); // Fecha o menu mobile
    }
    currentCollapseHeaderItems.style.height = ""; // Reseta altura para desktop
    navToggle.removeEventListener("click", toggleNavDropdown); // Em desktop, click não deve abrir/fechar o dropdown de soluções
    navToggle.addEventListener("mouseenter", openNavDropdownDesktop);
    navToggle.addEventListener("mouseleave", navMouseLeaveDesktop);
    navDropdown.addEventListener("mouseleave", navMouseLeaveDesktop);
  } else {
    // Mobile
    navToggle.removeEventListener("mouseenter", openNavDropdownDesktop);
    navToggle.removeEventListener("mouseleave", navMouseLeaveDesktop);
    navDropdown.removeEventListener("mouseleave", navMouseLeaveDesktop);
    navToggle.addEventListener("click", toggleNavDropdown); // Em mobile, click abre/fecha dropdown de soluções
    // Se o dropdown de soluções estiver aberto e a tela for redimensionada para mobile, fecha ele.
    if (navDropdown.getAttribute("data-open") === "true") {
        closeNavDropdown();
    }
  }
}

// --- Lógica do Dropdown de Navegação (Soluções) ---
function toggleNavDropdown(event) {
    event.stopPropagation(); // Impede que o clique feche o dropdown imediatamente via listener no document
    const navDropdown = document.querySelector("#nav-dropdown-list-0");
    if (!navDropdown) return;
    if (navDropdown.getAttribute("data-open") === "true") {
        closeNavDropdown();
    } else {
        openNavDropdown();
    }
}

function openNavDropdownDesktop() { // Apenas para mouseenter em desktop
    if (window.innerWidth <= RESPONSIVE_WIDTH) return;
    openNavDropdown();
}

function openNavDropdown() {
    const navDropdown = document.querySelector("#nav-dropdown-list-0");
    if (!navDropdown) return;
    navDropdown.classList.remove("tw-scale-0", "tw-opacity-0", "max-lg:tw-h-0");
    navDropdown.classList.add("tw-opacity-100", "tw-scale-100");
    if (window.innerWidth <= RESPONSIVE_WIDTH) { // Mobile
        navDropdown.classList.add("max-lg:!tw-h-fit", "tw-min-w-[90%]"); // Ajuste para mobile
    } else { // Desktop
        navDropdown.classList.add("lg:tw-h-auto");
    }
    navDropdown.setAttribute("data-open", "true");
}

function closeNavDropdown() {
    const navDropdown = document.querySelector("#nav-dropdown-list-0");
    if (!navDropdown) return;
    navDropdown.classList.remove("tw-opacity-100", "tw-scale-100", "max-lg:!tw-h-fit", "lg:tw-h-auto", "tw-min-w-[90%]");
    navDropdown.classList.add("tw-scale-0", "tw-opacity-0");
    if (window.innerWidth <= RESPONSIVE_WIDTH) {
        navDropdown.classList.add("max-lg:tw-h-0");
    }
    navDropdown.setAttribute("data-open", "false");
}

function navMouseLeaveDesktop() { // Apenas para mouseleave em desktop
    if (window.innerWidth <= RESPONSIVE_WIDTH) return;
    const navToggle = document.querySelector("#nav-dropdown-toggle-0");
    const navDropdown = document.querySelector("#nav-dropdown-list-0");
    setTimeout(() => {
        if (navDropdown && !navDropdown.matches(':hover') && navToggle && !navToggle.matches(':hover')) {
            closeNavDropdown();
        }
    }, 300);
}

function handleClickOutsideNavDropdown(event) {
    const navToggle = document.querySelector("#nav-dropdown-toggle-0");
    const navDropdown = document.querySelector("#nav-dropdown-list-0");
    if (navDropdown && navDropdown.getAttribute('data-open') === 'true') {
        if (navToggle && !navToggle.contains(event.target) && !navDropdown.contains(event.target)) {
            closeNavDropdown();
        }
    }
}


// --- Funções que não dependem do header e podem ser inicializadas no DOMContentLoaded principal ---
function setupFAQAccordion() {
  const faqAccordions = document.querySelectorAll(".faq-accordion");
  if (faqAccordions.length > 0) {
    faqAccordions.forEach((accordion) => {
      accordion.onclick = () => { // Usar onclick para simplicidade ou addEventListener
        const content = accordion.nextElementSibling;
        const icon = accordion.querySelector("i.bi");
        
        // Fecha outros accordions abertos (opcional, descomente se desejar)
        // faqAccordions.forEach(otherAccordion => {
        //   if (otherAccordion !== accordion) {
        //     const otherContent = otherAccordion.nextElementSibling;
        //     const otherIcon = otherAccordion.querySelector("i.bi");
        //     if (otherContent && otherContent.style.maxHeight && otherContent.style.maxHeight !== '0px') {
        //       otherContent.style.maxHeight = '0px';
        //       otherContent.style.paddingTop = '0px';
        //       otherContent.style.paddingBottom = '0px';
        //       if (otherIcon) {
        //         otherIcon.classList.remove('bi-dash');
        //         otherIcon.classList.add('bi-plus');
        //         otherIcon.style.transform = "rotate(0deg)";
        //       }
        //     }
        //   }
        // });

        if (content && icon) {
          if (content.style.maxHeight && content.style.maxHeight !== '0px') {
            content.style.maxHeight = '0px';
            content.style.paddingTop = '0px';
            content.style.paddingBottom = '0px';
            icon.classList.remove('bi-dash');
            icon.classList.add('bi-plus');
            icon.style.transform = "rotate(0deg)";
          } else {
            content.style.maxHeight = content.scrollHeight + "px";
            content.style.paddingTop = '18px'; // Ou o padding que você definiu no CSS
            content.style.paddingBottom = '18px';
            icon.classList.remove('bi-plus');
            icon.classList.add('bi-dash');
            icon.style.transform = "rotate(45deg)"; // Ou a rotação desejada
          }
        }
      };
    });
  }
}

function animateOnScroll() {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    const revealElements = document.querySelectorAll(".reveal-up"); // Classe genérica para elementos
    revealElements.forEach(elem => {
        gsap.fromTo(elem, 
            { autoAlpha: 0, y: 50 }, 
            { 
                autoAlpha: 1, y: 0, duration: 0.7, delay: 0.2,
                scrollTrigger: {
                    trigger: elem,
                    start: "top 90%", // Anima quando 90% do elemento está visível no topo
                    end: "bottom 20%",
                    toggleActions: "play none none reverse", // Anima ao entrar, reverte ao sair
                    // markers: true // Para debug
                }
            }
        );
    });

    const dashboardElement = document.querySelector("#dashboard");
    if (dashboardElement) {
        gsap.to("#dashboard", {
            scale: 1, translateY: 0, rotateX: "0deg",
            scrollTrigger: {
                trigger: "#hero-section", // Certifique-se que este elemento existe
                start: window.innerWidth > RESPONSIVE_WIDTH ? "top 95%" : "top 70%",
                end: "bottom bottom",
                scrub: 1,
            }
        });
    }
  }
}

function initializeTyped() {
  const typedElement = document.querySelector('#prompts-sample');
  if (typedElement && typeof Typed !== 'undefined') {
    new Typed('#prompts-sample', {
        strings: [
            "Simule seu crédito imobiliário conosco.", 
            "Planeje sua aposentadoria com segurança.", 
            "Encontre o seguro ideal para você e sua família.", 
            "Precisando de crédito? Fale com a Fontara!"
        ],
        typeSpeed: 70, smartBackspace: true, loop: true, backDelay: 2500, showCursor: false
    });
  }
}

function initializeVideoModal() {
  const videoModal = document.getElementById("video-modal");
  const videoPlayer = document.getElementById("video-player");
  const openModalBtn = document.getElementById("open-modal-btn"); // Certifique-se que este botão existe com este ID
  const closeModalBtn = document.getElementById("close-modal-btn");

  if (openModalBtn && videoModal && closeModalBtn && videoPlayer) {
    openModalBtn.addEventListener("click", () => {
        videoModal.classList.remove("tw-hidden"); // Se você usa Tailwind para esconder
        videoModal.style.display = 'flex'; // Se usa display none/flex
        document.body.classList.add("modal-open");
    });
    const closeAction = () => {
        videoModal.classList.add("tw-hidden");
        videoModal.style.display = 'none';
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
        document.body.classList.remove("modal-open");
    };
    closeModalBtn.addEventListener("click", closeAction);
    videoModal.addEventListener("click", (e) => {
      if (e.target === videoModal) closeAction();
    });
  }
}

function updateCurrentYear() {
    const yearSpans = document.querySelectorAll('#current-year, footer #current-year');
    if (yearSpans.length > 0) {
      yearSpans.forEach(span => {
        if (span) span.textContent = new Date().getFullYear();
      });
    }
}

// --- Inicialização Principal da Página ---
// Esta função será chamada implicitamente quando o script for carregado,
// ou explicitamente se você a envolver e chamar em DOMContentLoaded.
(function initializePage() {
    // Configuração inicial do tema (roda antes do DOMContentLoaded para evitar flash)
    const storedTheme = localStorage.getItem('color-mode');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (window.location.pathname.includes('/agradecimento/')) {
        document.documentElement.classList.remove('tw-dark');
    } else {
        if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
            document.documentElement.classList.add('tw-dark');
        } else {
            document.documentElement.classList.remove('tw-dark');
        }
    }

    // Funções que devem rodar após o DOM estar pronto
    function onDomReady() {
        console.log("DOM completamente carregado e parseado.");
        
        // Se o header NÃO for carregado dinamicamente (ou seja, já está no HTML da página)
        // E não houver um placeholder, inicializa os scripts do header aqui.
        if (document.getElementById('mainHeader') && !document.getElementById('header-placeholder')) {
            console.log("Header estático detectado. Inicializando scripts do header diretamente.");
            window.initializeHeaderScripts(); // A função global que definimos
        }
        // Se houver header-placeholder, loadPartials.js cuidará de chamar initializeHeaderScripts.

        setupFAQAccordion();
        animateOnScroll();
        initializeTyped();
        initializeVideoModal();
        updateCurrentYear(); // Atualiza o ano no footer (se estático ou já carregado)
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDomReady);
    } else {
        onDomReady(); // DOM já pronto
    }
})();
