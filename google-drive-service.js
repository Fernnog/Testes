// --- START OF FILE google-drive-service.js ---
// Responsabilidade: Conter toda a lógica de comunicação com a API do Google Drive.
// Este módulo lida com a criação e atualização de backups de alvos.
// VERSÃO COM LOGS DE DIAGNÓSTICO AVANÇADOS

// Flag para garantir que a API do Google só seja carregada uma vez.
let gapiInitialized = false;
// Cache para o ID da pasta do aplicativo, evitando chamadas repetidas à API.
let appFolderId = null;
// Nome da pasta que será criada no Google Drive do usuário.
const FOLDER_NAME = "Meus Alvos de Oração";

/**
 * Carrega e inicializa a biblioteca cliente da API do Google (GAPI).
 * @param {string} accessToken - O token de acesso OAuth.
 * @returns {Promise<boolean>}
 */
export async function initializeDriveService(accessToken) {
    if (gapiInitialized) {
        console.log("[Drive Service] GAPI já inicializado. Apenas revalidando token.");
        gapi.auth.setToken({ access_token: accessToken });
        return true;
    }

    return new Promise((resolve, reject) => {
        console.log("[Drive Service] Carregando script da API do Google (gapi.js)...");
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";
        document.body.appendChild(script);

        script.onload = () => {
            console.log("[Drive Service] Script gapi.js carregado. Inicializando cliente...");
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                    });
                    console.log("[Drive Service] Cliente GAPI inicializado com sucesso.");
                    gapi.auth.setToken({ access_token: accessToken });
                    gapiInitialized = true;
                    resolve(true);
                } catch (error) {
                    console.error("[Drive Service] CRITICAL ERROR: Falha ao inicializar o cliente GAPI.", error);
                    reject(error);
                }
            });
        };
        script.onerror = (err) => {
            console.error("[Drive Service] CRITICAL ERROR: Falha ao carregar o script da API do Google.", err);
            reject(new Error("Falha ao carregar o script da API do Google."));
        };
    });
}

/**
 * Procura pela pasta da aplicação no Drive ou a cria se não existir.
 * @returns {Promise<string>} - O ID da pasta.
 */
async function findOrCreateAppFolder() {
    if (appFolderId) {
        console.log(`[Drive Service] Usando ID da pasta em cache: ${appFolderId}`);
        return appFolderId;
    }

    const markerFileName = '.meu-diario-oracao-folder-id';
    const searchMarkerQuery = `name='${markerFileName}' and 'appDataFolder' in parents`;

    try {
        console.log("[Drive Service] Buscando arquivo marcador na pasta de dados da aplicação...");
        const response = await gapi.client.drive.files.list({
            q: searchMarkerQuery,
            fields: 'files(id, appProperties)',
            spaces: 'appDataFolder'
        });

        console.log("[Drive Service] Resposta da API (Busca de Marcador):", response.result);

        if (response.result.files && response.result.files.length > 0) {
            const folderId = response.result.files[0].appProperties.folderId;
            if (folderId) {
                console.log(`[Drive Service] Marcador encontrado! ID da pasta: ${folderId}`);
                appFolderId = folderId;
                return appFolderId;
            }
        }

        console.log("[Drive Service] Marcador não encontrado ou inválido. Criando nova pasta visível...");
        const folderMetadata = {
            'name': FOLDER_NAME,
            'mimeType': 'application/vnd.google-apps.folder'
        };
        const createFolderResponse = await gapi.client.drive.files.create({
            resource: folderMetadata,
            fields: 'id'
        });
        const newFolderId = createFolderResponse.result.id;
        console.log(`[Drive Service] Pasta visível criada com sucesso. ID: ${newFolderId}`);
        
        console.log("[Drive Service] Criando arquivo marcador oculto para persistir o ID da pasta...");
        const markerMetadata = {
            name: markerFileName,
            parents: ['appDataFolder'],
            appProperties: { folderId: newFolderId }
        };
        await gapi.client.drive.files.create({ resource: markerMetadata });
        console.log("[Drive Service] Arquivo marcador criado com sucesso.");

        appFolderId = newFolderId;
        return appFolderId;

    } catch (error) {
        console.error("[Drive Service] CRITICAL ERROR em findOrCreateAppFolder:", error);
        throw error; // Re-lança o erro para a camada superior (script.js) tratar
    }
}

/**
 * Formata o conteúdo de um alvo para um formato de texto legível.
 * @param {object} target - O objeto do alvo de oração.
 * @returns {string} - O conteúdo formatado.
 */
