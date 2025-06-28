/**
 * @file plan-creation-ui.js
 * @description Módulo de UI para gerenciar o formulário de criação de planos de leitura.
 * Lida com a visibilidade de opções, coleta de dados do formulário e feedback ao usuário.
 */

// Importa os elementos do DOM necessários
import {
    planCreationSection,
    planErrorDiv,
    planLoadingCreateDiv,
    planNameInput,
    googleDriveLinkInput,
    creationMethodRadios,
    intervalOptionsDiv,
    startBookSelect,
    startChapterInput,
    endBookSelect,
    endChapterInput,
    selectionOptionsDiv,
    booksSelect,
    chaptersInput,
    bookSuggestionsDatalist,
    durationMethodRadios,
    daysOptionDiv,
    daysInput,
    endDateOptionDiv,
    startDateInput,
    endDateInput,
    chaptersPerDayOptionDiv,
    chaptersPerDayInput,
    periodicityCheckboxes,
    periodicityWarningDiv,
    createPlanButton,
    cancelCreationButton,
} from './dom-elements.js';

// Importa dados e helpers
import { CANONICAL_BOOK_ORDER } from '../config/bible-data.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onCreatePlan: null,
        onCancel: null,
    },
    isPlanListEmpty: true, // Para controlar a visibilidade do botão 'Cancelar'
};

// --- Funções Privadas ---

/**
 * Popula os seletores de livros (inicial, final, múltiplos).
 */
function _populateBookSelectors() {
    const defaultOption = '<option value="">-- Selecione --</option>';
    startBookSelect.innerHTML = defaultOption;
    endBookSelect.innerHTML = defaultOption;
    booksSelect.innerHTML = ''; // Limpa a seleção múltipla

    CANONICAL_BOOK_ORDER.forEach(book => {
        const optionHTML = `<option value="${book}">${book}</option>`;
        startBookSelect.insertAdjacentHTML('beforeend', optionHTML);
        endBookSelect.insertAdjacentHTML('beforeend', optionHTML);
        booksSelect.insertAdjacentHTML('beforeend', optionHTML);
    });
}

/**
 * Reseta todos os campos do formulário para seus valores padrão.
 */
function _resetFormFields() {
    planNameInput.value = "";
    googleDriveLinkInput.value = "";
    startBookSelect.value = "";
    startChapterInput.value = "";
    endBookSelect.value = "";
    endChapterInput.value = "";
    Array.from(booksSelect.options).forEach(opt => opt.selected = false);
    chaptersInput.value = "";
    daysInput.value = "30";
    startDateInput.value = '';
    endDateInput.value = '';
    chaptersPerDayInput.value = '3';
    
    // Reseta os radios para o padrão
    document.querySelector('input[name="creation-method"][value="interval"]').checked = true;
    document.querySelector('input[name="duration-method"][value="days"]').checked = true;
    
    // Reseta os checkboxes para o padrão (Seg-Sex)
    periodicityCheckboxes.forEach(cb => {
        const dayVal = parseInt(cb.value, 10);
        cb.checked = (dayVal >= 1 && dayVal <= 5);
    });

    hideError();
    hidePeriodicityWarning();
    _toggleFormOptions();
}

/**
 * Alterna a visibilidade das opções do formulário com base nas seleções de rádio.
 */
function _toggleFormOptions() {
    const creationMethod = document.querySelector('input[name="creation-method"]:checked').value;
    const durationMethod = document.querySelector('input[name="duration-method"]:checked').value;

    // Lógica para método de criação
    intervalOptionsDiv.style.display = creationMethod === 'interval' ? 'block' : 'none';
    selectionOptionsDiv.style.display = (creationMethod === 'selection' || creationMethod === 'chapters-per-day') ? 'block' : 'none';
    
    // Lógica para duração/ritmo
    const showChaptersPerDay = creationMethod === 'chapters-per-day';
    chaptersPerDayOptionDiv.style.display = showChaptersPerDay ? 'block' : 'none';
    daysOptionDiv.style.display = !showChaptersPerDay && durationMethod === 'days' ? 'block' : 'none';
    endDateOptionDiv.style.display = !showChaptersPerDay && durationMethod === 'end-date' ? 'block' : 'none';

    // Desabilita os radios de duração quando o ritmo é por capítulos/dia
    durationMethodRadios.forEach(r => r.disabled = showChaptersPerDay);

    // Define a data de hoje como padrão para a data de início se a opção estiver visível e vazia
    if (endDateOptionDiv.style.display === 'block' && !startDateInput.value) {
        const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
        startDateInput.value = todayLocal.toISOString().split('T')[0];
    }
}

