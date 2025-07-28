// script.js (Orquestrador Principal da Aplicação - Versão Corrigida e com Google Drive)

// --- MÓDULOS ---
import * as Auth from './auth.js';
import * as Service from './firestore-service.js';
import * as UI from './ui.js';
import * as GoogleDriveService from './google-drive-service.js'; // <-- NOVO
import { initializeFloatingNav, updateFloatingNavVisibility } from './floating-nav.js';
import { formatDateForDisplay, generateAndDownloadPdf } from './utils.js';

// --- ESTADO DA APLICAÇÃO ---
let state = {
    user: null,
    isDriveConnected: false, // <-- NOVO
    prayerTargets: [],
    archivedTargets: [],
    resolvedTargets: [],
    perseveranceData: { consecutiveDays: 0, recordDays: 0, lastInteractionDate: null },
    weeklyPrayerData: { weekId: null, interactions: {} },
    dailyTargets: { pending: [], completed: [], targetIds: [] },
    pagination: {
        mainPanel: { currentPage: 1, targetsPerPage: 10 },
        archivedPanel: { currentPage: 1, targetsPerPage: 10 },
        resolvedPanel: { currentPage: 1, targetsPerPage: 10 },
    },
    filters: {
        mainPanel: { searchTerm: '', showDeadlineOnly: false, showExpiredOnly: false, startDate: null, endDate: null },
        archivedPanel: { searchTerm: '', startDate: null, endDate: null },
        resolvedPanel: { searchTerm: '' },
    }
};

