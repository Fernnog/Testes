/**
 * @file plan-builder.js
 * @description Módulo dedicado à lógica de negócios para construir um objeto de plano de leitura
 * a partir dos dados brutos de um formulário. Ele encapsula todos os cálculos de
 * capítulos, duração e distribuição, mantendo o orquestrador (main.js) limpo.
 */

// Importa todas as funções de ajuda necessárias
import {
    generateChaptersInRange,
    parseChaptersInput,
    generateChaptersForBookList,
    sortChaptersCanonically,
    distributeChaptersOverReadingDays
} from './chapter-helpers.js';
import {
    getCurrentUTCDateString,
    dateDiffInDays
} from './date-helpers.js';
import {
    getEffectiveDateForDay
} from './plan-logic-helpers.js';

/**
 * Agrega a lista de capítulos com base no método de criação escolhido no formulário.
 * @private
 * @param {object} formData - Os dados do formulário de criação.
 * @returns {Array<string>} Uma lista única e ordenada de capítulos.
 * @throws {Error} Se nenhum capítulo válido for gerado.
 */
function _getChapters(formData) {
    let chaptersToRead = [];

    if (formData.creationMethod === 'interval') {
        chaptersToRead = generateChaptersInRange(formData.startBook, formData.startChapter, formData.endBook, formData.endChapter);
    } else {
        // Combina capítulos de livros inteiros selecionados e da entrada de texto
        const chaptersFromBooks = generateChaptersForBookList(formData.selectedBooks);
        const chaptersFromText = parseChaptersInput(formData.chaptersText);
        const combinedSet = new Set([...chaptersFromBooks, ...chaptersFromText]);
        chaptersToRead = sortChaptersCanonically(Array.from(combinedSet));
    }

    if (chaptersToRead.length === 0) {
        throw new Error("Nenhum capítulo válido foi selecionado. Verifique os livros ou intervalos fornecidos.");
    }

    return chaptersToRead;
}

/**
 * Calcula o número total de dias de leitura efetivos, com base na duração e periodicidade.
 * @private
 * @param {object} formData - Os dados do formulário de criação.
 * @param {number} totalChapters - O número total de capítulos a serem lidos.
 * @returns {number} O número total de dias em que haverá leitura.
 * @throws {Error} Se a data final for inválida ou anterior à inicial.
 */
function _calculateTotalReadingDays(formData, totalChapters) {
    const startDate = formData.startDate || getCurrentUTCDateString();
    const validAllowedDays = formData.allowedDays.length > 0 ? formData.allowedDays : [0, 1, 2, 3, 4, 5, 6];

    if (formData.creationMethod === 'chapters-per-day') {
        // O ritmo define a duração
        return Math.ceil(totalChapters / formData.chaptersPerDay);
    }

    if (formData.durationMethod === 'days') {
        // A duração em dias de calendário define os dias de leitura
        let readingDaysInPeriod = 0;
        let tempDate = new Date(startDate + 'T00:00:00Z');
        for (let i = 0; i < formData.totalDays; i++) {
            if (validAllowedDays.includes(tempDate.getUTCDay())) {
                readingDaysInPeriod++;
            }
            tempDate.setUTCDate(tempDate.getUTCDate() + 1);
        }
        return Math.max(1, readingDaysInPeriod); // Garante pelo menos 1 dia de leitura
    }

    if (formData.durationMethod === 'end-date') {
        // O intervalo de datas define os dias de leitura
        if (!formData.endDate) {
            throw new Error("A data final é obrigatória para este método de duração.");
        }
        const calendarDuration = dateDiffInDays(startDate, formData.endDate) + 1;
        if (calendarDuration < 1) {
            throw new Error("A data final deve ser igual ou posterior à data de início.");
        }

        let readingDaysInPeriod = 0;
        let tempDate = new Date(startDate + 'T00:00:00Z');
        for (let i = 0; i < calendarDuration; i++) {
            if (validAllowedDays.includes(tempDate.getUTCDay())) {
                readingDaysInPeriod++;
            }
            tempDate.setUTCDate(tempDate.getUTCDate() + 1);
        }
        return Math.max(1, readingDaysInPeriod);
    }
    
    // Fallback de segurança, não deve ser atingido com a UI atual
    throw new Error("Método de cálculo de duração desconhecido.");
}

/**
 * Monta o objeto final do plano, pronto para ser salvo no Firestore.
 * @private
 * @param {object} formData - Os dados do formulário.
 * @param {Array<string>} chaptersList - A lista de capítulos.
 * @param {object} planMap - O mapa de distribuição de capítulos por dia.
 * @param {string} startDate - A data de início calculada.
 * @param {string} endDate - A data final calculada.
 * @returns {object} O objeto de plano completo.
 */
function _assemblePlanObject(formData, chaptersList, planMap, startDate, endDate) {
    return {
        // Dados do formulário
        name: formData.name,
        icon: formData.icon,
        googleDriveLink: formData.googleDriveLink || null,
        allowedDays: formData.allowedDays,

        // Dados calculados
        plan: planMap,
        chaptersList: chaptersList,
        totalChapters: chaptersList.length,
        startDate: startDate,
        endDate: endDate,

        // Estado inicial padrão
        currentDay: 1,
        readLog: {},
        dailyChapterReadStatus: {},
        recalculationBaseDay: null,
        recalculationBaseDate: null,
    };
}


/**
 * Função principal e pública do módulo. Constrói um objeto de plano de leitura
 * completo a partir dos dados do formulário.
 * @param {object} formData - Os dados brutos coletados do formulário de criação de plano.
 * @returns {object} Um objeto de plano de leitura pronto para ser salvo no serviço.
 * @throws {Error} Se a validação dos dados falhar em qualquer etapa.
 */
export function buildPlanFromFormData(formData) {
    // 1. Gera a lista de capítulos a serem lidos
    const chaptersToRead = _getChapters(formData);
    
    // 2. Calcula o número total de dias de leitura efetivos
    const totalReadingDays = _calculateTotalReadingDays(formData, chaptersToRead.length);
    
    // 3. Distribui os capítulos uniformemente pelos dias de leitura
    const planMap = distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays);
    
    // 4. Determina as datas de início e fim do plano
    const startDate = formData.startDate || getCurrentUTCDateString();
    const endDate = getEffectiveDateForDay({ startDate, allowedDays: formData.allowedDays }, totalReadingDays);
    
    // 5. Monta e retorna o objeto final do plano
    return _assemblePlanObject(formData, chaptersToRead, planMap, startDate, endDate);
}