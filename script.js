/* ==== INÍCIO - IMPORTS FIREBASE SDKS ==== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js"; // Uncomment if you use Analytics
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    setDoc,
    query,
    where, // Keep if needed for future specific queries by user ID, etc.
    orderBy
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
/* ==== FIM - IMPORTS FIREBASE SDKS ==== */

/* ==== INÍCIO - CONFIGURAÇÃO FIREBASE ==== */
const firebaseConfig = {
    apiKey: "AIzaSyDG1NYs6CM6TDfGAPXSz1ho8_-NWs28zSg", // SUA API KEY
    authDomain: "perola-rara.firebaseapp.com",       // SEU AUTH DOMAIN
    projectId: "perola-rara",                     // SEU PROJECT ID
    storageBucket: "perola-rara.firebasestorage.app", // SEU STORAGE BUCKET
    messagingSenderId: "502232132512",               // SEU MESSAGING SENDER ID
    appId: "1:502232132512:web:59f227a7d35b39cc8752c5", // SEU APP ID
    measurementId: "G-VHVMR10RSQ"                   // SEU MEASUREMENT ID (se usar Analytics)
};
/* ==== FIM - CONFIGURAÇÃO FIREBASE ==== */

/* ==== INÍCIO - INICIALIZAÇÃO FIREBASE ==== */
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Uncomment if needed
const db = getFirestore(app);
const auth = getAuth(app);
const orcamentosPedidosRef = collection(db, "Orcamento-Pedido");
/* ==== FIM - INICIALIZAÇÃO FIREBASE ==== */

/* ==== INÍCIO SEÇÃO - VARIÁVEIS GLOBAIS ==== */
let numeroOrcamento = 1;
let numeroPedido = 1;
const anoAtual = new Date().getFullYear();
let orcamentoEditando = null;
let pedidoEditando = null;
let orcamentos = [];
let pedidos = [];
let usuarioAtual = null; // Armazena o objeto do usuário logado (ou null)

// Element references (populated in DOMContentLoaded)
let authContainer, appContent, loadingIndicator, emailInput, passwordInput;
let registerBtn, loginBtn, forgotPasswordBtn, authMessage, btnLogout, userInfo;
/* ==== FIM SEÇÃO - VARIÁVEIS GLOBAIS ==== */

/* ==== INÍCIO SEÇÃO - FUNÇÕES AUXILIARES E DE UI ==== */

// Função para mostrar/ocultar indicador de carregamento (agora usa a variável global)
function showLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    } else {
        console.warn("Elemento #loading-indicator não encontrado.");
    }
}

// Função para mostrar a tela de Login e esconder a App
function mostrarTelaLogin() {
    if (authContainer) authContainer.style.display = 'block';
    if (appContent) appContent.style.display = 'none';
    if (userInfo) userInfo.textContent = ''; // Limpa info do usuário
    if (btnLogout) btnLogout.style.display = 'none'; // Esconde botão Sair
     // Limpa campos e mensagens do formulário de login
    if(emailInput) emailInput.value = '';
    if(passwordInput) passwordInput.value = '';
    if(authMessage) authMessage.textContent = '';
}

// Função para mostrar a App e esconder a tela de Login
function mostrarAplicacao(user) {
    if (authContainer) authContainer.style.display = 'none';
    if (appContent) appContent.style.display = 'block';
    if (userInfo && user) userInfo.textContent = `Logado como: ${user.email}`; // Mostra email
    if (btnLogout) btnLogout.style.display = 'inline-block'; // Mostra botão Sair (ou 'block' dependendo do CSS)
    mostrarPagina('form-orcamento'); // Mostra a página inicial da app por padrão
}

function formatarMoeda(valor) {
    // Certifica que o valor é numérico antes de formatar
    const numero = Number(valor) || 0;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarEntradaMoeda(input) {
    if (!input) return; // Verifica se o input existe
    let valor = input.value.replace(/\D/g, ''); // Remove tudo que não for dígito
    if (valor === '') {
        input.value = 'R$ 0,00'; // Formata como zero se vazio
        return;
    }
    valor = (parseInt(valor, 10) / 100).toFixed(2) + ''; // Converte para número, divide por 100, fixa 2 decimais
    valor = valor.replace(".", ","); // Troca ponto por vírgula
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); // Adiciona separador de milhar
    input.value = 'R$ ' + valor;
}

function converterMoedaParaNumero(valor) {
    if (typeof valor !== 'string') {
        // console.warn('converterMoedaParaNumero recebeu um valor não string:', valor);
        // Tenta converter se for número
        if (typeof valor === 'number') return valor;
        return 0;
    }
    // Remove 'R$', espaços, pontos de milhar e substitui vírgula por ponto decimal
    const numeroString = valor.replace(/R\$\s?|\./g, '').replace(',', '.');
    const numero = parseFloat(numeroString);
    return isNaN(numero) ? 0 : numero; // Retorna 0 se o resultado não for um número válido
}

function limparCamposMoeda() {
    const camposMoedaIds = [
        'valorFrete', 'valorOrcamento', 'total', 'entrada', 'restante', 'margemLucro', 'custoMaoDeObra',
        'valorFreteEdicao', 'valorPedidoEdicao', 'totalEdicao', 'entradaEdicao', 'restanteEdicao', 'margemLucroEdicao', 'custoMaoDeObraEdicao'
    ];
    camposMoedaIds.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            // Garante que o campo seja formatado como R$ 0,00 ao limpar
            campo.value = ''; // Limpa primeiro para garantir que formatarEntradaMoeda funcione corretamente
            formatarEntradaMoeda(campo); // Formata para R$ 0,00
        }
    });
}

function adicionarProduto() {
    const tbody = document.querySelector("#tabelaProdutos tbody");
    if (!tbody) return; // Sai se a tabela não for encontrada
    const newRow = tbody.insertRow();

    newRow.insertCell().innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1">';
    newRow.insertCell().innerHTML = '<input type="text" class="produto-descricao" placeholder="Descrição">'; // Placeholder adicionado
    newRow.insertCell().innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00">'; // Valor inicial formatado
    newRow.insertCell().textContent = formatarMoeda(0); // Célula de Valor Total
    newRow.insertCell().innerHTML = '<button type="button" class="btnExcluirProduto">Excluir</button>'; // Classe adicionada
}

function adicionarProdutoEdicao() {
    const tbody = document.querySelector("#tabelaProdutosEdicao tbody");
    if (!tbody) return;
    const newRow = tbody.insertRow();

    newRow.insertCell().innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1">'; // Removido onchange, usar event delegation
    newRow.insertCell().innerHTML = '<input type="text" class="produto-descricao" placeholder="Descrição">'; // Placeholder adicionado
    newRow.insertCell().innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00">'; // Removido oninput/onblur, usar event delegation
    newRow.insertCell().textContent = formatarMoeda(0);
    newRow.insertCell().innerHTML = '<button type="button" class="btnExcluirProdutoEdicao">Excluir</button>'; // Classe adicionada
}

function excluirProduto(botaoExcluir) {
    if (!botaoExcluir) return;
    const row = botaoExcluir.closest('tr'); // Método mais robusto para encontrar a linha
    if (row) {
        row.remove();
        atualizarTotais(); // Atualiza após remover
    }
}

function excluirProdutoEdicao(botaoExcluir) {
    if (!botaoExcluir) return;
    const row = botaoExcluir.closest('tr');
    if (row) {
        row.remove();
        atualizarTotaisEdicao(); // Atualiza após remover
    }
}


function atualizarTotais() {
    let valorTotalOrcamento = 0;
    const tabelaProdutosBody = document.querySelector("#tabelaProdutos tbody");
    if (!tabelaProdutosBody) return; // Verifica se o corpo da tabela existe

    const produtos = tabelaProdutosBody.querySelectorAll("tr");

    produtos.forEach(row => {
        const quantidadeInput = row.querySelector(".produto-quantidade");
        const valorUnitInput = row.querySelector(".produto-valor-unit");
        const valorTotalCell = row.cells[3]; // Assume que a 4ª célula é o valor total

        if (quantidadeInput && valorUnitInput && valorTotalCell) {
            const quantidade = parseFloat(quantidadeInput.value) || 0; // Usa 0 se inválido
            const valorUnit = converterMoedaParaNumero(valorUnitInput.value);
            const valorTotalProduto = quantidade * valorUnit;

            valorTotalCell.textContent = formatarMoeda(valorTotalProduto);
            valorTotalOrcamento += valorTotalProduto;
        }
    });

    const valorFreteInput = document.getElementById("valorFrete");
    const valorOrcamentoInput = document.getElementById("valorOrcamento");
    const totalInput = document.getElementById("total");

    if (valorFreteInput && valorOrcamentoInput && totalInput) {
        const valorFrete = converterMoedaParaNumero(valorFreteInput.value);
        const totalGeral = valorTotalOrcamento + valorFrete;

        // Usa formatarEntradaMoeda para manter o formato R$
        valorOrcamentoInput.value = ''; // Limpa antes de formatar
        formatarEntradaMoeda({ value: formatarMoeda(valorTotalOrcamento), set value(v){ valorOrcamentoInput.value = v } }); // Hackish way to use formatarEntradaMoeda
        valorOrcamentoInput.value = formatarMoeda(valorTotalOrcamento); // Define o valor formatado

        totalInput.value = ''; // Limpa antes de formatar
        formatarEntradaMoeda({ value: formatarMoeda(totalGeral), set value(v){ totalInput.value = v } }); // Hackish
        totalInput.value = formatarMoeda(totalGeral); // Define o valor formatado
    }
}


