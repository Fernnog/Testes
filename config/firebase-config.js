// config/firebase-config.js
// --- Módulo de Configuração do Firebase ---
// Responsabilidade: Inicializar e exportar as instâncias dos serviços do Firebase.
// Este é o único lugar no app onde as chaves de API e configurações de projeto devem existir.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Suas credenciais do Firebase.
const firebaseConfig = {
    apiKey: "AIzaSyCzLjQrE3KhneuwZZXIost5oghVjOTmZQE",
    authDomain: "plano-leitura.firebaseapp.com",
    projectId: "plano-leitura",
    storageBucket: "plano-leitura.appspot.com",
    messagingSenderId: "589137978493",
    appId: "1:589137978493:web:f7305bca602383fe14bd14"
};

// Inicializa o Firebase App
const app = initializeApp(firebaseConfig);

// Inicializa e exporta os serviços que serão usados pela aplicação.
// Outros módulos importarão `auth` e `db` diretamente daqui.
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("[Firebase Config] Módulo de configuração do Firebase carregado e serviços exportados.");
