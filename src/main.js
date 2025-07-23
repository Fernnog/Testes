// src/main.js

/**
 * @file main.js
 * @description Ponto de entrada principal e orquestrador da aplicação.
 * Gerencia o estado da aplicação, lida com a lógica de negócios e coordena
 * a comunicação entre os serviços (Firebase) e os módulos de UI.
 */

// --- 1. IMPORTAÇÕES DE MÓDULOS ---

// Serviços (Comunicação com o Backend)
import * as authService from './services/authService.js';
import * as planService from './services/planService.js';

// Módulos de UI (Manipulação do DOM)
import * as authUI from './ui/auth-ui.js';
import * as headerUI from './ui/header-ui.js';
import * as modalsUI from './ui/modals-ui.js';
import * as planCreationUI from './ui/plan-creation-ui.js';
import * as perseverancePanelUI from './ui/perseverance-panel-ui.js';
import * as weeklyTrackerUI from './ui/weekly-tracker-ui.js';
import * as readingPlanUI from './ui/reading-plan-ui.js';
import * as sidePanelsUI from './ui/side-panels-ui.js';
import * as floatingNavigatorUI from './ui/floating-navigator-ui.js';
import * as planReassessmentUI from './ui/plan-reassessment-ui.js';

// Helpers e Configurações
import {
    generateChaptersInRange,
    parseChaptersInput,
    generateChaptersForBookList,
    generateIntercalatedChapters,
    distributeChaptersOverReadingDays,
    sortChaptersCanonically,
    summarizeChaptersByBook
} from './utils/chapter-helpers.js';
import { getCurrentUTCDateString, dateDiffInDays, getUTCWeekId, addUTCDays, formatUTCDateStringToBrasilian } from './utils/date-helpers.js';
import { getEffectiveDateForDay } from './utils/plan-logic-helpers.js';
import { FAVORITE_ANNUAL_PLAN_CONFIG } from './config/plan-templates.js';
import { FAVORITE_PLAN_ICONS } from './config/icon-config.js';
import { buildPlanFromFormData } from './utils/plan-builder.js';
// INÍCIO DA ALTERAÇÃO: Importação do novo módulo de cálculo
import * as planCalculator from './utils/plan-calculator.js';
// FIM DA ALTERAÇÃO

// Elementos do DOM para ações principais
import {
    planCreationActionsSection,
    createNewPlanButton,
    createFavoritePlanButton,
    reassessPlansButton,
    exploreBibleButton, // Botão para a nova funcionalidade
    planStructureFieldset
} from './ui/dom-elements.js';


// --- 2. ESTADO DA APLICAÇÃO ---

const appState = {
    currentUser: null,
    userInfo: null,
    userPlans: [],
    activePlanId: null,
    
    get weeklyInteractions() {
        return this.userInfo ? this.userInfo.globalWeeklyInteractions : null;
    },

    reset() {
        this.currentUser = null;
        this.userInfo = null;
        this.userPlans = [];
        this.activePlanId = null;
    }
};


// --- 3. ORQUESTRADOR PRINCIPAL E LÓGICA DE NEGÓCIOS ---

async function handleAuthStateChange(user) {
    authUI.hideLoading(); 
    if (user) {
        appState.currentUser = user;
        authUI.hide();
        headerUI.showLoading();
        
        await loadInitialUserData(user);

        headerUI.render(user); 
        planCreationActionsSection.style.display = 'flex';
        
        perseverancePanelUI.render(appState.userInfo);
        weeklyTrackerUI.render(appState.weeklyInteractions);

        sidePanelsUI.render(appState.userPlans, {
            onSwitchPlan: handleSwitchPlan,
            onRecalculate: (planId) => {
                modalsUI.resetRecalculateForm();
                const confirmBtn = document.getElementById('confirm-recalculate');
                confirmBtn.dataset.planId = planId;
                modalsUI.open('recalculate-modal');
            }
        });
        
        renderAllPlanCards();
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
        
        if (appState.userPlans.length === 0) {
            handleCreateNewPlanRequest();
        }

    } else {
        appState.reset();
        authUI.show();
        headerUI.render(null);
        planCreationActionsSection.style.display = 'none';
        readingPlanUI.hide();
        planCreationUI.hide();
        planReassessmentUI.hide();
        perseverancePanelUI.hide();
        weeklyTrackerUI.hide();
        sidePanelsUI.hide();
        floatingNavigatorUI.hide();
    }
}

