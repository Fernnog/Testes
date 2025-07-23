/**
 * @file plan-creation-ui.js
 * @description Módulo de UI para gerenciar o formulário de criação e edição de planos de leitura.
 * Lida com a visibilidade de opções, coleta de dados do formulário e feedback ao usuário.
 */

// Importa os elementos do DOM necessários
import {
    planCreationSection,
    planCreationTitle,
    editingPlanIdInput,
    planErrorDiv,
    planLoadingCreateDiv,
    planNameInput,
    googleDriveLinkInput,
    iconSelectorContainer,
    planStructureFieldset,
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
import { SELECTABLE_ICONS } from '../config/icon-config.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onSubmit: null, // Callback unificado para criação e edição
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
 * Popula o seletor de ícones com as opções disponíveis.
 */
function _populateIconSelector() {
    iconSelectorContainer.innerHTML = ''; // Limpa antes de popular
    SELECTABLE_ICONS.forEach((icon, index) => {
        const isChecked = index === 0; // Marca o primeiro como padrão
        const iconOptionHTML = `
            <div class="icon-option">
                <input type="radio" id="icon-radio-${index}" name="plan-icon" value="${icon}" ${isChecked ? 'checked' : ''}>
                <label for="icon-radio-${index}" class="icon-label">${icon}</label>
            </div>
        `;
        iconSelectorContainer.insertAdjacentHTML('beforeend', iconOptionHTML);
    });
}

/**
 * Reseta todos os campos do formulário para seus valores padrão.
 */
function _resetFormFields() {
    planNameInput.value = "";
    googleDriveLinkInput.value = "";
    editingPlanIdInput.value = ""; // Limpa o ID de edição
    
    // Reseta o ícone para o primeiro da lista
    const firstIconRadio = iconSelectorContainer.querySelector('input[type="radio"]');
    if (firstIconRadio) firstIconRadio.checked = true;
    
    // Reseta os campos de estrutura do plano
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
    
    document.querySelector('input[name="creation-method"][value="interval"]').checked = true;
    document.querySelector('input[name="duration-method"][value="days"]').checked = true;
    
    periodicityCheckboxes.forEach(cb => {
        const dayVal = parseInt(cb.value, 10);
        cb.checked = (dayVal >= 1 && dayVal <= 5);
    });

    hideError();
    _toggleFormOptions();
}

/**
 * Alterna a visibilidade das opções do formulário com base nas seleções de rádio.
 */
function _toggleFormOptions() {
    const creationMethod = document.querySelector('input[name="creation-method"]:checked').value;
    const durationMethod = document.querySelector('input[name="duration-method"]:checked').value;

    intervalOptionsDiv.style.display = creationMethod === 'interval' ? 'block' : 'none';
    selectionOptionsDiv.style.display = (creationMethod === 'selection' || creationMethod === 'chapters-per-day') ? 'block' : 'none';
    
    const showChaptersPerDay = creationMethod === 'chapters-per-day';
    chaptersPerDayOptionDiv.style.display = showChaptersPerDay ? 'block' : 'none';
    daysOptionDiv.style.display = !showChaptersPerDay && durationMethod === 'days' ? 'block' : 'none';
    endDateOptionDiv.style.display = !showChaptersPerDay && durationMethod === 'end-date' ? 'block' : 'none';

    durationMethodRadios.forEach(r => r.disabled = showChaptersPerDay);

    if (endDateOptionDiv.style.display === 'block' && !startDateInput.value) {
        const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
        startDateInput.value = todayLocal.toISOString().split('T')[0];
    }
}

/**
 * Lida com a submissão do formulário, seja para criar ou editar.
 * // CÓDIGO MODIFICADO E CORRIGIDO
 */
function _handleFormSubmit() {
    hideError();
    
    const planId = editingPlanIdInput.value || null;
    
    // Detecta de forma confiável se estamos no modo de reavaliação.
    // A condição é: estamos editando (planStructureFieldset estaria desabilitado) E
    // a seção de periodicidade foi a única habilitada dentro dele.
    const isReassessing = planId && planStructureFieldset.disabled === false && 
                          document.getElementById('periodicity-options').disabled === false;

    // Coleta os dados que são comuns a ambos os modos (criação e edição)
    const formData = {
        name: planNameInput.value.trim(),
        icon: document.querySelector('input[name="plan-icon"]:checked').value,
        googleDriveLink: googleDriveLinkInput.value.trim(),
    };

    if (planId) {
        // Se estivermos especificamente reavaliando, adiciona os dias da semana.
        if (isReassessing) {
            formData.allowedDays = Array.from(periodicityCheckboxes)
                                        .filter(cb => cb.checked)
                                        .map(cb => parseInt(cb.value, 10));
        }
    } else {
        // Lógica de criação (permanece a mesma)
        Object.assign(formData, {
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
        });
    }

    if (!formData.name) {
        showError("Por favor, dê um nome ao seu plano.");
        planNameInput.focus();
        return;
    }
    
    // A chamada de callback agora inclui o flag 'isReassessing'
    if (state.callbacks.onSubmit) {
        state.callbacks.onSubmit(formData, planId, isReassessing);
    }
}


// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo.
 * @param {object} callbacks - Objeto com os callbacks { onSubmit, onCancel }.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    _populateBookSelectors();
    _populateIconSelector();

    creationMethodRadios.forEach(radio => radio.addEventListener('change', _toggleFormOptions));
    durationMethodRadios.forEach(radio => radio.addEventListener('change', _toggleFormOptions));
    
    createPlanButton.addEventListener('click', _handleFormSubmit);
    cancelCreationButton.addEventListener('click', () => state.callbacks.onCancel?.());
}

