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
import { getCurrentUTCDateString, formatUTCDateStringToBrasilian, countReadingDaysBetween } from '../utils/date-helpers.js';

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
    
    // --- INÍCIO DA ALTERAÇÃO: Adicionado o .shield-wrapper ---
    itemEl.innerHTML = `
        <div class="${type}-date">${formattedDate}</div>
        <div class="${type}-plan-name">
            <div class="shield-wrapper"><span class="plan-icon">${plan.icon || '📖'}</span></div>
            <span>${plan.name}</span>
        </div>
        <div class="${type}-chapters">${chaptersText}</div>
    `;
    // --- FIM DA ALTERAÇÃO ---

    itemEl.addEventListener('click', () => {
        if (onSwitchPlan) {
            onSwitchPlan(plan.id);
        }
    });

    return itemEl;
}

/**
 * Cria o elemento HTML para a sugestão de recálculo.
 * @private
 * @param {object} plan - O plano que necessita de recálculo.
 * @param {number} daysLate - Quantos dias de leitura o plano está atrasado.
 * @param {Function} onRecalculate - Callback para acionar o modal de recálculo.
 * @returns {HTMLElement} O elemento div criado.
 */
function _createRecalcSuggestionElement(plan, daysLate, onRecalculate) {
    const itemEl = document.createElement('div');
    itemEl.className = 'recalc-suggestion-item';

    // --- INÍCIO DA ALTERAÇÃO: Adicionado o .shield-wrapper ---
    itemEl.innerHTML = `
        <div class="recalc-plan-name">
            <div class="shield-wrapper"><span class="plan-icon">${plan.icon || '📖'}</span></div>
            <span>${plan.name}</span>
        </div>
        <p class="recalc-suggestion-text">
            Este plano parece estar <strong>${daysLate} dias de leitura</strong> atrasado. Que tal ajustar o ritmo para voltar aos trilhos?
        </p>
        <button class="recalc-suggestion-button">Recalcular Plano</button>
    `;
    // --- FIM DA ALTERAÇÃO ---

    const button = itemEl.querySelector('button');
    button.addEventListener('click', (e) => {
        e.stopPropagation(); // Previne o clique de acionar o onSwitchPlan no container
        onRecalculate?.(plan.id);
    });

    // O item todo ainda pode ser clicado para navegar até o plano
    itemEl.addEventListener('click', () => {
        const targetElement = document.getElementById(`plan-card-${plan.id}`);
        targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
 * @param {object} callbacks - Objeto contendo os callbacks { onSwitchPlan, onRecalculate }.
 */
export function render(allUserPlans, callbacks) {
    overdueReadingsListDiv.innerHTML = '';
    upcomingReadingsListDiv.innerHTML = '';
    
    if (!allUserPlans || allUserPlans.length === 0) {
        hide();
        return;
    }

    const todayStr = getCurrentUTCDateString();
    let hasOverdueItems = false;
    const upcomingReadings = [];
    const UPCOMING_DAYS_WINDOW = 10; // Define quantos dias de leitura vamos projetar para o futuro

    allUserPlans.forEach(plan => {
        const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
        if (plan.currentDay > totalReadingDaysInPlan) {
            return; // Ignora planos já concluídos
        }

        // --- LÓGICA DE ATRASADOS ---
        const firstEffectiveDateStr = getEffectiveDateForDay(plan, plan.currentDay);
        if (!firstEffectiveDateStr) return; 

        if (firstEffectiveDateStr < todayStr) {
            hasOverdueItems = true;
            const readingDaysLate = countReadingDaysBetween(firstEffectiveDateStr, todayStr, plan.allowedDays);
            
            // --- INÍCIO DA ALTERAÇÃO: Lógica de dias de atraso corrigida ---
            // Aumentamos o limite para 3 para tornar a sugestão menos agressiva e mais precisa.
            if (readingDaysLate >= 3) {
            // --- FIM DA ALTERAÇÃO ---
                const suggestionEl = _createRecalcSuggestionElement(plan, readingDaysLate, callbacks.onRecalculate);
                overdueReadingsListDiv.appendChild(suggestionEl);
            } else {
                const chaptersForDay = plan.plan[plan.currentDay.toString()] || [];
                const readingItem = { plan, date: firstEffectiveDateStr, chapters: chaptersForDay };
                const itemEl = _createReadingItemElement(readingItem, 'overdue', callbacks.onSwitchPlan);
                overdueReadingsListDiv.appendChild(itemEl);
            }
        }
        
        // --- LÓGICA DE PRÓXIMAS LEITURAS (Ciclo Semanal) ---
        // Para cada plano, projetamos suas próximas N leituras
        for (let i = 0; i < UPCOMING_DAYS_WINDOW; i++) {
            const dayNumber = plan.currentDay + i;
            if (dayNumber > totalReadingDaysInPlan) {
                break; // Para de projetar se o plano acabou
            }

            const projectedDateStr = getEffectiveDateForDay(plan, dayNumber);

            // Adiciona à lista apenas se a data for de hoje em diante
            if (projectedDateStr && projectedDateStr >= todayStr) {
                const chapters = plan.plan[dayNumber.toString()] || [];
                upcomingReadings.push({
                    plan,
                    date: projectedDateStr,
                    chapters
                });
            }
        }
    });

    // --- RENDERIZAÇÃO FINAL ---

    // Controle de Visibilidade dos Atrasados
    overdueReadingsSection.style.display = hasOverdueItems ? 'block' : 'none';
    
    // 1. Ordena a lista AGREGADA de todas as próximas leituras por data
    upcomingReadings.sort((a, b) => a.date.localeCompare(b.date));

    // 2. Remove duplicatas (caso um recálculo tenha gerado datas sobrepostas)
    const uniqueUpcomingReadings = upcomingReadings.filter((reading, index, self) =>
        index === self.findIndex((r) => (
            r.date === reading.date && r.plan.id === reading.plan.id
        ))
    );
    
    // 3. Pega os 7 primeiros itens para criar a visão semanal
    const nextReadingsToShow = uniqueUpcomingReadings.slice(0, 7);
    
    if (nextReadingsToShow.length > 0) {
        upcomingReadingsListDiv.innerHTML = ''; // Limpa antes de adicionar
        nextReadingsToShow.forEach(itemData => {
            const itemEl = _createReadingItemElement(itemData, 'upcoming', callbacks.onSwitchPlan);
            upcomingReadingsListDiv.appendChild(itemEl);
        });
        upcomingReadingsSection.style.display = 'block';
    } else {
        // Se, após toda a projeção, não houver leituras futuras, esconde o painel
        upcomingReadingsSection.style.display = 'none';
    }

    show();
}

/**
 * Mostra os painéis laterais (a visibilidade interna é controlada por `render`).
 */
export function show() {
    // A função render agora controla a visibilidade de cada seção individualmente
}

/**
 * Esconde ambos os painéis laterais.
 */
export function hide() {
    overdueReadingsSection.style.display = 'none';
    upcomingReadingsSection.style.display = 'none';
}