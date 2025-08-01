// --- Módulo de Sincronização com Google Agenda (COMPLETO) ---
// Responsabilidade: Orquestrar o fluxo completo de sincronização de planos de
// leitura com a Agenda Google. Isso inclui autenticação do usuário, preparação
// de dados, chamada ao backend e atualização do estado local.

// --- Importações de Serviços Firebase ---
import { GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-functions.js';
import { auth as appAuth } from '../config/firebase-config.js'; // A instância de Auth principal

// --- Importações de Módulos da Aplicação ---
import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';

/**
 * Prepara os eventos para a API do backend.
 * Identifica quais eventos precisam ser criados, atualizados ou deletados.
 * @param {Array<object>} planos - A lista completa de planos do estado da aplicação.
 * @returns {{eventos: Array<object>, eventosParaDeletar: Array<string>}}
 */
function _prepararDadosParaSincronizacao(planos) {
    const eventos = [];
    const eventosParaDeletar = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    planos.forEach(plano => {
        if (plano.isPaused || !plano.diasPlano) return;

        plano.diasPlano.forEach(dia => {
            if (!dia.data || !(dia.data instanceof Date) || isNaN(dia.data)) return;

            // Se o dia foi marcado como lido e já tem um ID de evento, ele deve ser deletado da agenda.
            if (dia.lido && dia.googleEventId) {
                eventosParaDeletar.push(dia.googleEventId);
                // O ID será removido do 'dia' após a confirmação do backend.
            } 
            // Se o dia não foi lido e ainda não passou, ele deve ser criado ou atualizado.
            else if (!dia.lido && dia.data >= hoje) {
                const dataInicioEvento = new Date(dia.data);
                dataInicioEvento.setHours(9, 0, 0, 0); // Horário fixo: 9h (pode ser configurável no futuro)

                const dataFimEvento = new Date(dia.data);
                dataFimEvento.setHours(10, 0, 0, 0); // Duração de 1h

                eventos.push({
                    diaId: `${plano.id}|${dia.data.toISOString()}`, // ID único para mapear o retorno
                    calendarEventId: dia.googleEventId || null, // ID existente para atualização
                    summary: `Leitura: ${plano.titulo}`,
                    description: `Ler páginas ${dia.paginaInicioDia} a ${dia.paginaFimDia}.\n\nGerado pelo Gerenciador de Planos de Leitura.`,
                    start: {
                        dateTime: dataInicioEvento.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                    end: {
                        dateTime: dataFimEvento.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                });
            }
        });
    });

    return { eventos, eventosParaDeletar };
}

/**
 * Atualiza o estado local dos planos com os resultados da sincronização e salva no Firestore.
 * @param {object} resultados - O objeto de resultados retornado pela Firebase Function.
 */
async function _atualizarEstadoEsalvar(resultados) {
    if (!resultados) return;
    
    const user = state.getCurrentUser();
    const planos = state.getPlanos();

    // Atualiza com os eventos criados
    resultados.criados?.forEach(res => {
        const [planId, diaISO] = res.diaId.split('|');
        const plano = planos.find(p => p.id === planId);
        if (plano) {
            const dia = plano.diasPlano.find(d => d.data.toISOString() === diaISO);
            if (dia) {
                dia.googleEventId = res.novoCalendarEventId;
            }
        }
    });

    // Limpa os IDs dos eventos deletados
    resultados.deletados?.forEach(eventId => {
        for (const plano of planos) {
            const dia = plano.diasPlano.find(d => d.googleEventId === eventId);
            if (dia) {
                dia.googleEventId = null;
                break; // Assume que o eventId é único em toda a aplicação
            }
        }
    });

    state.setPlanos(planos);
    await firestoreService.salvarPlanos(user, planos);
    
    // Renderiza a aplicação para refletir o estado atualizado
    ui.renderApp(state.getPlanos(), user); 
}

/**
 * Função principal exportada. Inicia e gerencia todo o processo de sincronização.
 */
export async function sincronizarPlanos() {
    const user = state.getCurrentUser();
    if (!user) {
        ui.showNotification("Você precisa estar logado para sincronizar com a agenda.", "error");
        return;
    }

    ui.toggleLoading(true);

    try {
        const { eventos, eventosParaDeletar } = _prepararDadosParaSincronizacao(state.getPlanos());

        if (eventos.length === 0 && eventosParaDeletar.length === 0) {
            ui.showNotification("Nenhuma nova leitura ou alteração para sincronizar.", "info");
            return;
        }

        ui.showNotification("Preparando para sincronizar... Por favor, autorize o acesso à sua agenda.", "info");

        // 2. Autenticação com Google para obter o token de acesso
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/calendar.events');
        
        const result = await signInWithPopup(appAuth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential.accessToken;
        
        if (!accessToken) {
            throw new Error("Não foi possível obter o token de acesso do Google.");
        }

        // 3. Chamar a Firebase Function
        const functions = getFunctions(); // CORREÇÃO: Chamada direta ao SDK do Firebase.
        const syncFunction = httpsCallable(functions, 'sincronizarGoogleAgenda');
        
        const totalOperacoes = eventos.length + eventosParaDeletar.length;
        ui.showNotification(`Sincronizando ${totalOperacoes} item(ns) com sua agenda. Isso pode levar um momento...`, "info");
        
        const response = await syncFunction({
            accessToken: accessToken,
            eventos: eventos,
            eventosParaDeletar: eventosParaDeletar
        });

        // 4. Processar a Resposta e Atualizar o Estado
        if (response.data.success) {
            await _atualizarEstadoEsalvar(response.data.resultados);
            const { criados, atualizados, deletados, erros } = response.data.resultados;
            const successMessage = `Sincronização concluída! Criados: ${criados.length}, Atualizados: ${atualizados.length}, Deletados: ${deletados.length}.`;
            ui.showNotification(successMessage, "success");
            if (erros.length > 0) {
                ui.showNotification(`Ocorreram ${erros.length} erros em itens específicos. Veja o console para detalhes.`, "warning");
                console.warn("Erros durante a sincronização:", erros);
            }
        } else {
            throw new Error(response.data.message || "Ocorreu um erro no servidor durante a sincronização.");
        }

    } catch (error) {
        console.error("[Calendar Sync Error]:", error);
        let errorMessage = "Ocorreu um erro durante a sincronização. ";
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = "A janela de login do Google foi fechada antes da conclusão.";
        } else if (error.code === 'functions/unauthenticated') {
            errorMessage = "Erro de autenticação. Por favor, faça login novamente.";
        } else {
            errorMessage = error.message;
        }
        ui.showNotification(errorMessage, "error");
    } finally {
        ui.toggleLoading(false);
    }
}
