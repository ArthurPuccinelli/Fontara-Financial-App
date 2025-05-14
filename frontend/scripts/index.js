// initialization

const RESPONSIVE_WIDTH = 1024;

let headerWhiteBg = false;
let isHeaderCollapsed = window.innerWidth < RESPONSIVE_WIDTH;
const collapseBtn = document.getElementById("collapse-btn");
const collapseHeaderItems = document.getElementById("collapsed-header-items");

const navToggle = document.querySelector("#nav-dropdown-toggle-0");
const navDropdown = document.querySelector("#nav-dropdown-list-0");


function onHeaderClickOutside(e) {
    // Garante que collapseHeaderItems exista antes de chamar .contains()
    if (collapseHeaderItems && !collapseHeaderItems.contains(e.target) && collapseBtn && !collapseBtn.contains(e.target)) {
        // Apenas fecha se o clique for fora do header E fora do botão de toggle (para evitar fechar ao clicar no botão para abrir)
        if (!isHeaderCollapsed) { // Só chama toggleHeader se o menu estiver aberto
             toggleHeader();
        }
    }
}


function toggleHeader() {
    // Verifica se os elementos existem antes de manipulá-los
    if (!collapseHeaderItems || !collapseBtn) {
        console.warn("Elementos do header (collapseHeaderItems ou collapseBtn) não encontrados.");
        return;
    }

    if (isHeaderCollapsed) {
        collapseHeaderItems.classList.add("max-lg:!tw-opacity-100", "tw-min-h-[90vh]");
        collapseHeaderItems.style.height = "90vh";
        collapseBtn.classList.remove("bi-list");
        collapseBtn.classList.add("bi-x", "max-lg:tw-fixed");
        isHeaderCollapsed = false;

        document.body.classList.add("modal-open");

        // Adiciona o listener APENAS se o menu for aberto
        setTimeout(() => window.addEventListener("click", onHeaderClickOutside), 1);

    } else {
        collapseHeaderItems.classList.remove("max-lg:!tw-opacity-100", "tw-min-h-[90vh]");
        collapseHeaderItems.style.height = "0vh";
        
        collapseBtn.classList.remove("bi-x", "max-lg:tw-fixed");  
        collapseBtn.classList.add("bi-list");
        document.body.classList.remove("modal-open");

        isHeaderCollapsed = true;
        // Remove o listener ao fechar o menu
        window.removeEventListener("click", onHeaderClickOutside);
    }
}

function responsive() {
    // Verifica se os elementos do header existem
    if (!collapseHeaderItems || !navToggle || !navDropdown) {
        // Se estivermos numa página sem header completo (ex: obrigado.html), não faz nada ou loga um aviso
        // console.warn("Elementos de navegação do header não encontrados na função responsive. Isso pode ser normal em algumas páginas.");
        return; 
    }

    // Se o menu estiver aberto e a tela for redimensionada para maior que RESPONSIVE_WIDTH,
    // e o menu colapsável móvel estiver ativo, ele deve ser fechado.
    if (window.innerWidth > RESPONSIVE_WIDTH && !isHeaderCollapsed && collapseHeaderItems.style.height === "90vh") {
        toggleHeader(); // Fecha o menu móvel
    } else if (window.innerWidth <= RESPONSIVE_WIDTH && isHeaderCollapsed && collapseHeaderItems.style.height !== "0vh" && collapseHeaderItems.style.height !== "") {
        // Se a tela ficar pequena e o menu não estiver devidamente colapsado (height 0), força o colapso.
        // Esta condição pode precisar de ajuste dependendo do estado inicial exato.
        // Geralmente, a lógica de toggleHeader já deve tratar isso.
    }


    if (window.innerWidth > RESPONSIVE_WIDTH) {
        collapseHeaderItems.style.height = ""; // Reseta a altura para o estilo desktop
        navToggle.addEventListener("mouseenter", openNavDropdown);
        navToggle.addEventListener("mouseleave", navMouseLeave);
    } else {
        // isHeaderCollapsed = true; // Não deve forçar isHeaderCollapsed aqui, pois pode estar aberto
        navToggle.removeEventListener("mouseenter", openNavDropdown);
        navToggle.removeEventListener("mouseleave", navMouseLeave);
    }
}
// Chama responsive na carga inicial, mas após o DOM estar mais estável para pegar elementos
document.addEventListener("DOMContentLoaded", function() {
    // Verifica se estamos numa página que TEM o header antes de rodar 'responsive' e adicionar listener
    if (document.getElementById("collapse-btn")) { // Um elemento chave do header
        responsive();
        window.addEventListener("resize", responsive);
    }
});


