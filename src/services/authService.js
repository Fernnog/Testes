/**
 * @file authService.js
 * @description Este módulo serve como uma camada de abstração para todos os serviços
 * de autenticação do Firebase. Ele exporta funções simples para login, cadastro,
 * logout e para observar o estado de autenticação.
 */

// Importa a instância 'auth' já inicializada e as funções necessárias do SDK do Firebase.
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged as firebaseOnAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

import { auth } from "../config/firebase-config.js";

/**
 * Realiza o login de um usuário com e-mail e senha.
 * A função é um wrapper assíncrono para a chamada do Firebase SDK.
 * Erros são lançados para serem tratados pelo chamador (ex: no main.js).
 *
 * @param {string} email - O e-mail do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<import("firebase/auth").UserCredential>} Uma promessa que resolve com as credenciais do usuário em caso de sucesso.
 * @throws {FirebaseError} Lança um erro do Firebase em caso de falha na autenticação.
 */
export async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Cadastra um novo usuário com e-mail e senha.
 * A função é um wrapper assíncrono para a chamada do Firebase SDK.
 * Erros são lançados para serem tratados pelo chamador.
 *
 * @param {string} email - O e-mail para o novo cadastro.
 * @param {string} password - A senha para o novo cadastro.
 * @returns {Promise<import("firebase/auth").UserCredential>} Uma promessa que resolve com as credenciais do novo usuário.
 * @throws {FirebaseError} Lança um erro do Firebase se o e-mail já estiver em uso, a senha for fraca, etc.
 */
export async function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Desconecta o usuário atualmente autenticado.
 *
 * @returns {Promise<void>} Uma promessa que resolve quando o logout é concluído.
 */
export async function logout() {
    return signOut(auth);
}

/**
 * Anexa um observador ao estado de autenticação do usuário.
 * Esta função é um wrapper direto para o onAuthStateChanged do Firebase,
 * permitindo que o orquestrador principal (main.js) reaja a mudanças de login/logout.
 *
 * @param {function(import("firebase/auth").User | null): void} callback - A função a ser chamada
 *   sempre que o estado de autenticação mudar. Ela recebe o objeto do usuário ou null.
 * @returns {import("firebase/auth").Unsubscribe} Uma função que pode ser chamada para remover o observador.
 */
export function onAuthStateChanged(callback) {
    return firebaseOnAuthStateChanged(auth, callback);
}
