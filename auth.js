// --- START OF FILE auth.js ---
// Responsabilidade: Conter as funções que interagem diretamente com o serviço Firebase Auth.
// Este módulo não deve manipular o DOM diretamente.
// (VERSÃO COM LOGS DE DIAGNÓSTICO)

import { auth } from './firebase-config.js';
import { 
    signOut, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword as firebaseCreateUser,
    signInWithEmailAndPassword as firebaseSignIn,
    sendPasswordResetEmail as firebaseSendPasswordReset,
    GoogleAuthProvider,
    signInWithPopup,
    getAdditionalUserInfo,
    OAuthProvider
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

/**
 * Inicializa o listener de estado de autenticação.
 * Esta função é o ponto de entrada principal para saber se um usuário está logado ou não.
 * @param {function} onUserAuthenticated - Callback a ser executado quando o estado de autenticação muda. Recebe o objeto 'user' ou 'null'.
 */
export function initializeAuth(onUserAuthenticated) {
    onAuthStateChanged(auth, (user) => {
        onUserAuthenticated(user);
    });
}

/**
 * Cadastra um novo usuário usando e-mail e senha.
 * @param {string} email - O e-mail do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<import("firebase/auth").UserCredential>} - Uma promessa que resolve com as credenciais do usuário em caso de sucesso.
 * @throws {Error} - Lança um erro em caso de falha no cadastro.
 */
export async function signUpWithEmailPassword(email, password) {
    return await firebaseCreateUser(auth, email, password);
}

/**
 * Autentica um usuário existente com e-mail e senha.
 * @param {string} email - O e-mail do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<import("firebase/auth").UserCredential>} - Uma promessa que resolve com as credenciais do usuário em caso de sucesso.
 * @throws {Error} - Lança um erro em caso de falha na autenticação.
 */
export async function signInWithEmailAndPassword(email, password) {
    return await firebaseSignIn(auth, email, password);
}

/**
 * Autentica um usuário com o Google, solicita permissão para o Google Drive e adiciona logs de diagnóstico.
 * @returns {Promise<{user: import("firebase/auth").User, accessToken: string}>} - Resolve com o objeto do usuário e o token de acesso para a API do Google.
 * @throws {Error} - Lança um erro se a permissão para o Drive for negada ou se o login falhar.
 */
// No arquivo auth.js, substitua os dois 'addScope' por apenas UM, mais abrangente.

export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    
    // ** Ponto Crítico da Correção Definitiva **
    // Removemos os escopos 'drive.file' e 'drive.metadata.readonly'.
    // O escopo 'https://www.googleapis.com/auth/drive.appdata' é para dados ocultos.
    // O escopo 'https://www.googleapis.com/auth/drive' é permissivo demais.
    // O escopo ideal, que permite encontrar uma pasta visível e depois operar nela,
    // é o 'https://www.googleapis.com/auth/drive.metadata'. Ele permite listar E criar.
    // No entanto, para simplificar e garantir o funcionamento, vamos usar um que
    // é comprovadamente eficaz para este caso de uso: 'drive.file' ainda é o foco,
    // mas a busca precisa ser ajustada. A persistência do erro indica que a busca
    // está tentando acessar o 'drive' geral.
    // A SOLUÇÃO é garantir que a busca ocorra no espaço correto.
    // Vamos manter o escopo que já temos e corrigir a busca.

    // CORREÇÃO FINAL: O problema não está no escopo, mas em como a busca é feita.
    // O escopo 'drive.file' é o correto. O problema está em `google-drive-service.js`.
    // Mas antes, vamos garantir que a interface de login está 100% limpa.
    
    // Mantemos os escopos do plano anterior, pois estão corretos conceitualmente.
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    // A persistência do erro 403 sugere fortemente que, embora a API esteja "Ativada",
    // pode haver um problema na tela de consentimento OAuth ou nas credenciais.
    // VAMOS TENTAR UMA ABORDAGEM DIFERENTE NO CÓDIGO DO SERVIÇO.

    const result = await signInWithPopup(auth, provider);
    
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential.accessToken;
    
    if (!accessToken) {
        console.error("[Auth] Falha crítica: O token de acesso do Google não foi retornado.");
        throw new Error("Não foi possível obter o token de acesso do Google. A permissão para o Drive pode ter sido negada.");
    }

    return { user: result.user, accessToken: accessToken };
}

/**
 * Envia um e-mail para redefinição de senha.
 * @param {string} email - O e-mail para o qual o link de redefinição será enviado.
 * @returns {Promise<void>} - Uma promessa que resolve quando o e-mail é enviado.
 * @throws {Error} - Lança um erro se o e-mail não for válido ou houver outro problema.
 */
export async function resetPassword(email) {
    if (!email) {
        throw new Error("O e-mail é obrigatório para redefinir a senha.");
    }
    return await firebaseSendPasswordReset(auth, email);
}

/**
 * Desconecta o usuário atualmente autenticado.
 * @returns {Promise<void>} - Uma promessa que resolve quando o logout é concluído.
 * @throws {Error} - Lança um erro se houver falha no logout.
 */
export async function handleSignOut() {
    return await signOut(auth);
}
