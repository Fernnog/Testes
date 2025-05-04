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
  apiKey: "AIzaSyC4xXSGw91MPLbC3ikCsdJ4pkNu1GZTqKQ",
  authDomain: "teste-da-perola.firebaseapp.com",
  projectId: "teste-da-perola",
  storageBucket: "teste-da-perola.firebasestorage.app",
  messagingSenderId: "845747978306",
  appId: "1:845747978306:web:90314c25caf38106bc6ddb",
  measurementId: "G-BLJ0S9GZLE"
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
    // Não mexemos no display do btnLogout aqui, ele é controlado pelo user-nav-container
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
    if (btnLogout) btnLogout.style.display = 'inline-block'; // Garante que botão Sair apareça se estiver logado
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
        // Não define para R$ 0,00 aqui, deixa o campo vazio para permitir limpar
        return; // Retorna se vazio
    }
    valor = (parseInt(valor, 10) / 100).toFixed(2) + ''; // Converte para número, divide por 100, fixa 2 decimais
    valor = valor.replace(".", ","); // Troca ponto por vírgula
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); // Adiciona separador de milhar
    input.value = 'R$ ' + valor;
}

function converterMoedaParaNumero(valor) {
    if (typeof valor !== 'string') {
        // console.warn('converterMoedaParaNumero recebeu um valor não string:', valor);
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
            // Define o valor como R$ 0,00 ao limpar
            campo.value = 'R$ 0,00';
        }
    });
    // Limpa também campos de texto/textarea manualmente ao resetar forms
    const prazoEntregaField = document.getElementById("prazoEntrega");
    if (prazoEntregaField) prazoEntregaField.value = '';
    const observacoesField = document.getElementById("observacoes");
    if (observacoesField) observacoesField.value = '';

    const prazoEntregaEdicaoField = document.getElementById("prazoEntregaEdicao");
    if (prazoEntregaEdicaoField) prazoEntregaEdicaoField.value = '';
    const observacoesEdicaoField = document.getElementById("observacoesEdicao");
    if (observacoesEdicaoField) observacoesEdicaoField.value = '';
    // Adicionar outros campos se necessário limpar manualmente
}

function adicionarProduto() {
    const tbody = document.querySelector("#tabelaProdutos tbody");
    if (!tbody) return; // Sai se a tabela não for encontrada
    const newRow = tbody.insertRow();

    newRow.insertCell().innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1">';
    newRow.insertCell().innerHTML = '<input type="text" class="produto-descricao" placeholder="Descrição">'; // Placeholder adicionado
    newRow.insertCell().innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00">'; // Valor inicial formatado
    newRow.insertCell().textContent = formatarMoeda(0); // Célula de Valor Total
    // Cria o botão Excluir programaticamente
    const cellAcoes = newRow.insertCell();
    const btnExcluir = document.createElement('button');
    btnExcluir.type = 'button';
    btnExcluir.textContent = 'Excluir';
    btnExcluir.classList.add('btnExcluirProduto'); // Adiciona classe para o listener de delegação
    cellAcoes.appendChild(btnExcluir);
}

