/**
 * @file dom-elements.js
 * @description Centraliza a seleção de todos os elementos do DOM utilizados pela aplicação.
 * Cada elemento é exportado como uma constante para ser importado e utilizado por outros módulos de UI.
 * Isso desacopla a lógica da aplicação da estrutura do HTML.
 */

// --- Header e Navegação Principal ---
export const headerLogo = document.getElementById('header-logo');
export const headerContent = document.querySelector('.header-content');
export const planSelectorContainer = document.getElementById('plan-selector-container');
export const planSelect = document.getElementById('plan-select');
export const managePlansButton = document.getElementById('manage-plans-button');
export const userStatusContainer = document.getElementById('user-status');
export const userEmailSpan = document.getElementById('user-email');
export const logoutButton = document.getElementById('logout-button');

// --- Seção de Autenticação (Login/Cadastro) ---
export const authSection = document.getElementById('auth-section');
export const authErrorDiv = document.getElementById('auth-error');
export const signupErrorDiv = document.getElementById('signup-error');
export const authLoadingDiv = document.getElementById('auth-loading');
export const loginForm = document.getElementById('login-form');
export const loginEmailInput = document.getElementById('login-email');
export const loginPasswordInput = document.getElementById('login-password');
export const loginButton = document.getElementById('login-button');
export const showSignupLink = document.getElementById('show-signup');
export const signupForm = document.getElementById('signup-form');
export const signupEmailInput = document.getElementById('signup-email');
export const signupPasswordInput = document.getElementById('signup-password');
export const signupButton = document.getElementById('signup-button');
export const showLoginLink = document.getElementById('show-login');

// --- Seção de Criação de Plano ---
export const planCreationSection = document.getElementById('plan-creation');
export const planErrorDiv = document.getElementById('plan-error');
export const planLoadingCreateDiv = document.getElementById('plan-loading-create');
export const planNameInput = document.getElementById('plan-name');
export const googleDriveLinkInput = document.getElementById('google-drive-link');
export const creationMethodRadios = document.querySelectorAll('input[name="creation-method"]');
export const intervalOptionsDiv = document.getElementById('interval-options');
export const startBookSelect = document.getElementById("start-book-select");
export const startChapterInput = document.getElementById("start-chapter-input");
export const endBookSelect = document.getElementById("end-book-select");
export const endChapterInput = document.getElementById("end-chapter-input");
export const selectionOptionsDiv = document.getElementById('selection-options');
export const booksSelect = document.getElementById("books-select");
export const chaptersInput = document.getElementById("chapters-input");
export const bookSuggestionsDatalist = document.getElementById("book-suggestions");
export const durationMethodRadios = document.querySelectorAll('input[name="duration-method"]');
export const daysOptionDiv = document.getElementById('days-option');
export const daysInput = document.getElementById("days-input");
export const endDateOptionDiv = document.getElementById('end-date-option');
export const startDateInput = document.getElementById('start-date-input');
export const endDateInput = document.getElementById('end-date-input');
export const chaptersPerDayOptionDiv = document.getElementById('chapters-per-day-option');
export const chaptersPerDayInput = document.getElementById('chapters-per-day-input');
export const periodicityOptions = document.getElementById('periodicity-options');
export const periodicityCheckboxes = document.querySelectorAll('input[name="reading-day"]');
export const periodicityWarningDiv = document.getElementById('periodicity-warning');
export const createPlanButton = document.getElementById('create-plan');
export const cancelCreationButton = document.getElementById('cancel-creation-button');

// --- Painel de Perseverança ---
export const perseveranceSection = document.getElementById('perseverance-section');
export const perseveranceHeader = perseveranceSection.querySelector('.perseverance-header');
export const milestoneIconsArea = perseveranceSection.querySelector('.milestone-icons-area');
export const perseveranceBarContainer = perseveranceSection.querySelector('.perseverance-bar-container');
export const perseveranceProgressFill = document.getElementById('perseverance-progress-fill');
export const currentDaysText = perseveranceSection.querySelector('.current-days-text');
export const recordDaysText = perseveranceSection.querySelector('.record-days-text');
export const milestoneLegend = perseveranceSection.querySelector('.milestone-legend');