function atualizarTotaisEdicao() {
    let valorTotalProdutosEdicao = 0;
    const tabelaProdutosEdicaoBody = document.querySelector("#tabelaProdutosEdicao tbody");
    if (!tabelaProdutosEdicaoBody) return;

    const produtos = tabelaProdutosEdicaoBody.querySelectorAll("tr");

    produtos.forEach(row => {
        const quantidadeInput = row.querySelector(".produto-quantidade");
        const valorUnitInput = row.querySelector(".produto-valor-unit");
        const valorTotalCell = row.cells[3]; // Assume 4ª célula

        if (quantidadeInput && valorUnitInput && valorTotalCell) {
            const quantidade = parseFloat(quantidadeInput.value) || 0;
            const valorUnit = converterMoedaParaNumero(valorUnitInput.value);
            const valorTotalProduto = quantidade * valorUnit;

            valorTotalCell.textContent = formatarMoeda(valorTotalProduto);
            valorTotalProdutosEdicao += valorTotalProduto;
        }
    });

    const valorFreteEdicaoInput = document.getElementById("valorFreteEdicao");
    const valorPedidoEdicaoInput = document.getElementById("valorPedidoEdicao");
    const totalEdicaoInput = document.getElementById("totalEdicao");

    if (valorFreteEdicaoInput && valorPedidoEdicaoInput && totalEdicaoInput) {
        const valorFreteEdicao = converterMoedaParaNumero(valorFreteEdicaoInput.value);
        const valorPedidoEdicao = converterMoedaParaNumero(valorPedidoEdicaoInput.value); // Pega o valor do campo editável

        // O total agora é a soma do valor do pedido (que pode incluir produtos e outros custos) + frete
        const totalGeralEdicao = valorPedidoEdicao + valorFreteEdicao;

        // Atualiza o campo Valor do Pedido para refletir a soma dos produtos (se for desejado, senão remover esta linha)
        // valorPedidoEdicaoInput.value = formatarMoeda(valorTotalProdutosEdicao); // Descomente se o campo "Valor do Pedido" deve ser a soma dos produtos

        totalEdicaoInput.value = formatarMoeda(totalGeralEdicao);

        atualizarRestanteEdicao(); // Atualiza o restante sempre que os totais mudam
    }
}


function atualizarRestanteEdicao() {
    const totalEdicaoInput = document.getElementById("totalEdicao");
    const entradaEdicaoInput = document.getElementById("entradaEdicao");
    const restanteEdicaoInput = document.getElementById("restanteEdicao");

    if (totalEdicaoInput && entradaEdicaoInput && restanteEdicaoInput) {
        const total = converterMoedaParaNumero(totalEdicaoInput.value);
        const entrada = converterMoedaParaNumero(entradaEdicaoInput.value);
        // const custoMaoDeObra = converterMoedaParaNumero(document.getElementById("custoMaoDeObraEdicao").value); // Se precisar incluir
        const restante = total - entrada; // Restante = Total - Entrada

        restanteEdicaoInput.value = formatarMoeda(restante);
    }
}

function gerarNumeroFormatado(numero) {
    return numero.toString().padStart(4, '0') + '/' + anoAtual;
}

// Função para exibir/ocultar seções da aplicação principal
function mostrarPagina(idPagina) {
    const paginas = document.querySelectorAll('#appContent .pagina'); // Seleciona páginas dentro de #appContent
    paginas.forEach(pagina => {
        pagina.style.display = (pagina.id === idPagina) ? 'block' : 'none';
    });
}

/* ==== FIM SEÇÃO - FUNÇÕES AUXILIARES E DE UI ==== */


/* ==== INÍCIO SEÇÃO - AUTENTICAÇÃO FIREBASE (Integrado de login.js) ==== */

// Função para registrar usuário
async function registrarUsuario(email, password) {
    if (!authMessage) return; // Sai se elemento de mensagem não existe
    showLoading(true);
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged vai lidar com a atualização da UI
        // authMessage.textContent = 'Registro bem-sucedido. Fazendo login...';
        // authMessage.style.color = 'green';
        // Não precisa redirecionar, onAuthStateChanged cuidará disso
    } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        authMessage.textContent = `Erro ao registrar: ${error.code} - ${error.message}`;
        authMessage.style.color = 'red';
    } finally {
        showLoading(false);
    }
}

// Função para logar usuário
async function loginUsuario(email, password) {
    if (!authMessage) return;
    showLoading(true);
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged vai lidar com a atualização da UI
        // authMessage.textContent = 'Login bem-sucedido.';
        // authMessage.style.color = 'green';
        // Não precisa redirecionar
    } catch (error) {
        console.error("Erro ao fazer login:", error);
        let mensagemErro = `Erro ao fazer login: ${error.message}`;
        // Mensagens mais amigáveis para erros comuns
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            mensagemErro = 'Email ou senha inválidos.';
        } else if (error.code === 'auth/invalid-email') {
            mensagemErro = 'Formato de email inválido.';
        }
        authMessage.textContent = mensagemErro;
        authMessage.style.color = 'red';
    } finally {
        showLoading(false);
    }
}

// Função para enviar email de redefinição de senha
async function enviarEmailRedefinicaoSenha(email) {
    if (!authMessage) return;
    if (!email) {
        authMessage.textContent = "Por favor, digite seu email para redefinir a senha.";
        authMessage.style.color = 'red';
        return;
    }
    showLoading(true);
    try {
        await sendPasswordResetEmail(auth, email);
        authMessage.textContent = 'Email de redefinição de senha enviado para ' + email;
        authMessage.style.color = 'blue';
    } catch (error) {
        console.error("Erro ao enviar email de redefinição:", error);
        let mensagemErro = `Erro: ${error.message}`;
        if (error.code === 'auth/user-not-found') {
             mensagemErro = 'Nenhum usuário encontrado com este email.';
        } else if (error.code === 'auth/invalid-email') {
            mensagemErro = 'Formato de email inválido.';
        }
        authMessage.textContent = mensagemErro;
        authMessage.style.color = 'red';
    } finally {
        showLoading(false);
    }
}

// Função de Logout (chamada pelo botão #btnLogout)
async function fazerLogout() {
    try {
        await signOut(auth);
        // onAuthStateChanged vai lidar com a atualização da UI (mostrarTelaLogin)
        console.log("Usuário desconectado.");
    } catch (error) {
        console.error("Erro ao sair:", error);
        alert("Erro ao fazer logout. Veja o console."); // Feedback para o usuário
    }
}

/* ==== FIM SEÇÃO - AUTENTICAÇÃO FIREBASE ==== */


/* ==== INÍCIO SEÇÃO - LÓGICA DA APLICAÇÃO (Firestore CRUD, etc.) ==== */

// Carregar dados do Firebase (APENAS se autenticado)
async function carregarDados() {
    if (!usuarioAtual) {
        console.log("Carregar dados: Nenhum usuário logado.");
        orcamentos = []; // Limpa dados locais
        pedidos = [];
        numeroOrcamento = 1; // Reseta contadores
        numeroPedido = 1;
        mostrarOrcamentosGerados(); // Atualiza tabelas (vazias)
        mostrarPedidosRealizados();
        return; // Sai se não houver usuário
    }

    console.log("Carregando dados para o usuário:", usuarioAtual.uid); // Opcional: logar ID do usuário
    showLoading(true); // Mostra loading da aplicação (se houver um indicador geral)

    try {
        orcamentos = [];
        pedidos = [];
        // Adicionar filtro por usuário se necessário no futuro:
        // const q = query(orcamentosPedidosRef, where("userId", "==", usuarioAtual.uid), orderBy("numero"));
        const q = query(orcamentosPedidosRef, orderBy("numero")); // Ordena por número
        const snapshot = await getDocs(q);

        let maxOrcNum = 0;
        let maxPedNum = 0;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id; // Adiciona o ID do documento aos dados

            const [numStr, anoStr] = (data.numero || "0/0").split('/'); // Trata caso numero não exista
            const num = parseInt(numStr) || 0;

            if (data.tipo === 'orcamento') {
                orcamentos.push(data);
                if (num > maxOrcNum) maxOrcNum = num;
            } else if (data.tipo === 'pedido') {
                pedidos.push(data);
                if (num > maxPedNum) maxPedNum = num;
            }
        });

        numeroOrcamento = maxOrcNum + 1; // Define o próximo número baseado no máximo encontrado
        numeroPedido = maxPedNum + 1;

        console.log("Dados carregados:", { orcamentos, pedidos, proximoOrcamento: numeroOrcamento, proximoPedido: numeroPedido });
        mostrarOrcamentosGerados(); // Atualiza a UI com os dados carregados
        mostrarPedidosRealizados();

    } catch (error) {
        console.error("Erro ao carregar dados do Firebase:", error);
        alert("Erro ao carregar dados do Firebase. Verifique sua conexão e tente recarregar a página.");
    } finally {
        showLoading(false); // Esconde loading da aplicação
    }
}

