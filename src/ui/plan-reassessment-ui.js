/**
 * @file plan-reassessment-ui.js
 * @description Módulo de UI para gerenciar o Quadro de Carga Semanal, permitindo
 * que o usuário visualize a distribuição de seus planos e inicie a reavaliação.
 * INCLUI FUNCIONALIDADE DE DRAG & DROP PARA DESKTOP E TOUCH E VISUALIZAÇÃO DE CARGA.
 */

// --- Importações de Elementos do DOM ---
import {
    planReassessmentSection,
    closeReassessmentButton,
    reassessmentGrid,
    reassessmentLegendList,
    // INÍCIO DA ALTERAÇÃO: Importado o novo botão
    syncPlansButton,
    // FIM DA ALTERAÇÃO
} from './dom-elements.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onClose: null,
        onPlanSelect: null,
        onUpdatePlanDays: null,
        // INÍCIO DA ALTERAÇÃO: Adicionado o novo callback
        onSyncRequest: null,
        // FIM DA ALTERAÇÃO
    },
};

// --- Funções Privadas de Renderização ---

/**
 * Renderiza a grade de dias e a legenda com base nos planos do usuário.
 * @private
 * @param {Array<object>} allUserPlans - A lista completa de planos do usuário.
 */
function _renderGridAndLegend(allUserPlans) {
    reassessmentGrid.innerHTML = '';
    reassessmentLegendList.innerHTML = '';

    if (!allUserPlans || allUserPlans.length === 0) {
        reassessmentGrid.innerHTML = '<p>Nenhum plano ativo encontrado para reavaliar.</p>';
        return;
    }

    const weeklyLoad = {};
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const activePlansForLegend = new Map();
    const CHAPTER_OVERLOAD_THRESHOLD = 20; // Limite para alerta de sobrecarga

    // 1. Calcular a "carga" de capítulos para cada plano
    allUserPlans.forEach(plan => {
        const totalReadingDays = Object.keys(plan.plan || {}).length;
        if (totalReadingDays === 0) return; // Ignora planos vazios

        const avgChapters = Math.ceil(plan.totalChapters / totalReadingDays);
        if (avgChapters < 1) return;

        (plan.allowedDays || []).forEach(dayIndex => {
            if (dayIndex >= 0 && dayIndex <= 6) {
                if (!weeklyLoad[dayIndex]) {
                    weeklyLoad[dayIndex] = [];
                }
                weeklyLoad[dayIndex].push({
                    id: plan.id,
                    icon: plan.icon || '📖',
                    chapters: avgChapters
                });
            }
        });
        
        if (!activePlansForLegend.has(plan.id)) {
            activePlansForLegend.set(plan.id, { icon: plan.icon || '📖', name: plan.name || 'Plano sem nome' });
        }
    });

    // 2. Renderizar as colunas da grade no DOM
    daysOfWeek.forEach((dayName, index) => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'reassessment-day-column';
        dayColumn.dataset.day = index; // Adiciona o data-day para identificação fácil
        
        let entriesHTML = '';
        let totalChaptersThisDay = 0;

        if (weeklyLoad[index]) {
            weeklyLoad[index].sort((a, b) => b.chapters - a.chapters);

            weeklyLoad[index].forEach(entry => {
                totalChaptersThisDay += entry.chapters;
                entriesHTML += `
                    <div class="reassessment-plan-entry" data-plan-id="${entry.id}" draggable="true" title="Arraste para remanejar o plano">
                        <span class="plan-icon">${entry.icon}</span>
                        <span class="chapter-count">${entry.chapters} cap.</span>
                    </div>
                `;
            });
        }
        
        // Verifica se há sobrecarga e adiciona a classe correspondente
        if (totalChaptersThisDay > CHAPTER_OVERLOAD_THRESHOLD) {
            dayColumn.classList.add('overload');
        }

        const totalLoadHTML = `<span class="total-load">Total: ${totalChaptersThisDay} caps</span>`;
        dayColumn.innerHTML = `<div class="reassessment-day-header">${dayName}${totalLoadHTML}</div><div class="day-entries">${entriesHTML}</div>`;
        reassessmentGrid.appendChild(dayColumn);
    });

    // 3. Renderizar a legenda dos planos ativos
    if (activePlansForLegend.size > 0) {
        activePlansForLegend.forEach(planData => {
            reassessmentLegendList.innerHTML += `
                <div class="reassessment-legend-item">
                    <span class="plan-icon">${planData.icon}</span>
                    <span>${planData.name}</span>
                </div>
            `;
        });
    } else {
        reassessmentLegendList.innerHTML = '<p>Nenhum plano com ícone e nome para exibir na legenda.</p>';
    }
}

// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo, configurando os listeners para clique, Drag & Drop e sincronização.
 * @param {object} callbacks - Objeto contendo os callbacks { onClose, onPlanSelect, onUpdatePlanDays, onSyncRequest }.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    closeReassessmentButton.addEventListener('click', () => state.callbacks.onClose?.());
    // INÍCIO DA ALTERAÇÃO: Adicionado o listener para o botão de sincronização
    syncPlansButton.addEventListener('click', () => state.callbacks.onSyncRequest?.());
    // FIM DA ALTERAÇÃO

    reassessmentGrid.addEventListener('click', (event) => {
        const planEntry = event.target.closest('.reassessment-plan-entry');
        if (planEntry && planEntry.dataset.planId) {
            state.callbacks.onPlanSelect?.(planEntry.dataset.planId);
        }
    });

    // --- LÓGICA DE DRAG & DROP (DESKTOP) ---
    let draggedItem = null;

    reassessmentGrid.addEventListener('dragstart', (e) => {
        const target = e.target.closest('.reassessment-plan-entry');
        if (target) {
            draggedItem = target;
            setTimeout(() => target.classList.add('dragging'), 0);
            e.dataTransfer.setData('text/plain', target.dataset.planId);
            e.dataTransfer.effectAllowed = 'move';
        }
    });
    
    reassessmentGrid.addEventListener('dragend', () => {
        draggedItem?.classList.remove('dragging');
        draggedItem = null;
    });
    
    reassessmentGrid.addEventListener('dragover', (e) => e.preventDefault());

    reassessmentGrid.addEventListener('dragenter', (e) => {
        const targetColumn = e.target.closest('.reassessment-day-column');
        if (targetColumn) {
            e.preventDefault();
            targetColumn.classList.add('over');
        }
    });

    reassessmentGrid.addEventListener('dragleave', (e) => {
        e.target.closest('.reassessment-day-column')?.classList.remove('over');
    });

    reassessmentGrid.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetColumn = e.target.closest('.reassessment-day-column');
        document.querySelectorAll('.reassessment-day-column.over').forEach(col => col.classList.remove('over'));

        if (targetColumn && draggedItem) {
            const planId = draggedItem.dataset.planId;
            const sourceColumn = draggedItem.closest('.reassessment-day-column');
            const sourceDay = parseInt(sourceColumn.dataset.day, 10);
            const targetDay = parseInt(targetColumn.dataset.day, 10);

            if (sourceDay !== targetDay) {
                state.callbacks.onUpdatePlanDays?.(planId, sourceDay, targetDay);
            }
        }
    });
    
    // --- LÓGICA DE DRAG & DROP (TOUCH) ---
    let touchDraggedItem = null;
    let ghostElement = null;
    let lastTouchTargetColumn = null;
    
    reassessmentGrid.addEventListener('touchstart', (e) => {
        const target = e.target.closest('.reassessment-plan-entry');
        if (target) {
            touchDraggedItem = target;
            touchDraggedItem.classList.add('dragging');
            
            ghostElement = touchDraggedItem.cloneNode(true);
            ghostElement.classList.add('touch-ghost');
            document.body.appendChild(ghostElement);
            
            const touch = e.touches[0];
            ghostElement.style.left = `${touch.clientX}px`;
            ghostElement.style.top = `${touch.clientY}px`;
        }
    }, { passive: true });
    
    reassessmentGrid.addEventListener('touchmove', (e) => {
        if (!touchDraggedItem || !ghostElement) return;
        
        e.preventDefault();
        
        const touch = e.touches[0];
        ghostElement.style.left = `${touch.clientX}px`;
        ghostElement.style.top = `${touch.clientY}px`;
        
        ghostElement.style.display = 'none';
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        ghostElement.style.display = '';

        const currentTargetColumn = elementBelow ? elementBelow.closest('.reassessment-day-column') : null;

        if (lastTouchTargetColumn !== currentTargetColumn) {
            lastTouchTargetColumn?.classList.remove('over');
            currentTargetColumn?.classList.add('over');
            lastTouchTargetColumn = currentTargetColumn;
        }
    }, { passive: false });
    
    reassessmentGrid.addEventListener('touchend', () => {
        if (!touchDraggedItem) return;
        
        if (lastTouchTargetColumn) {
            const planId = touchDraggedItem.dataset.planId;
            const sourceColumn = touchDraggedItem.closest('.reassessment-day-column');
            const sourceDay = parseInt(sourceColumn.dataset.day, 10);
            const targetDay = parseInt(lastTouchTargetColumn.dataset.day, 10);
            
            if (sourceDay !== targetDay) {
                state.callbacks.onUpdatePlanDays?.(planId, sourceDay, targetDay);
            }
        }
        
        touchDraggedItem.classList.remove('dragging');
        ghostElement?.remove();
        lastTouchTargetColumn?.classList.remove('over');
        
        touchDraggedItem = null;
        ghostElement = null;
        lastTouchTargetColumn = null;
    });
}

/**
 * Renderiza o conteúdo do quadro de reavaliação com os dados mais recentes.
 * @param {Array<object>} allUserPlans - A lista completa de planos do usuário.
 */
export function render(allUserPlans) {
    _renderGridAndLegend(allUserPlans);
}

/**
 * Mostra a seção de reavaliação de planos.
 */
export function show() {
    planReassessmentSection.style.display = 'block';
    window.scrollTo(0, 0);
}

/**
 * Esconde a seção de reavaliação de planos.
 */
export function hide() {
    planReassessmentSection.style.display = 'none';
}