/**
 * Mostra a seção de criação de plano em MODO DE CRIAÇÃO.
 * @param {boolean} isPlanListEmpty - Informa se o usuário já tem outros planos.
 */
export function show(isPlanListEmpty = true) {
    state.isPlanListEmpty = isPlanListEmpty;
    _resetFormFields();
    
    planCreationTitle.textContent = "Criar Novo Plano";
    createPlanButton.textContent = "Criar Plano";
    planStructureFieldset.disabled = false; // Garante que a estrutura esteja editável
    
    // Reseta estilos que podem ter sido aplicados pelo modo de reavaliação
    const periodicityFieldset = document.getElementById('periodicity-options');
    if (periodicityFieldset) {
        periodicityFieldset.style.border = '1px solid var(--border-color)';
        // Habilita todos os fieldsets internos para o modo de criação padrão
        planStructureFieldset.querySelectorAll('fieldset').forEach(fs => fs.disabled = false);
    }

    cancelCreationButton.style.display = isPlanListEmpty ? 'none' : 'inline-block';
    planCreationSection.style.display = 'block';
    window.scrollTo(0, 0);
}

/**
 * Abre e preenche o formulário para MODO DE EDIÇÃO.
 * @param {object} plan - O objeto do plano a ser editado.
 */
export function openForEditing(plan) {
    _resetFormFields();
    
    planCreationTitle.textContent = "Editar Plano";
    createPlanButton.textContent = "Salvar Alterações";

    // Preenche os campos com os dados do plano existente
    editingPlanIdInput.value = plan.id;
    planNameInput.value = plan.name || "";
    googleDriveLinkInput.value = plan.googleDriveLink || "";

    // Seleciona o ícone correto
    const iconRadio = iconSelectorContainer.querySelector(`input[value="${plan.icon}"]`);
    if (iconRadio) {
        iconRadio.checked = true;
    } else {
        // Se o ícone do plano não estiver na lista (ex: ícone de plano favorito), seleciona o primeiro
        iconSelectorContainer.querySelector('input[type="radio"]')?.setAttribute('checked', 'true');
    }

    // Desabilita a edição da estrutura do plano (capítulos, duração etc)
    planStructureFieldset.disabled = true;

    // Reseta estilos que podem ter sido aplicados pelo modo de reavaliação
    const periodicityFieldset = document.getElementById('periodicity-options');
    if (periodicityFieldset) {
        periodicityFieldset.style.border = '1px solid var(--border-color)';
    }
    
    cancelCreationButton.style.display = 'inline-block';
    planCreationSection.style.display = 'block';
    window.scrollTo(0, 0);
}

/**
 * Abre o formulário em um modo especial para reavaliação,
 * permitindo editar apenas os dias da semana.
 * @param {object} plan - O objeto do plano a ser editado.
 */
export function openForReassessment(plan) {
    // 1. Reutilizamos a função de edição, que preenche os dados mas desabilita a estrutura inteira.
    openForEditing(plan);

    // 2. Sobrescrevemos os textos para o contexto de reavaliação.
    planCreationTitle.textContent = "Ajustar Dias de Leitura";
    createPlanButton.textContent = "Salvar Dias";

    // 3. A CORREÇÃO DEFINITIVA:
    // Forçamos o fieldset PAI a se tornar habilitado novamente.
    // Isso "quebra" a herança do estado desabilitado que veio de openForEditing.
    planStructureFieldset.disabled = false;

    // 4. Agora que o pai está habilitado, podemos controlar seus filhos.
    // Desabilitamos individualmente todas as outras seções que NÃO SÃO de periodicidade.
    const fieldsetsToDisable = planStructureFieldset.querySelectorAll('fieldset:not(#periodicity-options)');
    fieldsetsToDisable.forEach(fieldset => {
        fieldset.disabled = true;
    });

    // 5. Por fim, garantimos que a seção de periodicidade esteja funcional e destacada.
    const periodicityFieldset = document.getElementById('periodicity-options');
    if (periodicityFieldset) {
        periodicityFieldset.disabled = false; // Garante que está habilitado
        periodicityFieldset.style.border = '2px dashed var(--primary-action)';
        periodicityFieldset.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 6. Preenchemos as checkboxes com os dias atuais do plano.
    const allowedDays = plan.allowedDays || [];
    periodicityCheckboxes.forEach(cb => {
        cb.checked = allowedDays.includes(parseInt(cb.value, 10));
    });
}

/**
 * Esconde a seção de criação/edição.
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
