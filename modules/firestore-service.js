// modules/firestore-service.js
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { db } from '../config/firebase-config.js';

/**
 * Carrega e processa os planos de leitura de um usuário do Firestore.
 * Converte timestamps/strings de data em objetos Date.
 * @param {object} user - O objeto de usuário autenticado do Firebase.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de objetos de plano.
 */
export async function carregarPlanos(user) {
    if (!user) return []; // Retorna array vazio se não houver usuário

    const docRef = doc(db, 'users', user.uid);
    console.log("[Firestore] Tentando carregar planos para userId:", user.uid);

    try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            console.log("[Firestore] Nenhum documento de usuário encontrado. Criando um novo.");
            await setDoc(docRef, { planos: [] });
            return [];
        }

        const planosDoFirestore = docSnap.data().planos || [];
        console.log(`[Firestore] Documento encontrado. ${planosDoFirestore.length} planos brutos para processar.`);

        // Processamento rigoroso: Converte strings de data para objetos Date e garante a integridade dos dados
        const planosProcessados = planosDoFirestore.map((plano, index) => {
            if (!plano || typeof plano.titulo !== 'string' || !plano.dataInicio || !plano.dataFim) {
                console.warn(`[Firestore] Plano ${index} inválido/incompleto, será filtrado:`, plano);
                return null;
            }
            const dataInicio = new Date(plano.dataInicio);
            const dataFim = new Date(plano.dataFim);

            if (isNaN(dataInicio) || isNaN(dataFim)) {
                console.warn(`[Firestore] Plano "${plano.titulo}" com datas inválidas, será filtrado.`);
                return null;
            }

            return {
                ...plano,
                id: plano.id || crypto.randomUUID(),
                linkDrive: plano.linkDrive || '',
                dataInicio,
                dataFim,
                diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => {
                    const dataDia = dia.data ? new Date(dia.data) : null;
                    if (dataDia && isNaN(dataDia)) {
                        console.warn("[Firestore] Dia com data inválida no plano:", plano.titulo);
                        return { ...dia, data: null };
                    }
                    return {
                        ...dia,
                        data: dataDia,
                        lido: Boolean(dia.lido || false),
                        ultimaPaginaLida: dia.ultimaPaginaLida ? Number(dia.ultimaPaginaLida) : null,
                        // --- MELHORIA (PRIORIDADE 2) ---
                        // Carrega o ID do evento do Google Agenda para evitar duplicatas.
                        // Garante retrocompatibilidade com planos antigos que não possuem este campo.
                        googleEventId: dia.googleEventId || null
                    };
                }) : [],
                paginaInicio: Number(plano.paginaInicio) || 1,
                paginaFim: Number(plano.paginaFim) || 1,
                totalPaginas: Number(plano.totalPaginas) || 0,
                paginasLidas: Number(plano.paginasLidas) || 0,
                isPaused: plano.isPaused || false,
                dataPausa: plano.dataPausa ? new Date(plano.dataPausa) : null,
            };
        }).filter(plano => plano !== null); // Remove planos que falharam na validação

        console.log('[Firestore] Planos processados e válidos carregados:', planosProcessados.length);
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
        console.error('[Firestore] Tentativa de salvar sem usuário logado.');
        throw new Error("Você precisa estar logado para salvar as alterações.");
    }

    const docRef = doc(db, 'users', user.uid);
    console.log("[Firestore] Tentando salvar", planosParaSalvar.length, "planos para userId:", user.uid);

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
                // --- MELHORIA (PRIORIDADE 2) ---
                // Salva o ID do evento do Google Agenda no banco de dados para persistir o estado de sincronização.
                googleEventId: dia.googleEventId || null
            })),
            isPaused: plano.isPaused || false,
            dataPausa: (plano.isPaused && plano.dataPausa instanceof Date) ? plano.dataPausa.toISOString() : null,
        };
    }).filter(p => p !== null);

    try {
        // Usa setDoc com merge:true para sobrescrever o array 'planos' sem afetar outros campos do documento do usuário
        await setDoc(docRef, { planos: planosParaFirestore }, { merge: true });
        console.log('[Firestore] Planos salvos com sucesso!');
    } catch (error) {
        console.error('[Firestore] Erro CRÍTICO ao salvar planos:', error);
        throw new Error('Erro grave ao salvar seus planos. Suas últimas alterações podem não ter sido salvas.');
    }
}
