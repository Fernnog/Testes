/**
 * @file perseverance-panel-ui.js
 * @description Módulo de UI para gerenciar o Painel de Perseverança.
 * É responsável por renderizar a sequência de dias, o recorde, a barra de progresso
 * e os ícones de marcos (milestones) com base nos dados do usuário.
 */

// Importa os elementos do DOM necessários para este painel
import {
    perseveranceSection,
    currentDaysText,
    recordDaysText,
    perseveranceProgressFill,
} from './dom-elements.js';

// NOVA IMPORTAÇÃO: Traz a lógica de cálculo do módulo de utilitários
import { calculateCumulativeMilestones } from '../utils/milestone-helpers.js';


// --- Funções Privadas de Renderização ---

/**
 * Atualiza a barra de progresso visual com base na sequência atual e no recorde.
 * (Esta função permanece inalterada)
 * @param {number} current - A sequência atual de dias.
 * @param {number} longest - O recorde de dias.
 */
function _renderProgressBar(current, longest) {
    let percentage = longest > 0 ? (current / longest) * 100 : 0;
    percentage = Math.min(100, Math.max(0, percentage)); // Garante que a % esteja entre 0 e 100

    perseveranceProgressFill.style.width = percentage + '%';
    currentDaysText.textContent = current;
    recordDaysText.textContent = longest;
}

/**
 * Renderiza os marcos de perseverança no DOM.
 * A lógica de cálculo foi abstraída para o `milestone-helpers.js`.
 * (Esta função foi completamente refatorada)
 * @param {number} current - A sequência atual de dias.
 * @param {number} longest - O recorde de dias.
 */
function _renderMilestoneIcons(current, longest) {
    // Seleção dos elementos do DOM
    const crownIcon = perseveranceSection.querySelector('.record-crown');
    // MODIFICADO: Seleciona o novo container dinâmico
    const container = document.getElementById('cumulative-milestones-container');
    
    if (!container || !crownIcon) {
        console.error("Elementos essenciais para os marcos não encontrados.");
        return;
    }

    // 1. Limpa o conteúdo anterior e reseta a coroa
    container.innerHTML = '';
    crownIcon.classList.remove('achieved');

    // 2. Lógica da Coroa (continua sendo uma responsabilidade da UI)
    if (longest > 0 && current >= longest) {
        crownIcon.classList.add('achieved');
    }

    // 3. Obtém os marcos calculados chamando a função do helper
    const achievedMilestones = calculateCumulativeMilestones(current);

    // 4. Renderiza os marcos recebidos no DOM
    achievedMilestones.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'milestone-item';

        const iconEl = document.createElement('span');
        iconEl.className = 'icon achieved'; // Aplica a classe para animação
        iconEl.textContent = item.icon;
        itemEl.appendChild(iconEl);

        if (item.count > 1) {
            const counterEl = document.createElement('span');
            counterEl.className = 'counter';
            counterEl.textContent = `x${item.count}`;
            itemEl.appendChild(counterEl);
        }
        
        container.appendChild(itemEl);
    });
}


// --- Funções Públicas (API do Módulo) ---
// (Estas funções permanecem inalteradas)

/**
 * Inicializa o módulo. Atualmente não requer callbacks.
 */
export function init() {
    // Nenhuma inicialização de listener necessária, pois o painel é apenas para exibição.
}

/**
 * Renderiza todo o painel de perseverança com base nos dados do usuário.
 * @param {object} userInfo - O objeto de dados do usuário contendo as informações da sequência.
 *                           Espera-se que tenha `currentStreak` e `longestStreak`.
 */
export function render(userInfo) {
    if (!userInfo || typeof userInfo.currentStreak === 'undefined' || typeof userInfo.longestStreak === 'undefined') {
        hide();
        return;
    }

    const consecutiveDays = userInfo.currentStreak || 0;
    const recordDays = userInfo.longestStreak || 0;

    _renderProgressBar(consecutiveDays, recordDays);
    _renderMilestoneIcons(consecutiveDays, recordDays);

    show();
}

/**
 * Mostra o painel de perseverança.
 */
export function show() {
    perseveranceSection.style.display = 'block';
}

/**
 * Esconde o painel de perseverança.
 */
export function hide() {
    perseveranceSection.style.display = 'none';
}
