// --- START OF FILE main.js (COMPLETO E MODIFICADO) ---

// main.js - O Orquestrador da Aplicação

// --- Importações dos Módulos ---
import * as DOMElements from './modules/dom-elements.js';
import * as state from './modules/state.js';
import * as authService from './modules/auth.js';
import * as firestoreService from './modules/firestore-service.js';
import * as ui from './modules/ui.js';
import * as planoLogic from './modules/plano-logic.js';
import * as formHandler from './modules/form-handler.js';
// MELHORIA (PRIORIDADE 1): Importa o novo módulo de sincronização com a agenda
import * as calendarSync from './modules/calendar-sync.js';

// --- Inicialização da Aplicação ---
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    console.log("[Main] DOM pronto. Iniciando aplicação modularizada.");
    ui.registerServiceWorker();
    setupEventHandlers();
    formHandler.init();
    authService.setupAuthStateObserver(handleAuthStateChange);
}

// --- Gerenciamento Central de Autenticação ---
async function handleAuthStateChange(firebaseUser) {
    state.setUser(firebaseUser);
    ui.toggleLoading(true);

    if (state.getCurrentUser()) {
        try {
            const planosCarregados = await firestoreService.carregarPlanos(state.getCurrentUser());
            state.setPlanos(planosCarregados);
        } catch (error) {
            console.error(error);
            ui.showNotification("Falha ao carregar seus dados. Verifique sua conexão e tente recarregar a página.", "error");
        }
    } else {
        state.setPlanos([]);
    }

    ui.renderApp(state.getPlanos(), state.getCurrentUser());
    ui.toggleLoading(false);
}

// --- Configuração dos Ouvintes de Eventos (Event Listeners) ---
function setupEventHandlers() {
    // Autenticação
    DOMElements.loginEmailButton.addEventListener('click', handleLogin);
    DOMElements.signupEmailButton.addEventListener('click', handleSignup);
    DOMElements.logoutButton.addEventListener('click', handleLogout);
    DOMElements.showAuthButton.addEventListener('click', ui.showAuthForm);
    DOMElements.cancelAuthButton.addEventListener('click', ui.hideAuthForm);

    // Navegação Principal
    DOMElements.novoPlanoBtn.addEventListener('click', () => ui.showCadastroForm());
    DOMElements.inicioBtn.addEventListener('click', () => ui.showPlanosList(state.getPlanos(), state.getCurrentUser()));
    DOMElements.inicioCadastroBtn.addEventListener('click', () => ui.showPlanosList(state.getPlanos(), state.getCurrentUser()));

    // Formulário de Plano
    DOMElements.formPlano.addEventListener('submit', handleFormSubmit);

    // Ações nos Cards (Usando delegação de eventos)
    DOMElements.listaPlanos.addEventListener('click', handleCardAction);

    // Modal de Reavaliação de Carga
    DOMElements.reavaliarCargaBtn.addEventListener('click', handleReavaliarCarga);
    DOMElements.fecharReavaliacaoBtn.addEventListener('click', ui.hideReavaliacaoModal);
    DOMElements.reavaliacaoModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.reavaliacaoModal) {
            ui.hideReavaliacaoModal();
            return;
        }
        handleModalReavaliacaoAction(e);
    });

    // Modal de Recálculo
    DOMElements.confirmRecalculoBtn.addEventListener('click', handleConfirmRecalculo);
    DOMElements.recalculoModalCloseBtn.addEventListener('click', ui.hideRecalculoModal);
    DOMElements.cancelRecalculoBtn.addEventListener('click', ui.hideRecalculoModal);
    DOMElements.recalculoModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.recalculoModal) ui.hideRecalculoModal();
    });

    // MELHORIA (PRIORIDADE 1 e 2): Listener do botão de sincronização, usando a referência de dom-elements.js.
    // Esta linha assume que 'syncGoogleCalendarBtn' foi devidamente exportado de 'modules/dom-elements.js'.
    const syncGoogleBtn = document.getElementById('sync-google-calendar'); // Mantido para compatibilidade, mas idealmente viria de DOMElements
    if (syncGoogleBtn) {
        syncGoogleBtn.addEventListener('click', handleGoogleSync);
    }
}

// --- Manipuladores de Ações de Autenticação e Formulário (Handlers) ---

async function handleLogin() {
    try {
        const email = DOMElements.emailLoginInput.value;
        const password = DOMElements.passwordLoginInput.value;
        await authService.loginWithEmailPassword(email, password);
    } catch (error) {
        console.error('[Main] Erro no login:', error);
        ui.showNotification('Erro ao fazer login: ' + error.message, 'error');
    }
}

async function handleSignup() {
    try {
        const email = DOMElements.emailLoginInput.value;
        const password = DOMElements.passwordLoginInput.value;
        await authService.signupWithEmailPassword(email, password);
        ui.showNotification('Cadastro realizado com sucesso! Agora você pode fazer login.', 'success');
        ui.hideAuthForm();
    } catch (error) {
        console.error('[Main] Erro no cadastro:', error);
        ui.showNotification('Erro ao cadastrar: ' + error.message, 'error');
    }
}