function adicionarProdutoEdicao() {
    const tbody = document.querySelector("#tabelaProdutosEdicao tbody");
    if (!tbody) return;
    const newRow = tbody.insertRow();

    newRow.insertCell().innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1">';
    newRow.insertCell().innerHTML = '<input type="text" class="produto-descricao" placeholder="Descrição">';
    newRow.insertCell().innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00">';
    newRow.insertCell().textContent = formatarMoeda(0);
    // Cria o botão Excluir programaticamente
    const cellAcoes = newRow.insertCell();
    const btnExcluir = document.createElement('button');
    btnExcluir.type = 'button';
    btnExcluir.textContent = 'Excluir';
    btnExcluir.classList.add('btnExcluirProdutoEdicao'); // Adiciona classe para o listener de delegação
    cellAcoes.appendChild(btnExcluir);
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

        valorOrcamentoInput.value = formatarMoeda(valorTotalOrcamento); // Define o valor formatado diretamente
        totalInput.value = formatarMoeda(totalGeral); // Define o valor formatado diretamente
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
    } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        authMessage.textContent = `Erro ao registrar: ${error.message}`; // Exibe mensagem mais genérica
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

            // Calcula próximo número baseado no ano atual para evitar colisão entre anos
            const [numStr, anoStr] = (data.numero || `0/${anoAtual}`).split('/');
            const num = parseInt(numStr) || 0;
            const ano = parseInt(anoStr) || anoAtual;


            if (data.tipo === 'orcamento') {
                orcamentos.push(data);
                if (ano === anoAtual && num > maxOrcNum) maxOrcNum = num; // Considera apenas o ano atual para o próximo número
            } else if (data.tipo === 'pedido') {
                pedidos.push(data);
                 if (ano === anoAtual && num > maxPedNum) maxPedNum = num; // Considera apenas o ano atual para o próximo número
            }
        });

        numeroOrcamento = maxOrcNum + 1; // Define o próximo número baseado no máximo encontrado NO ANO ATUAL
        numeroPedido = maxPedNum + 1; // Define o próximo número baseado no máximo encontrado NO ANO ATUAL

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
        // userId: usuarioAtual.uid, // Descomente se precisar de segurança por usuário
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
        prazoEntrega: document.getElementById("prazoEntrega")?.value || '', // <<< NOVO CAMPO
        pedidoGerado: false,
        numeroPedido: null
        // tipo: 'orcamento' // Definido em salvarDados
    };

    const produtosRows = document.querySelectorAll("#tabelaProdutos tbody tr");
    let produtoSemDescricao = false; // Flag para verificar descrição
    produtosRows.forEach(row => {
        const quantidade = parseFloat(row.querySelector(".produto-quantidade")?.value) || 0;
        const descricao = row.querySelector(".produto-descricao")?.value || '';
        const valorUnit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit")?.value);
        const valorTotal = quantidade * valorUnit; // Calcula valorTotal aqui para consistência
        if (quantidade > 0 && descricao) { // Adiciona apenas se tiver quantidade e descrição
             orcamento.produtos.push({
                quantidade: quantidade,
                descricao: descricao,
                valorUnit: valorUnit,
                valorTotal: valorTotal // Salva o valor total calculado
            });
        } else if(quantidade > 0 && !descricao){
             produtoSemDescricao = true; // Marca a flag
            console.warn("Produto com quantidade mas sem descrição na linha:", row);
        }
    });

    if (orcamento.produtos.length === 0) {
        alert("Adicione pelo menos um produto com descrição ao orçamento.");
        return;
    }
    if (produtoSemDescricao) { // Alerta se houver produto sem descrição
         alert("Atenção: Existem produtos com quantidade mas sem descrição. Eles não serão incluídos no orçamento salvo.");
     }

    const orcamentoId = await salvarDados(orcamento, 'orcamento');

    if (orcamentoId) {
        orcamento.id = orcamentoId; // Atualiza o objeto local com o ID
        numeroOrcamento++; // Incrementa SOMENTE em caso de sucesso
        orcamentos.push(orcamento); // Adiciona ao array local

        document.getElementById("orcamento")?.reset(); // Limpa o formulário
        limparCamposMoeda(); // Reseta campos de moeda e textareas relacionados
        const tabelaProdutosBody = document.querySelector("#tabelaProdutos tbody");
        if (tabelaProdutosBody) tabelaProdutosBody.innerHTML = ""; // Limpa tabela de produtos

        alert("Orçamento gerado com sucesso! Verifique se a janela de Orçamento foi aberta (pode ser necessário permitir pop-ups)."); // MENSAGEM ALTERADA: Não menciona mais Checklist

        mostrarPagina('orcamentos-gerados');
        mostrarOrcamentosGerados(); // Atualiza a lista exibida

        console.log("Tentando abrir Orçamento HTML...");
        exibirOrcamentoEmHTML(orcamento);
        // REMOVIDO: Chamada para exibir checklist ao gerar orçamento
        // console.log("Tentando abrir Checklist HTML...");
        // exibirChecklistEmHTML(orcamento);
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

        // Formata o campo prazoEntrega para exibição, mantendo quebras de linha
        const prazoEntregaFormatado = orcamento.prazoEntrega ? `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${orcamento.prazoEntrega.replace(/</g, "<").replace(/>/g, ">")}</pre>` : 'Não informado';
        // Formata o campo observacoes para exibição, mantendo quebras de linha
        const observacoesFormatado = orcamento.observacoes ? `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${orcamento.observacoes.replace(/</g, "<").replace(/>/g, ">")}</pre>` : '';


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
         if (!orcamento.produtos || orcamento.produtos.length === 0) { // Correção na condição
            html += `<tr><td colspan="4" style="text-align:center;">Nenhum produto adicionado.</td></tr>`;
        }

        html += `
                </tbody>
            </table>
            <div class="espaco-tabela" style="height: 15px;"></div> <!-- Espaço menor -->
            <div class="info-orcamento">
                <strong>Pagamento:</strong> ${pagamentoFormatado}<br>
                <strong>Valor do Frete:</strong> ${formatarMoeda(orcamento.valorFrete)}<br>
                <strong style="color: #7aa2a9;">Valor do Orçamento:</strong> ${formatarMoeda(orcamento.valorOrcamento)}<br> <!-- Destaca valor -->
                <strong style="color: #7aa2a9; font-size: 1.1em;">Total:</strong> ${formatarMoeda(orcamento.total)}<br> <!-- Destaca total -->
                ${orcamento.prazoEntrega ? `<strong>Prazo de Entrega:</strong><br>${prazoEntregaFormatado}<br>` : ''} <!-- Exibe Prazo de Entrega -->
                ${orcamento.observacoes ? `<strong>Observações:</strong><br>${observacoesFormatado}` : ''} <!-- Usa <pre> para manter quebras de linha -->
            </div>
        `;

        conteudoOrcamentoDiv.innerHTML = html;
        console.log("Conteúdo do orçamento inserido em orcamento.html.");
    };

     janelaOrcamento.onerror = (err) => {
         console.error("Erro ao carregar orcamento.html:", err);
         alert("Ocorreu um erro ao tentar abrir a visualização do orçamento.");
     };
}