// Salvar dados no Firebase (Orçamento ou Pedido)
async function salvarDados(dados, tipo) {
    if (!usuarioAtual) {
        alert("Você precisa estar autenticado para salvar dados.");
        return null; // Retorna null para indicar falha
    }

    const dadosParaSalvar = {
        ...dados,
        tipo: tipo, // Garante que o tipo está definido
        // userId: usuarioAtual.uid, // Adiciona o ID do usuário aos dados (IMPORTANTE para segurança/filtros futuros)
        timestamp: new Date() // Adiciona um timestamp para ordenação ou referência
    };

    showLoading(true);
    try {
        let docRef;
        if (dados.id) {
            // Atualizando documento existente
            docRef = doc(orcamentosPedidosRef, dados.id);
            await setDoc(docRef, dadosParaSalvar, { merge: true }); // Usa merge para não sobrescrever campos não enviados
            console.log(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} atualizado com ID:`, dados.id);
            return dados.id; // Retorna o ID existente
        } else {
            // Adicionando novo documento
            const addedDoc = await addDoc(orcamentosPedidosRef, dadosParaSalvar);
            console.log(`Novo ${tipo} salvo com ID:`, addedDoc.id);
            return addedDoc.id; // Retorna o ID do novo documento
        }
    } catch (error) {
        console.error(`Erro ao salvar ${tipo} no Firebase:`, error);
        alert(`Erro ao salvar ${tipo}. Verifique o console para detalhes.`);
        return null; // Retorna null em caso de erro
    } finally {
        showLoading(false);
    }
}

// Gerar Orçamento
async function gerarOrcamento() {
    if (orcamentoEditando !== null) {
        alert("Você está editando um orçamento. Clique em 'Atualizar Orçamento'.");
        return;
    }

    const dataOrcamento = document.getElementById("dataOrcamento")?.value;
    const dataValidade = document.getElementById("dataValidade")?.value;
    if (!dataOrcamento || !dataValidade) {
        alert("Por favor, preencha as datas do orçamento e validade.");
        return;
    }

    const orcamento = {
        // id: null, // ID será gerado pelo Firebase ou definido na atualização
        numero: gerarNumeroFormatado(numeroOrcamento),
        dataOrcamento: dataOrcamento,
        dataValidade: dataValidade,
        cliente: document.getElementById("cliente")?.value || '',
        endereco: document.getElementById("endereco")?.value || '',
        tema: document.getElementById("tema")?.value || '',
        cidade: document.getElementById("cidade")?.value || '',
        telefone: document.getElementById("telefone")?.value || '',
        email: document.getElementById("clienteEmail")?.value || '',
        cores: document.getElementById("cores")?.value || '',
        produtos: [],
        pagamento: Array.from(document.querySelectorAll('input[name="pagamento"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFrete")?.value),
        valorOrcamento: converterMoedaParaNumero(document.getElementById("valorOrcamento")?.value),
        total: converterMoedaParaNumero(document.getElementById("total")?.value),
        observacoes: document.getElementById("observacoes")?.value || '',
        pedidoGerado: false,
        numeroPedido: null
        // tipo: 'orcamento' // Definido em salvarDados
    };

    const produtosRows = document.querySelectorAll("#tabelaProdutos tbody tr");
    produtosRows.forEach(row => {
        const quantidade = parseFloat(row.querySelector(".produto-quantidade")?.value) || 0;
        const descricao = row.querySelector(".produto-descricao")?.value || '';
        const valorUnit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit")?.value);
        // Calcula valorTotal aqui para consistência
        const valorTotal = quantidade * valorUnit;
        if (quantidade > 0 && descricao) { // Adiciona apenas se tiver quantidade e descrição
             orcamento.produtos.push({
                quantidade: quantidade,
                descricao: descricao,
                valorUnit: valorUnit,
                valorTotal: valorTotal // Salva o valor total calculado
            });
        }
    });

    if (orcamento.produtos.length === 0) {
        alert("Adicione pelo menos um produto ao orçamento.");
        return;
    }

    const orcamentoId = await salvarDados(orcamento, 'orcamento');

    if (orcamentoId) {
        orcamento.id = orcamentoId; // Atualiza o objeto local com o ID
        numeroOrcamento++; // Incrementa SOMENTE em caso de sucesso
        orcamentos.push(orcamento); // Adiciona ao array local

        document.getElementById("orcamento")?.reset(); // Limpa o formulário
        limparCamposMoeda(); // Reseta campos de moeda
        const tabelaProdutosBody = document.querySelector("#tabelaProdutos tbody");
        if (tabelaProdutosBody) tabelaProdutosBody.innerHTML = ""; // Limpa tabela de produtos

        alert("Orçamento gerado com sucesso!");
        mostrarPagina('orcamentos-gerados');
        mostrarOrcamentosGerados(); // Atualiza a lista exibida
        exibirOrcamentoEmHTML(orcamento); // Mostra a pré-visualização
    }
}

// Exibir Orçamento em Nova Janela (HTML)
function exibirOrcamentoEmHTML(orcamento) {
    if (!orcamento) {
        console.error("exibirOrcamentoEmHTML: Orçamento inválido.");
        return;
    }
    console.log("Exibindo orçamento:", orcamento);
    const janelaOrcamento = window.open('./orcamento.html', '_blank'); // Usa caminho relativo

    if (!janelaOrcamento) {
        alert("Não foi possível abrir a janela de visualização do orçamento. Verifique as permissões de pop-up do seu navegador.");
        return;
    }

    janelaOrcamento.onload = () => { // Usa onload em vez de addEventListener('load')
        console.log("orcamento.html carregado.");
        const conteudoOrcamentoDiv = janelaOrcamento.document.getElementById("conteudo-orcamento");

        if (!conteudoOrcamentoDiv) {
            console.error("Elemento #conteudo-orcamento não encontrado em orcamento.html");
            janelaOrcamento.close(); // Fecha a janela se o elemento não for encontrado
            return;
        }

        // Formata datas (ex: DD/MM/AAAA)
        const formatDate = (dateString) => {
            if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'N/A'; // Validação básica
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        }
        const dataOrcamentoFormatada = formatDate(orcamento.dataOrcamento);
        const dataValidadeFormatada = formatDate(orcamento.dataValidade);

        const pagamentoFormatado = (orcamento.pagamento || []).map(pag => { // Trata caso pagamento seja undefined
            const map = { 'pix': 'PIX', 'dinheiro': 'Dinheiro', 'cartaoCredito': 'Cartão de Crédito', 'cartaoDebito': 'Cartão de Débito' };
            return map[pag] || pag;
        }).join(', ') || 'Não especificado';

        let html = `
            <h2>Orçamento Nº ${orcamento.numero || 'N/A'}</h2>
            <div class="info-orcamento">
                <strong>Data do Orçamento:</strong> ${dataOrcamentoFormatada}<br>
                <strong>Data de Validade:</strong> ${dataValidadeFormatada}<br>
                <strong>Cliente:</strong> ${orcamento.cliente || 'Não informado'}<br>
                <strong>Endereço:</strong> ${orcamento.endereco || 'Não informado'}<br>
                <strong>Cidade:</strong> ${orcamento.cidade || 'Não informada'}<br>
                <strong>Telefone:</strong> ${orcamento.telefone || 'Não informado'}<br>
                <strong>E-mail:</strong> ${orcamento.email || 'Não informado'}<br>
                ${orcamento.tema ? `<strong>Tema:</strong> ${orcamento.tema}<br>` : ''}
                ${orcamento.cores ? `<strong>Cores:</strong> ${orcamento.cores}<br>` : ''}
            </div>
            <h3>Produtos</h3>
            <table>
                <thead>
                    <tr>
                        <th>Qtde</th> <!-- Abreviado -->
                        <th>Descrição do Produto</th>
                        <th>Valor Unit.</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>`;

        (orcamento.produtos || []).forEach(produto => {
            html += `
                <tr>
                    <td style="text-align:center;">${produto.quantidade || 0}</td> <!-- Centraliza quantidade -->
                    <td>${produto.descricao || 'Sem descrição'}</td>
                    <td>${formatarMoeda(produto.valorUnit)}</td>
                    <td>${formatarMoeda(produto.valorTotal)}</td>
                </tr>`;
        });
         if (orcamento.produtos.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center;">Nenhum produto adicionado.</td></tr>`;
        }

        html += `
                </tbody>
            </table>
            <div class="espaco-tabela" style="height: 15px;"></div> <!-- Espaço menor -->
            <div class="info-orcamento">
                <strong>Pagamento:</strong> ${pagamentoFormatado}<br>
                <strong>Valor do Frete:</strong> ${formatarMoeda(orcamento.valorFrete)}<br>
                <strong style="color: var(--cor-principal);">Valor do Orçamento:</strong> ${formatarMoeda(orcamento.valorOrcamento)}<br> <!-- Destaca valor -->
                <strong style="color: var(--cor-principal); font-size: 1.1em;">Total:</strong> ${formatarMoeda(orcamento.total)}<br> <!-- Destaca total -->
                ${orcamento.observacoes ? `<strong>Observações:</strong><br><pre style="white-space: pre-wrap; font-family: inherit;">${orcamento.observacoes}</pre>` : ''} <!-- Usa <pre> para manter quebras de linha -->
            </div>
        `;

        conteudoOrcamentoDiv.innerHTML = html;
        console.log("Conteúdo do orçamento inserido em orcamento.html.");
        // Opcional: focar e imprimir
        // janelaOrcamento.focus();
        // janelaOrcamento.print();
    };

     janelaOrcamento.onerror = (err) => {
         console.error("Erro ao carregar orcamento.html:", err);
         alert("Ocorreu um erro ao tentar abrir a visualização do orçamento.");
     };
}

