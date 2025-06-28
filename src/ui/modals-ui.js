/**
 * @file modals-ui.js
 * @description Módulo de UI para gerenciar todos os modais da aplicação.
 * Controla a abertura, fechamento, e população de conteúdo dos modais de
 * Gerenciar Planos, Estatísticas, Histórico e Recálculo.
 */

// Importa todos os elementos do DOM relacionados aos modais
import {
    // Modal Genérico
    closeModal as closeGenericModal,

    // Gerenciar Planos
    managePlansModal,
    managePlansLoadingDiv,
    managePlansErrorDiv,
    planListDiv,
    createNewPlanButton,
    createFavoritePlanButton,

    // Recálculo
    recalculateModal,
    recalculateErrorDiv,
    recalculateLoadingDiv,
    confirmRecalculateButton,
    newPaceInput,

    // Estatísticas
    statsModal,
    statsLoadingDiv,
    statsErrorDiv,
    statsContentDiv,
    statsActivePlanName,
    statsActivePlanProgress,
    statsTotalChapters,
    statsPlansCompleted,
    statsAvgPace,

    // Histórico
    historyModal,
    historyLoadingDiv,
    historyErrorDiv,
    historyListDiv,
} from './dom-elements.js';

// Importa funções auxiliares
import { formatUTCDateStringToBrasilian } from '../utils/date-helpers.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        // Gerenciar Planos
        onDeletePlan: null,
        onSwitchPlan: null,
        onCreateGenericPlan: null,
        onCreateFavoritePlan: null,
        // Recálculo
        onConfirmRecalculate: null,
    },
};

const allModals = [managePlansModal, recalculateModal, statsModal, historyModal];


// --- Funções Públicas de Controle ---

/**
 * Abre um modal especificado pelo seu ID.
 * @param {string} modalId - O ID do modal a ser aberto (ex: 'manage-plans-modal').
 */
export function open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Fecha um modal especificado pelo seu ID.
 * @param {string} modalId - O ID do modal a ser fechado.
 */
export function close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Mostra um indicador de carregamento dentro de um modal específico.
 * @param {string} modalId - O ID do modal.
 */
export function showLoading(modalId) {
    const loadingDiv = document.getElementById(`${modalId.replace('-modal', '')}-loading`);
    if (loadingDiv) loadingDiv.style.display = 'block';
}

/**
 * Esconde o indicador de carregamento de um modal.
 * @param {string} modalId - O ID do modal.
 */
export function hideLoading(modalId) {
    const loadingDiv = document.getElementById(`${modalId.replace('-modal', '')}-loading`);
    if (loadingDiv) loadingDiv.style.display = 'none';
}

/**
 * Mostra uma mensagem de erro dentro de um modal.
 * @param {string} modalId - O ID do modal.
 * @param {string} message - A mensagem de erro.
 */
