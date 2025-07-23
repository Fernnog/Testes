/**
 * @file plan-calculator.js
 * @description Módulo central para lógicas de cálculo e recálculo de planos.
 * Contém funções puras para determinar novos ritmos e datas de término,
 * e para gerar estruturas de planos recalculados.
 */

import { countReadingDaysBetween } from './date-helpers.js';
import { distributeChaptersOverReadingDays } from './chapter-helpers.js';
import { getEffectiveDateForDay } from './plan-logic-helpers.js';

/**
 * Agrega todos os capítulos lidos de um plano, combinando o histórico (`readLog`)
 * e o progresso do dia atual (`dailyChapterReadStatus`).
 * Esta função é a fonte da verdade para o progresso real de um plano.
 * @private
 * @param {object} plan - O objeto do plano.
 * @returns {Set<string>} Um Set contendo todos os capítulos únicos já lidos.
 */
function _getChaptersReadSet(plan) {
    const chaptersRead = new Set();
    
    // 1. Adiciona capítulos do histórico de dias concluídos.
    const readLog = plan.readLog || {};
    Object.values(readLog).forEach(chaptersOnDate => {
        if (Array.isArray(chaptersOnDate)) {
            chaptersOnDate.forEach(chapter => chaptersRead.add(chapter));
        }
    });

    // 2. CORREÇÃO CRÍTICA: Adiciona capítulos marcados como lidos no dia atual, que ainda não estão no log.
    const dailyStatus = plan.dailyChapterReadStatus || {};
    Object.keys(dailyStatus).forEach(chapter => {
        if (dailyStatus[chapter] === true) {
            chaptersRead.add(chapter);
        }
    });

    return chaptersRead;
}

/**
 * Recalcula um plano para terminar em uma data final específica, a partir de uma data de início.
 * Esta é a função central do módulo, agora corrigida para usar o progresso real.
 * @param {object} plan - O objeto do plano original.
 * @param {string} targetEndDate - A data final desejada no formato "YYYY-MM-DD".
 * @param {string} recalculationStartDate - A data de início para o recálculo ("YYYY-MM-DD").
 * @returns {{recalculatedPlan: object, newPace: number}|null} Um objeto com o plano recalculado
 * e o novo ritmo (caps/dia), ou null se o recálculo for impossível.
 */
export function recalculatePlanToTargetDate(plan, targetEndDate, recalculationStartDate) {
    // 1. Usa a função corrigida para obter um Set com os capítulos exatos que foram lidos.
    const chaptersReadSet = _getChaptersReadSet(plan);
    
    // 2. Filtra a lista de capítulos original para obter apenas os que realmente faltam.
    const remainingChapters = plan.chaptersList.filter(chapter => !chaptersReadSet.has(chapter));

    if (remainingChapters.length === 0) {
        // O plano já foi concluído, não há o que recalcular. Retorna o plano como está.
        return { recalculatedPlan: { ...plan }, newPace: 0 };
    }

    // 3. Usa a data de início correta para calcular os dias disponíveis.
    const availableReadingDays = countReadingDaysBetween(recalculationStartDate, targetEndDate, plan.allowedDays);

    if (availableReadingDays < 1) {
        // É impossível terminar a tempo com os dias de leitura disponíveis.
        return null;
    }

    // Calcula o novo ritmo necessário para cumprir a meta (útil para a UI)
    const newPace = remainingChapters.length / availableReadingDays;
    
    // Distribui os capítulos restantes nos dias disponíveis
    const remainingPlanMap = distributeChaptersOverReadingDays(remainingChapters, availableReadingDays);
    
    const newPlanMap = {};
    // Preserva a parte do plano que já foi "avançada" (dias anteriores ao dia atual)
    for (let i = 1; i < plan.currentDay; i++) {
        if (plan.plan[i]) {
           newPlanMap[i] = plan.plan[i];
        }
    }
    
    // Adiciona a parte recalculada, começando do dia atual em diante.
    Object.keys(remainingPlanMap).forEach((dayKey, index) => {
        const newDayKey = plan.currentDay + index;
        newPlanMap[newDayKey] = remainingPlanMap[dayKey];
    });

    // Monta o objeto do plano atualizado
    const updatedPlan = {
        ...plan,
        plan: newPlanMap,
        endDate: targetEndDate, // A nova data final é a data alvo
        recalculationBaseDay: plan.currentDay,
        recalculationBaseDate: recalculationStartDate, // Salva a data de início correta
    };

    return { recalculatedPlan: updatedPlan, newPace };
}

/**
 * Calcula a data de término de um plano com base em um ritmo específico (caps/dia),
 * a partir de uma data de início.
 * @param {object} plan - O objeto do plano original.
 * @param {number} pace - O ritmo desejado (capítulos por dia de leitura).
 * @param {string} calculationStartDate - A data de início para o cálculo ("YYYY-MM-DD").
 * @returns {string|null} A nova data de término calculada, ou null se o ritmo for inválido.
 */
export function calculateEndDateFromPace(plan, pace, calculationStartDate) {
    if (!pace || pace <= 0) return null;

    // Usa o mesmo método robusto para encontrar os capítulos restantes.
    const chaptersReadSet = _getChaptersReadSet(plan);
    const remainingChaptersCount = plan.chaptersList.filter(chapter => !chaptersReadSet.has(chapter)).length;
    
    if (remainingChaptersCount <= 0) return plan.endDate; // Já concluído.

    const requiredReadingDays = Math.ceil(remainingChaptersCount / pace);
    
    // Usa a data de início fornecida para calcular a data futura
    const planDataForEndDateCalc = {
        startDate: calculationStartDate,
        allowedDays: plan.allowedDays,
    };

    return getEffectiveDateForDay(planDataForEndDateCalc, requiredReadingDays);
}

/**
 * [NOVO] Calcula o ritmo necessário para concluir um plano em uma data alvo.
 * Função leve, ideal para pré-visualizações na UI (Prioridade 2).
 * @param {object} plan - O objeto do plano original.
 * @param {string} targetEndDate - A data final desejada no formato "YYYY-MM-DD".
 * @param {string} calculationStartDate - A data de início para o cálculo ("YYYY-MM-DD").
 * @returns {number|null} O novo ritmo (caps/dia) ou null se for impossível.
 */
export function calculatePaceForTargetDate(plan, targetEndDate, calculationStartDate) {
    const chaptersReadSet = _getChaptersReadSet(plan);
    const remainingChaptersCount = plan.chaptersList.filter(chapter => !chaptersReadSet.has(chapter)).length;

    if (remainingChaptersCount === 0) {
        return 0; // Plano concluído
    }

    const availableReadingDays = countReadingDaysBetween(calculationStartDate, targetEndDate, plan.allowedDays);

    if (availableReadingDays < 1) {
        return null; // Impossível
    }

    return remainingChaptersCount / availableReadingDays;
}