// Exibir Checklist de Produção em Nova Janela (HTML) - VERSÃO ATUALIZADA PARA TABELA
// Esta função agora pode receber tanto um objeto 'orcamento' quanto um 'pedido'
function exibirChecklistEmHTML(dadosChecklist) { // Parâmetro renomeado para clareza
    if (!dadosChecklist) {
        console.error("exibirChecklistEmHTML: Dados inválidos (orçamento ou pedido).");
        return;
    }
    console.log("Gerando checklist para:", dadosChecklist.numero); // Exibe número do orçamento OU pedido
    console.log("Abrindo janela checklist...");
    const janelaChecklist = window.open('./checklist.html', '_blank');

    if (!janelaChecklist) {
        console.error("Falha ao abrir a janela de checklist. Provavelmente bloqueada pelo navegador.");
        alert("A janela do checklist foi bloqueada pelo navegador. Por favor, permita pop-ups para este site e tente visualizar o checklist novamente.");
        return;
    }
    console.log("Janela checklist aberta:", janelaChecklist);

    janelaChecklist.onload = () => {
        console.log("checklist.html carregado, buscando #conteudo-checklist");
        const conteudoChecklistDiv = janelaChecklist.document.getElementById("conteudo-checklist");

        if (!conteudoChecklistDiv) {
            console.error("Elemento #conteudo-checklist não encontrado em checklist.html");
            janelaChecklist.close();
            return;
        }

        // Determina o título correto (Orçamento ou Pedido)
        const tipoDocumento = dadosChecklist.tipo === 'pedido' ? 'Pedido' : 'Orçamento';

        // ***** INÍCIO DA GERAÇÃO DO HTML COM TABELA *****
        let checklistHtml = `
            <div class="info-cliente-tema">
                <strong>${tipoDocumento} Nº:</strong> <span>${dadosChecklist.numero || 'N/A'}</span><br>
                <strong>Cliente:</strong> <span>${dadosChecklist.cliente || 'Não informado'}</span><br>
                ${dadosChecklist.tema ? `<strong>Tema:</strong> <span>${dadosChecklist.tema}</span><br>` : ''}
                ${dadosChecklist.cores ? `<strong>Cores:</strong> <span>${dadosChecklist.cores}</span>` : ''}
            </div>
            <div class="checklist-container">
                <h3>Itens a Produzir/Separar</h3>
                <table class="checklist-table">
                    <thead>
                        <tr>
                            <th class="col-check">Feito</th>
                            <th class="col-qtd">Qtd.</th>
                            <th class="col-desc">Descrição</th>
                        </tr>
                    </thead>
                    <tbody>`; // Abre o tbody

        if (dadosChecklist.produtos && dadosChecklist.produtos.length > 0) {
            dadosChecklist.produtos.forEach((produto, index) => {
                // Gera um ID único para o checkbox e label
                const cleanDescricao = (produto.descricao || `item-${index}`).replace(/[^a-zA-Z0-9-_]/g, '');
                const checkboxId = `chk-${cleanDescricao}-${index}`; // Usa index para garantir unicidade

                checklistHtml += `
                    <tr>
                        <td class="col-check">
                            <input type="checkbox" id="${checkboxId}">
                        </td>
                        <td class="col-qtd">
                            ${produto.quantidade || 0}x
                        </td>
                        <td class="col-desc">
                            <label for="${checkboxId}">${produto.descricao || 'Sem descrição'}</label>
                        </td>
                    </tr>`;
            });
        } else {
            checklistHtml += `<tr><td colspan="3" style="text-align: center; padding: 20px;">Nenhum produto listado neste ${tipoDocumento.toLowerCase()}.</td></tr>`;
        }

        checklistHtml += `
                    </tbody>
                </table>
            </div>`; // Fim checklist-container e table
        // ***** FIM DA GERAÇÃO DO HTML COM TABELA *****

        conteudoChecklistDiv.innerHTML = checklistHtml;
        console.log(`Conteúdo do checklist (tabela) para ${tipoDocumento} ${dadosChecklist.numero} inserido em checklist.html.`);
    };

    janelaChecklist.onerror = (err) => {
        console.error("Erro ao carregar checklist.html:", err);
        alert("Ocorreu um erro ao tentar abrir a visualização do checklist.");
    };
}

