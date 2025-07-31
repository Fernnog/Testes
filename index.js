// Importa os módulos necessários
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");

// Inicializa o Firebase Admin SDK para ter acesso a outros serviços do Firebase, se necessário.
admin.initializeApp();

// --- Configuração do Cliente OAuth2 ---
// As credenciais são carregadas de forma segura a partir da configuração do ambiente do Firebase.
// NUNCA exponha o client_secret diretamente no código.
const CLIENT_ID = functions.config().google.client_id;
const CLIENT_SECRET = functions.config().google.client_secret;
// Este URI de redirecionamento é simbólico para o fluxo no servidor e deve corresponder
// ao que foi configurado no Google Cloud Console.
const REDIRECT_URI = "https://www.gstatic.com/firebasejs/auth/handler.html";

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

/**
 * Função principal na nuvem, acionada via HTTPS pelo front-end (onCall).
 * Responsável por sincronizar os eventos de leitura com o Google Agenda do usuário.
 *
 * @param {object} data - O objeto de dados enviado pelo cliente.
 * @param {string} data.accessToken - O token de acesso OAuth2 do usuário.
 * @param {Array<object>} data.eventos - Um array de eventos a serem sincronizados.
 *    Cada evento deve ter: summary, description, start, end, e um 'calendarEventId' (null se for novo).
 * @param {Array<string>} data.eventosParaDeletar - IDs de eventos que foram removidos do plano e devem ser deletados da agenda.
 * @param {object} context - Informações de autenticação do usuário que fez a chamada.
 * @returns {Promise<object>} Um objeto com o resultado da operação.
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
  if (!data.accessToken || !Array.isArray(data.eventos)) {
     throw new functions.https.HttpsError(
      "invalid-argument",
      "O token de acesso e a lista de eventos são obrigatórios."
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

  // --- Lógica de Sincronização ---
  // Esta seção implementa a melhoria de UX para evitar duplicatas.

  // Processa eventos para criar ou atualizar
  for (const evento of data.eventos) {
    const recursoEvento = {
      summary: evento.summary,
      description: evento.description,
      start: evento.start, // { dateTime: 'YYYY-MM-DDTHH:mm:ss', timeZone: '...' }
      end: evento.end,     // { dateTime: 'YYYY-MM-DDTHH:mm:ss', timeZone: '...' }
    };

    try {
      if (evento.calendarEventId) {
        // Se já existe um ID, ATUALIZA o evento
        await calendar.events.update({
          calendarId: "primary",
          eventId: evento.calendarEventId,
          resource: recursoEvento,
        });
        resultados.atualizados.push(evento.calendarEventId);
      } else {
        // Se não existe ID, CRIA um novo evento
        const novoEvento = await calendar.events.insert({
          calendarId: "primary",
          resource: recursoEvento,
        });
        // Retorna o novo ID para o front-end poder salvar
        resultados.criados.push({
            diaId: evento.diaId, // O front-end precisa enviar um ID do dia do plano
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

  // Processa eventos para deletar
  if (data.eventosParaDeletar && data.eventosParaDeletar.length > 0) {
      for (const eventId of data.eventosParaDeletar) {
          try {
              await calendar.events.delete({
                  calendarId: "primary",
                  eventId: eventId,
              });
              resultados.deletados.push(eventId);
          } catch (error) {
              // Um erro comum aqui é '410 Gone' se o usuário já deletou o evento manualmente.
              // Podemos ignorá-lo ou registrá-lo.
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
  }


  // 4. Retorno para o Cliente
  // Envia uma resposta estruturada para que o front-end possa atualizar o estado local.
  console.log(`Sincronização concluída para o usuário ${context.auth.uid}. Resultados:`, resultados);
  return {
    success: true,
    message: "Agenda sincronizada com sucesso!",
    resultados: resultados,
  };
});