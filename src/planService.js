/**
 * @file planService.js
 * @description Este módulo atua como uma camada de serviço, abstraindo todas as interações
 * com o Firestore relacionadas a planos de leitura, dados do usuário e progresso.
 * Nenhuma outra parte da aplicação deve interagir diretamente com o Firestore para essas tarefas.
 */

// Importações necessárias do SDK do Firebase e da configuração local
import { db } from '../config/firebase-config.js';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    collection,
    getDocs,
    query,
    orderBy,
    serverTimestamp
} from "firebase/firestore";
import { getUTCWeekId } from '../utils/date-helpers.js'; // Assumindo que esta função foi movida

// --- Funções de Leitura de Dados (Read) ---

/**
 * Busca as informações principais de um usuário. Se o usuário não existir no Firestore,
 * um novo documento é criado com valores padrão.
 * @param {string} userId - O UID do usuário do Firebase Authentication.
 * @param {string} userEmail - O email do usuário, usado ao criar um novo documento.
 * @returns {Promise<object>} Uma promessa que resolve para o objeto de dados do usuário.
 */
export async function fetchUserInfo(userId, userEmail) {
    if (!userId) throw new Error("userId é obrigatório para buscar informações do usuário.");
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        // O documento não existe, então criamos um
        console.log(`Criando novo documento para o usuário: ${userId}`);
        const initialUserInfo = {
            email: userEmail,
            createdAt: serverTimestamp(),
            activePlanId: null,
            lastStreakInteractionDate: null,
            currentStreak: 0,
            longestStreak: 0,
            globalWeeklyInteractions: {
                weekId: getUTCWeekId(),
                interactions: {}
            }
        };
        await setDoc(userDocRef, initialUserInfo);
        // Retornamos os dados iniciais (sem o serverTimestamp resolvido, o que é aceitável para o estado inicial)
        return { ...initialUserInfo, createdAt: new Date() };
    }
}

/**
 * Busca a lista completa de planos de leitura de um usuário, ordenados por data de criação.
 * @param {string} userId - O UID do usuário.
 * @returns {Promise<Array<object>>} Uma promessa que resolve para um array de objetos de plano, cada um com seu 'id'.
 */
export async function fetchUserPlans(userId) {
    if (!userId) throw new Error("userId é obrigatório para buscar os planos.");
    const plansCollectionRef = collection(db, 'users', userId, 'plans');
    const q = query(plansCollectionRef, orderBy("createdAt", "desc"));
    const userPlansList = [];
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
        userPlansList.push({ id: docSnap.id, ...docSnap.data() });
    });
    return userPlansList;
}

/**
 * Busca os dados detalhados de um único plano de leitura.
 * @param {string} userId - O UID do usuário.
 * @param {string} planId - O ID do plano a ser buscado.
 * @returns {Promise<object|null>} Uma promessa que resolve para o objeto de dados do plano, ou null se não for encontrado.
 */
export async function fetchPlanData(userId, planId) {
    if (!userId || !planId) return null;
    const planDocRef = doc(db, 'users', userId, 'plans', planId);
    const docSnap = await getDoc(planDocRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        console.warn(`Plano com ID ${planId} não encontrado para o usuário ${userId}.`);
        return null;
    }
}

// --- Funções de Escrita de Dados (Create, Update, Delete) ---

/**
 * Salva um novo plano de leitura no Firestore.
 * @param {string} userId - O UID do usuário.
 * @param {object} planData - O objeto contendo todos os dados do novo plano.
 * @returns {Promise<string>} Uma promessa que resolve para o ID do novo plano criado.
 */
export async function saveNewPlan(userId, planData) {
    if (!userId) throw new Error("userId é obrigatório para salvar um novo plano.");
    const plansCollectionRef = collection(db, 'users', userId, 'plans');
    const dataToSave = {
        ...planData,
        createdAt: serverTimestamp(), // Garante que o timestamp de criação seja definido pelo servidor
    };
    const newPlanDocRef = await addDoc(plansCollectionRef, dataToSave);
    return newPlanDocRef.id;
}

/**
 * Exclui um plano de leitura específico do Firestore.
 * @param {string} userId - O UID do usuário.
 * @param {string} planIdToDelete - O ID do plano a ser excluído.
 * @returns {Promise<void>} Uma promessa que resolve quando a exclusão é concluída.
 */