// Mostrar Orçamentos Gerados na Tabela (COM BOTÕES DE TEXTO - SEM BOTÃO CHECKLIST)
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

        // ---- Criação dos Botões com Texto ----
        cellAcoes.style.textAlign = 'center';

        const btnVisualizar = document.createElement('button');
        btnVisualizar.type = 'button';
        btnVisualizar.textContent = 'Visualizar'; // Texto
        btnVisualizar.classList.add('btnVisualizarOrcamento');
        btnVisualizar.title = 'Visualizar Orçamento';
        cellAcoes.appendChild(btnVisualizar);

        // ===== REMOVIDO o botão Ver Checklist daqui =====

        // Botões Editar / Gerar Pedido (condicionais)
        if (!orcamento.pedidoGerado) {
            const btnEditar = document.createElement('button');
            btnEditar.type = 'button';
            btnEditar.textContent = 'Editar'; // Texto
            btnEditar.classList.add('btnEditarOrcamento');
            btnEditar.title = 'Editar Orçamento';
            cellAcoes.appendChild(btnEditar);

            const btnGerarPedido = document.createElement('button');
            btnGerarPedido.type = 'button';
            btnGerarPedido.textContent = 'Gerar Pedido'; // Texto
            btnGerarPedido.classList.add('btnGerarPedido');
            btnGerarPedido.title = 'Gerar Pedido a partir deste Orçamento';
            cellAcoes.appendChild(btnGerarPedido);
        } else {
             const spanGerado = document.createElement('span');
             spanGerado.textContent = 'Pedido Gerado';
             spanGerado.title = `Pedido Nº ${orcamento.numeroPedido || '?'}`;
             spanGerado.style.padding = '6px 12px';
             spanGerado.style.fontSize = '13px';
             spanGerado.style.opacity = '0.6';
             spanGerado.style.marginLeft = '5px';
             spanGerado.style.display = 'inline-block'; // Para aplicar padding/margin
             cellAcoes.appendChild(spanGerado);
        }
        // ---- Fim da Criação dos Botões ----
    });
    // Event listeners são adicionados via delegação no DOMContentLoaded
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

