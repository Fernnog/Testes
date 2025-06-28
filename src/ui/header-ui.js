/**
 * @file header-ui.js
 * @description Módulo de UI para gerenciar todos os elementos do cabeçalho da aplicação.
 * Isso inclui o status do usuário, o seletor de planos e os botões de ação.
 */

// Importa os elementos do DOM necessários
import {
    headerLogo,
    planSelectorContainer,
    planSelect,
    managePlansButton,
    userEmailSpan,
    logoutButton,
} from './dom-elements.js';

// Importa funções auxiliares, se necessário (ex: formatação de datas)
import { formatUTCDateStringToBrasilian } from '../utils/date-helpers.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onLogout: null,
        onSwitchPlan: null,
        onManagePlans: null, // Callback para o botão de engrenagem
    },
};

// --- Funções Privadas ---

/**
 * Popula o elemento <select> com a lista de planos do usuário.
 * @param {Array<object>} plans - A lista de planos do usuário.
 * @param {string|null} activePlanId - O ID do plano atualmente ativo.
 */
function _populatePlanSelector(plans, activePlanId) {
    planSelect.innerHTML = ''; // Limpa as opções existentes

    if (!plans || plans.length === 0) {
        planSelect.innerHTML = '<option value="">Nenhum plano criado</option>';
        planSelect.disabled = true;
        return;
    }

    planSelect.disabled = false;
    plans.forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.id;
        
        const dateInfo = (plan.startDate && plan.endDate) 
            ? ` (${formatUTCDateStringToBrasilian(plan.startDate)})` 
            : '';
            
        option.textContent = `${plan.name || 'Plano sem nome'}${dateInfo}`;
        
        if (plan.id === activePlanId) {
            option.selected = true;
        }
        planSelect.appendChild(option);
    });
}

/**
 * Lida com a mudança de seleção no seletor de planos.
 * @param {Event} e - O objeto do evento de mudança.
 */
function _handlePlanSelectionChange(e) {
    const selectedPlanId = e.target.value;
    if (selectedPlanId && state.callbacks.onSwitchPlan) {
        // Invoca o callback passado pelo orquestrador (main.js)
        state.callbacks.onSwitchPlan(selectedPlanId);
    }
}

// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo de UI do cabeçalho, configurando os listeners de eventos.
 * @param {object} callbacks - Objeto contendo os callbacks { onLogout, onSwitchPlan, onManagePlans }.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    logoutButton.addEventListener('click', () => state.callbacks.onLogout?.());
    planSelect.addEventListener('change', _handlePlanSelectionChange);
    managePlansButton.addEventListener('click', () => state.callbacks.onManagePlans?.());
}

/**
 * Renderiza o cabeçalho com base no estado de autenticação e nos dados do usuário.
 * @param {object|null} user - O objeto do usuário do Firebase, ou null se deslogado.
 * @param {Array<object>} [plans=[]] - A lista de planos do usuário.
 * @param {string|null} [activePlanId=null] - O ID do plano ativo.
 */
export function render(user, plans = [], activePlanId = null) {
    if (user) {
        // --- Estado Logado ---
        userEmailSpan.textContent = user.email;
        userEmailSpan.style.display = 'inline';
        logoutButton.style.display = 'inline-block';
        planSelectorContainer.style.display = 'flex';
        managePlansButton.style.display = 'inline-block';
        _populatePlanSelector(plans, activePlanId);
    } else {
        // --- Estado Deslogado ---
        userEmailSpan.style.display = 'none';
        logoutButton.style.display = 'none';
        planSelectorContainer.style.display = 'none';
        managePlansButton.style.display = 'none';
        userEmailSpan.textContent = '';
        planSelect.innerHTML = '';
    }
}

/**
 * Mostra um estado de carregamento no cabeçalho, útil durante a busca de dados.
 */
export function showLoading() {
    planSelect.disabled = true;
    const loadingOption = '<option value="">Carregando planos...</option>';
    if (planSelect.innerHTML !== loadingOption) {
        planSelect.innerHTML = loadingOption;
    }
}

/**
 * Esconde o estado de carregamento e reabilita o seletor.
 */
export function hideLoading() {
    planSelect.disabled = false;
    // A função _populatePlanSelector será chamada em seguida para preencher com os dados reais.
}