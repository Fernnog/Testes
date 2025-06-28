/**
 * @file auth-ui.js
 * @description Módulo de UI responsável por gerenciar a seção de autenticação,
 * incluindo os formulários de login, cadastro, mensagens de erro e indicadores de carregamento.
 */

// Importa todos os elementos do DOM necessários para esta view
import {
    authSection,
    loginForm,
    signupForm,
    loginEmailInput,
    loginPasswordInput,
    signupEmailInput,
    signupPasswordInput,
    loginButton,
    signupButton,
    authErrorDiv,
    signupErrorDiv,
    authLoadingDiv,
    showSignupLink,
    showLoginLink,
} from './dom-elements.js';

// --- Estado Interno do Módulo ---
// Armazena os callbacks fornecidos pelo orquestrador (main.js)
let state = {
    callbacks: {
        onLogin: null,
        onSignup: null,
    },
};

// --- Funções Privadas (Handlers de Eventos) ---

/**
 * Lida com o envio do formulário de login.
 * @param {Event} e - O objeto do evento de submissão.
 */
function _handleLoginSubmit(e) {
    e.preventDefault();
    if (loginButton.disabled) return;
    
    // Mostra o feedback visual de carregamento
    showLoading();
    hideAllMessages();

    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;

    // Invoca o callback de login, passando os dados para o orquestrador
    if (state.callbacks.onLogin) {
        state.callbacks.onLogin(email, password);
    }
}

/**
 * Lida com o envio do formulário de cadastro.
 * @param {Event} e - O objeto do evento de submissão.
 */
function _handleSignupSubmit(e) {
    e.preventDefault();
    if (signupButton.disabled) return;

    showLoading();
    hideAllMessages();

    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value;
    
    // Invoca o callback de cadastro
    if (state.callbacks.onSignup) {
        state.callbacks.onSignup(email, password);
    }
}

/**
 * Alterna a visibilidade entre o formulário de login e de cadastro.
 * @param {boolean} showLogin - True para mostrar o formulário de login, false para o de cadastro.
 */
function _toggleForms(showLogin = true) {
    hideAllMessages();
    loginForm.style.display = showLogin ? 'block' : 'none';
    signupForm.style.display = showLogin ? 'none' : 'block';
}


// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo de UI de autenticação, configurando todos os listeners de eventos.
 * @param {object} callbacks - Um objeto contendo as funções de callback { onLogin, onSignup }.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    loginForm.addEventListener('submit', _handleLoginSubmit);
    signupForm.addEventListener('submit', _handleSignupSubmit);

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        _toggleForms(false);
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        _toggleForms(true);
    });
}

/**
 * Mostra a seção de autenticação e reseta para o formulário de login.
 */
export function show() {
    _toggleForms(true); // Garante que sempre começa no formulário de login
    authSection.style.display = 'block';
}

/**
 * Esconde a seção de autenticação.
 */
export function hide() {
    authSection.style.display = 'none';
}

/**

 * Mostra uma mensagem de erro específica para o formulário de login.
 * @param {string} message - A mensagem de erro a ser exibida.
 */
export function showLoginError(message) {
    authErrorDiv.textContent = message;
    authErrorDiv.style.display = 'block';
}

/**
 * Mostra uma mensagem de erro específica para o formulário de cadastro.
 * @param {string} message - A mensagem de erro a ser exibida.
 */
export function showSignupError(message) {
    signupErrorDiv.textContent = message;
    signupErrorDiv.style.display = 'block';
}

/**
 * Esconde todas as mensagens de erro.
 */
export function hideAllMessages() {
    authErrorDiv.style.display = 'none';
    signupErrorDiv.style.display = 'none';
}

/**
 * Mostra o indicador de carregamento e desabilita os botões de formulário.
 */
export function showLoading() {
    authLoadingDiv.style.display = 'block';
    loginButton.disabled = true;
    signupButton.disabled = true;
}

/**
 * Esconde o indicador de carregamento e habilita os botões de formulário.
 */
export function hideLoading() {
    authLoadingDiv.style.display = 'none';
    loginButton.disabled = false;
    signupButton.disabled = false;
}