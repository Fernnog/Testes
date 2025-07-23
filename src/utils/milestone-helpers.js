/**
 * @file milestone-helpers.js
 * @description Módulo de utilitários com a lógica pura para calcular os marcos de perseverança.
 * Este arquivo foi criado para desacoplar a lógica de cálculo da lógica de renderização da UI.
 */

/**
 * Define os marcos de perseverança disponíveis, em ordem hierárquica para o cálculo.
 * Cada marco tem um valor, um ícone e um tipo ('main' para os que podem acumular, 'step' para os de preenchimento).
 * @type {Array<object>}
 */
const MILESTONES_CONFIG = [
    { value: 1000, icon: '☀️', type: 'main' },
    { value: 300,  icon: '💎', type: 'main' },
    { value: 100,  icon: '🌳', type: 'main' },
    { value: 30,   icon: '⭐', type: 'main' },
    { value: 15,   icon: '🔥', type: 'step' },
    { value: 7,    icon: '🌱', type: 'step' }
];

/**
 * Calcula quais marcos cumulativos foram alcançados com base em um número de dias consecutivos.
 * Implementa a lógica hierárquica e de "troco".
 *
 * @param {number} days - O número total de dias consecutivos de interação.
 * @returns {Array<object>} Um array de objetos, onde cada objeto representa um marco alcançado
 *                            e contém a chave `icon` e `count`. Ex: [{ icon: '🌳', count: 2 }, { icon: '⭐', count: 1 }]
 */
export function calculateCumulativeMilestones(days) {
    if (isNaN(days) || days <= 0) {
        return [];
    }
    
    let remainingDays = days;
    const achievedMilestones = [];

    MILESTONES_CONFIG.forEach(milestone => {
        if (remainingDays < milestone.value) {
            return; // Pula para o próximo marco se não houver dias suficientes
        }

        let count = 0;
        if (milestone.type === 'main') {
            // Marcos principais podem ter contadores (x2, x3)
            count = Math.floor(remainingDays / milestone.value);
            remainingDays %= milestone.value;
        } else {
            // Marcos de etapa não acumulam, só aparecem uma vez no "troco"
            if (remainingDays >= milestone.value) {
                count = 1;
                remainingDays -= milestone.value;
            }
        }
        
        if (count > 0) {
            achievedMilestones.push({ icon: milestone.icon, count: count });
        }
    });

    return achievedMilestones;
}
