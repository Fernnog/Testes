// ==== INÍCIO SEÇÃO - IMPORTS FIREBASE SDKS ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
// Removido: import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
// Removido: Firestore imports (não são necessários em login.js)
// ==== FIM SEÇÃO - IMPORTS FIREBASE SDKS ====

// ==== INÍCIO SEÇÃO - CONFIGURAÇÃO FIREBASE ====
// Use a configuração do SEU projeto Firebase (a mesma de script.js)
const firebaseConfig = {
    apiKey: "AIzaSyDG1NYs6CM6TDfGAPXSz1ho8_-NWs28zSg", // SUA API KEY
    authDomain: "perola-rara.firebaseapp.com",       // SEU AUTH DOMAIN
    projectId: "perola-rara",                     // SEU PROJECT ID
    storageBucket: "perola-rara.firebasestorage.app", // SEU STORAGE BUCKET
    messagingSenderId: "502232132512",               // SEU MESSAGING SENDER ID
    appId: "1:502232132512:web:59f227a7d35b39cc8752c5", // SEU APP ID
    measurementId: "G-VHVMR10RSQ"                   // SEU MEASUREMENT ID (se usar Analytics)
};
// ==== FIM SEÇÃO - CONFIGURAÇÃO FIREBASE ====

// ==== INÍCIO SEÇÃO - INICIALIZAÇÃO FIREBASE ====
const app = initializeApp(firebaseConfig);
// Removido: const analytics = getAnalytics(app); // Não é necessário em login.js
// Removido: const db = getFirestore(app); // Não é necessário em login.js
const auth = getAuth(app);
// ==== FIM SEÇÃO - INICIALIZAÇÃO FIREBASE ====

// ==== INÍCIO SEÇÃO - FUNÇÕES DE AUTENTICAÇÃO FIREBASE (login.js) ====

// Função auxiliar para mostrar/ocultar o indicador de carregamento
function showLoading(show) {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = show ? 'block' : 'none';
}

async function registrarUsuario(email, password) {
    showLoading(true); // Mostrar loading
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        document.getElementById('auth-message').textContent = 'Registro bem-sucedido.';
        document.getElementById('auth-message').style.color = 'green';
        // Redireciona para a página principal após o registro
        window.location.href = "../index.html";
    } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        document.getElementById('auth-message').textContent = 'Erro ao registrar usuário: ' + error.message;
        document.getElementById('auth-message').style.color = 'red';
    } finally {
        showLoading(false); // Ocultar loading
    }
}

async function loginUsuario(email, password) {
    showLoading(true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        document.getElementById('auth-message').textContent = 'Login bem-sucedido.';
        document.getElementById('auth-message').style.color = 'green';
        // Redireciona para a página principal após o login
        window.location.href = "../index.html";
    } catch (error) {
        console.error("Erro ao fazer login:", error);
        document.getElementById('auth-message').textContent = 'Erro ao fazer login: ' + error.message;
        document.getElementById('auth-message').style.color = 'red';
    } finally {
        showLoading(false);
    }
}

async function enviarEmailRedefinicaoSenha(email) {
    showLoading(true);
    try {
        await sendPasswordResetEmail(auth, email);
        document.getElementById('auth-message').textContent = 'Email de redefinição de senha enviado.';
        document.getElementById('auth-message').style.color = 'blue';
    } catch (error) {
        console.error("Erro ao enviar email de redefinição de senha:", error);
        document.getElementById('auth-message').textContent = 'Erro ao enviar email de redefinição de senha: ' + error.message;
        document.getElementById('auth-message').style.color = 'red';
    }finally {
        showLoading(false);
    }
}
// ==== FIM SEÇÃO - FUNÇÕES DE AUTENTICAÇÃO FIREBASE (login.js) ====

// ==== INÍCIO SEÇÃO - EVENT LISTENERS (login.js) ====
document.addEventListener('DOMContentLoaded', () => {

    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            if (!emailInput.value || !passwordInput.value) {
                document.getElementById('auth-message').textContent = "Preencha email e senha.";
                document.getElementById('auth-message').style.color = 'red';
                return;
            }
            registrarUsuario(emailInput.value, passwordInput.value);
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (!emailInput.value || !passwordInput.value) {
                document.getElementById('auth-message').textContent = "Preencha email e senha.";
                document.getElementById('auth-message').style.color = 'red';
                return;
            }
            loginUsuario(emailInput.value, passwordInput.value);
        });
    }

    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', () => {
            if (!emailInput.value) {
                 document.getElementById('auth-message').textContent = "Preencha o email.";
                 document.getElementById('auth-message').style.color = 'red';
                 return;
            }
            enviarEmailRedefinicaoSenha(emailInput.value);
        });
    }

    //Verifica se já tem usuário logado
    onAuthStateChanged(auth, (user) => {
     if (user) {
        window.location.href = "../index.html"; // Se já está logado, vai para index.html
     }
    });
});
// ==== FIM SEÇÃO - EVENT LISTENERS (login.js) ====