// INÍCIO DA ALTERAÇÃO: Função corrigida para calcular a previsão corretamente
function renderAllPlanCards() {
    const effectiveDatesMap = {};
    const forecastsMap = {};
    const todayStr = getCurrentUTCDateString(); // Pega a data de hoje para projeção

    appState.userPlans.forEach(plan => {
         effectiveDatesMap[plan.id] = getEffectiveDateForDay(plan, plan.currentDay);

        const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
        const isCompleted = plan.currentDay > totalReadingDaysInPlan;
        
        if (!isCompleted) {
            const logEntries = plan.readLog || {};
            const daysWithReading = Object.keys(logEntries).length;
            const chaptersReadFromLog = Object.values(logEntries).reduce((sum, chapters) => sum + chapters.length, 0);
            const avgPace = daysWithReading > 0 ? (chaptersReadFromLog / daysWithReading) : 0;

            if (avgPace > 0) {
                const remainingChapters = plan.totalChapters - chaptersReadFromLog;
                // Calcula quantos DIAS DE LEITURA (sessões) faltam com base no ritmo
                const remainingReadingDays = Math.ceil(remainingChapters / avgPace);
                
                // Monta um objeto de "plano de projeção" para calcular a data final
                const projectionPlan = {
                    startDate: todayStr,
                    allowedDays: plan.allowedDays,
                    recalculationBaseDate: null, // Ignora recálculos passados para projeção
                    recalculationBaseDay: null
                };
                // Usa a função correta que respeita os dias permitidos
                const forecastDateStr = getEffectiveDateForDay(projectionPlan, remainingReadingDays);
                
                let colorClass = 'forecast-neutral';
                if (forecastDateStr && plan.endDate) {
                    if (forecastDateStr < plan.endDate) {
                        colorClass = 'forecast-ahead';
                    } else if (forecastDateStr > plan.endDate) {
                        colorClass = 'forecast-behind';
                    }
                }
                
                forecastsMap[plan.id] = { forecastDateStr, colorClass };
            }
        }
    });
    
    readingPlanUI.renderAllPlanCards(appState.userPlans, appState.activePlanId, effectiveDatesMap, forecastsMap);
}
// FIM DA ALTERAÇÃO

async function loadInitialUserData(user) {
    try {
        appState.userInfo = await planService.fetchUserInfo(user.uid, user.email);
        
        const streakUpdates = verifyAndResetStreak(appState.userInfo);
        if (streakUpdates) {
            await planService.updateUserInteractions(user.uid, streakUpdates);
            appState.userInfo.currentStreak = 0;
        }

        appState.userPlans = await planService.fetchUserPlans(user.uid);
        appState.activePlanId = appState.userInfo.activePlanId;

    } catch (error) {
        console.error("Erro ao carregar dados iniciais do usuário:", error);
        alert(`Falha ao carregar dados: ${error.message}`);
    } finally {
        sidePanelsUI.render(appState.userPlans, {
            onSwitchPlan: handleSwitchPlan,
            onRecalculate: (planId) => {
                modalsUI.resetRecalculateForm();
                const confirmBtn = document.getElementById('confirm-recalculate');
                confirmBtn.dataset.planId = planId;
                modalsUI.open('recalculate-modal');
            }
        });
        headerUI.hideLoading();
    }
}

function verifyAndResetStreak(userInfo) {
    const todayStr = getCurrentUTCDateString();
    const { lastStreakInteractionDate, currentStreak } = userInfo;

    if (currentStreak === 0 || !lastStreakInteractionDate || lastStreakInteractionDate === todayStr) {
        return null;
    }

    const daysSinceLastInteraction = dateDiffInDays(lastStreakInteractionDate, todayStr);
    if (daysSinceLastInteraction > 1) {
        return { currentStreak: 0 };
    }
    return null;
}

async function handleLogin(email, password) {
    authUI.showLoading();
    try {
        await authService.login(email, password);
    } catch (error) {
        authUI.hideLoading();
        authUI.showLoginError(`Erro de login: ${error.message}`);
    }
}

