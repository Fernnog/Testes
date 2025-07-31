// modules/form-handler.js
// RESPONSABILIDADE ÚNICA: Centralizar toda a lógica de interação e manipulação
// de eventos do formulário de cadastro de planos.

import * as DOMElements from './dom-elements.js';
import * as ui from './ui.js';
import * as planoLogic from './plano-logic.js';

/**
 * Função principal que anexa todos os event listeners ao formulário.
 * Deve ser chamada uma única vez pelo main.js.
 */
function init() {
    // Listeners para alternar a visibilidade dos campos de período
    DOMElements.definirPorDatasRadio.addEventListener('change', _handlePeriodoToggle);
    DOMElements.definirPorDiasRadio.addEventListener('change', _handlePeriodoToggle);
    DOMElements.definirPorPaginasRadio.addEventListener('change', _handlePeriodoToggle);

    // Listener para alternar a visibilidade da seleção de dias da semana
    DOMElements.periodicidadeSelect.addEventListener('change', _handlePeriodicidadeToggle);

    // Listeners para atualizar a estimativa da data de fim em tempo real
    const estimativaInputs = [
        DOMElements.paginaInicioInput,
        DOMElements.paginaFimInput,
        DOMElements.paginasPorDiaInput,
        DOMElements.dataInicioPaginas,
        DOMElements.periodicidadeSelect,
    ];
    estimativaInputs.forEach(input => input.addEventListener('input', _handleEstimativaUpdate));
    
    // O listener para checkboxes precisa ser no container por delegação
    DOMElements.diasSemanaSelecao.addEventListener('change', _handleEstimativaUpdate);
}

/**
 * Manipula a troca de visibilidade dos blocos de período e atualiza a estimativa.
 * @private
 */
function _handlePeriodoToggle() {
    ui.togglePeriodoFields();
    _handleEstimativaUpdate(); // Recalcula a estimativa ao trocar de método
}

/**
 * Manipula a troca de visibilidade dos dias da semana e atualiza a estimativa.
 * @private
 */
function _handlePeriodicidadeToggle() {
    ui.toggleDiasSemana();
    _handleEstimativaUpdate(); // Recalcula a estimativa ao mudar a periodicidade
}

/**
 * Calcula e renderiza a estimativa da data de fim do plano.
 * É acionado sempre que um campo relevante do formulário é alterado.
 * @private
 */
function _handleEstimativaUpdate() {
    // Só executa a lógica se a opção "Páginas por Dia" estiver marcada
    if (!DOMElements.definirPorPaginasRadio.checked) {
        ui.renderizarDataFimEstimada(null); // Limpa a estimativa se a opção não estiver ativa
        return;
    }

    try {
        // Coleta de dados do formulário para o cálculo
        const paginaInicio = parseInt(DOMElements.paginaInicioInput.value, 10);
        const paginaFim = parseInt(DOMElements.paginaFimInput.value, 10);
        const paginasPorDia = parseInt(DOMElements.paginasPorDiaInput.value, 10);
        const dataInicioStr = DOMElements.dataInicioPaginas.value;
        const periodicidade = DOMElements.periodicidadeSelect.value;
        
        const checkboxes = DOMElements.diasSemanaSelecao.querySelectorAll('input[type="checkbox"]:checked');
        const diasSemana = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

        // Validação mínima para evitar erros de cálculo
        if (isNaN(paginaInicio) || isNaN(paginaFim) || isNaN(paginasPorDia) || !dataInicioStr || paginasPorDia <= 0 || paginaFim < paginaInicio) {
            ui.renderizarDataFimEstimada(null); // Limpa se os dados forem insuficientes
            return;
        }
        if (periodicidade === 'semanal' && diasSemana.length === 0) {
            ui.renderizarDataFimEstimada(null, "Selecione ao menos um dia da semana.");
            return;
        }

        const dataInicio = new Date(dataInicioStr + 'T00:00:00');

        // Cria um objeto com os dados necessários para a função de lógica
        const dadosParaCalculo = {
            paginaInicio,
            paginaFim,
            paginasPorDia,
            dataInicio,
            periodicidade,
            diasSemana
        };
        
        // Chama a função de lógica para obter a data estimada
        const dataFimEstimada = planoLogic.calcularDataFimEstimada(dadosParaCalculo);

        // Envia o resultado para a UI renderizar
        ui.renderizarDataFimEstimada(dataFimEstimada);

    } catch (error) {
        console.warn("[Form Handler] Não foi possível calcular a estimativa:", error.message);
        ui.renderizarDataFimEstimada(null, "Dados inválidos para cálculo."); // Exibe erro
    }
}

// Exporta a função de inicialização para ser usada pelo orquestrador (main.js)
export { init };