export function showError(modalId, message) {
    const errorDiv = document.getElementById(`${modalId.replace('-modal', '')}-error`);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

/**
 * Esconde a mensagem de erro de um modal.
 * @param {string} modalId - O ID do modal.
 */
export function hideError(modalId) {
    const errorDiv = document.getElementById(`${modalId.replace('-modal', '')}-error`);
    if (errorDiv) errorDiv.style.display = 'none';
}


// --- Funções Específicas de População de Conteúdo ---

/**
 * Popula o modal de "Gerenciar Planos" com a lista de planos do usuário.
 * @param {Array<object>} plans - A lista de planos do usuário.
 * @param {string|null} activePlanId - O ID do plano ativo.
 */
export function populateManagePlans(plans, activePlanId) {
    planListDiv.innerHTML = '';
    hideError('manage-plans-modal');

    if (!plans || plans.length === 0) {
        planListDiv.innerHTML = '<p>Você ainda não criou nenhum plano de leitura.</p>';
        return;
    }

    plans.forEach(plan => {
        const item = document.createElement('div');
        item.className = 'plan-list-item';

        const dateInfo = (plan.startDate && plan.endDate)
            ? `<small>${formatUTCDateStringToBrasilian(plan.startDate)} - ${formatUTCDateStringToBrasilian(plan.endDate)}</small>`
            : '<small style="color: red;">Datas inválidas</small>';
        
        const driveLinkHTML = plan.googleDriveLink
            ? `<a href="${plan.googleDriveLink}" target="_blank" class="manage-drive-link" title="Abrir link do Drive" onclick="event.stopPropagation();">
                 <img src="drive_icon.png" alt="Drive" style="width:20px; height:auto;">
               </a>`
            : '';

        const isPlanActive = plan.id === activePlanId;

        item.innerHTML = `
            <div>
                <span>${plan.name || 'Plano sem nome'}</span>
                ${dateInfo}
            </div>
            <div class="actions">
                ${driveLinkHTML}
                <button class="button-primary activate-plan-btn" data-plan-id="${plan.id}" ${isPlanActive ? 'disabled' : ''}>
                    ${isPlanActive ? 'Ativo' : 'Ativar'}
                </button>
                <button class="button-danger delete-plan-btn" data-plan-id="${plan.id}">Excluir</button>
            </div>
        `;
        planListDiv.appendChild(item);
    });
}

/**
 * Exibe os dados de histórico de leitura no modal correspondente.
 * @param {object} readLog - O objeto de log de leitura do plano ativo.
 */
export function displayHistory(readLog) {
    historyListDiv.innerHTML = '';
    hideError('history-modal');
    
    const log = readLog || {};
    const sortedDates = Object.keys(log).sort().reverse();

    if (sortedDates.length === 0) {
        historyListDiv.innerHTML = '<p>Nenhum registro de leitura encontrado para este plano.</p>';
        return;
    }

    sortedDates.forEach(dateStr => {
        const chaptersRead = log[dateStr] || [];
        const entryDiv = document.createElement('div');
        entryDiv.className = 'history-entry';
        const formattedDate = formatUTCDateStringToBrasilian(dateStr);
        const chaptersText = chaptersRead.length > 0 ? chaptersRead.join(', ') : 'Nenhum capítulo registrado.';
        
        entryDiv.innerHTML = `
            <span class="history-date">${formattedDate}</span>
            <span class="history-chapters">${chaptersText}</span>
        `;
        historyListDiv.appendChild(entryDiv);
    });
}

/**
 * Exibe as estatísticas calculadas no modal de estatísticas.
 * @param {object} statsData - Objeto com os dados das estatísticas.
 */
export function displayStats(statsData) {
    hideError('stats-modal');
    statsActivePlanName.textContent = statsData.activePlanName || '--';
    statsActivePlanProgress.textContent = `${Math.round(statsData.activePlanProgress || 0)}%`;
    statsTotalChapters.textContent = statsData.chaptersReadFromLog || '--';
    statsPlansCompleted.textContent = statsData.isCompleted ? "Sim" : (statsData.activePlanName !== '--' ? "Não" : "--");
    statsAvgPace.textContent = statsData.avgPace || '--';
    statsContentDiv.style.display = 'block';
}

/**
 * Reseta o formulário do modal de recálculo para o estado padrão.
 */
export function resetRecalculateForm() {
    const extendOption = recalculateModal.querySelector('input[name="recalc-option"][value="extend_date"]');
    if (extendOption) extendOption.checked = true;
    newPaceInput.value = '3';
    hideError('recalculate-modal');
}


// --- Inicialização ---

/**
 * Inicializa o módulo de modais, configurando listeners de eventos genéricos.
 * @param {object} callbacks - Objeto com os callbacks para as ações dos modais.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    // Listeners genéricos para fechar modais
    allModals.forEach(modal => {
        if (!modal) return;
        // Fechar ao clicar fora do conteúdo
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                close(modal.id);
            }
        });
        // Fechar ao clicar no botão 'x'
        const closeButton = modal.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => close(modal.id));
        }
    });

    // Listeners específicos para ações dentro dos modais
    managePlansModal.addEventListener('click', (e) => {
        if (e.target.matches('.activate-plan-btn')) {
            state.callbacks.onSwitchPlan?.(e.target.dataset.planId);
        } else if (e.target.matches('.delete-plan-btn')) {
            state.callbacks.onDeletePlan?.(e.target.dataset.planId);
        }
    });

    createNewPlanButton.addEventListener('click', () => state.callbacks.onCreateGenericPlan?.());
    createFavoritePlanButton.addEventListener('click', () => state.callbacks.onCreateFavoritePlan?.());
    
    confirmRecalculateButton.addEventListener('click', () => {
        const option = document.querySelector('input[name="recalc-option"]:checked').value;
        const newPace = parseInt(newPaceInput.value, 10);
        state.callbacks.onConfirmRecalculate?.(option, newPace);
    });
}