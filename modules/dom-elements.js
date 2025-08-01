// --- START OF FILE dom-elements.js (COMPLETO E MODIFICADO) ---

// modules/dom-elements.js
// RESPONSABILIDADE ÚNICA: Selecionar e exportar todos os elementos do DOM
// que a aplicação precisa para interagir.

// --- Seções e Layout ---
export const cadastroPlanoSection = document.getElementById('cadastro-plano');
export const planosLeituraSection = document.getElementById('planos-leitura');
export const listaPlanos = document.getElementById('lista-planos');
export const paginadorPlanosDiv = document.getElementById('paginador-planos');
export const proximasLeiturasSection = document.getElementById('proximas-leituras-section');
export const listaProximasLeiturasDiv = document.getElementById('lista-proximas-leituras');
export const semProximasLeiturasP = document.getElementById('sem-proximas-leituras');
export const leiturasAtrasadasSection = document.getElementById('leituras-atrasadas-section');
export const listaLeiturasAtrasadasDiv = document.getElementById('lista-leituras-atrasadas');
export const semLeiturasAtrasadasP = document.getElementById('sem-leituras-atrasadas');
export const planosPausadosSection = document.getElementById('planos-pausados-section');
export const listaPlanosPausadosDiv = document.getElementById('lista-planos-pausados');
export const semPlanosPausadosP = document.getElementById('sem-planos-pausados');


// --- Header e Botões de Ação ---
export const novoPlanoBtn = document.getElementById('novo-plano');
export const inicioBtn = document.getElementById('inicio');
export const exportarAgendaBtn = document.getElementById('exportar-agenda');
export const inicioCadastroBtn = document.getElementById('inicio-cadastro');
export const reavaliarCargaBtn = document.getElementById('reavaliar-carga-btn');

// --- Autenticação ---
export const authFormDiv = document.getElementById('auth-form');
export const showAuthButton = document.getElementById('show-auth-button');
export const cancelAuthButton = document.getElementById('cancel-auth-button');
export const loginEmailButton = document.getElementById('login-email-button');
export const signupEmailButton = document.getElementById('signup-email-button');
export const emailLoginInput = document.getElementById('email-login');
export const passwordLoginInput = document.getElementById('password-login');
export const logoutButton = document.getElementById('logout-button');

// --- Formulário de Cadastro/Edição de Plano ---
export const formPlano = document.getElementById('form-plano');
export const periodicidadeSelect = document.getElementById('periodicidade');
export const diasSemanaSelecao = document.getElementById('dias-semana-selecao');
export const definirPorDatasRadio = document.getElementById('definir-por-datas');
export const definirPorDiasRadio = document.getElementById('definir-por-dias');
// INÍCIO DA MODIFICAÇÃO (Prioridade 1)
export const definirPorPaginasRadio = document.getElementById('definir-por-paginas');
// FIM DA MODIFICAÇÃO
export const periodoPorDatasDiv = document.getElementById('periodo-por-datas');
export const periodoPorDiasDiv = document.getElementById('periodo-por-dias');
// INÍCIO DA MODIFICAÇÃO (Prioridade 1)
export const periodoPorPaginasDiv = document.getElementById('periodo-por-paginas');
// FIM DA MODIFICAÇÃO
export const dataInicio = document.getElementById('data-inicio');
export const dataFim = document.getElementById('data-fim');
export const dataInicioDias = document.getElementById('data-inicio-dias');
export const numeroDias = document.getElementById('numero-dias');
// INÍCIO DA MODIFICAÇÃO (Prioridade 1)
export const dataInicioPaginas = document.getElementById('data-inicio-paginas');
export const paginasPorDiaInput = document.getElementById('paginas-por-dia');
// FIM DA MODIFICAÇÃO
export const linkDriveInput = document.getElementById('link-drive');
export const tituloLivroInput = document.getElementById('titulo-livro');
export const paginaInicioInput = document.getElementById('pagina-inicio');
export const paginaFimInput = document.getElementById('pagina-fim');
// INÍCIO DA MODIFICAÇÃO (Prioridade 2.B)
export const estimativaDataFimP = document.getElementById('estimativa-data-fim');
// FIM DA MODIFICAÇÃO

// --- Modal de Reavaliação ---
export const reavaliacaoModal = document.getElementById('reavaliacao-modal');
export const fecharReavaliacaoBtn = document.getElementById('fechar-reavaliacao-btn');
export const tabelaReavaliacaoBody = document.querySelector('#tabela-reavaliacao tbody');
export const reavaliacaoLegenda = document.getElementById('reavaliacao-legenda');

// --- Modal de Recálculo ---
export const recalculoModal = document.getElementById('recalculo-modal');
export const recalculoModalCloseBtn = document.getElementById('recalculo-modal-close-btn');
export const cancelRecalculoBtn = document.getElementById('cancel-recalculo-btn');
export const confirmRecalculoBtn = document.getElementById('confirm-recalculo-btn');
export const novaDataFimInput = document.getElementById('nova-data-fim-input');
export const recalculoPlanoTitulo = document.getElementById('recalculo-plano-titulo');

// --- Elementos do Modal de Recálculo Flexível ---
export const recalculoPorDataRadio = document.getElementById('recalculo-por-data');
export const recalculoPorPaginasRadio = document.getElementById('recalculo-por-paginas');
export const recalculoOpcaoDataDiv = document.getElementById('recalculo-opcao-data');
export const recalculoOpcaoPaginasDiv = document.getElementById('recalculo-opcao-paginas');
export const novaPaginasPorDiaInput = document.getElementById('nova-paginas-por-dia-input');

// --- Modal de Exportação de Agenda ---
export const agendaModal = document.getElementById('agenda-modal');
export const confirmAgendaExportBtn = document.getElementById('confirm-agenda-export');
export const cancelAgendaExportBtn = document.getElementById('cancel-agenda-export'); 
export const cancelAgendaExportBtnBottom = document.getElementById('cancel-agenda-export-btn');
export const agendaStartTimeInput = document.getElementById('agenda-start-time');
export const agendaEndTimeInput = document.getElementById('agenda-end-time');

// --- END OF FILE dom-elements.js ---