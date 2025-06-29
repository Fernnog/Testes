/**
 * @file reading-plan-ui.js
 * @description Módulo responsável por controlar toda a interface do usuário
 * para a seção do plano de leitura ativo. Isso inclui a renderização do título,
 * progresso, leitura do dia e o gerenciamento das ações do plano.
 */

// Importa os elementos do DOM necessários
import {
    readingPlanSection,
    planHeaderInfo,
    readingPlanTitle,
    activePlanDriveLink,
    planLoadingViewDiv,
    planViewErrorDiv,
    progressBarContainer,
    progressText,
    progressBarFill,
    dailyReadingHeaderDiv,
    dailyReadingChaptersListDiv,
    planActions,
    completeDayButton,
    recalculatePlanButton,
    showStatsButton,
    showHistoryButton,
    deleteCurrentPlanButton,
} from './dom-elements.js';

// Importa funções auxiliares
import { formatUTCDateStringToBrasilian } from '../utils/date-helpers.js';

// --- Estado Interno do Módulo ---
let state = {
    currentPlan: null,
    callbacks: {
        onCompleteDay: null,
        onChapterToggle: null,
        onDeletePlan: null,
        onRecalculate: null,
        onShowStats: null,
        onShowHistory: null,
    },
};

// --- Funções Privadas de Renderização ---

/**
 * Renderiza a barra de progresso do plano ativo.
 */
function _renderProgressBar() {
    if (!state.currentPlan || !progressBarContainer) {
        progressBarContainer.style.display = 'none';
        return;
    }

    const { plan, currentDay, startDate, endDate } = state.currentPlan;
    const totalReadingDaysInPlan = Object.keys(plan || {}).length;
    
    if (totalReadingDaysInPlan === 0 || !startDate || !endDate) {
        progressBarContainer.style.display = 'none';
        return;
    }

    progressBarContainer.style.display = 'block';
    const isCompleted = currentDay > totalReadingDaysInPlan;
    const percentage = isCompleted ? 100 : Math.min(100, Math.max(0, ((currentDay - 1) / totalReadingDaysInPlan) * 100));
    
    let progressLabel = `Dia ${currentDay} de ${totalReadingDaysInPlan} (${Math.round(percentage)}%) | ${formatUTCDateStringToBrasilian(startDate)} - ${formatUTCDateStringToBrasilian(endDate)}`;
    if (isCompleted) {
        progressLabel = `Plano concluído! (${formatUTCDateStringToBrasilian(startDate)} - ${formatUTCDateStringToBrasilian(endDate)})`;
    }
    
    progressBarFill.style.width = percentage + '%';
    progressText.textContent = progressLabel;
}

/**
 * Renderiza a lista de capítulos para o dia de leitura atual.
 */
function _renderDailyReading() {
    dailyReadingChaptersListDiv.innerHTML = '';
    
    const { plan, currentDay, dailyChapterReadStatus } = state.currentPlan;
    const chaptersForToday = plan[currentDay.toString()] || [];

    if (chaptersForToday.length > 0) {
        let allChaptersChecked = true;
        chaptersForToday.forEach((chapter, index) => {
            const chapterId = `ch-${currentDay}-${index}`;
            const isChecked = !!(dailyChapterReadStatus && dailyChapterReadStatus[chapter]);

            const chapterItemDiv = document.createElement('div');
            chapterItemDiv.className = 'daily-chapter-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = chapterId;
            checkbox.checked = isChecked;
            checkbox.dataset.chapterName = chapter;
            // O listener é adicionado uma vez no init() usando delegação de evento

            const label = document.createElement('label');
            label.htmlFor = chapterId;
            label.textContent = chapter;

            chapterItemDiv.appendChild(checkbox);
            chapterItemDiv.appendChild(label);
            dailyReadingChaptersListDiv.appendChild(chapterItemDiv);

            if (!isChecked) {
                allChaptersChecked = false;
            }
        });
        completeDayButton.disabled = !allChaptersChecked;
        completeDayButton.style.display = 'inline-block';
    } else {
        dailyReadingChaptersListDiv.innerHTML = "<p>Dia sem leitura designada ou erro no plano.</p>";
        completeDayButton.style.display = 'none';
    }
}

/**
 * Atualiza o cabeçalho da leitura diária com a data e o dia do plano.
 * @param {string|null} effectiveDate - A data de leitura efetiva, já calculada.
 */
function _renderDailyHeader(effectiveDate) {
    const { plan, currentDay, name } = state.currentPlan;
    const totalReadingDaysInPlan = Object.keys(plan || {}).length;
    const isCompleted = currentDay > totalReadingDaysInPlan;

    if (isCompleted) {
        dailyReadingHeaderDiv.innerHTML = `<p style="font-weight: bold; color: var(--success-color);">Parabéns!</p><p>Plano "${name || ''}" concluído!</p>`;
    } else {
        const formattedDate = formatUTCDateStringToBrasilian(effectiveDate);
        dailyReadingHeaderDiv.innerHTML = `<p style="margin-bottom: 5px;"><strong style="color: var(--primary-action); font-size: 1.1em;">${formattedDate}</strong><span style="font-size: 0.9em; color: var(--text-color-muted); margin-left: 10px;">(Dia ${currentDay} de ${totalReadingDaysInPlan})</span></p>`;
    }
}

