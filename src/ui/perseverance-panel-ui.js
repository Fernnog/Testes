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

// Seletores específicos para os ícones, internos ao módulo
const milestoneIcons = {
    crown: perseveranceSection.querySelector('.record-crown'),
    sun: perseveranceSection.querySelector('[data-milestone="sun"]'),
    diamond: perseveranceSection.querySelector('[data-milestone="diamond"]'),
    tree: perseveranceSection.querySelector('[data-milestone="tree"]'),
    flame: perseveranceSection.querySelector('[data-milestone="flame"]'),
    seed: perseveranceSection.querySelector('[data-milestone="seed"]'),
    starContainer: document.getElementById('starContainer'), // Container para as estrelas
};


// --- Funções Privadas de Renderização ---

/**
 * Atualiza a barra de progresso visual com base na sequência atual e no recorde.
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
 * Atualiza a visibilidade e o estado dos ícones de marcos.
 * @param {number} current - A sequência atual de dias.
 * @param {number} longest - O recorde de dias.
 */
function _renderMilestoneIcons(current, longest) {
    // 1. Reseta todos os ícones para o estado padrão
    Object.values(milestoneIcons).forEach(icon => {
        if (icon && icon.classList) { // Verifica se o ícone existe
            icon.classList.remove('achieved');
        }
    });
    if (milestoneIcons.starContainer) {
        milestoneIcons.starContainer.innerHTML = ''; // Limpa as estrelas
    }

    // 2. Lógica para a coroa (atingiu ou superou o recorde)
    if (longest > 0 && current >= longest) {
        milestoneIcons.crown?.classList.add('achieved');
    }

    // 3. Lógica para os marcos principais (hierárquica)
    if (current >= 1000) {
        milestoneIcons.sun?.classList.add('achieved');
    } else if (current >= 365) {
        milestoneIcons.diamond?.classList.add('achieved');
    } else if (current >= 100) {
        milestoneIcons.tree?.classList.add('achieved');
    }

    // 4. Lógica para as estrelas (representam múltiplos de 30 dias)
    // Mostra estrelas entre 30 e 99 dias, e depois novamente a partir de 100 (junto com a árvore/diamante).
    if (current >= 30 && milestoneIcons.starContainer) {
        let starCount = 0;
        if (current >= 100) { // Árvore/Diamante + Estrelas
            // Ex: 130 dias = Árvore + 1 estrela. 100-129 = árvore. 130 = arvore + estrela
            // A legenda diz 100d, então a primeira estrela vem com 130.
            starCount = Math.floor((current - 100) / 30);
        } else { // Apenas Estrelas
            starCount = Math.floor(current / 30);
        }
        
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('span');
            star.className = 'star-icon achieved';
            star.textContent = '⭐';
            milestoneIcons.starContainer.appendChild(star);
        }
    }
    
    // 5. Lógica para os marcos de ciclo (semente e chama)
    // Mostra apenas antes de atingir o marco de 100 dias.
    if (current > 0 && current < 100) {
        const daysInCurrentCycle = current % 30; // Dias dentro do ciclo atual de 30 dias
        if (daysInCurrentCycle >= 15) {
            milestoneIcons.flame?.classList.add('achieved');
        } else if (daysInCurrentCycle >= 7) {
            milestoneIcons.seed?.classList.add('achieved');
        }
    }
}


// --- Funções Públicas (API do Módulo) ---

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