/** Dark and light theme */
// Esta função é chamada globalmente, então deve verificar se o ícone existe
function updateToggleModeBtn() {
    const toggleIcon = document.querySelector("#toggle-mode-icon");
    if (toggleIcon) { // IMPORTANTE: Verifica se o elemento existe
        if (document.documentElement.classList.contains("tw-dark")) {
            toggleIcon.classList.remove("bi-sun");
            toggleIcon.classList.add("bi-moon-stars-fill"); // Usando um ícone de lua mais preenchido
        } else {
            toggleIcon.classList.add("bi-sun");
            toggleIcon.classList.remove("bi-moon-stars-fill");
        }
    }
}

function toggleMode() {
    document.documentElement.classList.toggle("tw-dark");
    if (document.documentElement.classList.contains("tw-dark")) {
        localStorage.setItem("color-mode", "dark");
    } else {
        localStorage.setItem("color-mode", "light");
    }
    updateToggleModeBtn();
}

// Lógica de inicialização do tema
(function() {
    const storedTheme = localStorage.getItem('color-mode');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let applyDarkTheme = false;

    // Verifica se estamos na página de agradecimento para forçar o tema claro inicial
    if (window.location.pathname.includes('/agradecimento/')) {
        document.documentElement.classList.remove('tw-dark');
        // Não definimos localStorage aqui para não sobrescrever a preferência global
    } else {
        // Lógica para todas as outras páginas
        if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
            applyDarkTheme = true;
        }
    }

    if (applyDarkTheme) {
        document.documentElement.classList.add('tw-dark');
    } else {
        document.documentElement.classList.remove('tw-dark');
    }
    
    // Chama updateToggleModeBtn após o DOM estar pronto ou se já estiver
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", updateToggleModeBtn);
    } else {
        updateToggleModeBtn();
    }
})();


// --- SEÇÃO DO PIXA PLAYGROUND REMOVIDA/COMENTADA ---
/*
const promptWindowElement = document.querySelector("#pixa-playground");
if (promptWindowElement) { // Só inicializa se o elemento existir
    const promptWindow =  new Prompt("#pixa-playground"); // Supondo que a classe Prompt esteja definida em components.js
    const promptForm = document.querySelector("#prompt-form");
    const promptInput = promptForm ? promptForm.querySelector("input[name='prompt']") : null;

    const MAX_PROMPTS = 3;

    if (promptForm && promptInput && promptWindow) {
        promptForm.addEventListener("submit", (event) => {
            event.preventDefault();
            if (promptWindow.promptList.length >= MAX_PROMPTS)
                return false;
            promptWindow.addPrompt(promptInput.value);
            promptInput.value = "";
            if (promptWindow.promptList.length >= MAX_PROMPTS){
                const signUpPrompt = document.querySelector("#signup-prompt");
                if (signUpPrompt) {
                    signUpPrompt.classList.add("tw-scale-100");
                    signUpPrompt.classList.remove("tw-scale-0");
                }
                promptForm.querySelectorAll("input").forEach(e => {e.disabled = true});
            }
            return false;
        });
    }

    // Se os dropdowns são para o seletor de modelo de IA do Pixa Playground:
    const dropdownElements = document.querySelectorAll('.dropdown.ai-model-selector'); // Adicione uma classe específica se necessário
    if (dropdownElements.length > 0 && typeof Dropdown !== 'undefined' && promptWindow) {
        dropdownElements.forEach(dropdown => new Dropdown(`#${dropdown.id}`, promptWindow.setAIModel));
    }
}
*/
// --- FIM DA SEÇÃO DO PIXA PLAYGROUND ---


// Lógica do menu dropdown de navegação (deve funcionar em todas as páginas com o header)
if (navToggle && navDropdown) {
    navToggle.addEventListener("click", toggleNavDropdown);
    navDropdown.addEventListener("mouseleave", closeNavDropdown); // Continua com mouseleave para fechar
    // Adiciona um listener para fechar o dropdown se clicar fora dele (no desktop)
    document.addEventListener('click', function(event) {
        if (window.innerWidth > RESPONSIVE_WIDTH && navDropdown.getAttribute('data-open') === 'true') {
            if (!navDropdown.contains(event.target) && !navToggle.contains(event.target)) {
                closeNavDropdown();
            }
        }
    });
}


