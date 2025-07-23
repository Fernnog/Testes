// src/config/firebase-config.js

// 1. IMPORTAÇÕES NECESSÁRIAS
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// 2. SUAS CREDENCIAIS DO FIREBASE (APENAS UMA VEZ!)
//    COLE SUAS CREDENCIAIS REAIS AQUI.
const firebaseConfig = {
  apiKey: "AIzaSyCv1G4CoK4EwZ6iMZ2CLCUdSg4YLFTuVKI",
  authDomain: "plano-leitura-biblia-8f763.firebaseapp.com",
  projectId: "plano-leitura-biblia-8f763",
  storageBucket: "plano-leitura-biblia-8f763.firebasestorage.app",
  messagingSenderId: "4101180633",
  appId: "1:4101180633:web:32d7846cf9a031962342c8",
  measurementId: "G-KT5PPGF7W1"
};

// 3. INICIALIZAÇÃO DO FIREBASE (APENAS UMA VEZ!)
const app = initializeApp(firebaseConfig);

// 4. EXPORTAÇÃO DAS INSTÂNCIAS (APENAS UMA VEZ!)
export const auth = getAuth(app);
export const db = getFirestore(app);
