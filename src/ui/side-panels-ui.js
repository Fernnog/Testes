// src/ui/side-panels-ui.js

/**
 * @file side-panels-ui.js
 * @description Módulo de UI responsável por renderizar os painéis de leituras
 * atrasadas e próximas, que oferecem uma visão geral de todos os planos.
 */

import {
    overdueReadingsSection,
    overdueReadingsLoadingDiv,
    overdueReadingsListDiv,
    upcomingReadingsSection,
    upcomingReadingsLoadingDiv,
    upcomingReadingsListDiv,
} from './dom-elements.js';

import { getEffectiveDateForDay } from '../utils/plan-logic-helpers.js';
import { getCurrentUTCDateString, formatUTCDateStringToBrasilian } from '../utils/date-helpers.js';

// --- Funções Privadas de Renderização ---

/**
 * Cria e retorna o elemento HTML para um item de leitura (seja atrasado ou próximo).
 * @param {object} itemData - Dados do item contendo { plan, date, chapters }.
 * @param {string} type - 'overdue' ou 'upcoming'.
 * @param {Function} onSwitchPlan - Callback para trocar o plano.
 * @returns {HTMLElement} O elemento div criado.
 */
function _createReadingItemElement(itemData, type, onSwitchPlan) {
    const itemEl = document.createElement('div');
    const { plan, date, chapters } = itemData;

    itemEl.className = type === 'overdue' ? 'overdue-reading-item' : 'upcoming-reading-item';
    itemEl.dataset.planId = plan.id;
    itemEl.style.cursor = 'pointer';
    itemEl.title = `Clique para ativar o plano "${plan.name}"`;

    const formattedDate = formatUTCDateStringToBrasilian(date);
    const chaptersText = chapters.length > 0 ? chapters.join(', ') : 'N/A';
    
    itemEl.innerHTML = `
        <div class="${type}-date">${formattedDate}</div>
        <div class="${type}-plan-name">${plan.name}</div>
        <div class="${type}-chapters">${chaptersText}</div>
    `;

    itemEl.addEventListener('click', () => {
        if (onSwitchPlan) {
            onSwitchPlan(plan.id);
        }
    });

    return itemEl;
}


// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo.
 */
export function init() {
    // Nenhuma inicialização de listener necessária neste momento.
}

/**
 * Renderiza os painéis de leituras atrasadas e próximas.
 * @param {Array<object>} allUserPlans - Lista de todos os planos do usuário.
 * @param {string|null} activePlanId - O ID do plano ativo (não usado diretamente aqui, mas bom ter).
 * @param {Function} onSwitchPlan - Callback para trocar de plano ao clicar em um item.
 */
export function render(allUserPlans, activePlanId, onSwitchPlan) {
    overdueReadingsListDiv.innerHTML = '';
    upcomingReadingsListDiv.innerHTML = '';
    
    if (!allUserPlans || allUserPlans.length === 0) {
        hide();
        return;
    }

    const todayStr = getCurrentUTCDateString();
    const overdueReadings = [];
    const upcomingReadings = [];

    allUserPlans.forEach(plan => {
        const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
        // Ignora planos já concluídos
        if (plan.currentDay > totalReadingDaysInPlan) {
            return;
        }

        const effectiveDateStr = getEffectiveDateForDay(plan, plan.currentDay);
        
        if (effectiveDateStr) {
            const chaptersForDay = plan.plan[plan.currentDay.toString()] || [];
            const readingItem = { plan, date: effectiveDateStr, chapters: chaptersForDay };

            if (effectiveDateStr < todayStr) {
                overdueReadings.push(readingItem);
            } else {
                upcomingReadings.push(readingItem);
            }
        }
    });

    // Ordena as listas por data
    overdueReadings.sort((a, b) => a.date.localeCompare(b.date)); // Mais antigas primeiro
    upcomingReadings.sort((a, b) => a.date.localeCompare(b.date)); // Mais próximas primeiro

    // Renderiza itens atrasados
    if (overdueReadings.length > 0) {
        overdueReadings.forEach(item => {
            const itemEl = _createReadingItemElement(item, 'overdue', onSwitchPlan);
            overdueReadingsListDiv.appendChild(itemEl);
        });
        overdueReadingsSection.style.display = 'block';
    } else {
        overdueReadingsSection.style.display = 'none';
    }

    // Renderiza próximos itens
    if (upcomingReadings.length > 0) {
        // Limita a exibição para as próximas 7 leituras, por exemplo, para não poluir a tela
        const nextReadingsToShow = upcomingReadings.slice(0, 7);
        nextReadingsToShow.forEach(item => {
            const itemEl = _createReadingItemElement(item, 'upcoming', onSwitchPlan);
            upcomingReadingsListDiv.appendChild(itemEl);
        });
        upcomingReadingsSection.style.display = 'block';
    } else {
        upcomingReadingsListDiv.innerHTML = '<p>Nenhuma leitura programada para hoje ou para os próximos dias em seus planos ativos.</p>';
        upcomingReadingsSection.style.display = 'block'; // Mostra a mensagem
    }

    // Garante que a seção principal de "Próximas Leituras" apareça mesmo que vazia, para dar feedback.
    // A seção de atrasadas só aparece se houver itens.
    show();
}

/**
 * Mostra os painéis laterais (a visibilidade interna é controlada por `render`).
 */
export function show() {
    // A função render agora controla a visibilidade de cada seção individualmente
    // Esta função garante que os containers não estejam com `display: none` no nível do body.
}

/**
 * Esconde ambos os painéis laterais.
 */
export function hide() {
    overdueReadingsSection.style.display = 'none';
    upcomingReadingsSection.style.display = 'none';
}
