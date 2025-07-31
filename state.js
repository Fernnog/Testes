// modules/state.js
// --- Módulo de Gerenciamento de Estado ---
// Responsabilidade: Manter o estado da aplicação e fornecer métodos seguros para acessá-lo e modificá-lo.
// Evita o uso de variáveis globais e cria um fluxo de dados previsível.

/*
 * --- NOTA DO ARQUITETO (MELHORIA) ---
 * Este módulo não requer alterações para suportar a sincronização com o Google Agenda.
 * Sua estrutura genérica permite que o objeto 'planos' seja enriquecido com novas propriedades
 * (como 'googleEventId' em cada dia do plano) sem a necessidade de modificar os métodos abaixo.
 * 
 * Isso demonstra uma arquitetura desacoplada e resiliente:
 * 1. `firestore-service.js` enriquece os dados.
 * 2. `state.js` armazena esses dados de forma agnóstica.
 * 3. Outros módulos (como `calendar-sync.js`, a ser criado) consomem os dados completos do estado.
 */

const state = {
    currentUser: null,
    planos: [],
    planoEditandoIndex: -1, // -1 significa que nenhum plano está sendo editado
};

// --- GETTERS (Acessores de Estado) ---
export const getCurrentUser = () => state.currentUser;
export const getPlanos = () => state.planos;
export const getPlanoEditandoIndex = () => state.planoEditandoIndex;
export const getPlanoByIndex = (index) => state.planos[index];


// --- SETTERS / MUTATORS (Modificadores de Estado) ---
export function setUser(user) {
    console.log('[State] Usuário atualizado:', user ? user.uid : 'null');
    state.currentUser = user;
}

export function setPlanos(newPlanos) {
    console.log(`[State] Planos atualizados. Total: ${newPlanos.length}`);
    state.planos = newPlanos;
}

export function setPlanoEditando(index) {
    console.log(`[State] Modo de edição definido para o índice: ${index}`);
    state.planoEditandoIndex = index;
}

export function addPlano(planoData) {
    console.log('[State] Adicionando novo plano:', planoData.titulo);
    state.planos.unshift(planoData); // Adiciona no início para aparecer primeiro
}

export function updatePlano(index, planoData) {
    console.log('[State] Atualizando plano no índice:', index);
    if (index >= 0 && index < state.planos.length) {
        state.planos[index] = planoData;
    }
}

export function removePlano(index) {
    if (index >= 0 && index < state.planos.length) {
        const titulo = state.planos[index].titulo;
        console.log('[State] Removendo plano:', titulo);
        state.planos.splice(index, 1);
        return titulo; // Retorna o título para mensagens de confirmação
    }
    return null;
}