/**
 * Lida com o evento de clique em um checkbox de capítulo.
 * @param {Event} e - O objeto de evento.
 */
function _handleChapterToggle(e) {
    if (e.target.matches('input[type="checkbox"]')) {
        const chapterName = e.target.dataset.chapterName;
        const isRead = e.target.checked;
        if (state.callbacks.onChapterToggle) {
            // Invoca o callback passado pelo orquestrador (main.js)
            state.callbacks.onChapterToggle(chapterName, isRead);
        }
    }
}

// --- Funções Públicas ---

/**
 * Inicializa o módulo de UI do plano de leitura, configurando listeners de eventos.
 * @param {object} callbacks - Um objeto contendo as funções de callback para interações do usuário.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    completeDayButton.addEventListener('click', () => {
        if (state.callbacks.onCompleteDay && state.currentPlan) {
            state.callbacks.onCompleteDay(state.currentPlan.id);
        }
    });

    deleteCurrentPlanButton.addEventListener('click', () => {
        if (state.callbacks.onDeletePlan && state.currentPlan) {
            state.callbacks.onDeletePlan(state.currentPlan.id);
        }
    });
    
    // Configura os botões que abrem modais
    recalculatePlanButton.addEventListener('click', () => state.callbacks.onRecalculate?.());
    showStatsButton.addEventListener('click', () => state.callbacks.onShowStats?.());
    showHistoryButton.addEventListener('click', () => state.callbacks.onShowHistory?.());

    // Usa delegação de evento para os checkboxes de capítulo
    dailyReadingChaptersListDiv.addEventListener('change', _handleChapterToggle);
}

/**
 * Renderiza toda a seção do plano de leitura ativo com base nos dados fornecidos.
 * @param {object|null} activePlan - O objeto do plano ativo, ou null se não houver nenhum.
 * @param {string|null} effectiveDate - A data de leitura efetiva pré-calculada para o dia atual.
 */
export function render(activePlan, effectiveDate) {
    state.currentPlan = activePlan;
    hideError();
    hideLoading();

    if (!activePlan) {
        hide();
        return;
    }

    readingPlanSection.style.display = 'block';

    // Renderiza o título e o link do Drive
    readingPlanTitle.textContent = activePlan.name || "Plano de Leitura Ativo";
    if (activePlan.googleDriveLink) {
        activePlanDriveLink.href = activePlan.googleDriveLink;
        activePlanDriveLink.style.display = 'inline-flex';
        activePlanDriveLink.setAttribute('title', `Abrir link do Drive para: ${activePlan.name || 'este plano'}`);
    } else {
        activePlanDriveLink.style.display = 'none';
    }

    // Renderiza as partes internas
    _renderProgressBar();
    _renderDailyHeader(effectiveDate); // Passa a data pré-calculada
    _renderDailyReading();
    
    // Habilita/desabilita botões de ação
    const isCompleted = activePlan.currentDay > Object.keys(activePlan.plan || {}).length;
    recalculatePlanButton.disabled = isCompleted;
    if (isCompleted) {
        completeDayButton.style.display = 'none';
    }
}

/**
 * Atualiza apenas os checkboxes de capítulo e o botão "Concluir Dia".
 * Útil após uma interação de toggle para não re-renderizar a tela inteira.
 * @param {object} updatedPlan - O objeto do plano com o `dailyChapterReadStatus` atualizado.
 */
export function updateDailyReadStatus(updatedPlan) {
    if (!updatedPlan || !state.currentPlan || updatedPlan.id !== state.currentPlan.id) return;
    state.currentPlan = updatedPlan;
    _renderDailyReading(); // Re-renderiza a lista de capítulos, que atualiza os checkboxes e o botão.
}

/**
 * Mostra a seção do plano de leitura.
 */
export function show() {
    readingPlanSection.style.display = 'block';
}

/**
 * Esconde a seção do plano de leitura.
 */
export function hide() {
    readingPlanSection.style.display = 'none';
}

/**
 * Mostra um indicador de carregamento.
 */
export function showLoading() {
    planLoadingViewDiv.style.display = 'block';
    hide();
}

/**
 * Esconde o indicador de carregamento.
 */
export function hideLoading() {
    planLoadingViewDiv.style.display = 'none';
}

/**
 * Mostra uma mensagem de erro na seção.
 * @param {string} message - A mensagem de erro a ser exibida.
 */
export function showError(message) {
    planViewErrorDiv.textContent = message;
    planViewErrorDiv.style.display = 'block';
}

/**
 * Esconde a mensagem de erro.
 */
export function hideError() {
    planViewErrorDiv.style.display = 'none';
}
