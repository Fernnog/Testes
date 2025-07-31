// modules/firestore-service.js
// RESPONSABILIDADE: Salvar e carregar os dados dos planos do Firestore.
// Versão finalizada para persistir o estado da sincronização com o Google Agenda.

import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { db } from '../config/firebase-config.js';

/**
 * Carrega e processa os planos de leitura de um usuário do Firestore.
 * Converte timestamps/strings de data em objetos Date.
 * @param {object} user - O objeto de usuário autenticado do Firebase.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de objetos de plano.
 */
export async function carregarPlanos(user) {
    if (!user) return [];

    const docRef = doc(db, 'users', user.uid);
    try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            await setDoc(docRef, { planos: [] });
            return [];
        }

        const planosDoFirestore = docSnap.data().planos || [];
        
        const planosProcessados = planosDoFirestore.map(plano => {
            if (!plano || typeof plano.titulo !== 'string' || !plano.dataInicio || !plano.dataFim) {
                return null;
            }
            return {
                ...plano,
                id: plano.id || crypto.randomUUID(),
                linkDrive: plano.linkDrive || '',
                dataInicio: new Date(plano.dataInicio),
                dataFim: new Date(plano.dataFim),
                diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                    ...dia,
                    data: dia.data ? new Date(dia.data) : null,
                    lido: Boolean(dia.lido || false),
                    ultimaPaginaLida: dia.ultimaPaginaLida ? Number(dia.ultimaPaginaLida) : null,
                    // --- MELHORIA DE ARQUITETURA (PRIORIDADE 1) ---
                    // Carrega o ID do evento do Google Agenda para evitar duplicatas.
                    // Garante retrocompatibilidade com planos antigos que não possuem este campo.
                    googleEventId: dia.googleEventId || null
                })) : [],
                paginaInicio: Number(plano.paginaInicio) || 1,
                paginaFim: Number(plano.paginaFim) || 1,
                totalPaginas: Number(plano.totalPaginas) || 0,
                paginasLidas: Number(plano.paginasLidas) || 0,
                isPaused: plano.isPaused || false,
                dataPausa: plano.dataPausa ? new Date(plano.dataPausa) : null,
            };
        }).filter(plano => plano !== null);

        return planosProcessados;

    } catch (error) {
        console.error('[Firestore] Erro CRÍTICO ao carregar planos:', error);
        throw new Error("Erro grave ao carregar seus planos. Verifique sua conexão.");
    }
}

/**
 * Salva o array completo de planos para um usuário no Firestore.
 * Converte objetos Date de volta para strings ISO para armazenamento.
 * @param {object} user - O objeto de usuário autenticado do Firebase.
 * @param {Array} planosParaSalvar - O array de planos a ser salvo.
 * @returns {Promise<void>} Uma promessa que resolve quando a operação for concluída.
 */
export async function salvarPlanos(user, planosParaSalvar) {
    if (!user) {
        throw new Error("Você precisa estar logado para salvar as alterações.");
    }

    const docRef = doc(db, 'users', user.uid);
    
    // Prepara os dados para o Firestore (converte Date para ISOString, garante tipos)
    const planosParaFirestore = planosParaSalvar.map(plano => {
        if (!plano || !plano.id || !plano.titulo || !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date) || isNaN(plano.dataInicio) || isNaN(plano.dataFim)) {
            console.error("[Firestore] ERRO: Tentativa de salvar plano inválido. Plano ignorado:", plano);
            return null;
        }
        return {
            ...plano,
            dataInicio: plano.dataInicio.toISOString(),
            dataFim: plano.dataFim.toISOString(),
            diasPlano: plano.diasPlano.map(dia => ({
                ...dia,
                data: (dia.data instanceof Date && !isNaN(dia.data)) ? dia.data.toISOString() : null,
                lido: Boolean(dia.lido || false),
                ultimaPaginaLida: dia.ultimaPaginaLida || null,
                // --- MELHORIA DE ARQUITETURA (PRIORIDADE 1) ---
                // Salva o ID do evento do Google Agenda no banco de dados para persistir o estado de sincronização.
                googleEventId: dia.googleEventId || null
            })),
            isPaused: plano.isPaused || false,
            dataPausa: (plano.isPaused && plano.dataPausa instanceof Date) ? plano.dataPausa.toISOString() : null,
        };
    }).filter(p => p !== null);

    try {
        await setDoc(docRef, { planos: planosParaFirestore }, { merge: true });
    } catch (error) {
        console.error('[Firestore] Erro CRÍTICO ao salvar planos:', error);
        throw new Error('Erro grave ao salvar seus planos. Suas últimas alterações podem não ter sido salvas.');
    }
}
