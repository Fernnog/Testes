/**
 * @file date-helpers.js
 * @description Módulo de utilitários contendo funções puras para manipulação de datas.
 * Todas as funções operam com base no fuso horário UTC para garantir consistência
 * independentemente da localização do usuário.
 */

/**
 * Retorna a data UTC atual como uma string no formato "YYYY-MM-DD".
 * @returns {string} A data UTC atual.
 */
export function getCurrentUTCDateString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Calcula o ID da semana UTC para uma determinada data.
 * O ID é no formato "YYYY-WNN" (ex: "2023-W35").
 * @param {Date} [date=new Date()] - A data para a qual o ID da semana será calculado.
 * @returns {string} O ID da semana UTC.
 */
export function getUTCWeekId(date = new Date()) {
    // Cria uma cópia da data em UTC para não modificar a original
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    
    // Define para a quinta-feira da semana para garantir a consistência do número da semana ISO 8601
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    
    // Calcula o início do ano
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    
    // Calcula o número da semana
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Retorna a data de início da semana (Domingo) em UTC para uma determinada data.
 * @param {Date} [date=new Date()] - A data de referência.
 * @returns {Date} Um objeto Date representando o início da semana em UTC.
 */
export function getUTCWeekStartDate(date = new Date()) {
    const currentDayOfWeek = date.getUTCDay(); // 0 para Domingo, 1 para Segunda...
    const diff = date.getUTCDate() - currentDayOfWeek;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}

/**
 * Calcula a diferença em dias inteiros entre duas strings de data (YYYY-MM-DD).
 * @param {string} dateStr1 - A data inicial.
 * @param {string} dateStr2 - A data final.
 * @returns {number} O número de dias entre as datas. Pode ser negativo.
 */
export function dateDiffInDays(dateStr1, dateStr2) {
    // Adiciona T00:00:00Z para garantir que as datas sejam interpretadas como UTC
    const date1 = new Date(dateStr1 + 'T00:00:00Z');
    const date2 = new Date(dateStr2 + 'T00:00:00Z');
    
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return Infinity;

    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.floor((date2.getTime() - date1.getTime()) / _MS_PER_DAY);
}

/**
 * Adiciona um número de dias a uma data (objeto Date) em UTC.
 * @param {Date} date - A data inicial.
 * @param {number} days - O número de dias a adicionar (pode ser negativo).
 * @returns {Date} Um novo objeto Date com os dias adicionados.
 */
export function addUTCDays(date, days) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

/**
 * Formata uma string de data "YYYY-MM-DD" para o formato brasileiro "DD/MM/YYYY".
 * @param {string} dateString - A data no formato "YYYY-MM-DD".
 * @returns {string} A data formatada, ou '--/--/----' em caso de entrada inválida.
 */
export function formatUTCDateStringToBrasilian(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return '--/--/----';
    }
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Erro ao formatar data:", dateString, e);
        return '--/--/----';
    }
}