function toggleNavDropdown() {
    if (!navDropdown) return;
    if (navDropdown.getAttribute("data-open") === "true") {
        closeNavDropdown();
    } else {
        openNavDropdown();
    }
}

function navMouseLeave() {
    // Considerar um pequeno delay para permitir que o mouse entre no dropdown antes de fechar
    // Se o dropdown estiver aberto por clique, o mouseleave não deve fechá-lo imediatamente em mobile.
    // Esta lógica é mais para desktop.
    if (window.innerWidth > RESPONSIVE_WIDTH) {
        setTimeout(() => {
            if (navDropdown && !navDropdown.matches(':hover') && navToggle && !navToggle.matches(':hover')) {
                closeNavDropdown();
            }
        }, 300); // Delay de 300ms
    }
}

function openNavDropdown() {
    if (!navDropdown) return;
    // Ajuste para que a altura se adapte ao conteúdo no desktop também, se 'lg:tw-h-auto' for usado no HTML
    navDropdown.classList.add("tw-opacity-100", "tw-scale-100", 
                            "max-lg:tw-min-h-[450px]", "max-lg:!tw-h-fit", "tw-min-w-[320px]");
    if (window.innerWidth > RESPONSIVE_WIDTH) {
        navDropdown.classList.add("lg:tw-h-auto"); // Garante que no desktop a altura seja automática
    }
    navDropdown.setAttribute("data-open", "true");
}

function closeNavDropdown() {
    if (!navDropdown) return;
    navDropdown.classList.remove("tw-opacity-100", "tw-scale-100", 
        "max-lg:tw-min-h-[450px]", "tw-min-w-[320px]", "max-lg:!tw-h-fit", "lg:tw-h-auto");
    navDropdown.setAttribute("data-open", "false");
}


// Lógica do Modal de Vídeo (se existir na página atual)
const videoBg = document.querySelector("#video-container-bg");
const videoContainer = document.querySelector("#video-container");

if (videoBg && videoContainer) { // Só adiciona listeners se os elementos existirem
    // A função openVideo() seria chamada por um botão específico, ex:
    // const openVideoBtn = document.getElementById("open-video-btn");
    // if (openVideoBtn) openVideoBtn.addEventListener('click', openVideo);
    // (Assumindo que openVideo é chamada de outra forma no seu HTML)
}

function openVideo() {
    if (!videoBg || !videoContainer) return;
    videoBg.classList.remove("tw-scale-0", "tw-opacity-0");
    videoBg.classList.add("tw-scale-100", "tw-opacity-100");
    videoContainer.classList.remove("tw-scale-0");
    videoContainer.classList.add("tw-scale-100");
    document.body.classList.add("modal-open");
}

function closeVideo() {
    if (!videoBg || !videoContainer) return;
    videoContainer.classList.add("tw-scale-0");
    videoContainer.classList.remove("tw-scale-100");
    setTimeout(() => {
        videoBg.classList.remove("tw-scale-100", "tw-opacity-100");
        videoBg.classList.add("tw-scale-0", "tw-opacity-0");
    }, 400);
    document.body.classList.remove("modal-open");
}

// Animações Typed.js (se o elemento existir na página atual)
const typedElement = document.querySelector('#prompts-sample');
if (typedElement && typeof Typed !== 'undefined') { // Verifica se Typed está definido
    const typed = new Typed('#prompts-sample', {
        strings: [
            "Simule seu crédito imobiliário conosco.", 
            "Planeje sua aposentadoria com segurança.", 
            "Encontre o seguro ideal para você e sua família.", 
            "Precisando de crédito? Fale com a Fontara!"
        ], // Textos atualizados para o contexto financeiro
        typeSpeed: 70,
        smartBackspace: true, 
        loop: true,
        backDelay: 2500,
    });
} else if (!typedElement) {
    // console.warn("Elemento #prompts-sample para Typed.js não encontrado. Isso é normal se não estiver na página atual.");
}


