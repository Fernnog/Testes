// --- Módulo de Sincronização de Calendário ---
// Responsabilidade: Orquestrar o fluxo completo de sincronização de planos de
// leitura com a Agenda Google. Isso inclui autenticação do usuário, preparação
// de dados, chamada ao backend e atualização do estado local.

// --- Importações de Serviços Firebase ---
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-functions.js';
import { auth as appAuth } from '../config/firebase-config.js'; // A instância de Auth principal
import { functions } from '../config/firebase-config.js'; // A instância de Functions

// --- Importações de Módulos da Aplicação ---
import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';

/**
 * Prepara a lista de eventos de leitura que precisam ser criados ou atualizados na Agenda Google.
 * Esta função implementa a lógica da "Prioridade 2", evitando a sincronização de
 * dias já lidos ou eventos que já existem no calendário.
 *
 * @param {Array<object>} planos - A lista completa de planos do estado da aplicação.
 * @returns {Array<object>} Um array de eventos formatados para a API do backend.
 */
function _prepararEventosParaSincronizar(planos) {
    const eventos = [];

    planos.forEach(plano => {
        // Ignora planos pausados ou que não tenham um array de dias válido.
        if (plano.isPaused || !plano.diasPlano) {
            return;
        }

        plano.diasPlano.forEach(dia => {
            // Um dia só é elegível para sincronização se:
            // 1. A data é válida.
            // 2. Não foi marcado como "lido".
            // 3. Ainda não possui um ID de evento do Google, o que significa que nunca foi sincronizado.
            //    (No futuro, poderíamos adicionar lógica para atualizar eventos existentes aqui).
            if (dia.data instanceof Date && !isNaN(dia.data) && !dia.lido && !dia.googleEventId) {
                
                // Define o horário do evento (ex: 08:00 às 09:00). Isso pode se tornar configurável no futuro.
                const dataInicioEvento = new Date(dia.data);
                dataInicioEvento.setHours(8, 0, 0, 0);

                const dataFimEvento = new Date(dia.data);
                dataFimEvento.setHours(9, 0, 0, 0);

                eventos.push({
                    // Dados para o backend identificar o evento e atualizar o estado depois
                    planId: plano.id,
                    diaDataISO: dia.data.toISOString(),
                    // Dados que a API do Google Calendar usará para criar o evento
                    resource: {
                        summary: `Leitura: ${plano.titulo}`,
                        description: `Ler páginas ${dia.paginaInicioDia} a ${dia.paginaFimDia}.\n\nGerado por Gerenciador de Planos de Leitura.`,
                        start: {
                            dateTime: dataInicioEvento.toISOString(),
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Usa o fuso horário do usuário
                        },
                        end: {
                            dateTime: dataFimEvento.toISOString(),
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        },
                        // Associa o ID do nosso plano ao evento no Google para futura referência
                        extendedProperties: {
                            private: {
                                planoId: plano.id
                            }
                        }
                    }
                });
            }
        });
    });

    return eventos;
}

/**
 * Atualiza o estado local dos planos com os IDs dos eventos criados no Google Calendar.
 * Após a atualização, salva o estado permanentemente no Firestore.
 *
 * @param {Array<object>} resultados - O array de resultados retornado pela Firebase Function.
 * @param {object} user - O usuário atual logado.
 * @returns {Promise<void>}
 */
async function _atualizarEstadoEsalvar(resultados, user) {
    if (!resultados || resultados.length === 0) return;

    const planos = state.getPlanos();

    resultados.forEach(res => {
        const plano = planos.find(p => p.id === res.planId);
        if (plano) {
            const dia = plano.diasPlano.find(d => d.data.toISOString() === res.diaDataISO);
            if (dia) {
                // Atribui o ID do evento do Google ao dia correspondente no nosso estado.
                dia.googleEventId = res.googleEventId;
            }
        }
    });

    state.setPlanos(planos); // Atualiza o estado local
    await firestoreService.salvarPlanos(user, planos); // Persiste as alterações no Firestore
    
    // Renderiza a aplicação novamente para refletir as mudanças (ex: ocultar um item sincronizado)
    ui.renderApp(state.getPlanos(), state.getCurrentUser()); 
}

/**
 * Função principal exportada. Inicia e gerencia todo o processo de sincronização.
 * Será chamada pelo event listener no `main.js`.
 */
export async function syncWithGoogleCalendar() {
    const user = state.getCurrentUser();
    if (!user) {
        alert("Você precisa estar logado para sincronizar com a agenda.");
        return;
    }

    ui.toggleLoading(true);

    try {
        // 1. Preparar os eventos
        const planos = state.getPlanos();
        const eventosParaSincronizar = _prepararEventosParaSincronizar(planos);

        if (eventosParaSincronizar.length === 0) {
            alert("Nenhuma nova leitura para sincronizar. Seus planos já estão em dia com a agenda!");
            return;
        }

        // 2. Autenticação com Google
        const provider = new GoogleAuthProvider();
        // Pedimos permissão explícita para gerenciar os eventos da agenda
        provider.addScope('https://www.googleapis.com/auth/calendar.events');
        
        const result = await signInWithPopup(appAuth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential.accessToken;
        
        if (!accessToken) {
            throw new Error("Não foi possível obter o token de acesso do Google.");
        }

        // 3. Chamar a Firebase Function
        alert(`Sincronizando ${eventosParaSincronizar.length} nova(s) leitura(s) com sua agenda. Isso pode levar um momento...`);
        
        const syncEventsFunction = httpsCallable(functions, 'syncCalendarEvents'); // O nome da sua função no backend
        const response = await syncEventsFunction({
            accessToken: accessToken,
            eventos: eventosParaSincronizar
        });

        // 4. Processar a Resposta e Atualizar o Estado
        if (response.data.success) {
            await _atualizarEstadoEsalvar(response.data.resultados, user);
            alert(`Sincronização concluída! ${response.data.resultados.length} eventos foram adicionados/atualizados na sua Agenda.`);
        } else {
            throw new Error(response.data.message || "Ocorreu um erro no servidor durante a sincronização.");
        }

    } catch (error) {
        console.error("[Calendar Sync Error]:", error);
        let errorMessage = "Ocorreu um erro durante a sincronização. ";
        // Personaliza a mensagem de erro para o usuário
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage += "A janela de login do Google foi fechada antes da conclusão.";
        } else if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += "Verifique sua conexão e tente novamente."
        }
        alert(errorMessage);
    } finally {
        ui.toggleLoading(false);
    }
}