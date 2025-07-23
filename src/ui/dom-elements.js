/**
 * @file dom-elements.js
 * @description Centraliza a seleção de todos os elementos do DOM utilizados pela aplicação.
 * Cada elemento é exportado como uma constante para ser importado e utilizado por outros módulos de UI.
 * Isso desacopla a lógica da aplicação da estrutura do HTML.
 */

// --- Header e Navegação Principal ---
export const headerLogo = document.getElementById('header-logo');
export const headerContent = document.querySelector('.header-content');
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

// --- Ações e Formulário de Criação/Edição de Plano ---
export const planCreationActionsSection = document.getElementById('plan-creation-actions');
export const createNewPlanButton = document.getElementById('create-new-plan-button');
export const createFavoritePlanButton = document.getElementById('create-favorite-plan-button');

export const planCreationSection = document.getElementById('plan-creation');
export const planCreationTitle = document.getElementById('plan-creation-title');
export const editingPlanIdInput = document.getElementById('editing-plan-id');
export const planErrorDiv = document.getElementById('plan-error');
export const planLoadingCreateDiv = document.getElementById('plan-loading-create');
export const planNameInput = document.getElementById('plan-name');
export const googleDriveLinkInput = document.getElementById('google-drive-link');
export const iconSelectorContainer = document.getElementById('icon-selector-container');
export const planStructureFieldset = document.getElementById('plan-structure-fieldset');
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

// --- Container de Exibição dos Planos ---
export const plansDisplaySection = document.getElementById('plans-display-section');
// NOTA: Os elementos internos de cada card de plano (título, progresso, etc.)
// são criados e gerenciados dinamicamente pelo módulo `reading-plan-ui.js`.

// --- Modais ---

// Modal de Recálculo
export const recalculateModal = document.getElementById('recalculate-modal');
export const recalculateErrorDiv = document.getElementById('recalculate-error');
export const recalculateLoadingDiv = document.getElementById('recalculate-loading');
export const newPaceInput = document.getElementById('new-pace-input');
export const confirmRecalculateButton = document.getElementById('confirm-recalculate');
// INÍCIO DA ALTERAÇÃO: Adicionados os elementos para recálculo inteligente e preview (Prioridades 2 e 3)
export const recalcSpecificDateInput = document.getElementById('recalc-specific-date-input'); // Elemento para data específica
// FIM DA ALTERAÇÃO

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

// Modal de Sincronização
export const syncModal = document.getElementById('sync-plans-modal');
export const syncErrorDiv = document.getElementById('sync-error');
export const syncLoadingDiv = document.getElementById('sync-loading');
export const syncBasePlanSelect = document.getElementById('sync-base-plan-select');
export const syncTargetDateDisplay = document.getElementById('sync-target-date-display');
export const syncPlansToAdjustList = document.getElementById('sync-plans-to-adjust-list');
export const confirmSyncButton = document.getElementById('confirm-sync-button');

// Botão para abrir o explorador
export const exploreBibleButton = document.getElementById('explore-bible-button');

// Elementos do Modal do Explorador
export const bibleExplorerModal = document.getElementById('bible-explorer-modal');
export const explorerGridView = document.getElementById('explorer-grid-view');
export const explorerBookGrid = document.getElementById('explorer-book-grid');
export const explorerDetailView = document.getElementById('explorer-detail-view');
export const explorerBackButton = document.getElementById('explorer-back-button');
export const explorerDetailTitle = document.getElementById('explorer-detail-title');
export const explorerChapterList = document.getElementById('explorer-chapter-list');


// --- Seção de Reavaliação de Planos ---
export const reassessPlansButton = document.getElementById('reassess-plans-button');
export const syncPlansButton = document.getElementById('sync-plans-button');
export const planReassessmentSection = document.getElementById('plan-reassessment-section');
export const closeReassessmentButton = document.getElementById('close-reassessment-button');
export const reassessmentGrid = document.getElementById('reassessment-grid');
export const reassessmentLegendList = document.getElementById('reassessment-legend-list');