// Mostrar Orçamentos Gerados na Tabela
function mostrarOrcamentosGerados() {
    const tbody = document.querySelector("#tabela-orcamentos tbody");
    if (!tbody) return;
    tbody.innerHTML = ''; // Limpa a tabela

    // Ordena orçamentos pelo número (decrescente, mais recentes primeiro)
    const orcamentosOrdenados = [...orcamentos].sort((a, b) => {
        const numA = parseInt((a.numero || "0").split('/')[0]);
        const numB = parseInt((b.numero || "0").split('/')[0]);
        return numB - numA; // Decrescente
    });


    if (orcamentosOrdenados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum orçamento encontrado.</td></tr>';
        return;
    }

    orcamentosOrdenados.forEach(orcamento => {
        const row = tbody.insertRow();
        row.dataset.orcamentoId = orcamento.id; // Adiciona ID à linha para fácil acesso

        const cellNumero = row.insertCell();
        const cellData = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellNumeroPedido = row.insertCell();
        const cellAcoes = row.insertCell();

        // Formata data DD/MM/AAAA
        const formatDate = (dateString) => {
            if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'N/A';
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        }

        cellNumero.textContent = orcamento.numero || 'N/A';
        cellData.textContent = formatDate(orcamento.dataOrcamento);
        cellCliente.textContent = orcamento.cliente || 'Não informado';
        cellTotal.textContent = formatarMoeda(orcamento.total);
        cellNumeroPedido.textContent = orcamento.numeroPedido || '---'; // Mais claro que N/A
        cellNumeroPedido.style.textAlign = 'center';
        cellTotal.style.textAlign = 'right'; // Alinha valor à direita

        // Botões de Ação
        cellAcoes.style.textAlign = 'center'; // Centraliza botões
        cellAcoes.innerHTML = `
            <button type="button" class="btnVisualizarOrcamento" title="Visualizar Orçamento">👁️</button>
            ${!orcamento.pedidoGerado ? `
            <button type="button" class="btnEditarOrcamento" title="Editar Orçamento">✏️</button>
            <button type="button" class="btnGerarPedido" title="Gerar Pedido a partir deste Orçamento">🛒</button>
            ` : `
            <span title="Pedido já gerado" style="cursor: default; opacity: 0.5;">🛒</span>
            `}
        `;
    });
    // Event listeners são adicionados dinamicamente no final do arquivo ou via delegação
}

// Filtrar Orçamentos
function filtrarOrcamentos() {
    const dataInicio = document.getElementById('filtroDataInicioOrcamento')?.value;
    const dataFim = document.getElementById('filtroDataFimOrcamento')?.value;
    const numeroFiltro = document.getElementById('filtroNumeroOrcamento')?.value;
    const anoFiltro = document.getElementById('filtroAnoOrcamento')?.value;
    const clienteFiltro = document.getElementById('filtroClienteOrcamento')?.value.toLowerCase();

    const orcamentosFiltrados = orcamentos.filter(orcamento => {
        const [numOrcStr, anoOrcStr] = (orcamento.numero || "0/0").split('/');
        const numOrc = parseInt(numOrcStr);
        const anoOrc = parseInt(anoOrcStr);
        const dataOrc = orcamento.dataOrcamento; // Formato YYYY-MM-DD
        const nomeCliente = (orcamento.cliente || '').toLowerCase();

        const checkData = (!dataInicio || dataOrc >= dataInicio) && (!dataFim || dataOrc <= dataFim);
        const checkNum = !numeroFiltro || numOrc === parseInt(numeroFiltro);
        const checkAno = !anoFiltro || anoOrc === parseInt(anoFiltro);
        const checkCliente = !clienteFiltro || nomeCliente.includes(clienteFiltro);

        return checkData && checkNum && checkAno && checkCliente;
    });

    atualizarListaOrcamentosFiltrados(orcamentosFiltrados); // Chama função para redesenhar a tabela
}

// Atualizar Tabela de Orçamentos com Dados Filtrados
function atualizarListaOrcamentosFiltrados(orcamentosFiltrados) {
    const tbody = document.querySelector("#tabela-orcamentos tbody");
    if (!tbody) return;
    tbody.innerHTML = ''; // Limpa a tabela

     if (orcamentosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum orçamento encontrado com os filtros aplicados.</td></tr>';
        return;
    }

    // Ordena filtrados por número decrescente
    orcamentosFiltrados.sort((a, b) => {
        const numA = parseInt((a.numero || "0").split('/')[0]);
        const numB = parseInt((b.numero || "0").split('/')[0]);
        return numB - numA;
    });

    orcamentosFiltrados.forEach(orcamento => {
         const row = tbody.insertRow();
        row.dataset.orcamentoId = orcamento.id; // Adiciona ID à linha

        const cellNumero = row.insertCell();
        const cellData = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellNumeroPedido = row.insertCell();
        const cellAcoes = row.insertCell();

        const formatDate = (dateString) => {
            if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'N/A';
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        }

        cellNumero.textContent = orcamento.numero || 'N/A';
        cellData.textContent = formatDate(orcamento.dataOrcamento);
        cellCliente.textContent = orcamento.cliente || 'Não informado';
        cellTotal.textContent = formatarMoeda(orcamento.total);
        cellNumeroPedido.textContent = orcamento.numeroPedido || '---';
        cellNumeroPedido.style.textAlign = 'center';
        cellTotal.style.textAlign = 'right';

        cellAcoes.style.textAlign = 'center';
        cellAcoes.innerHTML = `
            <button type="button" class="btnVisualizarOrcamento" title="Visualizar Orçamento">👁️</button>
            ${!orcamento.pedidoGerado ? `
            <button type="button" class="btnEditarOrcamento" title="Editar Orçamento">✏️</button>
            <button type="button" class="btnGerarPedido" title="Gerar Pedido a partir deste Orçamento">🛒</button>
            ` : `
            <span title="Pedido já gerado" style="cursor: default; opacity: 0.5;">🛒</span>
            `}
        `;
    });
}

// Editar Orçamento (Preencher formulário)
function editarOrcamento(orcamentoId) {
    const orcamento = orcamentos.find(o => o.id === orcamentoId);
    if (!orcamento) {
        alert("Orçamento não encontrado para edição.");
        return;
    }

    if (orcamento.pedidoGerado) {
        alert("Não é possível editar um orçamento que já virou pedido.");
        return;
    }

    orcamentoEditando = orcamento.id; // Define o ID do orçamento sendo editado

    // Preenche os campos do formulário principal
    document.getElementById("dataOrcamento").value = orcamento.dataOrcamento || '';
    document.getElementById("dataValidade").value = orcamento.dataValidade || '';
    document.getElementById("cliente").value = orcamento.cliente || '';
    document.getElementById("endereco").value = orcamento.endereco || '';
    document.getElementById("tema").value = orcamento.tema || '';
    document.getElementById("cidade").value = orcamento.cidade || '';
    document.getElementById("telefone").value = orcamento.telefone || '';
    document.getElementById("clienteEmail").value = orcamento.email || '';
    document.getElementById("cores").value = orcamento.cores || '';
    document.getElementById("observacoes").value = orcamento.observacoes || '';

    // Preenche campos de moeda formatando
    document.getElementById("valorFrete").value = formatarMoeda(orcamento.valorFrete);
    document.getElementById("valorOrcamento").value = formatarMoeda(orcamento.valorOrcamento);
    document.getElementById("total").value = formatarMoeda(orcamento.total);

    // Preenche checkboxes de pagamento
    document.querySelectorAll('input[name="pagamento"]').forEach(el => {
        el.checked = (orcamento.pagamento || []).includes(el.value);
    });

    // Preenche a tabela de produtos
    const tbody = document.querySelector("#tabelaProdutos tbody");
    if (!tbody) return;
    tbody.innerHTML = ''; // Limpa tabela antes de preencher
    (orcamento.produtos || []).forEach(produto => {
        const newRow = tbody.insertRow();
        newRow.insertCell().innerHTML = `<input type="number" class="produto-quantidade" value="${produto.quantidade || 1}" min="1">`;
        newRow.insertCell().innerHTML = `<input type="text" class="produto-descricao" value="${produto.descricao || ''}">`;
        newRow.insertCell().innerHTML = `<input type="text" class="produto-valor-unit" value="${formatarMoeda(produto.valorUnit)}">`;
        newRow.insertCell().textContent = formatarMoeda(produto.valorTotal); // Usa valor total já calculado
        newRow.insertCell().innerHTML = '<button type="button" class="btnExcluirProduto">Excluir</button>'; // Usa classe
    });

    // Ajusta visibilidade dos botões e mostra a página do formulário
    mostrarPagina('form-orcamento');
    document.getElementById("btnGerarOrcamento").style.display = "none";
    document.getElementById("btnAtualizarOrcamento").style.display = "inline-block";
    window.scrollTo(0, 0); // Rola para o topo
}