export async function deletePlan(userId, planIdToDelete) {
    if (!userId || !planIdToDelete) throw new Error("userId e planId são obrigatórios para deletar um plano.");
    const planDocRef = doc(db, 'users', userId, 'plans', planIdToDelete);
    await deleteDoc(planDocRef);
}

/**
 * Define o plano ativo para um usuário, atualizando o campo 'activePlanId' no documento do usuário.
 * @param {string} userId - O UID do usuário.
 * @param {string|null} planId - O ID do plano a ser ativado, ou null para desativar todos.
 * @returns {Promise<void>}
 */
export async function setActivePlan(userId, planId) {
    if (!userId) throw new Error("userId é obrigatório para definir o plano ativo.");
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { activePlanId: planId });
}

/**
 * Atualiza o status de leitura de um capítulo individual dentro de um plano.
 * @param {string} userId - O UID do usuário.
 * @param {string} planId - O ID do plano que está sendo atualizado.
 * @param {string} chapterName - O nome do capítulo (ex: "Gênesis 1").
 * @param {boolean} isRead - O novo status de leitura (true ou false).
 * @returns {Promise<void>}
 */
export async function updateChapterStatus(userId, planId, chapterName, isRead) {
    if (!userId || !planId) throw new Error("userId e planId são obrigatórios.");
    const planDocRef = doc(db, 'users', userId, 'plans', planId);
    // Usa a notação de ponto para atualizar um campo dentro de um mapa (objeto)
    const updatePayload = {
        [`dailyChapterReadStatus.${chapterName}`]: isRead
    };
    await updateDoc(planDocRef, updatePayload);
}

/**
 * Atualiza os dados de interação do usuário (sequência e interações semanais).
 * @param {string} userId - O UID do usuário.
 * @param {object} interactionUpdates - Um objeto contendo os campos a serem atualizados.
 *   Ex: { lastStreakInteractionDate: '...', currentStreak: 5, longestStreak: 10, globalWeeklyInteractions: {...} }
 * @returns {Promise<void>}
 */
export async function updateUserInteractions(userId, interactionUpdates) {
    if (!userId) throw new Error("userId é obrigatório para atualizar interações.");
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, interactionUpdates);
}

/**
 * Avança o plano para o próximo dia, registra os capítulos lidos no log e limpa os status diários.
 * @param {string} userId - O UID do usuário.
 * @param {string} planId - O ID do plano.
 * @param {number} newDay - O novo número do dia atual do plano.
 * @param {string} dateMarkedStr - A data (YYYY-MM-DD) em que a conclusão ocorreu.
 * @param {Array<string>} chaptersReadForLog - Array de capítulos concluídos para adicionar ao log.
 * @returns {Promise<void>}
 */
export async function advanceToNextDay(userId, planId, newDay, dateMarkedStr, chaptersReadForLog) {
    if (!userId || !planId) throw new Error("userId e planId são obrigatórios.");
    const planDocRef = doc(db, 'users', userId, 'plans', planId);

    const dataToUpdate = {
        currentDay: newDay,
        dailyChapterReadStatus: {}, // Limpa os checkboxes para o novo dia
        [`readLog.${dateMarkedStr}`]: chaptersReadForLog // Adiciona ao log
    };

    await updateDoc(planDocRef, dataToUpdate);
}

/**
 * Salva um plano de leitura recalculado, substituindo completamente os dados do plano antigo.
 * @param {string} userId - O UID do usuário.
 * @param {string} planId - O ID do plano a ser substituído.
 * @param {object} updatedPlanData - O objeto completo com os novos dados do plano.
 * @returns {Promise<void>}
 */
export async function saveRecalculatedPlan(userId, planId, updatedPlanData) {
    if (!userId || !planId) throw new Error("userId e planId são obrigatórios.");
    const planDocRef = doc(db, 'users',userId, 'plans', planId);
    // Usamos setDoc aqui porque estamos substituindo todo o documento do plano com novos dados
    // (novo mapa do plano, nova data final, etc.), preservando o ID do documento.
    await setDoc(planDocRef, updatedPlanData);
}