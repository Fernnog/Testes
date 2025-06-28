
## Tech Stack

*   **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
*   **Backend & Database:** Firebase
    *   Firebase Authentication (Autenticação por Email/Senha)
    *   Cloud Firestore (Banco de Dados NoSQL em tempo real)
*   **Fontes:** Google Fonts (Inter)

## Configuração do Firebase

Para executar este projeto localmente, você precisará configurar seu próprio projeto Firebase:

1.  **Crie um Projeto Firebase:** Acesse o [Firebase Console](https://console.firebase.google.com/) e crie um novo projeto.
2.  **Adicione um App Web:** Dentro do seu projeto, adicione um novo aplicativo da Web.
3.  **Obtenha as Credenciais:** Copie o objeto de configuração do Firebase (`firebaseConfig`).
4.  **Configure o Projeto:** Cole seu `firebaseConfig` no arquivo **`src/config/firebase-config.js`**.
5.  **Ative os Serviços:** No Firebase Console:
    *   **Authentication:** Habilite o provedor "Email/senha".
    *   **Firestore Database:** Crie um banco de dados Firestore.
6.  **Regras de Segurança do Firestore (Essencial!):** Para proteger os dados dos usuários, publique as seguintes regras na aba "Regras" do seu Firestore:
    ```firestore-rules
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{userId} {
          // Permite que um usuário autenticado leia e escreva em seu próprio documento de usuário
          // (para activePlanId, dados de streak, etc.)
          allow read, write: if request.auth != null && request.auth.uid == userId;

          // Permite que um usuário autenticado gerencie seus próprios planos de leitura
          match /plans/{planId} {
            allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
          }
        }
      }
    }
    ```

## Como Executar Localmente

1.  Clone este repositório.
2.  Configure suas credenciais do Firebase em **`src/config/firebase-config.js`**.
3.  Publique as Regras de Segurança do Firestore no seu projeto Firebase.
4.  Abra o arquivo `index.html` no seu navegador. **É recomendado usar um servidor local simples**, como a extensão "Live Server" no VS Code, pois os navegadores podem restringir o uso de Módulos ES6 (`import`/`export`) abertos diretamente do sistema de arquivos (`file://`).

## Uso

1.  **Cadastro/Login:** Crie uma conta ou faça login.
2.  **Gerenciar/Criar Planos:** Após o login, use o botão de engrenagem (⚙️) no cabeçalho para abrir o modal "Meus Planos". A partir daí, você pode criar um plano genérico, gerar o conjunto de planos anuais favoritos, ou ativar/excluir planos existentes.
3.  **Acompanhamento:** A interface principal exibirá o plano ativo selecionado. Marque os capítulos como lidos e clique em "Concluir Leituras e Avançar" para registrar seu progresso e atualizar seus painéis de perseverança e atividade semanal.
4.  **Ações do Plano:** Utilize os botões na seção do plano ativo para recalcular o ritmo, ver estatísticas ou acessar o histórico de leitura daquele plano.
