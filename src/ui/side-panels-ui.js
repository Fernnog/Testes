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

// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo. Como este módulo é primariamente para exibição e suas
 * interações (cliques nos itens) são gerenciadas pelo orquestrador,
 * esta função atualmente não precisa configurar listeners internos.
 */
export function init() {
    // Nenhuma inicialização de listener necessária neste momento.
    // A função existe para manter a consistência arquitetural com outros módulos de UI.
}


/**
 * Renderiza os painéis de leituras atrasadas e próximas.
 * (IMPLEMENTAÇÃO FUTURA: A lógica complexa de `displayScheduledReadings` do script antigo virá para cá)
 *
 * @param {Array<object>} allUserPlans - Lista de todos os planos do usuário.
 * @param {string|null} activePlanId - O ID do plano ativo.
 * @param {Function} onSwitchPlan - Callback para trocar de plano ao clicar em um item.
 */
export function render(allUserPlans, activePlanId, onSwitchPlan) {
    // Por enquanto, vamos apenas garantir que a aplicação não quebre.
    // A lógica completa de `displayScheduledReadings` pode ser movida para cá depois.
    console.log("SidePanelsUI.render() chamado. Lógica de renderização ainda não implementada neste módulo.");
    
    // Mostra as seções, mas com uma mensagem de "carregando" ou "não implementado".
    overdueReadingsListDiv.innerHTML = '<p>Verificando leituras atrasadas...</p>';
    upcomingReadingsListDiv.innerHTML = '<p>Carregando próximas leituras...</p>';
    
    show(); // Garante que os painéis fiquem visíveis.
}

/**
 * Mostra os painéis laterais.
 */
export function show() {
    overdueReadingsSection.style.display = 'block';
    upcomingReadingsSection.style.display = 'block';
}

/**
 * Esconde os painéis laterais.
 */
export function hide() {
    overdueReadingsSection.style.display = 'none';
    upcomingReadingsSection.style.display = 'none';
}
