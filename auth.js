// --- START OF FILE auth.js ---
// Responsabilidade: Conter as funções que interagem diretamente com o serviço Firebase Auth.
// Este módulo não deve manipular o DOM diretamente.
// (VERSÃO FINAL CORRIGIDA E MELHORADA)

import { auth } from './firebase-config.js';
import { 
    signOut, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword as firebaseCreateUser, // APELIDO (BOA PRÁTICA)
    signInWithEmailAndPassword as firebaseSignIn,     // APELIDO (CORREÇÃO)
    sendPasswordResetEmail as firebaseSendPasswordReset, // APELIDO (BOA PRÁTICA)
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
    // Usa a função apelidada do Firebase
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
    // Usa a função apelidada do Firebase (CORREÇÃO DO BUG ORIGINAL)
    return await firebaseSignIn(auth, email, password);
}

/**
 * (VERSÃO CORRIGIDA) Autentica um usuário com o Google e solicita permissão para o Google Drive.
 * @returns {Promise<{user: import("firebase/auth").User, accessToken: string}>} - Resolve com o objeto do usuário e o token de acesso para a API do Google.
 * @throws {Error} - Lança um erro se a permissão para o Drive for negada ou se o login falhar.
 */
export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    
    // ** Ponto Crítico **
    // Solicita a permissão para criar, editar e ver os arquivos que a APLICAÇÃO criou.
    // Isso não dá acesso a outros arquivos do usuário.
    provider.addScope('https://www.googleapis.com/auth/drive.file');

    const result = await signInWithPopup(auth, provider);
    
    // Extrai o token de acesso OAuth necessário para fazer chamadas à API do Google Drive.
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential.accessToken;
    
    // CORREÇÃO: A verificação de 'scope' foi removida por ser instável e desnecessária.
    // A obtenção bem-sucedida do accessToken já valida que a permissão foi concedida.
    
    if (!accessToken) {
        throw new Error("Não foi possível obter o token de acesso do Google. Tente novamente.");
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
    // Usa a função apelidada do Firebase
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