function formatTargetForDoc(target) {
    // (Esta função não precisa de logs, pois é síncrona e não faz chamadas de API)
    let content = `[Este documento é um backup gerado pela aplicação 'Meus Alvos de Oração']\n\n`;
    content += `TÍTULO: ${target.title}\n`;
    content += `==============================================\n\n`;
    content += `Categoria: ${target.category || 'Não definida'}\n`;
    content += `Data de Criação: ${target.date ? new Date(target.date).toLocaleDateString('pt-BR') : 'N/A'}\n`;
    if (target.hasDeadline && target.deadlineDate) {
        content += `Prazo: ${new Date(target.deadlineDate).toLocaleDateString('pt-BR')}\n`;
    }
    content += `\nDETALHES:\n${target.details || 'Sem detalhes fornecidos.'}\n\n`;
    
    if (target.observations && target.observations.length > 0) {
        content += `-----------------\n`;
        content += `HISTÓRICO DE OBSERVAÇÕES:\n\n`;
        const sortedObs = [...target.observations].sort((a, b) => new Date(a.date) - new Date(b.date));
        sortedObs.forEach(obs => {
            const obsDate = obs.date ? new Date(obs.date).toLocaleDateString('pt-BR') : 'Data desconhecida';
            content += `[${obsDate}] - ${obs.text}\n`;
        });
    }
    return content;
}

/**
 * (FUNÇÃO PRINCIPAL) Cria ou atualiza o backup de um alvo no Google Drive.
 * @param {object} target - O objeto completo do alvo.
 * @param {string | null} googleDocId - O ID do documento do Drive se já existir.
 * @returns {Promise<{success: boolean, docId: string}>}
 */
export async function backupTargetToDrive(target, googleDocId = null) {
    if (!gapiInitialized) {
        console.error("[Drive Service] Tentativa de backup falhou: serviço não inicializado.");
        throw new Error("O serviço do Google Drive não foi inicializado.");
    }
    
    const fileContent = formatTargetForDoc(target);
    const fileName = `Alvo - ${target.title}`;

    try {
        if (googleDocId) {
            // --- LÓGICA DE ATUALIZAÇÃO (UPDATE) ---
            console.log(`[Drive Service] ATUALIZANDO doc. ID: ${googleDocId}, Título: ${fileName}`);
            const updateMetadata = { name: fileName };
            
            const boundary = '---------' + Date.now();
            const body = `--${boundary}\nContent-Type: application/json; charset=UTF-8\n\n${JSON.stringify(updateMetadata)}\n--${boundary}\nContent-Type: text/plain\n\n${fileContent}\n--${boundary}--`;

            await gapi.client.request({
                path: `/upload/drive/v3/files/${googleDocId}`,
                method: 'PATCH',
                params: { uploadType: 'multipart' },
                headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
                body: body
            });
            
            console.log(`[Drive Service] Documento '${target.title}' ATUALIZADO com sucesso.`);
            return { success: true, docId: googleDocId };

        } else {
            // --- LÓGICA DE CRIAÇÃO (CREATE) ---
            const parentFolderId = await findOrCreateAppFolder();
            console.log(`[Drive Service] CRIANDO doc. Título: ${fileName}, na pasta ID: ${parentFolderId}`);
            const createMetadata = {
                'name': fileName,
                'mimeType': 'application/vnd.google-apps.document',
                'parents': [parentFolderId]
            };

            const boundary = '---------' + Date.now();
            const body = `--${boundary}\nContent-Type: application/json; charset=UTF-8\n\n${JSON.stringify(createMetadata)}\n--${boundary}\nContent-Type: text/plain\n\n${fileContent}\n--${boundary}--`;

            const response = await gapi.client.request({
                path: '/upload/drive/v3/files',
                method: 'POST',
                params: { uploadType: 'multipart', fields: 'id' },
                headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
                body: body
            });
            
            const newDocId = response.result.id;
            console.log(`[Drive Service] Documento criado. Novo ID: ${newDocId}`);
            return { success: true, docId: newDocId };
        }
    } catch (error) {
        console.error(`[Drive Service] CRITICAL ERROR durante o backup do alvo '${target.title}':`, error);
        // Adiciona o corpo do erro ao log, se disponível, para mais detalhes
        if (error.body) {
            console.error("[Drive Service] Detalhes do erro da API:", JSON.parse(error.body));
        }
        throw error;
    }
}