/**
 * Lida com a submissão do formulário de criação de plano.
 */
function _handleCreatePlan() {
    hideError();
    
    // Coleta todos os dados do formulário
    const planData = {
        name: planNameInput.value.trim(),
        googleDriveLink: googleDriveLinkInput.value.trim(),
        creationMethod: document.querySelector('input[name="creation-method"]:checked').value,
        startBook: startBookSelect.value,
        startChapter: parseInt(startChapterInput.value, 10),
        endBook: endBookSelect.value,
        endChapter: parseInt(endChapterInput.value, 10),
        selectedBooks: Array.from(booksSelect.selectedOptions).map(opt => opt.value),
        chaptersText: chaptersInput.value.trim(),
        durationMethod: document.querySelector('input[name="duration-method"]:checked').value,
        totalDays: parseInt(daysInput.value, 10),
        startDate: startDateInput.value,
        endDate: endDateInput.value,
        chaptersPerDay: parseInt(chaptersPerDayInput.value, 10),
        allowedDays: Array.from(periodicityCheckboxes).filter(cb => cb.checked).map(cb => parseInt(cb.value, 10)),
    };

    // Validação básica
    if (!planData.name) {
        showError("Por favor, dê um nome ao seu plano.");
        planNameInput.focus();
        return;
    }
    
    // Invoca o callback, passando os dados brutos do formulário para o orquestrador
    if (state.callbacks.onCreatePlan) {
        state.callbacks.onCreatePlan(planData);
    }
}


// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo, populando seletores e adicionando listeners.
 * @param {object} callbacks - Objeto com os callbacks { onCreatePlan, onCancel }.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    _populateBookSelectors();

    creationMethodRadios.forEach(radio => radio.addEventListener('change', _toggleFormOptions));
    durationMethodRadios.forEach(radio => radio.addEventListener('change', _toggleFormOptions));
    
    createPlanButton.addEventListener('click', _handleCreatePlan);
    cancelCreationButton.addEventListener('click', () => state.callbacks.onCancel?.());
}

/**
 * Mostra a seção de criação de plano.
 * @param {boolean} isPlanListEmpty - Informa se o usuário já tem outros planos.
 */
export function show(isPlanListEmpty = true) {
    state.isPlanListEmpty = isPlanListEmpty;
    _resetFormFields();
    cancelCreationButton.style.display = state.isPlanListEmpty ? 'none' : 'inline-block';
    planCreationSection.style.display = 'block';
    window.scrollTo(0, 0);
}

/**
 * Esconde a seção de criação de plano.
 */
export function hide() {
    planCreationSection.style.display = 'none';
}

/**
 * Mostra o indicador de carregamento.
 */
export function showLoading() {
    planLoadingCreateDiv.style.display = 'block';
    createPlanButton.disabled = true;
    cancelCreationButton.disabled = true;
}

/**
 * Esconde o indicador de carregamento.
 */
export function hideLoading() {
    planLoadingCreateDiv.style.display = 'none';
    createPlanButton.disabled = false;
    cancelCreationButton.disabled = false;
}

/**
 * Mostra uma mensagem de erro no formulário.
 * @param {string} message - A mensagem de erro.
 */
export function showError(message) {
    planErrorDiv.textContent = message;
    planErrorDiv.style.display = 'block';
}

/**
 * Esconde a mensagem de erro.
 */
export function hideError() {
    planErrorDiv.style.display = 'none';
}

/**
 * Mostra um aviso relacionado à periodicidade.
 * @param {string} message - A mensagem de aviso.
 */
export function showPeriodicityWarning(message) {
    periodicityWarningDiv.textContent = message;
    periodicityWarningDiv.style.display = 'block';
}

/**
 * Esconde o aviso de periodicidade.
 */
export function hidePeriodicityWarning() {
    periodicityWarningDiv.style.display = 'none';
}