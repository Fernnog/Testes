// --- START OF FILE google-drive-service.js ---
// Responsabilidade: Conter toda a lógica de comunicação com a API do Google Drive.
// Este módulo lida com a criação e atualização de backups de alvos.
// VERSÃO ATUALIZADA: Inclui refatoração e correção de busca de pasta.

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
 * (PRIORIDADE 3 - CORRIGIDO) Constrói o corpo da requisição multipart para a API do Drive.
 * Abstrai a lógica de criação do corpo para evitar duplicação.
 * @param {object} metadata - Os metadados do arquivo (nome, mimeType, etc.).
 * @param {string} fileContent - O conteúdo de texto do arquivo.
 * @returns {{boundary: string, body: string}} - O limite e o corpo da requisição.
 */
function _buildMultipartBody(metadata, fileContent) {
    const boundary = '---------' + Date.now();
    const delimiter = `\r\n--${boundary}`;
    const close_delim = `${delimiter}--`;

    const multipartRequestBody = [
        delimiter,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        delimiter,
        'Content-Type: text/plain; charset=UTF-8',
        '',
        fileContent,
        close_delim
    ].join('\r\n');

    return { boundary, body: multipartRequestBody };
}


/**
 * (PRIORIDADE 1 - CORRIGIDO) Procura pela pasta da aplicação no Drive ou a cria se não existir.
 * Utiliza a 'appDataFolder' para armazenar um marcador com o ID da pasta visível.
 * @returns {Promise<string>} - O ID da pasta.
 */
async function findOrCreateAppFolder() {
    if (appFolderId) {
        console.log("[Drive Service] Usando ID da pasta em cache:", appFolderId);
        return appFolderId;
    }

    const markerFileName = '.meu-diario-oracao-folder-id';
    // Busca o arquivo marcador APENAS na pasta de dados oculta do aplicativo
    const searchMarkerQuery = `name='${markerFileName}' and 'appDataFolder' in parents`;

    let response = await gapi.client.drive.files.list({
        q: searchMarkerQuery,
        fields: 'files(id, appProperties)',
        spaces: 'appDataFolder' // Garante que a busca seja feita no espaço correto
    });

    // Se o arquivo marcador for encontrado, lê o ID da pasta de suas propriedades
    if (response.result.files && response.result.files.length > 0) {
        const folderId = response.result.files[0].appProperties?.folderId;
        if (folderId) {
            console.log(`[Drive Service] Marcador encontrado. Usando ID da pasta existente: ${folderId}`);
            appFolderId = folderId;
            return appFolderId;
        }
    }
    
    // --- Se o marcador não for encontrado, cria a pasta e o marcador ---
    console.log("[Drive Service] Marcador não encontrado. Criando nova pasta e marcador.");
    
    // 1. Cria a pasta visível para o usuário
    const folderMetadata = {
        'name': FOLDER_NAME,
        'mimeType': 'application/vnd.google-apps.folder'
    };
    const createFolderResponse = await gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
    });
    const newFolderId = createFolderResponse.result.id;
    console.log(`[Drive Service] Pasta visível criada com ID: ${newFolderId}`);
    
    // 2. Cria o arquivo marcador na pasta de dados do aplicativo
    const markerMetadata = {
        name: markerFileName,
        parents: ['appDataFolder'], // Importante: define o pai como a pasta oculta
        appProperties: { // Salva o ID da pasta visível como uma propriedade do marcador
            folderId: newFolderId
        }
    };
    await gapi.client.drive.files.create({ resource: markerMetadata });
    console.log("[Drive Service] Arquivo marcador criado com sucesso na appDataFolder.");

    // Armazena em cache e retorna o ID da nova pasta
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
        
        // Utiliza a função auxiliar para construir o corpo da requisição
        const { boundary, body } = _buildMultipartBody(updateMetadata, fileContent);

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

        // Utiliza a função auxiliar para construir o corpo da requisição
        const { boundary, body } = _buildMultipartBody(createMetadata, fileContent);

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