async function handleLogout() {
    try {
        await authService.logout();
    } catch (error) {
        console.error('[Main] Erro no logout:', error);
        ui.showNotification('Erro ao sair: ' + error.message, 'error');
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const currentUser = state.getCurrentUser();
    if (!currentUser) {
        ui.showNotification("Você precisa estar logado para salvar um plano.", "warning");
        return;
    }

    try {
        const formData = ui.getFormData();
        const planoData = planoLogic.construirObjetoPlano(formData, state.getPlanoByIndex(state.getPlanoEditandoIndex()));
        planoLogic.distribuirPaginasPlano(planoData);

        const indexEditando = state.getPlanoEditandoIndex();
        if (indexEditando !== -1) {
            state.updatePlano(indexEditando, planoData);
        } else {
            state.addPlano(planoData);
        }

        await firestoreService.salvarPlanos(currentUser, state.getPlanos());

        const acao = indexEditando !== -1 ? 'atualizado' : 'criado';
        ui.showNotification(`Plano "${planoData.titulo}" ${acao} com sucesso!`, 'success');

        state.setPlanoEditando(-1);
        ui.showPlanosList(state.getPlanos(), currentUser);

        const planoIndexFinal = state.getPlanos().findIndex(p => p.id === planoData.id);
        if (planoIndexFinal !== -1) {
            ui.highlightAndScrollToPlano(planoIndexFinal);
        }

    } catch (error) {
        console.error("[Main] Erro ao submeter formulário:", error);
        ui.showNotification("Erro: " + error.message, "error");
    }
}

/**
 * Manipula o fluxo de sincronização com o Google Agenda.
 * Delega a lógica para o módulo 'calendarSync' e gerencia o estado da UI.
 */
async function handleGoogleSync() {
    const currentUser = state.getCurrentUser();
    if (!currentUser) {
        ui.showNotification("Você precisa estar logado para sincronizar com a agenda.", "warning");
        return;
    }

    // MELHORIA UX: Desabilita o botão para dar feedback e prevenir múltiplos cliques.
    const syncButton = document.getElementById('sync-google-calendar'); // Usando getElementById como no código original
    const originalButtonContent = syncButton.innerHTML;
    syncButton.disabled = true;
    syncButton.innerHTML = `<span class="material-symbols-outlined">sync</span> Sincronizando...`;

    try {
        // CORREÇÃO (Prioridade 1): Chama a função correta 'sincronizarPlanos' do módulo.
        await calendarSync.sincronizarPlanos();
    } catch (error) {
        // A função 'sincronizarPlanos' já exibe notificações de erro ao usuário.
        // O log aqui é para depuração do desenvolvedor em caso de falhas inesperadas.
        console.error("[Main] Erro inesperado capturado durante a sincronização com a agenda:", error);
    } finally {
        // Garante que o botão seja reativado e seu conteúdo restaurado, mesmo se a sincronização falhar.
        syncButton.disabled = false;
        syncButton.innerHTML = originalButtonContent;
    }
}


// --- Lógica de Ações do Card ---

const actionHandlers = {
    'editar': handleEditarPlano,
    'excluir': handleExcluirPlano,
    'marcar-lido': handleMarcarLido,
    'pausar': handlePausarPlano,
    'retomar': handleRetomarPlano,
    'recalcular': handleRecalcularPlano,
    'salvar-parcial': handleSalvarParcial
};

function handleCardAction(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const planoIndex = parseInt(target.dataset.planoIndex, 10);
    const plano = state.getPlanoByIndex(planoIndex);
    const currentUser = state.getCurrentUser();

    if (isNaN(planoIndex) || !plano || !currentUser) return;

    if (actionHandlers[action]) {
        actionHandlers[action](target, plano, planoIndex, currentUser);
    }
}

function handleEditarPlano(target, plano, planoIndex, currentUser) {
    state.setPlanoEditando(planoIndex);
    ui.showCadastroForm(plano);
}

async function handleExcluirPlano(target, plano, planoIndex, currentUser) {
    if (confirm(`Tem certeza que deseja excluir o plano "${plano.titulo}"?`)) {
        state.removePlano(planoIndex);
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        ui.showNotification(`Plano excluído.`, 'success');
        ui.renderApp(state.getPlanos(), currentUser);
    }
}

async function handleMarcarLido(target, plano, planoIndex, currentUser) {
    const diaIndex = parseInt(target.dataset.diaIndex, 10);
    const dia = plano.diasPlano[diaIndex];

    dia.lido = target.checked;
    if (dia.lido) {
        dia.ultimaPaginaLida = null;
    }

    planoLogic.atualizarPaginasLidas(plano);
    state.updatePlano(planoIndex, plano);
    await firestoreService.salvarPlanos(currentUser, state.getPlanos());
    ui.renderApp(state.getPlanos(), currentUser);
}

async function handleSalvarParcial(target, plano, planoIndex, currentUser) {
    const diaIndex = parseInt(target.dataset.diaIndex, 10);
    const dia = plano.diasPlano[diaIndex];
    const inputParcial = document.getElementById(`parcial-${planoIndex}-${diaIndex}`);
    const ultimaPagina = parseInt(inputParcial.value, 10);

    if (!ultimaPagina || isNaN(ultimaPagina) || ultimaPagina < dia.paginaInicioDia || ultimaPagina > dia.paginaFimDia) {
        ui.showNotification(`Por favor, insira um número de página válido entre ${dia.paginaInicioDia} e ${dia.paginaFimDia}.`, 'warning');
        inputParcial.focus();
        return;
    }

    dia.ultimaPaginaLida = ultimaPagina;
    dia.lido = (ultimaPagina === dia.paginaFimDia);
    if (dia.lido) {
        dia.ultimaPaginaLida = null;
    }

    planoLogic.atualizarPaginasLidas(plano);
    state.updatePlano(planoIndex, plano);
    await firestoreService.salvarPlanos(currentUser, state.getPlanos());
    ui.renderApp(state.getPlanos(), currentUser);
}

async function handlePausarPlano(target, plano, planoIndex, currentUser) {
    if (confirm(`Tem certeza que deseja pausar o plano "${plano.titulo}"? O cronograma será congelado.`)) {
        plano.isPaused = true;
        plano.dataPausa = new Date();
        state.updatePlano(planoIndex, plano);
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        ui.showNotification(`Plano pausado.`, 'info');
        ui.renderApp(state.getPlanos(), currentUser);
    }
}

async function handleRetomarPlano(target, plano, planoIndex, currentUser) {
    const planoRetomado = planoLogic.retomarPlano(plano);
    state.updatePlano(planoIndex, planoRetomado);
    await firestoreService.salvarPlanos(currentUser, state.getPlanos());
    ui.showNotification(`Plano "${plano.titulo}" retomado! As datas futuras foram ajustadas.`, 'success');
    ui.renderApp(state.getPlanos(), currentUser);
}

function handleRecalcularPlano(target, plano, planoIndex, currentUser) {
    ui.showRecalculoModal(plano, planoIndex, 'Confirmar Recálculo');
}

// --- Handlers de Modais ---

async function handleConfirmRecalculo() {
    const planoIndex = parseInt(DOMElements.confirmRecalculoBtn.dataset.planoIndex, 10);
    const planoOriginal = state.getPlanoByIndex(planoIndex);
    const currentUser = state.getCurrentUser();

    if (!planoOriginal || !currentUser) return;

    try {
        const planoModificado = JSON.parse(JSON.stringify(planoOriginal));
        const recalculoCheckboxes = document.querySelectorAll('#recalculo-dias-semana-selecao input[type="checkbox"]:checked');
        const novosDiasSemana = Array.from(recalculoCheckboxes).map(cb => parseInt(cb.value));

        if (novosDiasSemana.length === 0) {
            throw new Error("Selecione pelo menos um dia da semana para o remanejamento.");
        }

        planoModificado.diasSemana = novosDiasSemana;
        planoModificado.periodicidade = 'semanal';

        let planoRecalculado;
        if (DOMElements.recalculoPorDataRadio.checked) {
            const novaDataFimStr = DOMElements.novaDataFimInput.value;
            if (!novaDataFimStr) throw new Error("Por favor, selecione uma nova data de fim.");
            const novaDataFim = new Date(novaDataFimStr + 'T00:00:00');
            planoRecalculado = planoLogic.recalcularPlanoComNovaData(planoModificado, novaDataFim);
        } else {
            const paginasPorDia = parseInt(DOMElements.novaPaginasPorDiaInput.value, 10);
            if (!paginasPorDia || paginasPorDia <= 0) throw new Error("Insira um número válido de páginas por dia.");
            planoRecalculado = planoLogic.recalcularPlanoPorPaginasDia(planoModificado, paginasPorDia);
        }

        state.updatePlano(planoIndex, planoRecalculado);
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());

        ui.hideRecalculoModal();
        ui.showNotification(`Plano "${planoOriginal.titulo}" remanejado e recalculado com sucesso!`, 'success');

        ui.renderApp(state.getPlanos(), currentUser);
        ui.highlightAndScrollToPlano(planoIndex);

    } catch (error) {
        console.error('[Main] Erro ao confirmar recálculo/remanejamento:', error);
        ui.showNotification('Erro ao remanejar: ' + error.message, 'error');
    }
}

function handleReavaliarCarga() {
    const planosAtuais = state.getPlanos();
    const totalPlanos = planosAtuais.length;
    const dadosCarga = planoLogic.analisarCargaSemanal(planosAtuais, totalPlanos);

    ui.renderizarModalReavaliacaoCompleto(dadosCarga, planosAtuais, totalPlanos);

    ui.showReavaliacaoModal();
}

function handleModalReavaliacaoAction(event) {
    const target = event.target.closest('[data-action="remanejar-plano"]');
    if (!target) return;

    const planoIndex = parseInt(target.dataset.planoIndex, 10);
    const plano = state.getPlanoByIndex(planoIndex);

    if (isNaN(planoIndex) || !plano) return;

    ui.hideReavaliacaoModal();
    setTimeout(() => {
        ui.showRecalculoModal(plano, planoIndex, 'Confirmar Remanejamento');
    }, 300);
}