// Animações GSAP (se GSAP e ScrollTrigger estiverem carregados)
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Animação inicial para .reveal-up (pode ser global)
    // gsap.set(".reveal-up", { opacity: 0, y: "50px" }); // Define estado inicial

    // Animação da "dashboard" (se existir na página atual)
    const dashboardElement = document.querySelector("#dashboard");
    if (dashboardElement) {
        gsap.to("#dashboard", {
            scale: 1,
            translateY: 0,
            rotateX: "0deg",
            scrollTrigger: {
                trigger: "#hero-section", // Certifique-se que #hero-section existe
                start: window.innerWidth > RESPONSIVE_WIDTH ? "top 95%" : "top 70%",
                end: "bottom bottom",
                scrub: 1,
            }
        });
    }

    // Animações de revelação para seções
    const sections = gsap.utils.toArray("section.reveal-section-content"); // Use uma classe específica para seções que devem ter este efeito
    sections.forEach((sec) => {
        const revealElements = sec.querySelectorAll(".reveal-up");
        if (revealElements.length > 0) {
            gsap.fromTo(revealElements, 
                { opacity: 0, y: "50px" }, 
                {
                    opacity: 1,
                    y: "0%",
                    duration: 0.8,
                    stagger: 0.2,
                    scrollTrigger: {
                        trigger: sec,
                        start: "top 80%", // Quando o topo da seção atinge 80% da altura da viewport
                        end: "bottom 20%",
                        toggleActions: "play none none none", // Anima uma vez quando entra na viewport
                        // markers: true, // Descomente para debug
                    }
                }
            );
        }
    });

} else {
    // console.warn("GSAP ou ScrollTrigger não estão carregados.");
}


// Lógica do FAQ Accordion (deve funcionar em qualquer página com a estrutura do FAQ)
const faqAccordion = document.querySelectorAll('.faq-accordion');
if (faqAccordion.length > 0) {
    faqAccordion.forEach(function (btn) {
        btn.addEventListener('click', function () {
            // this.classList.toggle('active'); // 'active' não parecia estar sendo usada para funcionalidade
            let content = this.nextElementSibling;
            let icon = this.querySelector(".bi-plus");

            if (content && icon) { // Verifica se os elementos existem
                // Fecha outros accordions abertos na mesma seção FAQ (opcional)
                // faqAccordion.forEach(otherBtn => {
                //     if (otherBtn !== btn) {
                //         let otherContent = otherBtn.nextElementSibling;
                //         let otherIcon = otherBtn.querySelector(".bi-plus");
                //         if (otherContent && otherContent.style.maxHeight !== '0px') {
                //             otherContent.style.maxHeight = '0px';
                //             otherContent.style.padding = '0px 18px';
                //             if (otherIcon) otherIcon.style.transform = "rotate(0deg)";
                //         }
                //     }
                // });

                if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                    content.style.maxHeight = '0px';
                    content.style.paddingTop = '0px';
                    content.style.paddingBottom = '0px';
                    // A transição no CSS deve cuidar do padding lateral, mas podemos ser explícitos.
                    // content.style.padding = '0px 18px'; // Cuidado para não sobrescrever o padding lateral desejado
                    icon.style.transform = "rotate(0deg)";
                } else {
                    content.style.maxHeight = content.scrollHeight + "px"; // Ajusta para a altura real do conteúdo
                    content.style.paddingTop = '20px'; // Ajuste conforme seu CSS para .content
                    content.style.paddingBottom = '20px';
                    // content.style.padding = '20px 18px';
                    icon.style.transform = "rotate(45deg)";
                }
            }
        });
    });
}

// Lógica para inicializar o estado dos ícones de FAQ se eles não começam com bi-plus
document.addEventListener("DOMContentLoaded", function() {
    const allFaqIcons = document.querySelectorAll('.faq-accordion .bi');
    allFaqIcons.forEach(icon => {
        if (!icon.classList.contains('bi-plus')) {
            // Se o ícone não for 'bi-plus' mas estiver dentro de um faq-accordion,
            // e for o ícone de toggle, garantir que ele comece como 'bi-plus'
            // Esta lógica pode precisar de ajuste se houver outros ícones dentro de .faq-accordion
            const parentAccordion = icon.closest('.faq-accordion');
            if (parentAccordion && parentAccordion.querySelector('.bi-plus') === icon) {
                // Assume que deve ser bi-plus, mas pode ser mais complexo
            }
        }
    });
});