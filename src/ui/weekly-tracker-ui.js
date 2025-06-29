/**
 * @file weekly-tracker-ui.js
 * @description Módulo de UI para gerenciar o Painel de Progresso Semanal Global.
 * É responsável por renderizar o estado das interações do usuário na semana atual.
 */

// Importa os elementos do DOM e as funções de data necessárias
import {
    globalWeeklyTrackerSection,
    globalDayIndicatorElements,
} from './dom-elements.js';

import {
    getUTCWeekId,
    getUTCWeekStartDate,
    getCurrentUTCDateString,
} from '../utils/date-helpers.js';

// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo. Atualmente não requer callbacks, pois é apenas para exibição.
 */
export function init() {
    // Nenhuma inicialização de listener necessária.
}

/**
 * Renderiza o painel de progresso semanal com base nas interações do usuário.
 * @param {object|null} weeklyInteractions - O objeto de interações da semana atual do usuário.
 *   Ex: { weekId: '2023-W40', interactions: { '2023-10-02': true } }
 */
export function render(weeklyInteractions) {
    if (!globalWeeklyTrackerSection || !globalDayIndicatorElements || globalDayIndicatorElements.length === 0) {
        hide();
        return;
    }

    const currentWeekId = getUTCWeekId();
    const weekStartDate = getUTCWeekStartDate();
    const todayStr = getCurrentUTCDateString();
    const nowUTC = new Date();
    const currentUTCDayOfWeek = nowUTC.getUTCDay(); // 0=Dom, 1=Seg, ...

    // Verifica se os dados de interação fornecidos são válidos e para a semana atual
    const isCurrentWeekDataValid = weeklyInteractions &&
                                   weeklyInteractions.weekId === currentWeekId &&
                                   weeklyInteractions.interactions &&
                                   typeof weeklyInteractions.interactions === 'object';

    globalDayIndicatorElements.forEach(el => {
        const dayIndex = parseInt(el.dataset.day, 10);

        // Calcula a data para este indicador de dia específico na semana
        const dateForThisDayIndicator = new Date(weekStartDate);
        dateForThisDayIndicator.setUTCDate(weekStartDate.getUTCDate() + dayIndex);
        const dateStringForIndicator = dateForThisDayIndicator.toISOString().split('T')[0];
        
        const isPastDay = dateStringForIndicator < todayStr;
        const isMarkedRead = isCurrentWeekDataValid && weeklyInteractions.interactions[dateStringForIndicator];

        // Reseta as classes de estado
        el.classList.remove('active', 'missed-day', 'current-day-highlight');

        // Aplica as classes com base na lógica
        if (isMarkedRead) {
            el.classList.add('active');
        } else if (isPastDay) {
            el.classList.add('missed-day');
        }

        // Aplica o destaque para o dia atual
        if (dayIndex === currentUTCDayOfWeek) {
            el.classList.add('current-day-highlight');
        }
    });

    show();
}

/**
 * Mostra o painel do tracker semanal.
 */
export function show() {
    globalWeeklyTrackerSection.style.display = 'block';
}

/**
 * Esconde o painel do tracker semanal.
 */
export function hide() {
    globalWeeklyTrackerSection.style.display = 'none';
}