// modules/auth.js
// RESPONSABILIDADE ÚNICA: Lidar com todas as operações do Firebase Authentication.
// Versão atualizada para incluir a autenticação via Google para a sincronização da agenda.

import { 
    onAuthStateChanged, 
    signOut, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    GoogleAuthProvider, // <-- NOVO: Importado para o fluxo de login com Google
    signInWithPopup     // <-- NOVO: Importado para abrir a janela de login do Google
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { auth } from '../config/firebase-config.js';

/**
 * Registra um observador que reage a mudanças no estado de autenticação (login/logout).
 * @param {function} callback - A função a ser executada quando o estado do usuário mudar.
 * Ela receberá o objeto 'user' ou 'null'.
 */
export function setupAuthStateObserver(callback) {
    onAuthStateChanged(auth, callback);
}

/**
 * Tenta fazer login com email e senha.
 * @param {string} email - O email do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<UserCredential>} Uma promessa que resolve com as credenciais do usuário em caso de sucesso.
 */
export function loginWithEmailPassword(email, password) {
    if (!email || !password) {
        return Promise.reject(new Error("Por favor, preencha o email e a senha."));
    }
    return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Tenta criar uma nova conta com email e senha.
 * @param {string} email - O email para a nova conta.
 * @param {string} password - A senha para a nova conta.
 * @returns {Promise<UserCredential>} Uma promessa que resolve com as credenciais do usuário em caso de sucesso.
 */
export function signupWithEmailPassword(email, password) {
    if (!email || !password) {
        return Promise.reject(new Error("Por favor, preencha o email e a senha para cadastrar."));
    }
    if (password.length < 6) {
        return Promise.reject(new Error("A senha deve ter pelo menos 6 caracteres."));
    }
    return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Inicia o processo de autenticação com a conta Google.
 * Solicita permissão para acessar a agenda do usuário, que é um requisito da nossa nova funcionalidade.
 * @returns {Promise<UserCredential>} Uma promessa que resolve com as credenciais do usuário, incluindo o token de acesso para a API do Google.
 */
export function signInWithGoogle() {
    // Cria uma instância do provedor de autenticação do Google.
    const provider = new GoogleAuthProvider();

    // Adiciona o "escopo" de permissão necessário. Estamos pedindo ao usuário
    // permissão para ler e escrever eventos na sua agenda.
    provider.addScope('https://www.googleapis.com/auth/calendar.events');

    // Abre a janela pop-up do Google para que o usuário possa fazer login e autorizar o acesso.
    return signInWithPopup(auth, provider);
}

/**
 * Desconecta o usuário atualmente logado.
 * @returns {Promise<void>} Uma promessa que resolve quando o logout é concluído.
 */
export function logout() {
    return signOut(auth);
}