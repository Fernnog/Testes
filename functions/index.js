// index.js (no diretório 'functions' do seu projeto Firebase)

// Importa os módulos necessários
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");

// Inicializa o Firebase Admin SDK
admin.initializeApp();

// --- Configuração do Cliente OAuth2 ---
// As credenciais devem ser configuradas no ambiente do Firebase usando a CLI:
// firebase functions:config:set google.client_id="SEU_CLIENT_ID" google.client_secret="SEU_CLIENT_SECRET"
const CLIENT_ID = functions.config().google.client_id;
const CLIENT_SECRET = functions.config().google.client_secret;
const REDIRECT_URI = "https://www.gstatic.com/firebasejs/auth/handler.html";

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

/**
 * Função principal na nuvem, acionada via HTTPS (onCall).
 * Sincroniza eventos de leitura com o Google Agenda do usuário.
 *
 * @param {object} data - Dados enviados pelo cliente.
 * @param {string} data.accessToken - Token de acesso OAuth2 do usuário.
 * @param {Array<object>} data.eventos - Eventos para criar ou atualizar.
 * @param {Array<string>} data.eventosParaDeletar - IDs de eventos para deletar.
 * @param {object} context - Informações de autenticação do usuário.
 * @returns {Promise<object>} Um objeto com o resultado detalhado da operação.
 */
exports.sincronizarGoogleAgenda = functions.https.onCall(async (data, context) => {
  // 1. Verificação de Segurança: Garante que o usuário está autenticado.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário precisa estar autenticado para realizar esta ação."
    );
  }

  // 2. Validação dos Dados de Entrada
  if (!data.accessToken || !Array.isArray(data.eventos) || !Array.isArray(data.eventosParaDeletar)) {
     throw new functions.https.HttpsError(
      "invalid-argument",
      "O token de acesso e as listas de eventos são obrigatórios."
    );
  }

  // 3. Configuração do Cliente da API com o token do usuário
  oauth2Client.setCredentials({ access_token: data.accessToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const resultados = {
    criados: [],
    atualizados: [],
    deletados: [],
    erros: [],
  };

  // --- Processa eventos para criar ou atualizar ---
  for (const evento of data.eventos) {
    const recursoEvento = {
      summary: evento.summary,
      description: evento.description,
      start: evento.start,
      end: evento.end,
    };

    try {
      if (evento.calendarEventId) {
        // ATUALIZA o evento existente
        await calendar.events.update({
          calendarId: "primary",
          eventId: evento.calendarEventId,
          resource: recursoEvento,
        });
        resultados.atualizados.push(evento.calendarEventId);
      } else {
        // CRIA um novo evento
        const novoEvento = await calendar.events.insert({
          calendarId: "primary",
          resource: recursoEvento,
        });
        // Retorna o novo ID para o front-end poder salvar
        resultados.criados.push({
            diaId: evento.diaId, // ID do dia do plano para mapeamento
            novoCalendarEventId: novoEvento.data.id 
        });
      }
    } catch (error) {
       resultados.erros.push({
        diaId: evento.diaId || evento.calendarEventId,
        error: error.message,
      });
      console.error("Erro ao sincronizar evento:", error.message);
    }
  }

  // --- Processa eventos para deletar ---
  for (const eventId of data.eventosParaDeletar) {
      try {
          await calendar.events.delete({
              calendarId: "primary",
              eventId: eventId,
          });
          resultados.deletados.push(eventId);
      } catch (error) {
          // Erro '410 Gone' significa que o usuário já deletou o evento manualmente.
          // Isso não é um erro crítico, então contamos como sucesso na deleção.
          if (error.code !== 410) {
              resultados.erros.push({
                  diaId: eventId,
                  error: `Falha ao deletar: ${error.message}`
              });
               console.error("Erro ao deletar evento:", error.message);
          } else {
              // O evento já não existia, consideramos como 'deletado' com sucesso.
              resultados.deletados.push(eventId);
          }
      }
  }

  // 4. Retorno detalhado para o Cliente
  console.log(`Sincronização concluída para o usuário ${context.auth.uid}. Resultados:`, resultados);
  return {
    success: true,
    message: "Agenda sincronizada com sucesso!",
    resultados: resultados,
  };
});
