/**
 * @file main.js
 * @description Ponto de entrada e orquestrador principal da aplicação.
 * Este arquivo inicializa todos os módulos, gerencia o estado global da aplicação
 * e coordena a comunicação entre os serviços de dados (Firebase) e os módulos de UI.
 */

// --- Importações ---

// Firebase e Configuração
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase-config.js';

// Camada de Serviços (Dados)
import * as AuthService from './services/authService.js';
import * as PlanService from './services/planService.js';

// Camada de Apresentação (UI)
import * as HeaderUI from './ui/header-ui.js';
import * as AuthUI from './ui/auth-ui.js';
import * as PlanCreationUI from './ui/plan-creation-ui.js';
import * as ReadingPlanUI from './ui/reading-plan-ui.js';
import * as ModalsUI from './ui/modals-ui.js';
import * as PerseveranceUI from './ui/perseverance-panel-ui.js';
import * as SidePanelsUI from './ui/side-panels-ui.js'; // Módulo para "Atrasadas" e "Próximas"

// --- Estado Central da Aplicação ---

const AppState = {
    currentUser: null,
    userInfo: null,      // Dados do documento /users/{userId}
    userPlans: [],       // Array de todos os planos do usuário
    activePlan: null,    // Objeto do plano atualmente ativo
    isLoading: true,
};

// --- Handlers (Controladores de Ações) ---
// Estas funções conectam eventos da UI com a lógica de serviço.

async function handleLogin(email, password) {
    // A UI mostra o loading. O resultado será capturado pelo onAuthStateChanged.
    try {
        await AuthService.login(email, password);
    } catch (error) {
        AuthUI.showLoginError(error.message);
    } finally {
        AuthUI.hideLoading();
    }
}

async function handleSignup(email, password) {
    try {
        await AuthService.signup(email, password);
        // O onAuthStateChanged vai lidar com o login automático após o cadastro.
    } catch (error) {
        AuthUI.showSignupError(error.message);
    } finally {
        AuthUI.hideLoading();
    }
}

async function handleLogout() {
    try {
        await AuthService.logout();
        // A UI será limpa pelo onAuthStateChanged.
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        alert("Ocorreu um erro ao tentar sair. Por favor, tente novamente.");
    }
}

async function handleSwitchActivePlan(planId) {
    if (!AppState.currentUser || AppState.activePlan?.id === planId) return;

    try {
        HeaderUI.showLoading();
        await PlanService.setActivePlan(AppState.currentUser.uid, planId);

        // Atualiza o estado local
        AppState.userInfo.activePlanId = planId;
        AppState.activePlan = AppState.userPlans.find(p => p.id === planId) || null;

        // Re-renderiza as partes necessárias da UI
        ReadingPlanUI.render(AppState.activePlan, AppState.userInfo);
        SidePanelsUI.render(AppState.userPlans, AppState.activePlan?.id, handleSwitchActivePlan);

    } catch (error) {
        console.error("Erro ao trocar de plano:", error);
        // TODO: Mostrar um erro mais amigável para o usuário
    } finally {
        HeaderUI.hideLoading();
    }
}

async function handleDeletePlan(planId) {
    if (!AppState.currentUser) return;

    const planToDelete = AppState.userPlans.find(p => p.id === planId);
    if (!planToDelete) return;

    if (confirm(`Tem certeza que deseja excluir o plano "${planToDelete.name}"? Esta ação é irreversível.`)) {
        try {
            ModalsUI.showLoading('manage-plans-modal');
            await PlanService.deletePlan(AppState.currentUser.uid, planId);

            // Se o plano deletado era o ativo, define um novo plano ativo
            if (AppState.activePlan?.id === planId) {
                const remainingPlans = AppState.userPlans.filter(p => p.id !== planId);
                const newActivePlanId = remainingPlans.length > 0 ? remainingPlans[0].id : null;
                await handleSwitchActivePlan(newActivePlanId); // Isso já vai atualizar o DB e o estado local
            }

            // Recarrega a lista de planos e atualiza a UI
            await loadUserPlansAndRender(AppState.currentUser.uid);
            ModalsUI.populateManagePlans(AppState.userPlans, AppState.activePlan?.id, { onDelete: handleDeletePlan, onSwitch: handleSwitchActivePlan });
            ModalsUI.close('manage-plans-modal');

        } catch (error) {
            console.error("Erro ao deletar plano:", error);
            ModalsUI.showError('manage-plans-modal', 'Não foi possível deletar o plano.');
        } finally {
            ModalsUI.hideLoading('manage-plans-modal');
        }
    }
}