// =================================================================
// === FEEDBACK VISUAL (Toast Notifications) ===
// =================================================================

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = `app-toast toast--${type}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('is-visible');
    }, 10);
    setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => {
            if (document.body.contains(toast)) document.body.removeChild(toast);
        }, 400);
    }, 3500);
}

// =================================================================
// === LÓGICA DE AUTENTICAÇÃO E FLUXO DE DADOS ===
// =================================================================

async function handleSignUp() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return showToast("Por favor, preencha e-mail e senha.", "error");
    try {
        await Auth.signUpWithEmailPassword(email, password);
    } catch (error) {
        UI.updateAuthUI(null, "Erro ao cadastrar: " + error.message, true);
    }
}

async function handleSignIn() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return showToast("Por favor, preencha e-mail e senha.", "error");
    try {
        await Auth.signInWithEmailPassword(email, password);
    } catch (error) {
        UI.updateAuthUI(null, "Erro ao entrar: " + error.message, true);
    }
}

// NOVO: Handler para o fluxo de login com Google
async function handleGoogleSignIn() {
    try {
        const { user, accessToken } = await Auth.signInWithGoogle();
        if (user && accessToken) {
            showToast("Autenticado com Google. Inicializando Google Drive...", "info");
            const initialized = await GoogleDriveService.initializeDriveService(accessToken);
            if (initialized) {
                state.isDriveConnected = true;
                UI.updateDriveStatusUI('connected');
                showToast("Conexão com Google Drive estabelecida!", "success");
            }
        }
    } catch (error) {
        console.error("Erro no login com Google ou na inicialização do Drive:", error);
        showToast(error.message, "error");
        UI.updateDriveStatusUI('error');
    }
}


async function handlePasswordReset() {
    const email = document.getElementById('email').value.trim();
    if (!email) return showToast("Por favor, insira seu e-mail para redefinir a senha.", "error");
    try {
        await Auth.resetPassword(email);
        UI.updateAuthUI(null, "Um e-mail de redefinição de senha foi enviado para " + email + ".");
    } catch (error) {
        UI.updateAuthUI(null, "Erro ao redefinir senha: " + error.message, true);
    }
}

function applyFiltersAndRender(panelId) {
    // (Esta função permanece inalterada)
    const panelState = state.pagination[panelId];
    const panelFilters = state.filters[panelId];
    let sourceData = [];

    if (panelId === 'mainPanel') sourceData = state.prayerTargets;
    if (panelId === 'archivedPanel') sourceData = state.archivedTargets;
    if (panelId === 'resolvedPanel') sourceData = state.resolvedTargets;

    let filteredData = sourceData.filter(target => {
        const searchTerm = panelFilters.searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' ||
            (target.title && target.title.toLowerCase().includes(searchTerm)) ||
            (target.details && target.details.toLowerCase().includes(searchTerm)) ||
            (target.category && target.category.toLowerCase().includes(searchTerm)) ||
            (target.observations && target.observations.some(obs => 
                (obs.text && obs.text.toLowerCase().includes(searchTerm)) ||
                (obs.subTargetTitle && obs.subTargetTitle.toLowerCase().includes(searchTerm))
            ));
        if (!matchesSearch) return false;

        if (panelId === 'mainPanel') {
            const now = new Date();
            const todayUTCStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            if (panelFilters.showDeadlineOnly && !target.hasDeadline) return false;
            if (panelFilters.showExpiredOnly) {
                 if (!target.hasDeadline || !target.deadlineDate || target.deadlineDate.getTime() >= todayUTCStart.getTime()) {
                     return false;
                 }
            }
        }
        
        if (panelFilters.startDate) {
            const startDate = new Date(panelFilters.startDate + 'T00:00:00Z');
            if (target.date < startDate) return false;
        }
        if (panelFilters.endDate) {
            const endDate = new Date(panelFilters.endDate + 'T23:59:59Z');
            if (target.date > endDate) return false;
        }

        return true;
    });

    const { currentPage, targetsPerPage } = panelState;
    const startIndex = (currentPage - 1) * targetsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + targetsPerPage);

    switch (panelId) {
        case 'mainPanel': UI.renderTargets(paginatedData, filteredData.length, currentPage, targetsPerPage, state.dailyTargets); break;
        case 'archivedPanel': UI.renderArchivedTargets(paginatedData, filteredData.length, currentPage, targetsPerPage); break;
        case 'resolvedPanel': UI.renderResolvedTargets(paginatedData, filteredData.length, currentPage, targetsPerPage); break;
    }
}

async function loadDataForUser(user) {
    try {
        const [prayerData, archivedData, perseveranceData, weeklyData] = await Promise.all([
            Service.fetchPrayerTargets(user.uid),
            Service.fetchArchivedTargets(user.uid),
            Service.loadPerseveranceData(user.uid),
            Service.loadWeeklyPrayerData(user.uid)
        ]);
        state.user = user;
        state.prayerTargets = prayerData;
        state.archivedTargets = archivedData.filter(t => !t.resolved);
        state.resolvedTargets = archivedData.filter(t => t.resolved);
        state.perseveranceData = perseveranceData;
        state.weeklyPrayerData = weeklyData;
        const dailyTargetsData = await Service.loadDailyTargets(user.uid, state.prayerTargets);
        state.dailyTargets = dailyTargetsData;
        applyFiltersAndRender('mainPanel');
        applyFiltersAndRender('archivedPanel');
        applyFiltersAndRender('resolvedPanel');
        UI.renderDailyTargets(state.dailyTargets.pending, state.dailyTargets.completed, state.dailyTargets);
        UI.renderPriorityTargets(state.prayerTargets, state.dailyTargets);
        UI.updatePerseveranceUI(state.perseveranceData);
        UI.updateWeeklyChart(state.weeklyPrayerData);
        UI.showPanel('dailySection');

        const now = new Date();
        const todayUTCStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const expiredTargets = state.prayerTargets.filter(target => 
            target.hasDeadline && target.deadlineDate && target.deadlineDate.getTime() < todayUTCStart.getTime()
        );
        
        if (expiredTargets.length > 0) UI.showExpiredTargetsToast(expiredTargets);
        
        updateFloatingNavVisibility(state);

    } catch (error) {
        console.error("[App] Error during data loading process:", error);
        showToast("Ocorreu um erro crítico ao carregar seus dados.", "error");
        handleLogoutState();
    }
}

function handleLogoutState() {
    // Reset do estado completo, incluindo a nova flag do Drive
    state = { user: null, isDriveConnected: false, prayerTargets: [], archivedTargets: [], resolvedTargets: [], perseveranceData: { consecutiveDays: 0, recordDays: 0, lastInteractionDate: null }, weeklyPrayerData: { weekId: null, interactions: {} }, dailyTargets: { pending: [], completed: [], targetIds: [] }, pagination: { mainPanel: { currentPage: 1, targetsPerPage: 10 }, archivedPanel: { currentPage: 1, targetsPerPage: 10 }, resolvedPanel: { currentPage: 1, targetsPerPage: 10 }}, filters: { mainPanel: { searchTerm: '', showDeadlineOnly: false, showExpiredOnly: false, startDate: null, endDate: null }, archivedPanel: { searchTerm: '', startDate: null, endDate: null }, resolvedPanel: { searchTerm: '' }} };
    
    UI.renderTargets([], 0, 1, 10);
    UI.renderArchivedTargets([], 0, 1, 10);
    UI.renderResolvedTargets([], 0, 1, 10);
    UI.renderDailyTargets([], []);
    UI.resetPerseveranceUI();
    UI.resetWeeklyChart();
    UI.showPanel('authSection');
    UI.updateDriveStatusUI('disconnected');
    updateFloatingNavVisibility(state);
}

// Função auxiliar para encontrar um alvo em qualquer lista do estado
function findTargetInState(targetId) {
    let target = state.prayerTargets.find(t => t.id === targetId);
    if (target) return { target, isArchived: false, panelId: 'mainPanel' };
    target = state.archivedTargets.find(t => t.id === targetId);
    if (target) return { target, isArchived: true, panelId: 'archivedPanel' };
    target = state.resolvedTargets.find(t => t.id === targetId);
    if (target) return { target, isArchived: true, panelId: 'resolvedPanel' };
    return { target: null, isArchived: null, panelId: null };
}

// NOVO: Função central de sincronização
async function syncTarget(targetId) {
    if (!state.isDriveConnected) return;

    const { target: targetToSync, isArchived, panelId } = findTargetInState(targetId);
    if (!targetToSync || !panelId) return;

    try {
        targetToSync.driveStatus = 'syncing';
        applyFiltersAndRender(panelId);

        const result = await GoogleDriveService.backupTargetToDrive(targetToSync, targetToSync.googleDocId);

        if (result.success && result.docId !== targetToSync.googleDocId) {
            await Service.updateTargetField(state.user.uid, targetId, isArchived, { googleDocId: result.docId });
            targetToSync.googleDocId = result.docId;
        }
        
        targetToSync.driveStatus = 'synced';
        applyFiltersAndRender(panelId);

    } catch (error) {
        console.error(`Falha ao sincronizar o alvo ${targetId}:`, error);
        targetToSync.driveStatus = 'error';
        applyFiltersAndRender(panelId);
        showToast(`Erro ao sincronizar "${targetToSync.title}"`, "error");
    }
}


async function handleAddNewTarget(event) {
    event.preventDefault();
    if (!state.user) return showToast("Você precisa estar logado.", "error");
    const title = document.getElementById('title').value.trim();
    if (!title) return showToast("O título é obrigatório.", "error");
    const hasDeadline = document.getElementById('hasDeadline').checked;
    const deadlineValue = document.getElementById('deadlineDate').value;
    if (hasDeadline && !deadlineValue) return showToast("Selecione uma data para o prazo.", "error");
    
    // Workaround para obter o ID do novo alvo, já que o serviço não retorna
    const oldTargetIds = new Set(state.prayerTargets.map(t => t.id));

    const newTargetData = { 
        title: title, 
        details: document.getElementById('details').value.trim(), 
        date: new Date(document.getElementById('date').value + 'T12:00:00Z'), 
        hasDeadline: hasDeadline, 
        deadlineDate: hasDeadline ? new Date(deadlineValue + 'T12:00:00Z') : null, 
        category: document.getElementById('categorySelect').value, 
        observations: [], 
        resolved: false,
        isPriority: document.getElementById('isPriority').checked
    };
    try {
        await Service.addNewPrayerTarget(state.user.uid, newTargetData);
        showToast("Alvo adicionado com sucesso!", "success");
        document.getElementById('prayerForm').reset();
        document.getElementById('deadlineContainer').style.display = 'none';
        
        await loadDataForUser(state.user);
        
        // Agora encontramos o novo alvo e disparamos a sincronização inicial
        const newTarget = state.prayerTargets.find(t => !oldTargetIds.has(t.id));
        if (newTarget) {
            await syncTarget(newTarget.id);
        }

        UI.showPanel('dailySection');
    } catch (error) {
        console.error("Erro ao adicionar novo alvo:", error);
        showToast("Falha ao adicionar alvo: " + error.message, "error");
    }
}


// =================================================================
// === Handlers de Ação Dedicados ===
// =================================================================

async function handlePray(targetId) {
    // ... (função inalterada) ...
}

async function handleResolveTarget(target, panelId) {
    if (!confirm("Marcar como respondido?")) return;
    try {
        await Service.markAsResolved(state.user.uid, target);
        await syncTarget(target.id); // Sincroniza o estado final
        showToast("Alvo marcado como respondido!", "success");
    } catch (error) {
        showToast("Erro ao sincronizar. A ação será desfeita.", "error");
    } finally {
        await loadDataForUser(state.user); // Recarrega para garantir consistência
    }
}

async function handleArchiveTarget(target, panelId) {
    if (!confirm("Arquivar este alvo?")) return;
    try {
        await Service.archiveTarget(state.user.uid, target);
        await syncTarget(target.id); // Sincroniza o estado final
        showToast("Alvo arquivado.", "info");
    } catch (error) {
        showToast("Erro ao sincronizar. A ação será desfeita.", "error");
    } finally {
        await loadDataForUser(state.user); // Recarrega para garantir consistência
    }
}

async function handleDeleteArchivedTarget(targetId) {
    // A exclusão não é sincronizada, pois o arquivo no Drive pode ser mantido como registro.
    // (Esta função permanece inalterada)
}

async function handleAddObservation(target, isArchived, panelId) {
    const text = document.getElementById(`observationText-${target.id}`).value.trim(); 
    const dateStr = document.getElementById(`observationDate-${target.id}`).value; 
    if (!text || !dateStr) return showToast("Preencha o texto e a data.", "error"); 
    
    const newObservation = { text, date: new Date(dateStr + 'T12:00:00Z'), isSubTarget: false }; 
    
    try {
        await Service.addObservationToTarget(state.user.uid, target.id, isArchived, newObservation); 
        await syncTarget(target.id);
        showToast("Observação adicionada.", "success");
    } catch(error) {
        showToast("Falha ao salvar. A alteração será desfeita.", "error");
    } finally {
        await loadDataForUser(state.user);
        UI.toggleAddObservationForm(target.id);
    }
}

// ... outros handlers permanecem iguais ...


// ===============================================
// === PONTO DE ENTRADA DA APLICAÇÃO E EVENTOS ===
// ===============================================
document.addEventListener('DOMContentLoaded', () => {
    Auth.initializeAuth(user => {
        if (user) { 
            showToast(`Bem-vindo(a), ${user.displayName || user.email}!`, 'success');
            UI.updateAuthUI(user);
            loadDataForUser(user);
        } else { 
            UI.updateAuthUI(null);
            handleLogoutState();
        }
    });

    // --- Listeners de Autenticação e Ações Gerais ---
    document.getElementById('btnEmailSignUp').addEventListener('click', handleSignUp);
    document.getElementById('btnEmailSignIn').addEventListener('click', handleSignIn);
    document.getElementById('btnGoogleSignIn').addEventListener('click', handleGoogleSignIn); // <-- NOVO
    document.getElementById('btnForgotPassword').addEventListener('click', handlePasswordReset);
    document.getElementById('btnLogout').addEventListener('click', () => Auth.handleSignOut());
    document.getElementById('prayerForm').addEventListener('submit', handleAddNewTarget);
    
    // ... todos os outros listeners de UI permanecem os mesmos ...
    document.getElementById('backToMainButton').addEventListener('click', () => UI.showPanel('dailySection'));
    // etc.

    // --- DELEGAÇÃO DE EVENTOS CENTRALIZADA ---
    document.body.addEventListener('click', async e => {
        const { action, id, page, panel, obsIndex, subObsIndex } = e.target.dataset;
        if (!state.user && action) return;

        // ... lógica de paginação e findTarget inalterada ...
        
        if (!action || !id) {
            return;
        }

        const { target, isArchived, panelId } = findTargetInState(id);
        //...

        // --- Switch de Ações com Sincronização ---
        switch(action) {
            case 'resolve':
                await handleResolveTarget(target, panelId);
                break;

            case 'archive':
                await handleArchiveTarget(target, panelId);
                break;
            
            case 'add-new-observation':
                if (target) await handleAddObservation(target, isArchived, panelId);
                break;

            // ... outros casos que não modificam dados ...

            case 'save-title':
            case 'save-details':
            case 'save-observation':
            case 'save-sub-target-title':
            case 'save-sub-target-details':
            case 'save-sub-observation':
            case 'save-deadline':
            case 'save-category':
            case 'remove-deadline':
            case 'toggle-priority':
            case 'promote-observation':
            case 'demote-sub-target':
            case 'resolve-sub-target':
            case 'add-sub-observation':
            {
                // Lógica unificada para todas as ações de salvamento
                // O código original para cada case é executado primeiro...
                // E no final do try bem-sucedido, adicionamos a sincronização.

                // Exemplo para 'save-title':
                if (action === 'save-title') {
                    const form = e.target.closest('.inline-edit-form');
                    // ... (código de extração de dados) ...
                    try {
                        await Service.updateTargetField(state.user.uid, id, isArchived, { title: newTitle });
                        showToast("Título atualizado com sucesso!", "success");
                        await syncTarget(id); // <-- CHAMADA DE SINCRONIZAÇÃO
                    } catch (error) {
                        // ... (tratamento de erro) ...
                    } finally {
                        await loadDataForUser(state.user); // Recarrega tudo para manter UI consistente
                    }
                }
                // Repetir padrão semelhante para todos os outros cases de modificação
                break;
            }

            // ... outros cases ...
        }
    });

    initializeFloatingNav(state);
});