// --- Painel de Progresso Semanal Global ---
export const globalWeeklyTrackerSection = document.getElementById('global-weekly-tracker-section');
export const globalWeekDaysIndicators = document.getElementById('global-week-days-indicators');
export const globalDayIndicatorElements = document.querySelectorAll('#global-weekly-tracker-section .day-indicator');

// --- Seções de Leituras Atrasadas e Próximas ---
export const overdueReadingsSection = document.getElementById('overdue-readings');
export const overdueReadingsLoadingDiv = document.getElementById('overdue-readings-loading');
export const overdueReadingsListDiv = document.getElementById('overdue-readings-list');
export const upcomingReadingsSection = document.getElementById('upcoming-readings');
export const upcomingReadingsLoadingDiv = document.getElementById('upcoming-readings-loading');
export const upcomingReadingsListDiv = document.getElementById('upcoming-readings-list');

// --- Seção do Plano de Leitura Ativo ---
export const readingPlanSection = document.getElementById('reading-plan');
export const planHeaderInfo = document.querySelector('.plan-header-info');
export const readingPlanTitle = document.getElementById('reading-plan-title');
export const activePlanDriveLink = document.getElementById('active-plan-drive-link');
export const planLoadingViewDiv = document.getElementById('plan-loading-view');
export const planViewErrorDiv = document.getElementById('plan-view-error');
export const progressBarContainer = document.querySelector('.progress-container');
export const progressText = document.getElementById('progress-text');
export const progressBarFill = document.getElementById('progress-bar-fill');
export const dailyReadingHeaderDiv = document.getElementById('daily-reading-header');
export const dailyReadingChaptersListDiv = document.getElementById('daily-reading-chapters-list');
export const planActions = document.querySelector('.plan-actions');
export const completeDayButton = document.getElementById('complete-day-button');
export const recalculatePlanButton = document.getElementById('recalculate-plan');
export const showStatsButton = document.getElementById('show-stats-button');
export const showHistoryButton = document.getElementById('show-history-button');
export const deleteCurrentPlanButton = document.getElementById('delete-current-plan-button');

// --- Modais ---

// Modal de Recálculo
export const recalculateModal = document.getElementById('recalculate-modal');
export const recalculateErrorDiv = document.getElementById('recalculate-error');
export const recalculateLoadingDiv = document.getElementById('recalculate-loading');
export const newPaceInput = document.getElementById('new-pace-input');
export const confirmRecalculateButton = document.getElementById('confirm-recalculate');

// Modal de Gerenciar Planos
export const managePlansModal = document.getElementById('manage-plans-modal');
export const managePlansLoadingDiv = document.getElementById('manage-plans-loading');
export const managePlansErrorDiv = document.getElementById('manage-plans-error');
export const planListDiv = document.getElementById('plan-list');
export const createNewPlanButton = document.getElementById('create-new-plan-button');
export const createFavoritePlanButton = document.getElementById('create-favorite-plan-button');

// Modal de Estatísticas
export const statsModal = document.getElementById('stats-modal');
export const statsLoadingDiv = document.getElementById('stats-loading');
export const statsErrorDiv = document.getElementById('stats-error');
export const statsContentDiv = document.getElementById('stats-content');
export const statsActivePlanName = document.getElementById('stats-active-plan-name');
export const statsActivePlanProgress = document.getElementById('stats-active-plan-progress');
export const statsTotalChapters = document.getElementById('stats-total-chapters');
export const statsPlansCompleted = document.getElementById('stats-plans-completed');
export const statsAvgPace = document.getElementById('stats-avg-pace');

// Modal de Histórico
export const historyModal = document.getElementById('history-modal');
export const historyLoadingDiv = document.getElementById('history-loading');
export const historyErrorDiv = document.getElementById('history-error');
export const historyListDiv = document.getElementById('history-list');

// Função auxiliar para fechar qualquer modal (pode ser movida para modals-ui.js)
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}
