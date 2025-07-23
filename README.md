# Plano de Leitura da Bíblia Personalizado com Firebase

![Logotipo do Plano de Leitura](logo.png)

## Descrição

Este projeto é uma aplicação web interativa que permite aos usuários criar, acompanhar e gerenciar múltiplos planos personalizados de leitura da Bíblia. Utilizando Firebase para autenticação e armazenamento de dados em tempo real (Firestore), a aplicação oferece uma experiência flexível, personalizada, moderna e motivadora.

O projeto foi arquitetado com uma **estrutura de módulos JavaScript (ESM)**, focando em separação de responsabilidades, manutenibilidade e escalabilidade.

## Estrutura de Arquivos [ATUALIZADO]

O projeto é organizado na seguinte estrutura de diretórios, promovendo a separação de responsabilidades e a manutenibilidade:

└── src/ # Contém todo o código-fonte modular da aplicação
    ├── main.js # Ponto de entrada JS, orquestrador principal
    │
    ├── config/ # Módulos de configuração e dados estáticos
    │   ├── firebase-config.js # Credenciais e inicialização do Firebase
    │   ├── bible-data.js # Constantes dos livros e capítulos da Bíblia
    │   ├── icon-config.js # Ícones selecionáveis e para planos favoritos
    │   └── plan-templates.js # Modelos para planos de leitura predefinidos
    │
    ├── services/ # Camada de abstração de dados (comunicação com backend)
    │   ├── authService.js # Funções de autenticação (login, signup, etc.)
    │   └── planService.js # Funções de CRUD para os planos no Firestore
    │
    ├── ui/ # Módulos de UI (manipulação do DOM)
    │   ├── dom-elements.js # Centraliza todos os seletores de elementos do DOM
    │   ├── auth-ui.js # Lógica da UI de autenticação
    │   ├── header-ui.js # Lógica da UI do cabeçalho
    │   ├── modals-ui.js # Lógica da UI de todos os modais
    │   ├── perseverance-panel-ui.js # Lógica da UI do painel de perseverança
    │   ├── weekly-tracker-ui.js # Lógica da UI do painel de interações semanais
    │   ├── plan-creation-ui.js # Lógica da UI de criação e edição de planos
    │   ├── reading-plan-ui.js # Lógica da UI para renderizar os cards de todos os planos
    │   ├── side-panels-ui.js # Lógica da UI dos painéis de leituras atrasadas e próximas
    │   ├── floating-navigator-ui.js # Lógica da UI do navegador/dock flutuante
    │   └── plan-reassessment-ui.js # **[NOVO]** Lógica da UI para o Quadro de Carga Semanal (Reavaliação de Planos)
    │
    └── utils/ # Funções puras e utilitárias
        ├── chapter-helpers.js # Funções para gerar e manipular capítulos
        ├── date-helpers.js # Funções para formatar e calcular datas
        ├── plan-logic-helpers.js # Lógica para calcular a data efetiva de um dia de leitura
        └── plan-builder.js # Lógica de negócios para construir um objeto de plano completo a partir dos dados do formulário

## Funcionalidades Principais [ATUALIZADO]

*   **Autenticação de Usuários:** Cadastro e login seguros usando Firebase Authentication.
*   **Gerenciamento de Múltiplos Planos:** Crie, edite, gerencie e delete múltiplos planos de leitura em uma interface moderna baseada em cards.
*   **Reavaliação Inteligente de Planos:** **[NOVO]** Visualize a distribuição de capítulos de todos os seus planos em um "Quadro de Carga Semanal". Remaneje a carga de leitura entre os dias da semana de forma intuitiva, arrastando e soltando (Drag & Drop) os planos para balancear seus estudos.
*   **Navegação Rápida:** Um *dock* flutuante permite alternar instantaneamente entre os seus planos de leitura.
*   **Criação Rápida:** Gere um conjunto de três planos anuais estruturados com um único clique.
*   **Criação de Planos Personalizados:** Defina conteúdo por intervalo, seleção de livros/capítulos avulsos e configure a duração e a periodicidade (dias da semana).
*   **Acompanhamento de Progresso Detalhado:**
    *   Leitura diária com checkboxes individuais por capítulo.
    *   Painel de **Perseverança** que rastreia a sequência de dias de leitura consecutivos (streak).
    *   Painel de **Interações Semanais** com um resumo visual da sua atividade.
    *   Visualização de leituras atrasadas e próximas em todos os seus planos.
*   **Recálculo de Plano:** Ajuste dinamicamente o ritmo de um plano ativo sem perder o progresso.
*   **Histórico e Estatísticas:** Acesse o histórico de leituras concluídas e veja estatísticas sobre seu progresso para cada plano.
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

## Uso [ATUALIZADO]

1.  **Cadastro/Login:** Crie uma conta ou faça login para acessar seus planos.
2.  **Criação de Planos:** Após o login, você verá botões para "Criar Novo Plano (Genérico)" ou "Criar Plano Favorito Anual".
3.  **Interface Principal:** Seus planos de leitura são exibidos como cards individuais. O plano ativo é destacado com uma borda roxa.
4.  **Navegação:** Use o **dock flutuante** na parte inferior da tela para pular rapidamente para qualquer um dos seus planos.
5.  **Reavaliar e Balancear:** **[NOVO]** Clique em **"Reavaliar Planos"** para visualizar o Quadro de Carga Semanal. Arraste e solte os cards de plano entre os dias da semana para ajustar a distribuição da sua leitura. Você também pode clicar em um card para editar os dias da semana através de checkboxes.
6.  **Acompanhamento:** Dentro de cada card, marque os capítulos lidos nos checkboxes e clique em "Concluir Leituras e Avançar" para registrar seu progresso. Isso atualizará seus painéis de perseverança e atividade semanal.
7.  **Ações do Plano:** Cada card possui botões para **Editar** (nome e ícone), **Recalcular** o ritmo, ver **Estatísticas**, acessar o **Histórico** de leitura e **Excluir** o plano.