// Atualizar Tabela de Orçamentos com Dados Filtrados (COM BOTÕES DE TEXTO - SEM BOTÃO CHECKLIST)
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

        // ---- Criação dos Botões com Texto ----
        cellAcoes.style.textAlign = 'center';

        const btnVisualizar = document.createElement('button');
        btnVisualizar.type = 'button';
        btnVisualizar.textContent = 'Visualizar';
        btnVisualizar.classList.add('btnVisualizarOrcamento');
        btnVisualizar.title = 'Visualizar Orçamento';
        cellAcoes.appendChild(btnVisualizar);

        // ===== REMOVIDO o botão Ver Checklist daqui =====

        if (!orcamento.pedidoGerado) {
            const btnEditar = document.createElement('button');
            btnEditar.type = 'button';
            btnEditar.textContent = 'Editar';
            btnEditar.classList.add('btnEditarOrcamento');
            btnEditar.title = 'Editar Orçamento';
            cellAcoes.appendChild(btnEditar);

            const btnGerarPedido = document.createElement('button');
            btnGerarPedido.type = 'button';
            btnGerarPedido.textContent = 'Gerar Pedido';
            btnGerarPedido.classList.add('btnGerarPedido');
            btnGerarPedido.title = 'Gerar Pedido a partir deste Orçamento';
            cellAcoes.appendChild(btnGerarPedido);
        } else {
             const spanGerado = document.createElement('span');
             spanGerado.textContent = 'Pedido Gerado';
             spanGerado.title = `Pedido Nº ${orcamento.numeroPedido || '?'}`;
             spanGerado.style.padding = '6px 12px';
             spanGerado.style.fontSize = '13px';
             spanGerado.style.opacity = '0.6';
             spanGerado.style.marginLeft = '5px';
             spanGerado.style.display = 'inline-block';
             cellAcoes.appendChild(spanGerado);
        }
        // ---- Fim da Criação dos Botões ----
    });
    // Event listeners são adicionados via delegação
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
    document.getElementById("prazoEntrega").value = orcamento.prazoEntrega || '';

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
        newRow.insertCell().innerHTML = `<input type="text" class="produto-descricao" value="${produto.descricao || ''}" placeholder="Descrição">`;
        newRow.insertCell().innerHTML = `<input type="text" class="produto-valor-unit" value="${formatarMoeda(produto.valorUnit)}">`;
        newRow.insertCell().textContent = formatarMoeda(produto.valorTotal || 0); // Usa valor total ou recalcula se necessário

        // Cria botão excluir
        const cellAcoes = newRow.insertCell();
        const btnExcluir = document.createElement('button');
        btnExcluir.type = 'button';
        btnExcluir.textContent = 'Excluir';
        btnExcluir.classList.add('btnExcluirProduto');
        cellAcoes.appendChild(btnExcluir);
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
        mostrarPagina('orcamentos-gerados'); // Volta para a lista
        mostrarOrcamentosGerados();
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
        prazoEntrega: document.getElementById("prazoEntrega")?.value || '',
        pedidoGerado: orcamentos[orcamentoIndex].pedidoGerado, // Mantém status
        numeroPedido: orcamentos[orcamentoIndex].numeroPedido // Mantém número do pedido se existir
        // tipo: 'orcamento' // Definido em salvarDados
    };

    const produtosRows = document.querySelectorAll("#tabelaProdutos tbody tr");
    let produtoSemDescricao = false;
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
        } else if (quantidade > 0 && !descricao) {
            produtoSemDescricao = true;
            console.warn("Produto com quantidade mas sem descrição na atualização:", row);
        }
    });

     if (orcamentoAtualizado.produtos.length === 0) {
        alert("O orçamento deve ter pelo menos um produto com descrição.");
        return;
    }
     if (produtoSemDescricao) {
         alert("Atenção: Existem produtos com quantidade mas sem descrição. Eles não serão salvos.");
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
    const orcamentoOrigemIndex = orcamentos.findIndex(o => o.id === orcamentoId); // Encontra pelo ID
     if (orcamentoOrigemIndex === -1) {
        alert("Orçamento de origem não encontrado.");
        return;
    }
    const orcamentoOrigem = orcamentos[orcamentoOrigemIndex];

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
        pagamento: [...(orcamentoOrigem.pagamento || [])], // Copia array de pagamento
        valorFrete: orcamentoOrigem.valorFrete || 0,
        valorPedido: orcamentoOrigem.valorOrcamento || 0, // Valor do pedido = valor do orçamento inicial
        total: orcamentoOrigem.total || 0, // Total inicial igual ao do orçamento
        observacoes: orcamentoOrigem.observacoes || '',
        prazoEntrega: orcamentoOrigem.prazoEntrega || '', // COPIA PRAZO ENTREGA
        entrada: 0, // Entrada inicial zero
        restante: orcamentoOrigem.total || 0, // Restante inicial é o total
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
        // Salva a atualização no orçamento
        const sucessoUpdateOrc = await salvarDados(orcamentoOrigem, 'orcamento');

        if(sucessoUpdateOrc){
             // Atualiza também no array local
            orcamentos[orcamentoOrigemIndex] = orcamentoOrigem;
            alert(`Pedido Nº ${pedido.numero} gerado com sucesso a partir do orçamento Nº ${orcamentoOrigem.numero}!`);
            mostrarPagina('lista-pedidos');
            mostrarPedidosRealizados(); // Atualiza lista de pedidos
            mostrarOrcamentosGerados(); // Atualiza lista de orçamentos
        } else {
             alert("Pedido gerado, mas houve falha ao atualizar o status do orçamento original. Recarregue a página.");
             // Idealmente, deveria haver um tratamento de erro mais robusto aqui (rollback?)
        }

    } else {
         alert("Falha ao gerar o pedido. Verifique o console.");
    }
}