// Atualizar Orçamento
async function atualizarOrcamento() {
    if (orcamentoEditando === null) {
        alert("Nenhum orçamento selecionado para atualizar.");
        return;
    }

    const orcamentoIndex = orcamentos.findIndex(o => o.id === orcamentoEditando);
    if (orcamentoIndex === -1) {
        alert("Orçamento não encontrado nos dados locais.");
        orcamentoEditando = null; // Reseta estado de edição
        // Opcional: voltar para a lista ou recarregar dados
        return;
    }

    // Coleta os dados atualizados do formulário
      const orcamentoAtualizado = {
        id: orcamentoEditando, // Mantém o ID original
        numero: orcamentos[orcamentoIndex].numero, // Mantém o número original
        dataOrcamento: document.getElementById("dataOrcamento")?.value,
        dataValidade: document.getElementById("dataValidade")?.value,
        cliente: document.getElementById("cliente")?.value || '',
        endereco: document.getElementById("endereco")?.value || '',
        tema: document.getElementById("tema")?.value || '',
        cidade: document.getElementById("cidade")?.value || '',
        telefone: document.getElementById("telefone")?.value || '',
        email: document.getElementById("clienteEmail")?.value || '',
        cores: document.getElementById("cores")?.value || '',
        produtos: [],
        pagamento: Array.from(document.querySelectorAll('input[name="pagamento"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFrete")?.value),
        valorOrcamento: converterMoedaParaNumero(document.getElementById("valorOrcamento")?.value),
        total: converterMoedaParaNumero(document.getElementById("total")?.value),
        observacoes: document.getElementById("observacoes")?.value || '',
        pedidoGerado: orcamentos[orcamentoIndex].pedidoGerado, // Mantém status
        numeroPedido: orcamentos[orcamentoIndex].numeroPedido // Mantém número do pedido se existir
        // tipo: 'orcamento' // Definido em salvarDados
    };

    const produtosRows = document.querySelectorAll("#tabelaProdutos tbody tr");
    produtosRows.forEach(row => {
         const quantidade = parseFloat(row.querySelector(".produto-quantidade")?.value) || 0;
        const descricao = row.querySelector(".produto-descricao")?.value || '';
        const valorUnit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit")?.value);
        const valorTotal = quantidade * valorUnit;
         if (quantidade > 0 && descricao) {
             orcamentoAtualizado.produtos.push({
                quantidade: quantidade,
                descricao: descricao,
                valorUnit: valorUnit,
                valorTotal: valorTotal
            });
        }
    });

     if (orcamentoAtualizado.produtos.length === 0) {
        alert("O orçamento deve ter pelo menos um produto.");
        return;
    }

    // Salva no Firebase
    const sucesso = await salvarDados(orcamentoAtualizado, 'orcamento');

    if (sucesso) {
        orcamentos[orcamentoIndex] = orcamentoAtualizado; // Atualiza no array local

        // Limpa formulário e reseta estado
        document.getElementById("orcamento")?.reset();
        limparCamposMoeda();
        const tabelaProdutosBody = document.querySelector("#tabelaProdutos tbody");
        if (tabelaProdutosBody) tabelaProdutosBody.innerHTML = "";
        orcamentoEditando = null;
        document.getElementById("btnGerarOrcamento").style.display = "inline-block";
        document.getElementById("btnAtualizarOrcamento").style.display = "none";

        alert("Orçamento atualizado com sucesso!");
        mostrarPagina('orcamentos-gerados');
        mostrarOrcamentosGerados(); // Atualiza a lista
    } else {
        alert("Falha ao atualizar o orçamento. Verifique o console.");
    }
}

// Gerar Pedido a partir de um Orçamento
async function gerarPedido(orcamentoId) {
    const orcamentoOrigem = orcamentos.find(o => o.id === orcamentoId);
    if (!orcamentoOrigem) {
        alert("Orçamento de origem não encontrado.");
        return;
    }

    if (orcamentoOrigem.pedidoGerado) {
        alert(`Este orçamento (Nº ${orcamentoOrigem.numero}) já gerou o pedido Nº ${orcamentoOrigem.numeroPedido || '?'}.`);
        return;
    }

    // Cria o objeto do pedido baseado no orçamento
    const pedido = {
        // id: null // Gerado pelo Firebase
        numero: gerarNumeroFormatado(numeroPedido),
        dataPedido: new Date().toISOString().split('T')[0], // Data atual YYYY-MM-DD
        dataEntrega: orcamentoOrigem.dataValidade || '', // Usa validade como entrega inicial
        cliente: orcamentoOrigem.cliente,
        endereco: orcamentoOrigem.endereco,
        tema: orcamentoOrigem.tema,
        cidade: orcamentoOrigem.cidade,
        telefone: orcamentoOrigem.telefone,
        email: orcamentoOrigem.email,
        cores: orcamentoOrigem.cores,
        pagamento: orcamentoOrigem.pagamento,
        valorFrete: orcamentoOrigem.valorFrete,
        valorPedido: orcamentoOrigem.valorOrcamento, // Valor do pedido = valor do orçamento inicial
        total: orcamentoOrigem.total, // Total inicial igual ao do orçamento
        observacoes: orcamentoOrigem.observacoes,
        entrada: 0, // Entrada inicial zero
        restante: orcamentoOrigem.total, // Restante inicial é o total
        margemLucro: 0, // Valores zerados, a serem preenchidos na edição do pedido
        custoMaoDeObra: 0,
        produtos: (orcamentoOrigem.produtos || []).map(p => ({ ...p })), // Copia profunda dos produtos
        orcamentoOrigemId: orcamentoOrigem.id, // Guarda referência ao ID do orçamento
        orcamentoOrigemNumero: orcamentoOrigem.numero // Guarda referência ao número do orçamento
        // tipo: 'pedido' // Definido em salvarDados
    };

    // Salva o novo pedido
    const pedidoId = await salvarDados(pedido, 'pedido');

    if (pedidoId) {
        pedido.id = pedidoId; // Atualiza objeto local com ID
        numeroPedido++; // Incrementa contador de pedido
        pedidos.push(pedido); // Adiciona ao array local

        // Atualiza o orçamento original marcando como gerado e salvando
        orcamentoOrigem.pedidoGerado = true;
        orcamentoOrigem.numeroPedido = pedido.numero;
        await salvarDados(orcamentoOrigem, 'orcamento'); // Salva a atualização no orçamento

        alert(`Pedido Nº ${pedido.numero} gerado com sucesso a partir do orçamento Nº ${orcamentoOrigem.numero}!`);
        mostrarPagina('lista-pedidos');
        mostrarPedidosRealizados(); // Atualiza lista de pedidos
        mostrarOrcamentosGerados(); // Atualiza lista de orçamentos (mostra o número do pedido)
    } else {
         alert("Falha ao gerar o pedido. Verifique o console.");
    }
}

// Mostrar Pedidos Realizados na Tabela
function mostrarPedidosRealizados() {
    const tbody = document.querySelector("#tabela-pedidos tbody");
    if (!tbody) return;
    tbody.innerHTML = ''; // Limpa

    // Ordena pedidos por número decrescente
    const pedidosOrdenados = [...pedidos].sort((a, b) => {
        const numA = parseInt((a.numero || "0").split('/')[0]);
        const numB = parseInt((b.numero || "0").split('/')[0]);
        return numB - numA;
    });

    if (pedidosOrdenados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum pedido encontrado.</td></tr>';
        return;
    }

    pedidosOrdenados.forEach(pedido => {
        const row = tbody.insertRow();
        row.dataset.pedidoId = pedido.id; // ID na linha

        const cellNumero = row.insertCell();
        const cellDataPedido = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        const formatDate = (dateString) => {
             if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'N/A';
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        }

        cellNumero.textContent = pedido.numero || 'N/A';
        cellDataPedido.textContent = formatDate(pedido.dataPedido);
        cellCliente.textContent = pedido.cliente || 'Não informado';
        cellTotal.textContent = formatarMoeda(pedido.total);
        cellTotal.style.textAlign = 'right';

        cellAcoes.style.textAlign = 'center';
        cellAcoes.innerHTML = `<button type="button" class="btnEditarPedido" title="Editar Pedido">✏️</button>`;
        // Adicionar botão de visualizar pedido se necessário no futuro
        // cellAcoes.innerHTML += `<button type="button" class="btnVisualizarPedido" title="Visualizar Pedido">👁️</button>`;
    });
     // Listeners adicionados via delegação
}

// Filtrar Pedidos
function filtrarPedidos() {
    const dataInicio = document.getElementById('filtroDataInicioPedido')?.value;
    const dataFim = document.getElementById('filtroDataFimPedido')?.value;
    const numeroFiltro = document.getElementById('filtroNumeroPedido')?.value;
    const anoFiltro = document.getElementById('filtroAnoPedido')?.value;
    const clienteFiltro = document.getElementById('filtroClientePedido')?.value.toLowerCase();

     const pedidosFiltrados = pedidos.filter(pedido => {
        const [numPedStr, anoPedStr] = (pedido.numero || "0/0").split('/');
        const numPed = parseInt(numPedStr);
        const anoPed = parseInt(anoPedStr);
        const dataPed = pedido.dataPedido;
        const nomeCliente = (pedido.cliente || '').toLowerCase();

        const checkData = (!dataInicio || dataPed >= dataInicio) && (!dataFim || dataPed <= dataFim);
        const checkNum = !numeroFiltro || numPed === parseInt(numeroFiltro);
        const checkAno = !anoFiltro || anoPed === parseInt(anoFiltro);
        const checkCliente = !clienteFiltro || nomeCliente.includes(clienteFiltro);

        return checkData && checkNum && checkAno && checkCliente;
    });

    atualizarListaPedidosFiltrados(pedidosFiltrados);
}

// Atualizar Tabela de Pedidos com Dados Filtrados
function atualizarListaPedidosFiltrados(pedidosFiltrados) {
     const tbody = document.querySelector("#tabela-pedidos tbody");
    if (!tbody) return;
    tbody.innerHTML = '';

    if (pedidosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum pedido encontrado com os filtros aplicados.</td></tr>';
        return;
    }

    // Ordena filtrados por número decrescente
    pedidosFiltrados.sort((a, b) => {
        const numA = parseInt((a.numero || "0").split('/')[0]);
        const numB = parseInt((b.numero || "0").split('/')[0]);
        return numB - numA;
    });

    pedidosFiltrados.forEach(pedido => {
        const row = tbody.insertRow();
        row.dataset.pedidoId = pedido.id;

        const cellNumero = row.insertCell();
        const cellDataPedido = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellAcoes = row.insertCell();

         const formatDate = (dateString) => {
             if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'N/A';
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        }

        cellNumero.textContent = pedido.numero || 'N/A';
        cellDataPedido.textContent = formatDate(pedido.dataPedido);
        cellCliente.textContent = pedido.cliente || 'Não informado';
        cellTotal.textContent = formatarMoeda(pedido.total);
        cellTotal.style.textAlign = 'right';

        cellAcoes.style.textAlign = 'center';
        cellAcoes.innerHTML = `<button type="button" class="btnEditarPedido" title="Editar Pedido">✏️</button>`;
    });
}

// Editar Pedido (Preencher Formulário de Edição)
function editarPedido(pedidoId) {
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) {
        alert("Pedido não encontrado para edição.");
        return;
    }

    pedidoEditando = pedido.id; // Define o ID do pedido sendo editado

    // Preenche campos do formulário de edição
    document.getElementById("dataPedidoEdicao").value = pedido.dataPedido || '';
    document.getElementById("dataEntregaEdicao").value = pedido.dataEntrega || '';
    document.getElementById("clienteEdicao").value = pedido.cliente || '';
    document.getElementById("enderecoEdicao").value = pedido.endereco || '';
    document.getElementById("temaEdicao").value = pedido.tema || '';
    document.getElementById("cidadeEdicao").value = pedido.cidade || '';
    document.getElementById("contatoEdicao").value = pedido.telefone || ''; // Usa 'telefone' do pedido
    document.getElementById("coresEdicao").value = pedido.cores || '';
    document.getElementById("observacoesEdicao").value = pedido.observacoes || '';

    // Preenche campos de moeda formatando
    document.getElementById("valorFreteEdicao").value = formatarMoeda(pedido.valorFrete);
    document.getElementById("valorPedidoEdicao").value = formatarMoeda(pedido.valorPedido); // Valor editável do pedido
    document.getElementById("totalEdicao").value = formatarMoeda(pedido.total); // Total calculado
    document.getElementById("entradaEdicao").value = formatarMoeda(pedido.entrada);
    document.getElementById("restanteEdicao").value = formatarMoeda(pedido.restante); // Restante calculado
    document.getElementById("margemLucroEdicao").value = formatarMoeda(pedido.margemLucro);
    document.getElementById("custoMaoDeObraEdicao").value = formatarMoeda(pedido.custoMaoDeObra);

    // Preenche checkboxes de pagamento
    document.querySelectorAll('input[name="pagamentoEdicao"]').forEach(el => {
        el.checked = (pedido.pagamento || []).includes(el.value);
    });

    // Preenche a tabela de produtos da edição
    const tbodyEdicao = document.querySelector("#tabelaProdutosEdicao tbody");
     if (!tbodyEdicao) return;
    tbodyEdicao.innerHTML = ''; // Limpa
    (pedido.produtos || []).forEach(produto => {
        const newRow = tbodyEdicao.insertRow();
        newRow.insertCell().innerHTML = `<input type="number" class="produto-quantidade" value="${produto.quantidade || 1}" min="1">`;
        newRow.insertCell().innerHTML = `<input type="text" class="produto-descricao" value="${produto.descricao || ''}">`;
        newRow.insertCell().innerHTML = `<input type="text" class="produto-valor-unit" value="${formatarMoeda(produto.valorUnit)}">`;
        newRow.insertCell().textContent = formatarMoeda(produto.valorTotal);
        newRow.insertCell().innerHTML = '<button type="button" class="btnExcluirProdutoEdicao">Excluir</button>'; // Usa classe
    });

    // Mostra a página de edição e rola para o topo
    mostrarPagina('form-edicao-pedido');
    window.scrollTo(0, 0);
}

// Atualizar Pedido
async function atualizarPedido() {
    if (pedidoEditando === null) {
        alert("Nenhum pedido selecionado para atualizar.");
        return;
    }

    const pedidoIndex = pedidos.findIndex(p => p.id === pedidoEditando);
    if (pedidoIndex === -1) {
        alert("Pedido não encontrado nos dados locais.");
        pedidoEditando = null; // Reseta estado
        return;
    }

    // Coleta dados atualizados do formulário de edição
     const pedidoAtualizado = {
        id: pedidoEditando, // Mantém ID
        numero: pedidos[pedidoIndex].numero, // Mantém número
        orcamentoOrigemId: pedidos[pedidoIndex].orcamentoOrigemId, // Mantém ref orçamento
        orcamentoOrigemNumero: pedidos[pedidoIndex].orcamentoOrigemNumero, // Mantém ref orçamento
        dataPedido: document.getElementById("dataPedidoEdicao")?.value,
        dataEntrega: document.getElementById("dataEntregaEdicao")?.value,
        cliente: document.getElementById("clienteEdicao")?.value || '',
        endereco: document.getElementById("enderecoEdicao")?.value || '',
        tema: document.getElementById("temaEdicao")?.value || '',
        cidade: document.getElementById("cidadeEdicao")?.value || '',
        telefone: document.getElementById("contatoEdicao")?.value || '', // Campo 'contato' vira 'telefone'
        // email: ??? // Adicionar campo de email na edição se necessário
        cores: document.getElementById("coresEdicao")?.value || '',
        produtos: [],
        pagamento: Array.from(document.querySelectorAll('input[name="pagamentoEdicao"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFreteEdicao")?.value),
        valorPedido: converterMoedaParaNumero(document.getElementById("valorPedidoEdicao")?.value), // Valor editável
        total: converterMoedaParaNumero(document.getElementById("totalEdicao")?.value), // Total calculado
        entrada: converterMoedaParaNumero(document.getElementById("entradaEdicao")?.value),
        restante: converterMoedaParaNumero(document.getElementById("restanteEdicao")?.value), // Restante calculado
        margemLucro: converterMoedaParaNumero(document.getElementById("margemLucroEdicao")?.value),
        custoMaoDeObra: converterMoedaParaNumero(document.getElementById("custoMaoDeObraEdicao")?.value),
        observacoes: document.getElementById("observacoesEdicao")?.value || ''
        // tipo: 'pedido' // Definido em salvarDados
    };

    const produtosRowsEdicao = document.querySelectorAll("#tabelaProdutosEdicao tbody tr");
    produtosRowsEdicao.forEach(row => {
         const quantidade = parseFloat(row.querySelector(".produto-quantidade")?.value) || 0;
        const descricao = row.querySelector(".produto-descricao")?.value || '';
        const valorUnit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit")?.value);
        const valorTotal = quantidade * valorUnit;
         if (quantidade > 0 && descricao) {
             pedidoAtualizado.produtos.push({
                quantidade: quantidade,
                descricao: descricao,
                valorUnit: valorUnit,
                valorTotal: valorTotal
            });
        }
    });

    // Validação básica (pode adicionar mais)
     if (pedidoAtualizado.produtos.length === 0) {
        alert("O pedido deve ter pelo menos um produto.");
        return;
    }

    // Salva no Firebase
    const sucesso = await salvarDados(pedidoAtualizado, 'pedido');

     if (sucesso) {
        pedidos[pedidoIndex] = pedidoAtualizado; // Atualiza array local

        // Limpa estado de edição
        pedidoEditando = null;
        // Opcional: Limpar formulário de edição se desejar
        // document.getElementById("edicaoPedido")?.reset();
        // limparCamposMoeda(); // Cuidado ao limpar tudo aqui

        alert("Pedido atualizado com sucesso!");
        mostrarPagina('lista-pedidos');
        mostrarPedidosRealizados(); // Atualiza lista
    } else {
        alert("Falha ao atualizar o pedido. Verifique o console.");
    }
}

// Filtrar Pedidos para Relatório
function filtrarPedidosRelatorio() {
    const dataInicio = document.getElementById('filtroDataInicio')?.value; // ID correto para relatório
    const dataFim = document.getElementById('filtroDataFim')?.value; // ID correto para relatório
    const relatorioConteudoDiv = document.getElementById('relatorio-conteudo');
    if (!relatorioConteudoDiv) return;

    const pedidosFiltradosRelatorio = pedidos.filter(pedido => {
        const dataPedido = pedido.dataPedido;
        // Filtro inclusivo: considera pedidos NA data de início e FIM
        const checkInicio = !dataInicio || dataPedido >= dataInicio;
        const checkFim = !dataFim || dataPedido <= dataFim;
        return checkInicio && checkFim;
    });

    gerarRelatorio(pedidosFiltradosRelatorio); // Passa os pedidos filtrados
}

// Gerar Conteúdo do Relatório (HTML)
function gerarRelatorio(pedidosParaRelatorio) {
    const relatorioConteudoDiv = document.getElementById('relatorio-conteudo');
     if (!relatorioConteudoDiv) return;

    let totalPedidosValor = 0;
    let totalFrete = 0;
    let totalMargemLucro = 0;
    let totalCustoMaoDeObra = 0;

    pedidosParaRelatorio.forEach(pedido => {
        totalPedidosValor += pedido.total || 0;
        totalFrete += pedido.valorFrete || 0;
        totalMargemLucro += pedido.margemLucro || 0;
        totalCustoMaoDeObra += pedido.custoMaoDeObra || 0;
    });

    const quantidadePedidos = pedidosParaRelatorio.length;

    let relatorioHTML = `
        <h3>Resumo do Período</h3>
        <table class="relatorio-table">
            <thead>
                <tr>
                    <th>Total Pedidos (Valor)</th>
                    <th>Total Frete</th>
                    <th>Total Margem Lucro</th>
                    <th>Total Custo M.O.</th>
                    <th>Qtd. Pedidos</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${formatarMoeda(totalPedidosValor)}</td>
                    <td>${formatarMoeda(totalFrete)}</td>
                    <td>${formatarMoeda(totalMargemLucro)}</td>
                    <td>${formatarMoeda(totalCustoMaoDeObra)}</td>
                    <td>${quantidadePedidos}</td>
                </tr>
            </tbody>
        </table>

        <h3 style="margin-top: 30px;">Detalhes dos Pedidos</h3>
        <table class="relatorio-table" id="tabela-detalhes-relatorio">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Data Pedido</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Entrada</th>
                    <th>Restante</th>
                    <th>M. Lucro</th>
                    <th>Custo M.O.</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Ordena por data decrescente para o relatório
    pedidosParaRelatorio.sort((a, b) => (b.dataPedido || "").localeCompare(a.dataPedido || ""));

    if (quantidadePedidos === 0) {
         relatorioHTML += `<tr><td colspan="8" style="text-align:center;">Nenhum pedido encontrado para o período selecionado.</td></tr>`;
    } else {
        pedidosParaRelatorio.forEach(pedido => {
            const formatDate = (dateString) => {
                if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'N/A';
                const [year, month, day] = dateString.split('-');
                return `${day}/${month}/${year}`;
            }
            relatorioHTML += `
                <tr>
                    <td>${pedido.numero || 'N/A'}</td>
                    <td>${formatDate(pedido.dataPedido)}</td>
                    <td>${pedido.cliente || 'Não informado'}</td>
                    <td style="text-align:right;">${formatarMoeda(pedido.total)}</td>
                    <td style="text-align:right;">${formatarMoeda(pedido.entrada)}</td>
                    <td style="text-align:right;">${formatarMoeda(pedido.restante)}</td>
                    <td style="text-align:right;">${formatarMoeda(pedido.margemLucro)}</td>
                    <td style="text-align:right;">${formatarMoeda(pedido.custoMaoDeObra)}</td>
                </tr>
            `;
        });
    }

    relatorioHTML += `
            </tbody>
        </table>
    `;

    relatorioConteudoDiv.innerHTML = relatorioHTML;
}

// Gerar Relatório XLSX (Excel)
function gerarRelatorioXLSX() {
    // Seleciona a tabela de DETALHES para exportar
    const tabelaDetalhes = document.getElementById('tabela-detalhes-relatorio');
    const resumoTable = document.querySelector('#relatorio-conteudo .relatorio-table'); // Pega a primeira tabela (resumo)

    if (!tabelaDetalhes || !resumoTable) {
        alert('Gere o relatório primeiro antes de exportar.');
        return;
    }

    // Verifica se a biblioteca XLSX está carregada
    if (typeof XLSX === 'undefined') {
        alert('Erro: Biblioteca SheetJS (XLSX) não carregada.');
        console.error('XLSX library is not defined.');
        return;
    }

    try {
        // Cria um novo Workbook
        const wb = XLSX.utils.book_new();

        // Cria a planilha de Resumo
        const wsResumo = XLSX.utils.table_to_sheet(resumoTable);
        XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

        // Cria a planilha de Detalhes
        const wsDetalhes = XLSX.utils.table_to_sheet(tabelaDetalhes);
        XLSX.utils.book_append_sheet(wb, wsDetalhes, "Detalhes Pedidos");

        // Gera o nome do arquivo com data
        const hoje = new Date();
        const dataFormatada = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}-${hoje.getDate().toString().padStart(2, '0')}`;
        const nomeArquivo = `Relatorio_PerolaRara_${dataFormatada}.xlsx`;

        // Faz o download do arquivo
        XLSX.writeFile(wb, nomeArquivo);

    } catch (error) {
        console.error("Erro ao gerar XLSX:", error);
        alert("Ocorreu um erro ao tentar gerar o arquivo Excel. Verifique o console.");
    }
}

/* ==== FIM SEÇÃO - LÓGICA DA APLICAÇÃO ==== */


/* ==== INÍCIO SEÇÃO - EVENT LISTENERS ==== */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado. Configurando listeners...");

    // --- Referências aos Elementos do DOM ---
    authContainer = document.getElementById('auth-container');
    appContent = document.getElementById('appContent');
    loadingIndicator = document.getElementById('loading-indicator');
    emailInput = document.getElementById('email');
    passwordInput = document.getElementById('password');
    registerBtn = document.getElementById('registerBtn');
    loginBtn = document.getElementById('loginBtn');
    forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    authMessage = document.getElementById('auth-message');
    btnLogout = document.getElementById('btnLogout');
    userInfo = document.getElementById('user-info');

    // Verifica se os elementos essenciais foram encontrados
    if (!authContainer || !appContent || !loadingIndicator || !emailInput || !passwordInput || !registerBtn || !loginBtn || !forgotPasswordBtn || !authMessage || !btnLogout || !userInfo) {
        console.error("Erro Fatal: Nem todos os elementos essenciais da UI foram encontrados no DOM. Verifique os IDs no HTML.");
        // Opcional: Mostrar uma mensagem de erro para o usuário
        document.body.innerHTML = '<p style="color: red; text-align: center; margin-top: 50px;">Erro crítico ao carregar a interface. Por favor, contate o suporte.</p>';
        return; // Impede a execução do restante do script
    }


    // --- Listeners de Autenticação ---
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            if (!emailInput.value || !passwordInput.value) {
                if (authMessage) {
                    authMessage.textContent = "Preencha email e senha para registrar.";
                    authMessage.style.color = 'red';
                }
                return;
            }
            registrarUsuario(emailInput.value, passwordInput.value);
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (!emailInput.value || !passwordInput.value) {
                 if (authMessage) {
                    authMessage.textContent = "Preencha email e senha para entrar.";
                    authMessage.style.color = 'red';
                 }
                return;
            }
            loginUsuario(emailInput.value, passwordInput.value);
        });
    }

    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', () => {
            enviarEmailRedefinicaoSenha(emailInput.value); // A função já valida se o email está vazio
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', fazerLogout);
    }

    // --- Listeners da Aplicação Principal ---

    // Navegação Principal (Menu)
    const menuLinks = document.querySelectorAll('nav ul li a[data-pagina]');
    menuLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const paginaId = link.dataset.pagina;
            mostrarPagina(paginaId);
            // Ações específicas ao mudar de página (ex: recarregar lista se necessário)
             if (paginaId === 'orcamentos-gerados') mostrarOrcamentosGerados();
             if (paginaId === 'lista-pedidos') mostrarPedidosRealizados();
        });
    });

    // Botões de Ação nos Formulários
    document.getElementById('btnAddProdutoOrcamento')?.addEventListener('click', adicionarProduto);
    document.getElementById('btnAddProdutoEdicao')?.addEventListener('click', adicionarProdutoEdicao);
    document.getElementById('btnGerarOrcamento')?.addEventListener('click', gerarOrcamento);
    document.getElementById('btnAtualizarOrcamento')?.addEventListener('click', atualizarOrcamento);
    document.getElementById('btnSalvarPedidoEdicao')?.addEventListener('click', atualizarPedido);

    // Botões de Filtro
    document.getElementById('btnFiltrarOrcamentos')?.addEventListener('click', filtrarOrcamentos);
    document.getElementById('btnFiltrarPedidos')?.addEventListener('click', filtrarPedidos);
    document.getElementById('btnGerarRelatorio')?.addEventListener('click', filtrarPedidosRelatorio);
    document.getElementById('btnExportarRelatorioXLSX')?.addEventListener('click', gerarRelatorioXLSX);


    // --- Event Delegation para Botões Dinâmicos e Inputs em Tabelas ---

    // Delegação para Orçamentos Gerados
    const tabelaOrcamentos = document.getElementById('tabela-orcamentos');
    if (tabelaOrcamentos) {
        tabelaOrcamentos.addEventListener('click', (event) => {
            const target = event.target;
            const orcamentoId = target.closest('tr')?.dataset.orcamentoId; // Pega ID da linha

            if (target.classList.contains('btnVisualizarOrcamento') && orcamentoId) {
                const orcamento = orcamentos.find(o => o.id === orcamentoId);
                if (orcamento) exibirOrcamentoEmHTML(orcamento);
            } else if (target.classList.contains('btnEditarOrcamento') && orcamentoId) {
                editarOrcamento(orcamentoId);
            } else if (target.classList.contains('btnGerarPedido') && orcamentoId) {
                gerarPedido(orcamentoId);
            }
        });
    }

    // Delegação para Pedidos Realizados
    const tabelaPedidos = document.getElementById('tabela-pedidos');
    if (tabelaPedidos) {
        tabelaPedidos.addEventListener('click', (event) => {
             const target = event.target;
             const pedidoId = target.closest('tr')?.dataset.pedidoId;

             if (target.classList.contains('btnEditarPedido') && pedidoId) {
                 editarPedido(pedidoId);
             }
              // Adicionar listener para visualizar pedido aqui se implementar
             // else if (target.classList.contains('btnVisualizarPedido') && pedidoId) { ... }
        });
    }

    // Delegação para Tabela de Produtos (Form Orçamento)
    const formOrcamento = document.getElementById('form-orcamento');
    if (formOrcamento) {
        formOrcamento.addEventListener('click', (event) => {
            if (event.target.classList.contains('btnExcluirProduto')) {
                excluirProduto(event.target);
            }
        });
        formOrcamento.addEventListener('input', (event) => {
            const target = event.target;
             if (target.classList.contains('produto-valor-unit')) {
                 formatarEntradaMoeda(target);
                 atualizarTotais(); // Atualiza no input
             } else if (target.id === 'valorFrete'){
                 formatarEntradaMoeda(target);
                 atualizarTotais(); // Atualiza no input do frete
             }
        });
         formOrcamento.addEventListener('change', (event) => { // Para number input
            const target = event.target;
             if (target.classList.contains('produto-quantidade')) {
                 atualizarTotais();
             }
        });
         formOrcamento.addEventListener('blur', (event) => { // Atualiza no blur também por segurança
             const target = event.target;
             if (target.classList.contains('produto-quantidade') || target.classList.contains('produto-valor-unit') || target.id === 'valorFrete') {
                 // Re-formata valor unitário no blur para garantir
                 if (target.classList.contains('produto-valor-unit')) {
                    formatarEntradaMoeda(target);
                 }
                 atualizarTotais();
             }
         }, true); // Usa capturing phase para pegar blur antes de outros eventos
    }

    // Delegação para Tabela de Produtos (Form Edição Pedido)
     const formEdicaoPedido = document.getElementById('form-edicao-pedido');
     if (formEdicaoPedido) {
        formEdicaoPedido.addEventListener('click', (event) => {
             if (event.target.classList.contains('btnExcluirProdutoEdicao')) {
                excluirProdutoEdicao(event.target);
            }
        });
         formEdicaoPedido.addEventListener('input', (event) => {
             const target = event.target;
             if (target.classList.contains('produto-valor-unit')) {
                 formatarEntradaMoeda(target);
                 atualizarTotaisEdicao(); // Atualiza total e restante
             } else if (target.id === 'valorFreteEdicao' || target.id === 'valorPedidoEdicao') {
                  formatarEntradaMoeda(target);
                  atualizarTotaisEdicao(); // Atualiza total e restante
             } else if (target.id === 'entradaEdicao') {
                 formatarEntradaMoeda(target);
                 atualizarRestanteEdicao(); // Atualiza só o restante
             } else if (target.id === 'custoMaoDeObraEdicao' || target.id === 'margemLucroEdicao') {
                 formatarEntradaMoeda(target);
                 // Não precisa recalcular totais aqui, só formatar
             }
         });
         formEdicaoPedido.addEventListener('change', (event) => { // Para number input
            const target = event.target;
             if (target.classList.contains('produto-quantidade')) {
                 atualizarTotaisEdicao();
             }
         });
         formEdicaoPedido.addEventListener('blur', (event) => {
             const target = event.target;
             const needsTotalUpdate = target.classList.contains('produto-quantidade') ||
                                    target.classList.contains('produto-valor-unit') ||
                                    target.id === 'valorFreteEdicao' ||
                                    target.id === 'valorPedidoEdicao';
             const needsRestanteUpdate = target.id === 'entradaEdicao';
             const needsFormatting = target.classList.contains('produto-valor-unit') ||
                                     target.id === 'valorFreteEdicao' ||
                                     target.id === 'valorPedidoEdicao' ||
                                     target.id === 'entradaEdicao' ||
                                     target.id === 'custoMaoDeObraEdicao' ||
                                     target.id === 'margemLucroEdicao';

            if (needsFormatting) {
                formatarEntradaMoeda(target);
            }
            if (needsTotalUpdate) {
                atualizarTotaisEdicao();
            } else if (needsRestanteUpdate) {
                atualizarRestanteEdicao();
            }
         }, true);
     }


    // --- Monitor de Estado de Autenticação (Principal) ---
    onAuthStateChanged(auth, (user) => {
        usuarioAtual = user; // Atualiza a variável global
        if (user) {
            // Usuário está LOGADO
            console.log("Auth state changed: Usuário LOGADO:", user.email);
            mostrarAplicacao(user); // Mostra a app, esconde login
            carregarDados(); // Carrega os dados do Firestore
        } else {
            // Usuário está DESLOGADO
            console.log("Auth state changed: Usuário DESLOGADO.");
            mostrarTelaLogin(); // Mostra login, esconde a app
            // Limpa dados locais para garantir que não haja dados de outro usuário
            orcamentos = [];
            pedidos = [];
            numeroOrcamento = 1;
            numeroPedido = 1;
            orcamentoEditando = null;
            pedidoEditando = null;
            mostrarOrcamentosGerados(); // Limpa tabelas na UI
            mostrarPedidosRealizados();
            const relatorioDiv = document.getElementById('relatorio-conteudo'); // Limpa relatório
            if(relatorioDiv) relatorioDiv.innerHTML = '';
        }
    });

    // Inicializar campos de moeda no carregamento inicial
    limparCamposMoeda();

    console.log("Listeners configurados.");
});
/* ==== FIM SEÇÃO - EVENT LISTENERS ==== */