async function handleSignup(email, password) {
    authUI.showLoading();
    try {
        await authService.signup(email, password);
        alert("Cadastro realizado com sucesso! Você já está logado.");
    } catch (error) {
        authUI.hideLoading();
        authUI.showSignupError(`Erro de cadastro: ${error.message}`);
    }
}

async function handleLogout() {
    try {
        await authService.logout();
    } catch (error) {
        alert(`Erro ao sair: ${error.message}`);
    }
}

async function handleSwitchPlan(planId) {
    if (!appState.currentUser || planId === appState.activePlanId) {
        const targetElement = document.getElementById(`plan-card-${planId}`);
        targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    try {
        await planService.setActivePlan(appState.currentUser.uid, planId);
        const oldActivePlanId = appState.activePlanId;
        appState.activePlanId = planId;
        const oldActiveCard = document.querySelector(`.plan-card[data-plan-id="${oldActivePlanId}"]`);
        if (oldActiveCard) {
            oldActiveCard.classList.remove('active-plan');
        }
        const newActiveCard = document.getElementById(`plan-card-${planId}`);
        if (newActiveCard) {
            newActiveCard.classList.add('active-plan');
        }
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
        requestAnimationFrame(() => {
            newActiveCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

    } catch (error) {
        console.error("Erro ao trocar de plano:", error);
        alert(`Erro ao ativar plano: ${error.message}`);
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
    }
}

function handleCreateNewPlanRequest() {
    readingPlanUI.hide();
    sidePanelsUI.hide();
    planCreationActionsSection.style.display = 'none';
    floatingNavigatorUI.hide();
    planReassessmentUI.hide();
    perseverancePanelUI.hide();
    weeklyTrackerUI.hide();
    planCreationUI.show(appState.userPlans.length === 0);
}

function handleCancelPlanCreation() {
    planCreationUI.hide();
    planReassessmentUI.hide();
    
    planCreationActionsSection.style.display = 'flex';
    readingPlanUI.show();
    floatingNavigatorUI.show();
    
    perseverancePanelUI.render(appState.userInfo);
    weeklyTrackerUI.render(appState.weeklyInteractions);

    sidePanelsUI.render(appState.userPlans, {
        onSwitchPlan: handleSwitchPlan,
        onRecalculate: (planId) => {
            modalsUI.resetRecalculateForm();
            const confirmBtn = document.getElementById('confirm-recalculate');
            confirmBtn.dataset.planId = planId;
            modalsUI.open('recalculate-modal');
        }
    });
}

async function handlePlanSubmit(formData, planId, isReassessing) {
    planCreationUI.showLoading();
        
    try {
        if (planId) {
            let updatedData = {};
            
            if (isReassessing) {
                updatedData = { allowedDays: formData.allowedDays };
                await planService.updatePlan(appState.currentUser.uid, planId, updatedData);
                alert('Dias de leitura atualizados com sucesso!');

            } else {
                updatedData = { 
                    name: formData.name, 
                    icon: formData.icon, 
                    googleDriveLink: formData.googleDriveLink || null 
                };
                await planService.updatePlan(appState.currentUser.uid, planId, updatedData);
                alert(`Plano "${formData.name}" atualizado com sucesso!`);
            }
        } else {
            const newPlan = buildPlanFromFormData(formData);
            const newPlanId = await planService.saveNewPlan(appState.currentUser.uid, newPlan);
            if (appState.userPlans.length === 0) {
                await planService.setActivePlan(appState.currentUser.uid, newPlanId);
            }
            alert(`Plano "${newPlan.name}" criado com sucesso!`);
        }

        await loadInitialUserData(appState.currentUser);

        planCreationUI.hide();

        if (isReassessing) {
            handleReassessPlansRequest();
        } else {
            handleCancelPlanCreation();
        }

    } catch (error) {
        planCreationUI.showError(`Erro: ${error.message}`);
    } finally {
        planCreationUI.hideLoading();
    }
}

async function handleChapterToggle(planId, chapterName, isRead) {
    if (!appState.currentUser) return;

    try {
        await planService.updateChapterStatus(appState.currentUser.uid, planId, chapterName, isRead);
        
        const planToUpdate = appState.userPlans.find(p => p.id === planId);
        if (planToUpdate) {
            if (!planToUpdate.dailyChapterReadStatus) planToUpdate.dailyChapterReadStatus = {};
            planToUpdate.dailyChapterReadStatus[chapterName] = isRead;
        }
        
        const todayStr = getCurrentUTCDateString();
        let interactionUpdates = {};
        if (isRead && appState.userInfo.lastStreakInteractionDate !== todayStr) {
            const daysDiff = appState.userInfo.lastStreakInteractionDate ? dateDiffInDays(appState.userInfo.lastStreakInteractionDate, todayStr) : Infinity;
            appState.userInfo.currentStreak = (daysDiff === 1) ? appState.userInfo.currentStreak + 1 : 1;
            appState.userInfo.longestStreak = Math.max(appState.userInfo.longestStreak, appState.userInfo.currentStreak);
            appState.userInfo.lastStreakInteractionDate = todayStr;
            interactionUpdates = {
                currentStreak: appState.userInfo.currentStreak,
                longestStreak: appState.userInfo.longestStreak,
                lastStreakInteractionDate: todayStr
            };
        }
        const currentWeekId = getUTCWeekId();
        if (appState.weeklyInteractions?.weekId !== currentWeekId) {
            appState.userInfo.globalWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
        }
        if (!appState.userInfo.globalWeeklyInteractions.interactions) {
            appState.userInfo.globalWeeklyInteractions.interactions = {};
        }
        appState.userInfo.globalWeeklyInteractions.interactions[todayStr] = true;
        interactionUpdates.globalWeeklyInteractions = appState.userInfo.globalWeeklyInteractions;

        if (Object.keys(interactionUpdates).length > 0) {
            await planService.updateUserInteractions(appState.currentUser.uid, interactionUpdates);
        }

        renderAllPlanCards();
        perseverancePanelUI.render(appState.userInfo);
        weeklyTrackerUI.render(appState.weeklyInteractions);
        
    } catch (error) {
        alert(`Erro ao salvar progresso: ${error.message}`);
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();
    }
}

async function handleCompleteDay(planId) {
    const planToAdvance = appState.userPlans.find(p => p.id === planId);
    if (!planToAdvance) return;

    try {
        const { currentDay, plan } = planToAdvance;
        const chaptersForLog = plan[currentDay.toString()] || [];
        const newDay = currentDay + 1;

        await planService.advanceToNextDay(appState.currentUser.uid, planId, newDay, getCurrentUTCDateString(), chaptersForLog);
        await loadInitialUserData(appState.currentUser);
        
        renderAllPlanCards();
        sidePanelsUI.render(appState.userPlans, {
            onSwitchPlan: handleSwitchPlan,
            onRecalculate: (planId) => {
                modalsUI.resetRecalculateForm();
                const confirmBtn = document.getElementById('confirm-recalculate');
                confirmBtn.dataset.planId = planId;
                modalsUI.open('recalculate-modal');
            }
        });
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
        
        if (newDay > Object.keys(plan).length) {
            setTimeout(() => alert(`Parabéns! Você concluiu o plano "${planToAdvance.name}"!`), 100);
        }
    } catch (error) {
        alert(`Erro ao avançar o plano: ${error.message}`);
    }
}

async function handleDeletePlan(planId) {
    const planToDelete = appState.userPlans.find(p => p.id === planId);
    if (!planToDelete) return;

    if (confirm(`Tem certeza que deseja excluir o plano "${planToDelete.name}"? Esta ação não pode ser desfeita.`)) {
        try {
            await planService.deletePlan(appState.currentUser.uid, planId);

            if (appState.activePlanId === planId) {
                const remainingPlans = appState.userPlans.filter(p => p.id !== planId);
                const newActivePlanId = remainingPlans.length > 0 ? remainingPlans[0].id : null;
                await planService.setActivePlan(appState.currentUser.uid, newActivePlanId);
            }
            
            alert(`Plano "${planToDelete.name}" excluído com sucesso.`);
            await loadInitialUserData(appState.currentUser); 
            
            renderAllPlanCards();
            sidePanelsUI.render(appState.userPlans, {
                onSwitchPlan: handleSwitchPlan,
                onRecalculate: (planId) => {
                    modalsUI.resetRecalculateForm();
                    const confirmBtn = document.getElementById('confirm-recalculate');
                    confirmBtn.dataset.planId = planId;
                    modalsUI.open('recalculate-modal');
                }
            });
            floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
            
            if (appState.userPlans.length === 0) {
                handleCreateNewPlanRequest();
            }

        } catch (error) {
            alert(`Erro ao deletar: ${error.message}`);
        }
    }
}

function handleEditPlanRequest(planId) {
    const planToEdit = appState.userPlans.find(p => p.id === planId);
    if (planToEdit) {
        readingPlanUI.hide();
        sidePanelsUI.hide();
        planCreationActionsSection.style.display = 'none';
        floatingNavigatorUI.hide();
        planReassessmentUI.hide();
        perseverancePanelUI.hide();
        weeklyTrackerUI.hide();
        planCreationUI.openForEditing(planToEdit);
    } else {
        alert("Erro: Plano não encontrado para edição.");
    }
}


// --- 4. FUNÇÕES DE RECÁLCULO, SINCRONIZAÇÃO E REAVALIAÇÃO ---

function handleReassessPlansRequest() {
    readingPlanUI.hide();
    sidePanelsUI.hide();
    planCreationActionsSection.style.display = 'none';
    floatingNavigatorUI.hide();
    planCreationUI.hide();
    perseverancePanelUI.hide();
    weeklyTrackerUI.hide();

    planReassessmentUI.render(appState.userPlans);
    planReassessmentUI.show();
}

function handleReassessPlanEdit(planId) {
    const planToEdit = appState.userPlans.find(p => p.id === planId);
    if (planToEdit) {
        planReassessmentUI.hide();
        planCreationUI.openForReassessment(planToEdit);
    }
}

async function handlePlanUpdateDaysByDrag(planId, sourceDay, targetDay) {
    if (sourceDay === targetDay) return;

    const planToUpdate = appState.userPlans.find(p => p.id === planId);
    if (!planToUpdate) return;
    
    let newAllowedDays = [...(planToUpdate.allowedDays || [])];
    newAllowedDays = newAllowedDays.filter(day => day !== sourceDay);
    if (!newAllowedDays.includes(targetDay)) {
        newAllowedDays.push(targetDay);
    }
    
    try {
        await planService.updatePlan(appState.currentUser.uid, planId, { allowedDays: newAllowedDays });
        await loadInitialUserData(appState.currentUser);
        planReassessmentUI.render(appState.userPlans);
    } catch (error) {
        console.error("Erro ao atualizar plano por Drag & Drop:", error);
        alert("Ocorreu um erro ao remanejar o plano.");
    }
}

function handleSyncPlansRequest() {
    const eligiblePlans = appState.userPlans.filter(p => {
        const totalDays = Object.keys(p.plan || {}).length;
        return totalDays > 0 && p.currentDay <= totalDays;
    });

    modalsUI.displaySyncOptions(eligiblePlans, handleConfirmSync);
}

// INÍCIO DA ALTERAÇÃO: Função refatorada para usar o módulo de cálculo
async function handleConfirmSync(basePlanId, targetDate, plansToSyncIds) {
    modalsUI.showLoading('sync-modal');
    modalsUI.hideError('sync-modal');

    try {
        if (!targetDate || plansToSyncIds.length === 0) {
            throw new Error("Seleção inválida. Escolha um plano de referência e planos para ajustar.");
        }
        const todayStr = getCurrentUTCDateString();

        for (const planId of plansToSyncIds) {
            const originalPlan = appState.userPlans.find(p => p.id === planId);
            
            // Usa o novo módulo de cálculo centralizado
            const result = planCalculator.recalculatePlanToTargetDate(originalPlan, targetDate, todayStr);

            if (!result) {
                const formattedDate = formatUTCDateStringToBrasilian(targetDate);
                throw new Error(`O plano "${originalPlan.name}" não pode ser recalculado para terminar em ${formattedDate}. A data pode ser muito próxima.`);
            }
            let { recalculatedPlan } = result;
            
            // Adiciona informações específicas da sincronização ao histórico
            if (!recalculatedPlan.recalculationHistory) recalculatedPlan.recalculationHistory = [];
            recalculatedPlan.recalculationHistory.push({
                date: todayStr,
                type: 'sync',
                recalculatedFromDay: originalPlan.currentDay,
                chaptersReadAtPoint: Object.values(originalPlan.readLog || {}).reduce((sum, chapters) => sum + chapters.length, 0),
                targetDate: targetDate,
                syncedWithPlanId: basePlanId,
            });

            const planToSave = { ...recalculatedPlan };
            delete planToSave.id;
            await planService.saveRecalculatedPlan(appState.currentUser.uid, planId, planToSave);
        }

        alert("Planos sincronizados com sucesso!");
        modalsUI.close('sync-plans-modal');
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();
        handleReassessPlansRequest();

    } catch (error) {
        modalsUI.showError('sync-modal', `Erro: ${error.message}`);
    } finally {
        modalsUI.hideLoading('sync-modal');
    }
}
// FIM DA ALTERAÇÃO

// INÍCIO DA ALTERAÇÃO: Função refatorada para usar o módulo de cálculo
async function handleRecalculate(option, newPaceValue, planId) {
    const planToRecalculate = appState.userPlans.find(p => p.id === planId);
    if (!appState.currentUser || !planToRecalculate) return;
    
    modalsUI.showLoading('recalculate-modal');
    modalsUI.hideError('recalculate-modal');

    try {
        const todayStr = getCurrentUTCDateString();
        const originalPlan = { ...planToRecalculate };
        let targetEndDate = null;

        // 1. Determina a data final alvo com base na opção do usuário
        switch(option) {
            case 'new_pace':
                if (!newPaceValue || newPaceValue < 1) throw new Error("O novo ritmo deve ser de pelo menos 1.");
                targetEndDate = planCalculator.calculateEndDateFromPace(originalPlan, newPaceValue, todayStr);
                break;
            case 'increase_pace':
                targetEndDate = originalPlan.endDate;
                break;
            case 'extend_date':
            default:
                const originalTotalDays = Object.keys(originalPlan.plan).length;
                const originalPace = originalTotalDays > 0 ? (originalPlan.totalChapters / originalTotalDays) : 1;
                targetEndDate = planCalculator.calculateEndDateFromPace(originalPlan, originalPace, todayStr);
                break;
        }

        if (!targetEndDate) {
            throw new Error("Não foi possível calcular uma nova data final para a opção selecionada.");
        }

        // 2. Chama o módulo de cálculo central com a data alvo
        const result = planCalculator.recalculatePlanToTargetDate(originalPlan, targetEndDate, todayStr);

        if (!result) {
            const formattedDate = formatUTCDateStringToBrasilian(targetEndDate);
            throw new Error(`O plano não pode ser recalculado para terminar em ${formattedDate}. A data pode ser muito próxima ou inválida.`);
        }
        let { recalculatedPlan } = result;

        // 3. Atualiza o histórico e salva o plano
        if (!recalculatedPlan.recalculationHistory) recalculatedPlan.recalculationHistory = [];
        recalculatedPlan.recalculationHistory.push({
            date: todayStr,
            type: 'manual',
            recalculatedFromDay: originalPlan.currentDay,
            chaptersReadAtPoint: Object.values(originalPlan.readLog || {}).reduce((sum, chapters) => sum + chapters.length, 0),
            option: option,
            paceValue: option === 'new_pace' ? newPaceValue : null,
        });

        const planToSave = { ...recalculatedPlan };
        delete planToSave.id;
        await planService.saveRecalculatedPlan(appState.currentUser.uid, planId, planToSave);
        
        alert("Plano recalculado com sucesso!");
        modalsUI.close('recalculate-modal');
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();
        sidePanelsUI.render(appState.userPlans, {
            onSwitchPlan: handleSwitchPlan,
            onRecalculate: (planId) => {
                modalsUI.resetRecalculateForm();
                document.getElementById('confirm-recalculate').dataset.planId = planId;
                modalsUI.open('recalculate-modal');
            }
        });
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);

    } catch (error) {
        modalsUI.showError('recalculate-modal', `Erro: ${error.message}`);
    } finally {
        modalsUI.hideLoading('recalculate-modal');
    }
}
// FIM DA ALTERAÇÃO


// --- 5. FUNÇÕES DE MODAIS E OUTRAS AÇÕES ---

function handleShowBibleExplorer() {
    const booksToIconsMap = new Map();
    const allChaptersInPlans = new Set();

    appState.userPlans.forEach(plan => {
        if (!plan.chaptersList || plan.chaptersList.length === 0) {
            return;
        }

        plan.chaptersList.forEach(chapter => allChaptersInPlans.add(chapter));
        
        const booksInCurrentPlan = new Set();
        plan.chaptersList.forEach(chapterString => {
            const bookNameMatch = chapterString.match(/^(.*)\s+\d+$/);
            if (bookNameMatch && bookNameMatch[1]) {
                booksInCurrentPlan.add(bookNameMatch[1]);
            }
        });

        booksInCurrentPlan.forEach(bookName => {
            if (!booksToIconsMap.has(bookName)) {
                booksToIconsMap.set(bookName, []);
            }
            booksToIconsMap.get(bookName).push({ 
                icon: plan.icon || '📖',
                name: plan.name 
            });
        });
    });
    
    modalsUI.displayBibleExplorer(booksToIconsMap, allChaptersInPlans);
}

// INÍCIO DA ALTERAÇÃO: Função corrigida para calcular a previsão corretamente
function handleShowStats(planId) {
    const plan = appState.userPlans.find(p => p.id === planId);
    if (!plan) return;

    const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
    const isCompleted = plan.currentDay > totalReadingDaysInPlan;
    const progressPercentage = totalReadingDaysInPlan > 0 ? Math.min(100, ((plan.currentDay - 1) / totalReadingDaysInPlan) * 100) : 0;
    
    const logEntries = plan.readLog || {};
    const daysWithReading = Object.keys(logEntries).length;
    const chaptersReadFromLog = Object.values(logEntries).reduce((sum, chapters) => sum + chapters.length, 0);
    const avgPace = daysWithReading > 0 ? (chaptersReadFromLog / daysWithReading) : 0;
    
    const recalculationsCount = plan.recalculationHistory?.length || 0;
    
    let forecastDateStr = '--';
    if (!isCompleted && avgPace > 0) {
        const remainingChapters = plan.totalChapters - chaptersReadFromLog;
        // Calcula quantos DIAS DE LEITURA (sessões) faltam
        const remainingReadingDays = Math.ceil(remainingChapters / avgPace);
        
        // Monta um "plano de projeção" para calcular a data final corretamente
        const projectionPlan = {
            startDate: getCurrentUTCDateString(),
            allowedDays: plan.allowedDays,
            recalculationBaseDate: null, // Ignora recálculos passados para projeção
            recalculationBaseDay: null
        };
        const forecastDate = getEffectiveDateForDay(projectionPlan, remainingReadingDays);
        
        if (forecastDate) {
            // Converte a data string "YYYY-MM-DD" para um objeto Date UTC antes de formatar
            const dateObj = new Date(forecastDate + 'T00:00:00Z');
            forecastDateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
        }
    }

    const chartData = { idealLine: [], actualProgress: [] };
    const originalEndDate = getEffectiveDateForDay({ startDate: plan.startDate, allowedDays: plan.allowedDays }, Object.keys(plan.plan).length);
    chartData.idealLine.push({ x: plan.startDate, y: 0 });
    if(originalEndDate) {
        chartData.idealLine.push({ x: originalEndDate, y: plan.totalChapters });
    }
    
    chartData.actualProgress.push({ x: plan.startDate, y: 0 });
    const sortedLog = Object.entries(logEntries).sort((a, b) => a[0].localeCompare(b[0]));
    let cumulativeChapters = 0;
    for (const [date, chapters] of sortedLog) {
        cumulativeChapters += chapters.length;
        chartData.actualProgress.push({ x: date, y: cumulativeChapters });
    }

    const planSummary = summarizeChaptersByBook(plan.chaptersList);

    const stats = {
        activePlanName: plan.name || 'Plano sem nome',
        activePlanProgress: progressPercentage,
        chaptersReadFromLog: chaptersReadFromLog,
        isCompleted: isCompleted,
        avgPace: `${avgPace.toFixed(1)} caps/dia`,
        recalculationsCount: recalculationsCount,
        forecastDate: forecastDateStr,
        planSummary: planSummary,
        chartData: chartData
    };
    
    modalsUI.displayStats(stats);
    modalsUI.open('stats-modal');
}
// FIM DA ALTERAÇÃO

function handleShowHistory(planId) {
    const plan = appState.userPlans.find(p => p.id === planId);
    if (!plan) return;
    modalsUI.displayHistory(plan.readLog);
    modalsUI.open('history-modal');
}

async function handleCreateFavoritePlanSet() {
    try {
        for (const config of FAVORITE_ANNUAL_PLAN_CONFIG) {
            const chaptersToRead = config.intercalate
                ? generateIntercalatedChapters(config.bookBlocks)
                : generateChaptersForBookList(config.books);
            const totalReadingDays = Math.ceil(chaptersToRead.length / config.chaptersPerReadingDay);
            const planMap = distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays);
            const startDate = getCurrentUTCDateString();
            const endDate = getEffectiveDateForDay({ startDate, allowedDays: config.allowedDays }, totalReadingDays);
            const planData = {
                name: config.name, icon: FAVORITE_PLAN_ICONS[config.name] || '📖', plan: planMap,
                chaptersList: chaptersToRead, totalChapters: chaptersToRead.length, currentDay: 1,
                startDate, endDate, allowedDays: config.allowedDays, readLog: {},
                dailyChapterReadStatus: {}, googleDriveLink: null, recalculationBaseDay: null,
                recalculationBaseDate: null,
            };
            await planService.saveNewPlan(appState.currentUser.uid, planData);
        }
        const updatedPlans = await planService.fetchUserPlans(appState.currentUser.uid);
        if (updatedPlans.length > 0) {
            await planService.setActivePlan(appState.currentUser.uid, updatedPlans[0].id);
        }
        alert("Conjunto de planos favoritos criado com sucesso!");
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();
        sidePanelsUI.render(appState.userPlans, {
            onSwitchPlan: handleSwitchPlan,
            onRecalculate: (planId) => {
                modalsUI.resetRecalculateForm();
                const confirmBtn = document.getElementById('confirm-recalculate');
                confirmBtn.dataset.planId = planId;
                modalsUI.open('recalculate-modal');
            }
        });
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
    } catch (error) {
        alert(`Erro ao criar planos favoritos: ${error.message}`);
    }
}


// --- 6. INICIALIZAÇÃO DA APLICAÇÃO ---

function initApplication() {
    authService.onAuthStateChanged(handleAuthStateChange);

    authUI.init({ onLogin: handleLogin, onSignup: handleSignup });
    headerUI.init({ onLogout: handleLogout });
    
    createNewPlanButton.addEventListener('click', handleCreateNewPlanRequest);
    createFavoritePlanButton.addEventListener('click', handleCreateFavoritePlanSet);
    reassessPlansButton.addEventListener('click', handleReassessPlansRequest);

    if (exploreBibleButton) {
        exploreBibleButton.addEventListener('click', handleShowBibleExplorer);
    }

    planCreationUI.init({
        onSubmit: handlePlanSubmit,
        onCancel: () => {
            const isReassessing = !planStructureFieldset.disabled;
            planCreationUI.hide();
            if (isReassessing) {
                handleReassessPlansRequest();
            } else {
                handleCancelPlanCreation();
            }
        }
    });
    
    readingPlanUI.init({
        onCompleteDay: handleCompleteDay,
        onChapterToggle: handleChapterToggle,
        onDeletePlan: handleDeletePlan,
        onEditPlan: handleEditPlanRequest,
        onRecalculate: (planId) => { 
            modalsUI.resetRecalculateForm();
            const confirmBtn = document.getElementById('confirm-recalculate');
            confirmBtn.dataset.planId = planId;
            modalsUI.open('recalculate-modal'); 
        },
        onShowStats: handleShowStats,
        onShowHistory: handleShowHistory,
    });
    
    perseverancePanelUI.init();
    weeklyTrackerUI.init();
    sidePanelsUI.init();
    
    planReassessmentUI.init({
        onClose: handleCancelPlanCreation,
        onPlanSelect: handleReassessPlanEdit,
        onUpdatePlanDays: handlePlanUpdateDaysByDrag,
        onSyncRequest: handleSyncPlansRequest,
    });

    floatingNavigatorUI.init({
        onSwitchPlan: handleSwitchPlan
    });
    
    modalsUI.init({
        onConfirmRecalculate: (option, newPace) => {
            const confirmBtn = document.getElementById('confirm-recalculate');
            const planId = confirmBtn.dataset.planId;
            if (planId) {
                handleRecalculate(option, newPace, planId);
            }
        },
    });
    
    console.log("Aplicação modular inicializada com nova arquitetura de UI.");
}

document.addEventListener('DOMContentLoaded', initApplication);