// Mostrar Pedidos Realizados na Tabela (COM BOTÕES EDITAR E VER CHECKLIST)
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

        // ---- Criação dos Botões ----
        cellAcoes.style.textAlign = 'center';

        // Botão Editar
        const btnEditar = document.createElement('button');
        btnEditar.type = 'button';
        btnEditar.textContent = 'Editar'; // Texto
        btnEditar.classList.add('btnEditarPedido');
        btnEditar.title = 'Editar Pedido';
        cellAcoes.appendChild(btnEditar);

        // ===== ADICIONADO - Botão Ver Checklist =====
        const btnChecklistPedido = document.createElement('button');
        btnChecklistPedido.type = 'button';
        btnChecklistPedido.textContent = 'Ver Checklist'; // Texto para o botão
        btnChecklistPedido.classList.add('btnVisualizarChecklistPedido'); // Classe específica
        btnChecklistPedido.title = 'Visualizar Checklist de Produção do Pedido';
        cellAcoes.appendChild(btnChecklistPedido); // Adiciona o botão
        // ===== FIM ADIÇÃO =====

    });
     // Listeners adicionados via delegação no DOMContentLoaded
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

// Atualizar Tabela de Pedidos com Dados Filtrados (COM BOTÕES EDITAR E VER CHECKLIST)
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

        // ---- Criação dos Botões ----
        cellAcoes.style.textAlign = 'center';

        // Botão Editar
        const btnEditar = document.createElement('button');
        btnEditar.type = 'button';
        btnEditar.textContent = 'Editar';
        btnEditar.classList.add('btnEditarPedido');
        btnEditar.title = 'Editar Pedido';
        cellAcoes.appendChild(btnEditar);

        // ===== ADICIONADO - Botão Ver Checklist =====
        const btnChecklistPedido = document.createElement('button');
        btnChecklistPedido.type = 'button';
        btnChecklistPedido.textContent = 'Ver Checklist';
        btnChecklistPedido.classList.add('btnVisualizarChecklistPedido'); // Mesma classe específica
        btnChecklistPedido.title = 'Visualizar Checklist de Produção do Pedido';
        cellAcoes.appendChild(btnChecklistPedido);
        // ===== FIM ADIÇÃO =====

    });
    // Event listeners são adicionados via delegação
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
    document.getElementById("prazoEntregaEdicao").value = pedido.prazoEntrega || '';

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
        newRow.insertCell().innerHTML = `<input type="text" class="produto-descricao" value="${produto.descricao || ''}" placeholder="Descrição">`;
        newRow.insertCell().innerHTML = `<input type="text" class="produto-valor-unit" value="${formatarMoeda(produto.valorUnit)}">`;
        newRow.insertCell().textContent = formatarMoeda(produto.valorTotal || 0);

        // Cria botão excluir
        const cellAcoes = newRow.insertCell();
        const btnExcluir = document.createElement('button');
        btnExcluir.type = 'button';
        btnExcluir.textContent = 'Excluir';
        btnExcluir.classList.add('btnExcluirProdutoEdicao');
        cellAcoes.appendChild(btnExcluir);
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
        mostrarPagina('lista-pedidos'); // Volta para lista
        mostrarPedidosRealizados();
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
        email: pedidos[pedidoIndex].email, // Mantém email original se não houver campo de edição
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
        observacoes: document.getElementById("observacoesEdicao")?.value || '',
        prazoEntrega: document.getElementById("prazoEntregaEdicao")?.value || ''
        // tipo: 'pedido' // Definido em salvarDados
    };

    const produtosRowsEdicao = document.querySelectorAll("#tabelaProdutosEdicao tbody tr");
    let produtoEdicaoSemDescricao = false;
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
        } else if (quantidade > 0 && !descricao) {
             produtoEdicaoSemDescricao = true;
             console.warn("Produto com quantidade mas sem descrição na atualização do pedido:", row);
        }
    });

     if (pedidoAtualizado.produtos.length === 0) {
        alert("O pedido deve ter pelo menos um produto com descrição.");
        return;
    }
    if (produtoEdicaoSemDescricao) {
         alert("Atenção: Existem produtos com quantidade mas sem descrição. Eles não serão salvos.");
     }

    // Salva no Firebase
    const sucesso = await salvarDados(pedidoAtualizado, 'pedido');

     if (sucesso) {
        pedidos[pedidoIndex] = pedidoAtualizado; // Atualiza array local

        // Limpa estado de edição
        pedidoEditando = null;
        // Opcional: Limpar formulário de edição
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
    const resumoTable = document.querySelector('#relatorio-conteudo .relatorio-table:first-of-type'); // Pega a primeira tabela (resumo)

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
    btnLogout = document.getElementById('btnLogout'); // Já referenciado
    userInfo = document.getElementById('user-info');   // Já referenciado

    // Verifica se os elementos essenciais foram encontrados
    if (!authContainer || !appContent || !loadingIndicator || !emailInput || !passwordInput || !registerBtn || !loginBtn || !forgotPasswordBtn || !authMessage || !btnLogout || !userInfo) {
        console.error("Erro Fatal: Nem todos os elementos essenciais da UI foram encontrados no DOM. Verifique os IDs no HTML.");
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
            // Ações específicas ao mudar de página
             if (paginaId === 'orcamentos-gerados') mostrarOrcamentosGerados();
             if (paginaId === 'lista-pedidos') mostrarPedidosRealizados();
             // Se precisar limpar filtros ao mudar de página, adicione aqui
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
            // Verifica se o clique foi em um botão dentro da tabela
            if (target.tagName === 'BUTTON') {
                const linha = target.closest('tr'); // Encontra a linha pai do botão clicado
                if (!linha) return; // Sai se não encontrou a linha (pouco provável)
                const orcamentoId = linha.dataset.orcamentoId; // Pega ID da linha

                if (!orcamentoId) {
                    console.warn("ID do orçamento não encontrado na linha:", linha);
                    return;
                }

                const orcamento = orcamentos.find(o => o.id === orcamentoId); // Busca o orçamento

                if (!orcamento) {
                     console.error("Orçamento não encontrado no array local:", orcamentoId);
                     alert("Erro: Orçamento não encontrado.");
                     return;
                }

                if (target.classList.contains('btnVisualizarOrcamento')) {
                    exibirOrcamentoEmHTML(orcamento);
                }
                // ===== REMOVIDO: Ação do botão btnVisualizarChecklist daqui =====
                else if (target.classList.contains('btnEditarOrcamento')) {
                    editarOrcamento(orcamentoId); // Passa o ID aqui
                } else if (target.classList.contains('btnGerarPedido')) {
                    gerarPedido(orcamentoId); // Passa o ID aqui
                }
            }
        });
    }

    // Delegação para Pedidos Realizados
    const tabelaPedidos = document.getElementById('tabela-pedidos');
    if (tabelaPedidos) {
        tabelaPedidos.addEventListener('click', (event) => {
             const target = event.target;
             if (target.tagName === 'BUTTON') { // Verifica se o clique foi em um botão
                 const linha = target.closest('tr');
                 if (!linha) return;
                 const pedidoId = linha.dataset.pedidoId;

                 if (!pedidoId) {
                     console.warn("ID do pedido não encontrado na linha:", linha);
                     return;
                 }

                 // Encontra o pedido correspondente no array 'pedidos'
                 const pedido = pedidos.find(p => p.id === pedidoId);

                 if (!pedido) {
                     console.error("Pedido não encontrado no array local:", pedidoId);
                     alert("Erro: Pedido não encontrado.");
                     return;
                 }

                 // Verifica qual botão foi clicado
                 if (target.classList.contains('btnEditarPedido')) {
                     editarPedido(pedidoId); // Chama a função de edição
                 }
                 // ===== ADICIONADO: Ação do botão btnVisualizarChecklistPedido =====
                 else if (target.classList.contains('btnVisualizarChecklistPedido')) {
                     // Chama a função existente de exibir checklist, passando o OBJETO PEDIDO
                     exibirChecklistEmHTML(pedido);
                 }
                 // ===== FIM ADIÇÃO =====
             }
        });
    }

    // Delegação para Tabela de Produtos (Form Orçamento)
    const formOrcamento = document.getElementById('form-orcamento');
    if (formOrcamento) {
        // Listener para Botão Excluir
        formOrcamento.addEventListener('click', (event) => {
            if (event.target.classList.contains('btnExcluirProduto')) {
                excluirProduto(event.target); // Chama a função passando o botão
            }
        });
        // Listener para Inputs (Valor Unit, Frete) - Evento 'input'
        formOrcamento.addEventListener('input', (event) => {
            const target = event.target;
             if (target.classList.contains('produto-valor-unit') || target.id === 'valorFrete'){
                 formatarEntradaMoeda(target);
                 atualizarTotais(); // Atualiza no input
             }
             // Não precisa de listener para observacoes/prazoEntrega aqui, só na hora de salvar
        });
        // Listener para Inputs (Quantidade) - Evento 'change'
         formOrcamento.addEventListener('change', (event) => {
            const target = event.target;
             if (target.classList.contains('produto-quantidade')) {
                 atualizarTotais();
             }
        });
        // Listener para Inputs (Valor Unit, Frete) - Evento 'blur' para garantir formatação
         formOrcamento.addEventListener('blur', (event) => {
             const target = event.target;
             if (target.classList.contains('produto-valor-unit') || target.id === 'valorFrete') {
                 formatarEntradaMoeda(target); // Garante formatação correta no blur
                 atualizarTotais(); // Atualiza totais no blur também
             }
         }, true); // Usa capturing phase para pegar blur antes de outros eventos
    }

    // Delegação para Tabela de Produtos (Form Edição Pedido)
     const formEdicaoPedido = document.getElementById('form-edicao-pedido');
     if (formEdicaoPedido) {
         // Listener para Botão Excluir
        formEdicaoPedido.addEventListener('click', (event) => {
             if (event.target.classList.contains('btnExcluirProdutoEdicao')) {
                excluirProdutoEdicao(event.target); // Chama a função passando o botão
            }
        });
        // Listener para Inputs - Evento 'input'
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
         // Listener para Inputs (Quantidade) - Evento 'change'
         formEdicaoPedido.addEventListener('change', (event) => {
            const target = event.target;
             if (target.classList.contains('produto-quantidade')) {
                 atualizarTotaisEdicao();
             }
         });
         // Listener para Inputs - Evento 'blur'
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
                formatarEntradaMoeda(target); // Garante formatação no blur
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
            // Limpa UI das tabelas e relatório
            const orcTbody = document.querySelector("#tabela-orcamentos tbody");
            if(orcTbody) orcTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carregando...</td></tr>';
            const pedTbody = document.querySelector("#tabela-pedidos tbody");
             if(pedTbody) pedTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando...</td></tr>';
            const relatorioDiv = document.getElementById('relatorio-conteudo');
            if(relatorioDiv) relatorioDiv.innerHTML = '';
        }
    });

    // Inicializar campos de moeda se não estiver logado (ou sempre ao carregar)
    limparCamposMoeda();


    console.log("Listeners configurados.");
});
/* ==== FIM SEÇÃO - EVENT LISTENERS ==== */

// === ADICIONANDO FUNÇÕES GLOBAIS (Se necessário para onclicks remanescentes) ===
// (Comentado pois os botões agora usam IDs e/ou delegação)
// window.filtrarOrcamentos = filtrarOrcamentos;
// window.filtrarPedidos = filtrarPedidos;
// window.filtrarPedidosRelatorio = filtrarPedidosRelatorio;
// window.gerarRelatorioXLSX = gerarRelatorioXLSX;
