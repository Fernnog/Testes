// src/main.js
import { onAuthStateChanged } from './services/authService.js';
import * as AuthUI from './ui/auth-ui.js';
import * as HeaderUI from './ui/header-ui.js';
import { loadUserInitialData } from './services/planService.js';
import { renderActivePlan } from './ui/reading-plan-ui.js';

// Inicializa as UIs que são sempre visíveis ou precisam de listeners
AuthUI.init();
HeaderUI.init();
// ... inicializar outros módulos de UI

onAuthStateChanged(async (user) => {
    if (user) {
        // Usuário logado
        const { plans, activePlanId, userData } = await loadUserInitialData(user.uid);
        HeaderUI.updateUserStatus(user, plans, activePlanId);
        renderActivePlan(plans.find(p => p.id === activePlanId));
        AuthUI.hide();
        // ... mostrar outras seções da UI
    } else {
        // Usuário deslogado
        HeaderUI.updateUserStatus(null);
        AuthUI.show();
        // ... esconder outras seções da UI
    }
});
