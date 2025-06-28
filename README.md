# Plano de Leitura da Bíblia Personalizado com Firebase

![Logotipo do Plano de Leitura](logo.png)

## Descrição

Este projeto é uma aplicação web interativa que permite aos usuários criar, acompanhar e gerenciar múltiplos planos personalizados de leitura da Bíblia. Utilizando Firebase para autenticação e armazenamento de dados em tempo real (Firestore), a aplicação oferece uma experiência flexível, personalizada, moderna e motivadora.

O projeto foi arquitetado com uma **estrutura de módulos JavaScript (ESM)**, focando em separação de responsabilidades, manutenibilidade e escalabilidade.

## Estrutura de Arquivos

O projeto é organizado na seguinte estrutura de diretórios, promovendo a separação de responsabilidades e a manutenibilidade:

.
├── index.html # Ponto de entrada HTML da aplicação
├── styles.css # Folha de estilos principal
├── logo.png # Imagem do logotipo
├── favicon.ico # Ícone da aba do navegador
├── manifest.json # Configuração para Progressive Web App (PWA)
├── README.md # Esta documentação
└── src/ # Contém todo o código-fonte modular da aplicação
├── main.js # Ponto de entrada JS, orquestrador principal
│
├── config/ # Módulos de configuração e dados estáticos
│ ├── firebase-config.js # Credenciais e inicialização do Firebase
│ ├── bible-data.js # Constantes dos livros e capítulos da Bíblia
│ └── plan-templates.js # Modelos para planos de leitura predefinidos
│
├── services/ # Camada de abstração de dados (comunicação com backend)
│ ├── authService.js # Funções de autenticação (login, signup, etc.)
│ └── planService.js # Funções de CRUD para os planos no Firestore
│
├── ui/ # Módulos de UI (manipulação do DOM)
│ ├── dom-elements.js # Centraliza todos os seletores de elementos do DOM
│ ├── auth-ui.js # Lógica da UI de autenticação
│ ├── header-ui.js # Lógica da UI do cabeçalho
│ ├── modals-ui.js # Lógica da UI de todos os modais
│ ├── perseverance-panel-ui.js # Lógica da UI do painel de perseverança
│ ├── plan-creation-ui.js # Lógica da UI de criação de planos
│ └── reading-plan-ui.js # Lógica da UI do plano de leitura ativo
│
└── utils/ # Funções puras e utilitárias
├── chapter-helpers.js # Funções para gerar e manipular capítulos
└── date-helpers.js # Funções para formatar e calcular datas


## Funcionalidades Principais

*   **Autenticação de Usuários:** Cadastro e login seguros usando Firebase Authentication.
*   **Gerenciamento de Múltiplos Planos:** Crie, alterne, gerencie e delete múltiplos planos de leitura.
*   **Criação Rápida:** Gere um conjunto de três planos anuais estruturados com um único clique.
*   **Criação de Planos Personalizados:** Defina conteúdo por intervalo, seleção de livros/capítulos avulsos e configure a duração e a periodicidade (dias da semana).
*   **Acompanhamento de Progresso Detalhado:**
    *   Leitura diária com checkboxes individuais por capítulo.
    *   Painel de **Perseverança** que rastreia a sequência de dias de leitura consecutivos (streak).
    *   Painel de **Interações Semanais** com um resumo visual da sua atividade.
    *   Visualização de leituras atrasadas e próximas em todos os seus planos.
*   **Recálculo de Plano:** Ajuste dinamicamente o ritmo de um plano ativo sem perder o progresso.
*   **Histórico e Estatísticas:** Acesse o histórico de leituras concluídas e veja estatísticas sobre seu progresso.
*   **Interface Responsiva:** Design moderno e otimizado para dispositivos móveis (Mobile-First).

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
