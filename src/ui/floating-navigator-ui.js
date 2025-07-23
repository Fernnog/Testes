/**
 * @file floating-navigator-ui.js
 * @description Módulo de UI para gerenciar o paginador flutuante (dock)
 * que oferece atalhos de navegação para os planos de leitura. A lógica de clique
 * foi otimizada para ser mais robusta e escalável, tratando cada tipo de botão
 * de forma específica e confiável.
 */

// --- Seleção de Elementos ---
const navigatorEl = document.getElementById('floating-navigator');

// --- Funções Privadas ---

/**
 * Controla a visibilidade do paginador com base na posição de rolagem.
 * Ele deve desaparecer quando o usuário atinge o final da página para não
 * obstruir o conteúdo, um comportamento crucial em dispositivos móveis.
 */
function _toggleVisibilityOnScroll() {
    if (!navigatorEl) return;

    // A página inteira, usada para medir a altura total.
    const pageContent = document.body;
    // Uma margem de segurança para a detecção ficar mais fluida e natural.
    const buffer = 30;

    // Condição: A posição da parte de baixo da janela visível é maior ou igual
    // à altura total do conteúdo da página (menos o buffer)?
    const isAtTheVeryBottom = (window.scrollY + window.innerHeight) >= (pageContent.offsetHeight - buffer);

    if (isAtTheVeryBottom) {
        // Se estamos no final da página, adiciona a classe que o esconde com animação.
        navigatorEl.classList.add('hidden-at-bottom');
    } else {
        // Caso contrário, remove a classe, permitindo que ele apareça.
        navigatorEl.classList.remove('hidden-at-bottom');
    }
}

// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo do paginador, configurando os listeners de eventos.
 * Usa delegação de eventos para otimizar a performance e uma lógica de roteamento
 * de cliques para garantir a execução correta de cada ação.
 * @param {object} callbacks - Objeto com os callbacks, como { onSwitchPlan }.
 */
export function init(callbacks = {}) {
    if (!navigatorEl) {
        console.error("Elemento do paginador flutuante não encontrado no DOM.");
        return;
    }

    // Delegação de Eventos: um único listener no container para todos os botões.
    navigatorEl.addEventListener('click', (event) => {
        const button = event.target.closest('a.nav-button');
        if (!button) return;

        event.preventDefault();
        const href = button.getAttribute('href');

        // --- Roteamento de Ações ---

        // Ação 1: Botão "Home" (ID Fixo)
        // Usa o método mais confiável para rolar para o topo da página.
        if (href === '#header-logo') {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            return; // Ação concluída.
        }

        // Ação 2: Botão de Plano (Padrão de ID Dinâmico)
        // Extrai o ID do plano e aciona o callback de troca de plano.
        if (href.startsWith('#plan-card-')) {
            const planId = href.replace('#plan-card-', '');
            // Chama o callback onSwitchPlan fornecido pelo main.js, se existir.
            callbacks.onSwitchPlan?.(planId);
            return; // Ação concluída.
        }
        
        // Fallback para outros possíveis botões futuros que usem a rolagem padrão.
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    // Adiciona os listeners globais para controlar a visibilidade ao rolar ou redimensionar.
    // `passive: true` melhora a performance de rolagem em navegadores modernos.
    window.addEventListener('scroll', _toggleVisibilityOnScroll, { passive: true });
    window.addEventListener('resize', _toggleVisibilityOnScroll);
}

/**
 * Renderiza os botões do paginador com base na lista de planos e no plano ativo.
 * Esta função é chamada pelo `main.js` sempre que os dados são atualizados.
 * @param {Array<object>} plans - A lista de planos do usuário.
 * @param {string|null} activePlanId - O ID do plano atualmente ativo para destaque.
 */
export function render(plans, activePlanId) {
    if (!navigatorEl) return;

    // Se não há planos, esconde o paginador e encerra a função.
    if (!plans || plans.length === 0) {
        hide();
        return;
    }

    // Começa a construir o HTML interno com o botão "Home", que é fixo.
    let innerHTML = `
        <a href="#header-logo" class="nav-button home-button" title="Ir para o topo">
            🏠
        </a>
    `;

    // Itera sobre a lista de planos e adiciona um botão para cada um que tenha um ícone definido.
    plans.forEach(plan => {
        if (plan.icon) {
            // Adiciona a classe 'active-nav' se o plano atual for o plano ativo.
            const isActiveClass = plan.id === activePlanId ? 'active-nav' : '';
            innerHTML += `
                <a href="#plan-card-${plan.id}" class="nav-button ${isActiveClass}" title="${plan.name}">
                    ${plan.icon}
                </a>
            `;
        }
    });

    // Insere o HTML gerado no elemento do paginador.
    navigatorEl.innerHTML = innerHTML;

    // Garante que o paginador esteja visível e verifica seu estado de rolagem inicial.
    show();
    _toggleVisibilityOnScroll();
}


/**
 * Torna o paginador visível adicionando a classe de controle de opacidade.
 */
export function show() {
    if (navigatorEl) navigatorEl.classList.add('visible');
}

/**
 * Esconde o paginador removendo a classe de controle de opacidade.
 */
export function hide() {
    if (navigatorEl) navigatorEl.classList.remove('visible');
}