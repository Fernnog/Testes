// --- START OF FILE google-drive-service.js ---
// Responsabilidade: Conter toda a lógica de comunicação com a API do Google Drive.
// Este módulo lida com a criação e atualização de backups de alvos.

// Flag para garantir que a API do Google só seja carregada uma vez.
let gapiInitialized = false;
// Cache para o ID da pasta do aplicativo, evitando chamadas repetidas à API.
let appFolderId = null;
// Nome da pasta que será criada no Google Drive do usuário.
const FOLDER_NAME = "Meus Alvos de Oração";

/**
 * Carrega e inicializa a biblioteca cliente da API do Google (GAPI).
 * Esta função deve ser chamada na inicialização da aplicação após o login com Google.
 * @param {string} accessToken - O token de acesso OAuth obtido do Firebase Auth.
 * @returns {Promise<boolean>} - Resolve para 'true' se a inicialização for bem-sucedida.
 */
export async function initializeDriveService(accessToken) {
    if (gapiInitialized) {
        // Se já foi inicializado, apenas revalida o token
        gapi.auth.setToken({ access_token: accessToken });
        return true;
    }

    return new Promise((resolve, reject) => {
        // Cria um elemento <script> para carregar a biblioteca GAPI
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";
        document.body.appendChild(script);

        script.onload = () => {
            // Após carregar o script, carrega o módulo 'client' do GAPI
            gapi.load('client', async () => {
                try {
                    // Inicializa o cliente com a API do Drive v3
                    await gapi.client.init({
                        'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                    });
                    // Define o token de acesso para autorizar as chamadas
                    gapi.auth.setToken({ access_token: accessToken });
                    gapiInitialized = true;
                    resolve(true);
                } catch (error) {
                    console.error("Erro ao inicializar o cliente GAPI:", error);
                    reject(error);
                }
            });
        };
        script.onerror = () => reject(new Error("Falha ao carregar o script da API do Google."));
    });
}

/**
 * Procura pela pasta da aplicação no Drive ou a cria se não existir.
 * @returns {Promise<string>} - O ID da pasta.
 */
// No arquivo google-drive-service.js, substitua a função findOrCreateAppFolder

async function findOrCreateAppFolder() {
    if (appFolderId) {
        console.log("[Drive Service] Usando ID da pasta em cache:", appFolderId);
        return appFolderId;
    }

    // 1. Usa o escopo 'drive.appdata' para buscar um arquivo marcador oculto.
    const markerFileName = '.meu-diario-oracao-folder-id';
    const searchMarkerQuery = `name='${markerFileName}' and 'appDataFolder' in parents`;

    let response = await gapi.client.drive.files.list({
        q: searchMarkerQuery,
        fields: 'files(id, appProperties)',
        spaces: 'appDataFolder'
    });

    // Se o marcador for encontrado, ele contém o ID da pasta visível.
    if (response.result.files && response.result.files.length > 0) {
        const folderId = response.result.files[0].appProperties.folderId;
        if (folderId) {
            console.log(`[Drive Service] ID da pasta encontrado no marcador. ID: ${folderId}`);
            appFolderId = folderId;
            return appFolderId;
        }
    }
    
    // 2. Se não encontrou o marcador, cria a pasta VISÍVEL para o usuário.
    console.log("[Drive Service] Marcador não encontrado. Criando nova pasta visível...");
    const folderMetadata = {
        'name': FOLDER_NAME,
        'mimeType': 'application/vnd.google-apps.folder'
    };
    const createFolderResponse = await gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
    });
    const newFolderId = createFolderResponse.result.id;
    
    // 3. Cria o arquivo marcador OCULTO e armazena o ID da pasta visível nele.
    const markerMetadata = {
        name: markerFileName,
        parents: ['appDataFolder'],
        appProperties: {
            folderId: newFolderId
        }
    };
    await gapi.client.drive.files.create({ resource: markerMetadata });
    console.log(`[Drive Service] Marcador oculto criado para persistir o ID da pasta.`);

    appFolderId = newFolderId;
    return appFolderId;
}

/**
 * Formata o conteúdo de um alvo para um formato de texto legível.
 * @param {object} target - O objeto do alvo de oração.
 * @returns {string} - O conteúdo formatado.
 */
function formatTargetForDoc(target) {
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
        // Ordena as observações da mais antiga para a mais recente
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
 * @param {string | null} googleDocId - O ID do documento do Drive se já existir, ou nulo.
 * @returns {Promise<{success: boolean, docId: string}>} - Retorna o status e o ID do documento.
 */
export async function backupTargetToDrive(target, googleDocId = null) {
    if (!gapiInitialized) {
        throw new Error("O serviço do Google Drive não foi inicializado.");
    }
    
    // Define o conteúdo e o nome do arquivo. O nome do arquivo será 'Alvo - {Título do Alvo}'.
    const fileContent = formatTargetForDoc(target);
    const fileName = `Alvo - ${target.title}`;

    if (googleDocId) {
        // --- LÓGICA DE ATUALIZAÇÃO (UPDATE) ---
        console.log(`[Drive Service] ATUALIZANDO documento. ID: ${googleDocId}, Novo Título: ${fileName}`);
        const updateMetadata = { name: fileName }; // Garante que o nome seja atualizado se o título do alvo mudar
        
        // Requisição multipart para atualizar metadados e conteúdo de uma vez
        const boundary = '---------' + Date.now();
        const body = `
--${boundary}
Content-Type: application/json; charset=UTF-8

${JSON.stringify(updateMetadata)}
--${boundary}
Content-Type: text/plain

${fileContent}
--${boundary}--`;

        await gapi.client.request({
            path: `/upload/drive/v3/files/${googleDocId}`,
            method: 'PATCH',
            params: { uploadType: 'multipart' },
            headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
            body: body
        });
        
        console.log(`[Drive Service] Resposta da API de atualização recebida para o alvo '${target.title}'.`);
        return { success: true, docId: googleDocId };

    } else {
        // --- LÓGICA DE CRIAÇÃO (CREATE) ---
        const parentFolderId = await findOrCreateAppFolder();
        console.log(`[Drive Service] CRIANDO novo documento. Título: ${fileName}, na pasta ID: ${parentFolderId}`);
        const createMetadata = {
            'name': fileName,
            'mimeType': 'application/vnd.google-apps.document', // Cria como um Google Doc
            'parents': [parentFolderId]
        };

        const boundary = '---------' + Date.now();
        const body = `
--${boundary}
Content-Type: application/json; charset=UTF-8

${JSON.stringify(createMetadata)}
--${boundary}
Content-Type: text/plain

${fileContent}
--${boundary}--`;

        const response = await gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart', fields: 'id' },
            headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
            body: body
        });
        
        const newDocId = response.result.id;
        console.log(`[Drive Service] Documento criado com sucesso. Novo ID do Documento: ${newDocId}`);
        return { success: true, docId: newDocId };
    }
}