// --- Funções de Fluxo de Dados e Renderização ---

/**
 * Reseta o estado da aplicação para o estado inicial (deslogado).
 */
function resetAppState() {
    AppState.currentUser = null;
    AppState.userInfo = null;
    AppState.userPlans = [];
    AppState.activePlan = null;
    AppState.isLoading = false;
}

/**
 * Reseta e esconde todos os componentes de UI da aplicação.
 */
function resetAllUI() {
    HeaderUI.render(null);
    ReadingPlanUI.hide();
    PerseveranceUI.hide();
    SidePanelsUI.hide();
    PlanCreationUI.hide();
    AuthUI.show();
}

/**
 * Busca todos os planos do usuário e atualiza o estado e a UI correspondente.
 * @param {string} userId
 */
async function loadUserPlansAndRender(userId) {
    AppState.userPlans = await PlanService.fetchUserPlans(userId);
    AppState.activePlan = AppState.userPlans.find(p => p.id === AppState.userInfo.activePlanId) || null;

    HeaderUI.render(AppState.currentUser, AppState.userPlans, AppState.activePlan?.id);
    ReadingPlanUI.render(AppState.activePlan, AppState.userInfo);
    SidePanelsUI.render(AppState.userPlans, AppState.activePlan?.id, handleSwitchActivePlan);
}


// --- Ponto de Entrada Principal ---

/**
 * Inicializa a aplicação, configurando os listeners de UI.
 */
function initApp() {
    // Passa os handlers (callbacks) para os módulos de UI
    AuthUI.init({ onLogin: handleLogin, onSignup: handleSignup });
    HeaderUI.init({ onLogout: handleLogout, onSwitchPlan: handleSwitchActivePlan });
    ModalsUI.init({
        onDeletePlan: handleDeletePlan,
        onSwitchPlan: handleSwitchActivePlan
        // ... outros handlers para modais (recalcular, stats, etc.)
    });
    PlanCreationUI.init(); // Pode precisar de callbacks no futuro
    // ... inicializar outros módulos se necessário
}

// Inicia a aplicação
initApp();


// --- Listener Central de Autenticação ---
// Este é o coração do fluxo da aplicação. Ele reage a logins e logouts.

onAuthStateChanged(auth, async (user) => {
    AuthUI.hideAllMessages();
    AppState.isLoading = true;
    HeaderUI.showLoading();

    if (user) {
        // --- Usuário está LOGADO ---
        AppState.currentUser = user;
        try {
            // 1. Busca os dados do usuário (perfil, ID do plano ativo, etc.)
            AppState.userInfo = await PlanService.fetchUserInfo(user.uid, user.email);

            // 2. Busca todos os planos e renderiza as seções principais
            await loadUserPlansAndRender(user.uid);
            
            // 3. Renderiza os painéis de engajamento
            PerseveranceUI.render(AppState.userInfo);

            // 4. Esconde a autenticação e mostra o conteúdo principal
            AuthUI.hide();

        } catch (error) {
            console.error("Erro crítico ao carregar dados do usuário:", error);
            alert("Não foi possível carregar seus dados. Por favor, recarregue a página.");
            // Em caso de erro, desloga para evitar estado inconsistente
            handleLogout();
        }
    } else {
        // --- Usuário está DESLOGADO ---
        resetAppState();
        resetAllUI();
    }

    AppState.isLoading = false;
    HeaderUI.hideLoading();
});
