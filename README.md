# Plano de Leitura da Bíblia Personalizado com Firebase

![Logotipo do Plano de Leitura](logo.png)

## Descrição

Este projeto é uma aplicação web interativa que permite aos usuários criar, acompanhar e gerenciar múltiplos planos personalizados de leitura da Bíblia. Utilizando Firebase para autenticação e armazenamento de dados em tempo real (Firestore), a aplicação oferece uma experiência flexível, personalizada, moderna e motivadora.

O projeto foi arquitetado com uma **estrutura de módulos JavaScript (ESM)**, focando em separação de responsabilidades, manutenibilidade e escalabilidade.

## Estrutura de Arquivos

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
    │   └── plan-reassessment-ui.js # Lógica da UI para o Quadro de Carga Semanal
    │
    └── utils/ # Funções puras e utilitárias
        ├── chapter-helpers.js # Funções para gerar e manipular capítulos
        ├── date-helpers.js # Funções para formatar e calcular datas
        ├── plan-logic-helpers.js # Lógica para calcular a data efetiva de um dia de leitura
        ├── plan-builder.js # Lógica de negócios para construir um objeto de plano
        ├── plan-calculator.js # Lógica para recálculos de ritmo e datas
        └── plan-aggregator.js # Lógica para agregar dados de múltiplos planos

## Funcionalidades Principais

*   **Autenticação de Usuários:** Cadastro e login seguros usando Firebase Authentication.
*   **Gerenciamento de Múltiplos Planos:** Crie, edite, gerencie e delete múltiplos planos de leitura em uma interface moderna baseada em cards.
*   **Explorador da Bíblia:** Uma visão geral de todos os livros da Bíblia, destacando quais estão incluídos em seus planos e permitindo explorar os capítulos.
*   **Reavaliação e Sincronização:**
    *   **Quadro de Carga Semanal:** Visualize a distribuição de capítulos de todos os seus planos e remaneje a carga de leitura entre os dias da semana com Drag & Drop.
    *   **Sincronização de Término:** Ajuste múltiplos planos para terminarem na mesma data com um clique.
*   **Navegação Rápida:** Um *dock* flutuante permite alternar instantaneamente entre os seus planos de leitura.
*   **Criação Rápida e Personalizada:**
    *   Gere um conjunto de três planos anuais estruturados com um único clique.
    *   Crie planos totalmente personalizados por intervalo, seleção de livros/capítulos ou ritmo desejado.
*   **Acompanhamento de Progresso Detalhado:**
    *   Checkboxes individuais por capítulo e feedback de salvamento instantâneo.
    *   Painel de **Perseverança** que rastreia sua sequência de dias de leitura (streak).
    *   Painel de **Interações Semanais** com um resumo visual da sua atividade.
    *   Painéis inteligentes que mostram leituras atrasadas e próximas.
*   **Análise e Recálculo:**
    *   Recalcule um plano para se ajustar a um novo ritmo ou a uma nova data final.
    *   Acesse o histórico de leituras e veja estatísticas detalhadas, incluindo um gráfico de progresso.
*   **Interface Responsiva:** Design moderno e otimizado para dispositivos móveis.

## Tech Stack

*   **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
*   **Backend & Database:** Firebase
    *   Firebase Authentication
    *   Cloud Firestore
*   **Bibliotecas:** Chart.js (para gráficos de estatísticas)

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
          allow read, write: if request.auth != null && request.auth.uid == userId;

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
3.  Publique as Regras de Segurança do Firestore.
4.  Abra o arquivo `index.html` em seu navegador. **É recomendado usar um servidor local**, como a extensão "Live Server" no VS Code, pois os navegadores podem restringir o uso de Módulos ES6 (`import`/`export`) abertos diretamente do sistema de arquivos (`file://`).

## Uso

1.  **Cadastro/Login:** Crie uma conta ou faça login.
2.  **Visão Geral:** Após o login, você verá os botões de ação principais e, abaixo, seus planos de leitura em formato de cards.
3.  **Ações Principais:** Use os botões no topo para:
    *   **Criar um Novo Plano:** Configurar um plano do zero.
    *   **Explorar a Bíblia:** Ver a cobertura dos seus planos.
    *   **Reavaliar Planos:** Acessar o quadro de carga semanal para balancear e sincronizar seus planos.
    *   **Criar Plano Favorito:** Gerar o conjunto de planos anuais.
4.  **Navegação:** Use o **dock flutuante** na parte inferior para pular rapidamente para qualquer um dos seus planos.
5.  **Acompanhamento:** Dentro de cada card, marque os capítulos lidos e clique em "Concluir Leituras e Avançar" para registrar seu progresso.
