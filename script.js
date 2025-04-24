/* ==== INÍCIO - Configuração e Inicialização do Firebase ==== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDG1NYs6CM6TDfGAPXSz1ho8_-NWs28zSg", // SUA API KEY
    authDomain: "perola-rara.firebaseapp.com",       // SEU AUTH DOMAIN
    projectId: "perola-rara",                     // SEU PROJECT ID
    storageBucket: "perola-rara.firebasestorage.app", // SEU STORAGE BUCKET
    messagingSenderId: "502232132512",               // SEU MESSAGING SENDER ID
    appId: "1:502232132512:web:59f227a7d35b39cc8752c5", // SEU APP ID
    measurementId: "G-VHVMR10RSQ"                   // SEU MEASUREMENT ID (se usar Analytics)
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Opcional
const db = getFirestore(app);
const auth = getAuth(app); // Adicionado para autenticação
const orcamentosPedidosRef = collection(db, "Orcamento-Pedido");
/* ==== FIM - Configuração e Inicialização do Firebase ==== */

/* ==== INÍCIO SEÇÃO - VARIÁVEIS GLOBAIS ==== */
let numeroOrcamento = 1;
let numeroPedido = 1;
const anoAtual = new Date().getFullYear();
let orcamentoEditando = null;
let pedidoEditando = null; // Adicionado para rastrear o pedido sendo editado
let orcamentos = [];
let pedidos = [];
let usuarioAtual = null; // Armazena o usuário logado
/* ==== FIM SEÇÃO - VARIÁVEIS GLOBAIS ==== */

/* ==== INÍCIO SEÇÃO - AUTENTICAÇÃO ==== */
// Removidas todas as referências a elementos do HTML relacionados à autenticação
// (btnRegister, btnLogin, authStatus, emailInput, passwordInput, etc.)
// Removidas as funções relacionadas à autenticação (updateAuthUI, listeners de eventos
// para botões de autenticação, monitor de estado de autenticação onAuthStateChanged).

// Mantido o botão de logout, movido para o menu
const btnLogout = document.getElementById('btnLogout'); // Agora no menu

// Função de logout (chamada pelo botão no menu)
if (btnLogout) { //Verifica se existe o botão
    btnLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log("Usuário desconectado.");
             window.location.href = "./login/login.html"; // Redireciona para a tela de login
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    });
}

/* ==== FIM SEÇÃO - AUTENTICAÇÃO ==== */

/* ==== INÍCIO SEÇÃO - CARREGAR DADOS DO FIREBASE ==== */
async function carregarDados() {
    if (!usuarioAtual) {
        // Se não tiver usuário, não carrega nada.
        return;
    }

    try {
        orcamentos = [];
        pedidos = [];
        // Consulta com ordenação
        const q = query(orcamentosPedidosRef, orderBy("numero"));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;

            if (data.tipo === 'orcamento') {
                orcamentos.push(data);
                numeroOrcamento = Math.max(numeroOrcamento, parseInt(data.numero.split('/')[0]) + 1);
            } else if (data.tipo === 'pedido') {
                pedidos.push(data);
                numeroPedido = Math.max(numeroPedido, parseInt(data.numero.split('/')[0]) + 1);
            }
        });
        console.log("Dados carregados do Firebase:", orcamentos, pedidos);
        mostrarOrcamentosGerados();
        mostrarPedidosRealizados();

    } catch (error) {
        console.error("Erro ao carregar dados do Firebase:", error);
        alert("Erro ao carregar dados do Firebase. Veja o console para detalhes.");
    }
}

/* ==== FIM SEÇÃO - CARREGAR DADOS DO FIREBASE ==== */

/* ==== INÍCIO SEÇÃO - FUNÇÕES AUXILIARES ==== */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarEntradaMoeda(input) {
    if (!input.value) {
        input.value = 'R$ 0,00'; // Garante que o campo não fique vazio e formata como moeda zero
        return;
    }
    let valor = input.value.replace(/\D/g, '');
    valor = (valor / 100).toFixed(2) + '';
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    input.value = 'R$ ' + valor;
}


function converterMoedaParaNumero(valor) {
    if (typeof valor !== 'string') {
        console.warn('converterMoedaParaNumero recebeu um valor não string:', valor);
        return 0;
    }
    return parseFloat(valor.replace(/R\$\s?|\./g, '').replace(',', '.')) || 0;
}

function limparCamposMoeda() {
    const camposMoeda = ['valorFrete', 'valorOrcamento', 'total', 'entrada', 'restante', 'margemLucro', 'custoMaoDeObra',
                         'valorFreteEdicao', 'valorPedidoEdicao', 'totalEdicao', 'entradaEdicao', 'restanteEdicao', 'margemLucroEdicao', 'custoMaoDeObraEdicao'];
    camposMoeda.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.value = 'R$ 0,00'; // Define para 'R$ 0,00' em vez de '0,00'
        }
    });
}


function adicionarProduto() {
    const tbody = document.querySelector("#tabelaProdutos tbody");
    const newRow = tbody.insertRow();

    const cellQuantidade = newRow.insertCell();
    const cellDescricao = newRow.insertCell();
    const cellValorUnit = newRow.insertCell();
    const cellValorTotal = newRow.insertCell();
    const cellAcoes = newRow.insertCell();

    cellQuantidade.innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1">';
    cellDescricao.innerHTML = '<input type="text" class="produto-descricao">';
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00">'; // Valor inicial formatado
    cellValorTotal.textContent = formatarMoeda(0);
    cellAcoes.innerHTML = '<button type="button" onclick="excluirProduto(this)">Excluir</button>';
}

function adicionarProdutoEdicao() {
    const tbody = document.querySelector("#tabelaProdutosEdicao tbody");
    const newRow = tbody.insertRow();

    const cellQuantidade = newRow.insertCell();
    const cellDescricao = newRow.insertCell();
    const cellValorUnit = newRow.insertCell();
    const cellValorTotal = newRow.insertCell();
    const cellAcoes = newRow.insertCell();

    cellQuantidade.innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1" onchange="atualizarTotaisEdicao()">';
    cellDescricao.innerHTML = '<input type="text" class="produto-descricao">';
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotaisEdicao()">'; // Valor inicial formatado
    cellValorTotal.textContent = formatarMoeda(0);
    cellAcoes.innerHTML = '<button type="button" onclick="excluirProdutoEdicao(this)">Excluir</button>';
}

function excluirProduto(botaoExcluir) {
    const row = botaoExcluir.parentNode.parentNode;
    row.remove();
    atualizarTotais();
}

function excluirProdutoEdicao(botaoExcluir) {
    const row = botaoExcluir.parentNode.parentNode;
    row.remove();
    atualizarTotaisEdicao();
}

function atualizarTotais() {
    let valorTotalOrcamento = 0;
    const produtos = document.querySelectorAll("#tabelaProdutos tbody tr");

    produtos.forEach(row => {
        const quantidade = parseFloat(row.querySelector(".produto-quantidade").value);
        const valorUnit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value);
        const valorTotal = quantidade * valorUnit;

        row.cells[3].textContent = formatarMoeda(valorTotal); // Atualiza o valor total do produto na tabela
        valorTotalOrcamento += valorTotal;
    });

    const valorFrete = converterMoedaParaNumero(document.getElementById("valorFrete").value);
    const total = valorTotalOrcamento + valorFrete;

    document.getElementById("valorOrcamento").value = formatarMoeda(valorTotalOrcamento);
    document.getElementById("total").value = formatarMoeda(total);
}

function atualizarTotaisEdicao() {
    let valorTotalPedido = 0;

    document.querySelectorAll("#tabelaProdutosEdicao tbody tr").forEach(row => {
        const quantidade = parseFloat(row.querySelector(".produto-quantidade").value) || 0;
        const valorUnit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value);
        const valorTotal = quantidade * valorUnit;

        row.cells[3].textContent = formatarMoeda(valorTotal);
        valorTotalPedido += valorTotal;
    });

    const valorFrete = converterMoedaParaNumero(document.getElementById("valorFreteEdicao").value);
    const valorPedido = converterMoedaParaNumero(document.getElementById("valorPedidoEdicao").value);
    const total = valorPedido + valorFrete; // Cálculo correto do total do pedido

    document.getElementById("totalEdicao").value = formatarMoeda(total); // Atualiza o total com o cálculo correto
    atualizarRestanteEdicao();
}


function atualizarRestanteEdicao() {
    const total = converterMoedaParaNumero(document.getElementById("totalEdicao").value);
    const entrada = converterMoedaParaNumero(document.getElementById("entradaEdicao").value);
    // Removido custoMaoDeObra do cálculo para corresponder à solicitação do usuário
    // const custoMaoDeObra = converterMoedaParaNumero(document.getElementById("custoMaoDeObraEdicao").value);
    // const restante = total - entrada - custoMaoDeObra;
    const restante = total - entrada; // Cálculo simplificado: Restante = Total - Entrada

    document.getElementById("restanteEdicao").value = formatarMoeda(restante);
}

function gerarNumeroFormatado(numero) {
    return numero.toString().padStart(4, '0') + '/' + anoAtual;
}

/* ==== FIM DA SEÇÃO - FUNÇÕES AUXILIARES ==== */

/* ==== INÍCIO SEÇÃO - SALVAR DADOS NO FIREBASE (COM VERIFICAÇÃO DE AUTENTICAÇÃO) ==== */
async function salvarDados(dados, tipo) {
    if (!usuarioAtual) {
        alert("Você precisa estar autenticado para salvar dados.");
        return; // Não salva se não estiver autenticado
    }
    try {
        if (dados.id) {
            const docRef = doc(orcamentosPedidosRef, dados.id);
            await setDoc(docRef, dados, { merge: true });
            console.log(`Dados ${tipo} atualizados no Firebase com ID:`, dados.id);
        } else {
            const docRef = await addDoc(orcamentosPedidosRef, { ...dados, tipo });
            console.log(`Novos dados ${tipo} salvos no Firebase com ID:`, docRef.id);
            dados.id = docRef.id;
        }
    } catch (error) {
        console.error("Erro ao salvar dados no Firebase:", error);
        alert("Erro ao salvar no Firebase. Veja o console.");
    }
}
/* ==== FIM SEÇÃO - SALVAR DADOS NO FIREBASE ==== */

/* ==== INÍCIO SEÇÃO - GERAÇÃO DE ORÇAMENTO ==== */
async function gerarOrcamento() {
    if (orcamentoEditando !== null) {
        alert("Você está no modo de edição de orçamento. Clique em 'Atualizar Orçamento' para salvar as alterações.");
        return;
    }

    const dataOrcamento = document.getElementById("dataOrcamento").value;
    const dataValidade = document.getElementById("dataValidade").value;

    const orcamento = {
        numero: gerarNumeroFormatado(numeroOrcamento),
        dataOrcamento: dataOrcamento,
        dataValidade: dataValidade,
        cliente: document.getElementById("cliente").value,
        endereco: document.getElementById("endereco").value,
        tema: document.getElementById("tema").value,
        cidade: document.getElementById("cidade").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("clienteEmail").value, // Alterado para clienteEmail
        cores: document.getElementById("cores").value,
        produtos: [],
        pagamento: Array.from(document.querySelectorAll('input[name="pagamento"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFrete").value),
        valorOrcamento: converterMoedaParaNumero(document.getElementById("valorOrcamento").value),
        total: converterMoedaParaNumero(document.getElementById("total").value),
        observacoes: document.getElementById("observacoes").value,
        pedidoGerado: false,
        numeroPedido: null,
        tipo: 'orcamento' // Definição do tipo aqui
    };

    const produtos = document.querySelectorAll("#tabelaProdutos tbody tr");
    produtos.forEach(row => {
        orcamento.produtos.push({
            quantidade: parseFloat(row.querySelector(".produto-quantidade").value),
            descricao: row.querySelector(".produto-descricao").value,
            valorUnit: converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value),
            valorTotal: converterMoedaParaNumero(row.cells[3].textContent)
        });
    });

    await salvarDados(orcamento, 'orcamento'); // Salva no Firebase
    numeroOrcamento++;
    orcamentos.push(orcamento); //Adiciona para renderizar

    document.getElementById("orcamento").reset();
    limparCamposMoeda();
    document.querySelector("#tabelaProdutos tbody").innerHTML = "";

    alert("Orçamento gerado com sucesso!");
     mostrarPagina('orcamentos-gerados'); //Adicionado
     mostrarOrcamentosGerados();          //Adicionado
     exibirOrcamentoEmHTML(orcamento); // Chamar a função para exibir o orçamento aqui
}

function exibirOrcamentoEmHTML(orcamento) {
    console.log("Função exibirOrcamentoEmHTML chamada com orçamento:", orcamento);
    const janelaOrcamento = window.open('orcamento.html', '_blank');

    janelaOrcamento.addEventListener('load', () => {
        console.log("Página orcamento.html carregada.");
        const conteudoOrcamento = janelaOrcamento.document.getElementById("conteudo-orcamento");

        if (!conteudoOrcamento) {
            console.error("Elemento #conteudo-orcamento não encontrado em orcamento.html");
            return;
        }

        const dataOrcamentoFormatada = orcamento.dataOrcamento.split('-').reverse().join('/');
        const dataValidadeFormatada = orcamento.dataValidade.split('-').reverse().join('/');

        const pagamentoFormatado = orcamento.pagamento.map(pag => {
            if (pag === 'pix') return 'PIX';
            if (pag === 'dinheiro') return 'Dinheiro';
            if (pag === 'cartaoCredito') return 'Cartão de Crédito';
            if (pag === 'cartaoDebito') return 'Cartão de Débito';
            return pag;
        }).join(', ');

        let html = `
            <h2>Orçamento Nº ${orcamento.numero}</h2>
            <div class="info-orcamento">
                <strong>Data do Orçamento:</strong> ${dataOrcamentoFormatada}<br>
                <strong>Data de Validade:</strong> ${dataValidadeFormatada}<br>
                <strong>Cliente:</strong> ${orcamento.cliente}<br>
                <strong>Endereço:</strong> ${orcamento.endereco}<br>
                <strong>Cidade:</strong> ${orcamento.cidade}<br>
                <strong>Telefone:</strong> ${orcamento.telefone}<br>
                <strong>E-mail:</strong> ${orcamento.email}<br>
                ${orcamento.tema ? `<strong>Tema:</strong> ${orcamento.tema}<br>` : ''}
                ${orcamento.cores ? `<strong>Cores:</strong> ${orcamento.cores}<br>` : ''}
            </div>
            <h3>Produtos</h3>
            <table>
                <thead>
                    <tr>
                        <th>Quantidade</th>
                        <th>Descrição do Produto</th>
                        <th>Valor Unit.</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        orcamento.produtos.forEach(produto => {
            html += `
                <tr>
                    <td>${produto.quantidade}</td>
                    <td>${produto.descricao}</td>
                    <td>${formatarMoeda(produto.valorUnit)}</td>
                    <td>${formatarMoeda(produto.valorTotal)}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <div class="espaco-tabela"></div>
            <div class="info-orcamento">
                <strong>Pagamento:</strong> ${pagamentoFormatado}<br>
                <strong>Valor do Frete:</strong> ${formatarMoeda(orcamento.valorFrete)}<br>
                <strong>Valor do Orçamento:</strong> ${formatarMoeda(orcamento.valorOrcamento)}<br>
                <strong>Total:</strong> ${formatarMoeda(orcamento.total)}<br>
                ${orcamento.observacoes ? `<strong>Observações:</strong> ${orcamento.observacoes}<br>` : ''}
            </div>
        `;

        conteudoOrcamento.innerHTML = html;
        console.log("Conteúdo do orçamento inserido em orcamento.html");
    });
}

/* ==== FIM SEÇÃO - GERAÇÃO DE ORÇAMENTO ==== */

/* ==== INÍCIO SEÇÃO - ORÇAMENTOS GERADOS ==== */
function mostrarOrcamentosGerados() {
    const tbody = document.querySelector("#tabela-orcamentos tbody");
    tbody.innerHTML = '';

    orcamentos.forEach(orcamento => {  // Usa a variável global 'orcamentos'
        const row = tbody.insertRow();
        const cellNumero = row.insertCell();
        const cellData = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellNumeroPedido = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = orcamento.numero;
        cellData.textContent = orcamento.dataOrcamento;
        cellCliente.textContent = orcamento.cliente;
        cellTotal.textContent = formatarMoeda(orcamento.total);
        cellNumeroPedido.textContent = orcamento.numeroPedido || 'N/A';

        let buttonVisualizar = document.createElement('button');
        buttonVisualizar.textContent = 'Visualizar';
        buttonVisualizar.classList.add('btnVisualizarOrcamento'); // Adicione uma classe para selecionar depois
        cellAcoes.appendChild(buttonVisualizar);

        if (!orcamento.pedidoGerado) {
            cellAcoes.innerHTML = `<button type="button" class="btnEditarOrcamento" data-orcamento-id="${orcamento.id}">Editar</button>
                                   `; // Removido o botão visualizar daqui, ele já foi adicionado acima
            let buttonGerarPedido = document.createElement('button');
            buttonGerarPedido.textContent = 'Gerar Pedido';
            buttonGerarPedido.classList.add('btnGerarPedido');
            buttonGerarPedido.dataset.orcamentoId = orcamento.id;
            cellAcoes.appendChild(buttonGerarPedido);
        }
    });

      // Adicionar event listeners para botões dinâmicos (depois de inseridos no DOM)
    const btnsEditarOrcamento = document.querySelectorAll('.btnEditarOrcamento');
    btnsEditarOrcamento.forEach(btn => {
        btn.addEventListener('click', function() {
            const orcamentoId = this.dataset.orcamentoId;
            editarOrcamento(orcamentoId);
        });
    });

    const btnsGerarPedido = document.querySelectorAll('.btnGerarPedido');
    btnsGerarPedido.forEach(btn => {
        btn.addEventListener('click', function() {
            const orcamentoId = this.dataset.orcamentoId;
            gerarPedido(orcamentoId);
        });
    });

    // Novos event listeners para os botões "Visualizar"
    const btnsVisualizarOrcamento = document.querySelectorAll('.btnVisualizarOrcamento');
    btnsVisualizarOrcamento.forEach(btn => {
        btn.addEventListener('click', function() {
            // Encontra o orçamento correspondente na lista `orcamentos` (você pode precisar de um dataset-id se não estiver funcionando corretamente)
            const numeroOrcamentoBotao = this.closest('tr').cells[0].textContent; // Pega o número da linha
            const orcamentoParaVisualizar = orcamentos.find(orcamento => orcamento.numero === numeroOrcamentoBotao);
            if (orcamentoParaVisualizar) {
                exibirOrcamentoEmHTML(orcamentoParaVisualizar);
                console.log('Visualizar Orçamento:', orcamentoParaVisualizar);
            } else {
                console.error("Orçamento não encontrado para visualização.");
            }
        });
    });
}

function filtrarOrcamentos() {
    const dataInicio = document.getElementById('filtroDataInicioOrcamento').value;
    const dataFim = document.getElementById('filtroDataFimOrcamento').value;
    const numeroOrcamentoFiltro = parseInt(document.getElementById('filtroNumeroOrcamento').value);
    const anoOrcamentoFiltro = parseInt(document.getElementById('filtroAnoOrcamento').value);
    const clienteOrcamentoFiltro = document.getElementById('filtroClienteOrcamento').value.toLowerCase();

    const orcamentosFiltrados = orcamentos.filter(orcamento => {
        const [numOrcamento, anoOrcamento] = orcamento.numero.split('/');
        const dataOrcamento = new Date(orcamento.dataOrcamento);
        const nomeCliente = orcamento.cliente.toLowerCase();

        return (!dataInicio || dataOrcamento >= new Date(dataInicio)) &&
               (!dataFim || dataOrcamento <= new Date(dataFim)) &&
               (!numeroOrcamentoFiltro || parseInt(numOrcamento) === numeroOrcamentoFiltro) &&
               (!anoOrcamentoFiltro || parseInt(anoOrcamento) === anoOrcamentoFiltro) &&
               nomeCliente.includes(clienteOrcamentoFiltro);
    });

    atualizarListaOrcamentos(orcamentosFiltrados);
}

function atualizarListaOrcamentos(orcamentosFiltrados) {
    const tbody = document.querySelector("#tabela-orcamentos tbody");
    tbody.innerHTML = '';

    orcamentosFiltrados.forEach(orcamento => {
        const row = tbody.insertRow();
        const cellNumero = row.insertCell();
        const cellData = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellNumeroPedido = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = orcamento.numero;
        cellData.textContent = orcamento.dataOrcamento;
        cellCliente.textContent = orcamento.cliente;
        cellTotal.textContent = formatarMoeda(orcamento.total);
        cellNumeroPedido.textContent = orcamento.numeroPedido || 'N/A';

        let buttonVisualizar = document.createElement('button');
        buttonVisualizar.textContent = 'Visualizar';
        buttonVisualizar.classList.add('btnVisualizarOrcamento'); // Adicione uma classe para selecionar depois
        cellAcoes.appendChild(buttonVisualizar);

         if (!orcamento.pedidoGerado) {
             cellAcoes.innerHTML = `<button type="button" class="btnEditarOrcamento" data-orcamento-id="${orcamento.id}">Editar</button>
                                    `; // Removido o botão visualizar daqui, ele já foi adicionado acima
            let buttonGerarPedido = document.createElement('button');
            buttonGerarPedido.textContent = 'Gerar Pedido';
            buttonGerarPedido.classList.add('btnGerarPedido');
            buttonGerarPedido.dataset.orcamentoId = orcamento.id;
            cellAcoes.appendChild(buttonGerarPedido);
        }
    });
      // Adicionar event listeners para botões dinâmicos (depois de inseridos no DOM)
    const btnsEditarOrcamento = document.querySelectorAll('.btnEditarOrcamento');
    btnsEditarOrcamento.forEach(btn => {
        btn.addEventListener('click', function() {
            const orcamentoId = this.dataset.orcamentoId;
            editarOrcamento(orcamentoId);
        });
    });

    const btnsGerarPedido = document.querySelectorAll('.btnGerarPedido');
    btnsGerarPedido.forEach(btn => {
        btn.addEventListener('click', function() {
            const orcamentoId = this.dataset.orcamentoId;
            gerarPedido(orcamentoId);
        });
    });
      // Novos event listeners para os botões "Visualizar"
    const btnsVisualizarOrcamento = document.querySelectorAll('.btnVisualizarOrcamento');
    btnsVisualizarOrcamento.forEach(btn => {
        btn.addEventListener('click', function() {
            // Encontra o orçamento correspondente na lista `orcamentos` (você pode precisar de um dataset-id se não estiver funcionando corretamente)
            const numeroOrcamentoBotao = this.closest('tr').cells[0].textContent; // Pega o número da linha
            const orcamentoParaVisualizar = orcamentos.find(orcamento => orcamento.numero === numeroOrcamentoBotao);
            if (orcamentoParaVisualizar) {
                exibirOrcamentoEmHTML(orcamentoParaVisualizar);
                console.log('Visualizar Orçamento:', orcamentoParaVisualizar);
            } else {
                console.error("Orçamento não encontrado para visualização.");
            }
        });
    });
}

function editarOrcamento(orcamentoId) {
    const orcamento = orcamentos.find(o => o.id === orcamentoId);
    if (!orcamento) {
        alert("Orçamento não encontrado.");
        return;
    }

    if (orcamento.pedidoGerado) {
        alert("Não é possível editar um orçamento que já gerou um pedido.");
        return;
    }

    orcamentoEditando = orcamento.id; // Usando o ID agora

    document.getElementById("dataOrcamento").value = orcamento.dataOrcamento;
    document.getElementById("dataValidade").value = orcamento.dataValidade;
    document.getElementById("cliente").value = orcamento.cliente;
    document.getElementById("endereco").value = orcamento.endereco;
    document.getElementById("tema").value = orcamento.tema;
    document.getElementById("cidade").value = orcamento.cidade;
    document.getElementById("telefone").value = orcamento.telefone;
    document.getElementById("clienteEmail").value = orcamento.email; // Alterado para clienteEmail
    document.getElementById("cores").value = orcamento.cores;
    document.getElementById("valorFrete").value = formatarMoeda(orcamento.valorFrete);
    document.getElementById("valorOrcamento").value = formatarMoeda(orcamento.valorOrcamento);
    document.getElementById("total").value = formatarMoeda(orcamento.total);
    document.getElementById("observacoes").value = orcamento.observacoes;

    const tbody = document.querySelector("#tabelaProdutos tbody");
    tbody.innerHTML = '';
    orcamento.produtos.forEach(produto => {
        const row = tbody.insertRow();
        const cellQuantidade = row.insertCell();
        const cellDescricao = row.insertCell();
        const cellValorUnit = row.insertCell();
        const cellValorTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellQuantidade.innerHTML = `<input type="number" class="produto-quantidade" value="${produto.quantidade}" min="1">`;
        cellDescricao.innerHTML = `<input type="text" class="produto-descricao" value="${produto.descricao}">`;
        cellValorUnit.innerHTML = `<input type="text" class="produto-valor-unit" value="${formatarMoeda(produto.valorUnit)}">`;
        cellValorTotal.textContent = formatarMoeda(produto.valorTotal);
        cellAcoes.innerHTML = '<button type="button" onclick="excluirProduto(this)">Excluir</button>';
    });

    document.querySelectorAll('input[name="pagamento"]').forEach(el => {
        el.checked = orcamento.pagamento.includes(el.value);
    });

    mostrarPagina('form-orcamento');
    document.getElementById("btnGerarOrcamento").style.display = "none";
    document.getElementById("btnAtualizarOrcamento").style.display = "inline-block";
}

async function atualizarOrcamento() {
    if (orcamentoEditando === null) {
        alert("Nenhum orçamento está sendo editado.");
        return;
    }

  const orcamentoIndex = orcamentos.findIndex(o => o.id === orcamentoEditando); // Find by ID
    if (orcamentoIndex === -1) {
        alert("Orçamento não encontrado.");
        return;
    }

    const orcamentoAtualizado = {
        ...orcamentos[orcamentoIndex], // Mantém os dados existentes
        dataOrcamento: document.getElementById("dataOrcamento").value,
        dataValidade: document.getElementById("dataValidade").value,
        cliente: document.getElementById("cliente").value,
        endereco: document.getElementById("endereco").value,
        tema: document.getElementById("tema").value,
        cidade: document.getElementById("cidade").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("clienteEmail").value, // Alterado para clienteEmail
        cores: document.getElementById("cores").value,
        produtos: [], // Começa com um array vazio e preenche abaixo
        pagamento: Array.from(document.querySelectorAll('input[name="pagamento"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFrete").value),
        valorOrcamento: converterMoedaParaNumero(document.getElementById("valorOrcamento").value),
        total: converterMoedaParaNumero(document.getElementById("total").value),
        observacoes: document.getElementById("observacoes").value,
        tipo: 'orcamento' // Explicitamente define o tipo
    };

    const produtos = document.querySelectorAll("#tabelaProdutos tbody tr");
    produtos.forEach(row => {
        orcamentoAtualizado.produtos.push({ // Preenche o array de produtos
            quantidade: parseFloat(row.querySelector(".produto-quantidade").value),
                       descricao: row.querySelector(".produto-descricao").value,
            valorUnit: converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value),
            valorTotal: converterMoedaParaNumero(row.cells[3].textContent)
        });
    });

    orcamentos[orcamentoIndex] = orcamentoAtualizado; // Atualiza no array local
    await salvarDados(orcamentoAtualizado, 'orcamento'); // Salva no Firebase

    document.getElementById("orcamento").reset();
    limparCamposMoeda();
    document.querySelector("#tabelaProdutos tbody").innerHTML = "";

    alert("Orçamento atualizado com sucesso!");

    orcamentoEditando = null; // Reseta o estado de edição
    document.getElementById("btnGerarOrcamento").style.display = "inline-block";
    document.getElementById("btnAtualizarOrcamento").style.display = "none";

    mostrarPagina('orcamentos-gerados');
    mostrarOrcamentosGerados();
}
/* ==== FIM SEÇÃO - ORÇAMENTOS GERADOS ==== */

/* ==== INÍCIO SEÇÃO - GERAR PEDIDO A PARTIR DO ORÇAMENTO ==== */
async function gerarPedido(orcamentoId) {
    const orcamento = orcamentos.find(o => o.id === orcamentoId);
    if (!orcamento) {
        alert("Orçamento não encontrado.");
        return;
    }

    if (orcamento.pedidoGerado) {
        alert("Um pedido já foi gerado para este orçamento.");
        return;
    }

    const pedido = {
        numero: gerarNumeroFormatado(numeroPedido),
        dataPedido: new Date().toISOString().split('T')[0],
        dataEntrega: orcamento.dataValidade,
        cliente: orcamento.cliente,
        endereco: orcamento.endereco,
        tema: orcamento.tema,
        cidade: orcamento.cidade,
        telefone: orcamento.telefone,
        email: orcamento.email, // Mantém email (copia do orçamento)
        cores: orcamento.cores,
        pagamento: orcamento.pagamento,
        valorFrete: orcamento.valorFrete,
        valorOrcamento: orcamento.valorOrcamento,
        total: orcamento.total,
        observacoes: orcamento.observacoes,
        entrada: 0,
        restante: orcamento.total,
        margemLucro: converterMoedaParaNumero(String(orcamento.margemLucro)) || 0,
        custoMaoDeObra: converterMoedaParaNumero(String(orcamento.custoMaoDeObra)) || 0,
        valorPedido: orcamento.valorOrcamento,
        produtos: orcamento.produtos.map(p => ({
            ...p,
            valorTotal: p.quantidade * p.valorUnit
        })),
      tipo: 'pedido' //Adicionado

    };

    delete pedido.dataValidade;

    await salvarDados(pedido, 'pedido');
    numeroPedido++;
    pedidos.push(pedido); // Adiciona o novo pedido ao array local

    orcamento.numeroPedido = pedido.numero;
    orcamento.pedidoGerado = true;
    await salvarDados(orcamento, 'orcamento');

    alert(`Pedido Nº ${pedido.numero} gerado com sucesso a partir do orçamento Nº ${orcamento.numero}!`);
    mostrarPagina('lista-pedidos');
    mostrarPedidosRealizados();
    mostrarOrcamentosGerados(); // Atualiza a lista de orçamentos
}
/* ==== FIM SEÇÃO - GERAR PEDIDO A PARTIR DO ORÇAMENTO ==== */

/* ==== INÍCIO SEÇÃO - PEDIDOS REALIZADOS ==== */
function mostrarPedidosRealizados() {
    const tbody = document.querySelector("#tabela-pedidos tbody");
    tbody.innerHTML = '';

    pedidos.forEach(pedido => {
        const row = tbody.insertRow();
        const cellNumero = row.insertCell();
        const cellDataPedido = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = pedido.numero;
        cellDataPedido.textContent = pedido.dataPedido;
        cellCliente.textContent = pedido.cliente;
        cellTotal.textContent = formatarMoeda(pedido.total);
        cellAcoes.innerHTML = `<button type="button" class="btnEditarPedido" data-pedido-id="${pedido.id}">Editar</button>`;
    });

    // Adicionar event listeners para botões dinâmicos (depois de inseridos no DOM)
    const btnsEditarPedido = document.querySelectorAll('.btnEditarPedido');
    btnsEditarPedido.forEach(btn => {
        btn.addEventListener('click', function() {
            const pedidoId = this.dataset.pedidoId;
            editarPedido(pedidoId);
        });
    });
}

function filtrarPedidos() {
    const dataInicio = document.getElementById('filtroDataInicioPedido').value;
    const dataFim = document.getElementById('filtroDataFimPedido').value;
    const numeroPedidoFiltro = parseInt(document.getElementById('filtroNumeroPedido').value);
    const anoPedidoFiltro = parseInt(document.getElementById('filtroAnoPedido').value);
    const clientePedidoFiltro = document.getElementById('filtroClientePedido').value.toLowerCase();

    const pedidosFiltrados = pedidos.filter(pedido => {
        const [numPedido, anoPedido] = pedido.numero.split('/');
        const dataPedido = new Date(pedido.dataPedido);
        const nomeCliente = pedido.cliente.toLowerCase();

        return (!dataInicio || dataPedido >= new Date(dataInicio)) &&
               (!dataFim || dataPedido <= new Date(dataFim)) &&
               (!numeroPedidoFiltro || parseInt(numPedido) === numeroPedidoFiltro) &&
               (!anoPedidoFiltro || parseInt(anoPedido) === anoPedidoFiltro) &&
               nomeCliente.includes(clientePedidoFiltro);
    });

    atualizarListaPedidos(pedidosFiltrados);
}

function atualizarListaPedidos(pedidosFiltrados) {
    const tbody = document.querySelector("#tabela-pedidos tbody");
    tbody.innerHTML = '';

    pedidosFiltrados.forEach(pedido => {
        const row = tbody.insertRow();
        const cellNumero = row.insertCell();
        const cellDataPedido = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = pedido.numero;
        cellDataPedido.textContent = pedido.dataPedido;
        cellCliente.textContent = pedido.cliente;
        cellTotal.textContent = formatarMoeda(pedido.total);
        cellAcoes.innerHTML = `<button type="button" class="btnEditarPedido" data-pedido-id="${pedido.id}">Editar</button>`;
    });
      // Adicionar event listeners para botões dinâmicos (depois de inseridos no DOM)
    const btnsEditarPedido = document.querySelectorAll('.btnEditarPedido');
    btnsEditarPedido.forEach(btn => {
        btn.addEventListener('click', function() {
            const pedidoId = this.dataset.pedidoId;
            editarPedido(pedidoId);
        });
    });
}

function editarPedido(pedidoId) {
    pedidoEditando = pedidoId; // Define o pedidoEditando para o ID do pedido que está sendo editado
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) {
        alert("Pedido não encontrado.");
        return;
    }

    document.getElementById("dataPedidoEdicao").value = pedido.dataPedido;
    document.getElementById("dataEntregaEdicao").value = pedido.dataEntrega;
    document.getElementById("clienteEdicao").value = pedido.cliente;
    document.getElementById("enderecoEdicao").value = pedido.endereco;
    document.getElementById("temaEdicao").value = pedido.tema;
    document.getElementById("cidadeEdicao").value = pedido.cidade;
    document.getElementById("contatoEdicao").value = pedido.telefone;
    document.getElementById("coresEdicao").value = pedido.cores;
    document.getElementById("valorFreteEdicao").value = formatarMoeda(pedido.valorFrete);
    document.getElementById("valorPedidoEdicao").value = formatarMoeda(pedido.valorPedido);
    document.getElementById("valorPedidoEdicao").onblur = atualizarTotaisEdicao; // Garante que o onblur está definido
    document.getElementById("totalEdicao").value = formatarMoeda(pedido.total);
    document.getElementById("entradaEdicao").value = formatarMoeda(pedido.entrada);
    document.getElementById("restanteEdicao").value = formatarMoeda(pedido.restante);
    document.getElementById("margemLucroEdicao").value = formatarMoeda(pedido.margemLucro);
    document.getElementById("custoMaoDeObraEdicao").value = formatarMoeda(pedido.custoMaoDeObra || 0);
    document.getElementById("observacoesEdicao").value = pedido.observacoes;

    const tbody = document.querySelector("#tabelaProdutosEdicao tbody");
    tbody.innerHTML = '';
    pedido.produtos.forEach(produto => {
        const row = tbody.insertRow();
        const cellQuantidade = row.insertCell();
        const cellDescricao = row.insertCell();
        const cellValorUnit = row.insertCell();
        const cellValorTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellQuantidade.innerHTML = `<input type="number" class="produto-quantidade" value="${produto.quantidade}" min="1" onchange="atualizarTotaisEdicao()">`;
        cellDescricao.innerHTML = `<input type="text" class="produto-descricao" value="${produto.descricao}">`;
        cellValorUnit.innerHTML = `<input type="text" class="produto-valor-unit" value="${formatarMoeda(produto.valorUnit)}" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotaisEdicao()">`;
        cellValorTotal.textContent = formatarMoeda(produto.valorTotal);
        cellAcoes.innerHTML = '<button type="button" onclick="excluirProdutoEdicao(this)">Excluir</button>';
    });

    const pagamentoCheckboxes = document.querySelectorAll('input[name="pagamentoEdicao"]');
    pagamentoCheckboxes.forEach(el => el.checked = pedido.pagamento && pedido.pagamento.includes(el.value));

    mostrarPagina('form-edicao-pedido');
}

async function atualizarPedido() {
    if (pedidoEditando === null) {
        alert("Nenhum pedido está sendo editado.");
        return;
    }

    const pedido = pedidos.find(p => p.id === pedidoEditando);
    if (!pedido) {
        alert("Pedido não encontrado para atualização.");
        return;
    }

    const pedidoAtualizado = {
        ...pedido, // Mantém os dados existentes e o ID original
        dataPedido: document.getElementById("dataPedidoEdicao").value,
        dataEntrega: document.getElementById("dataEntregaEdicao").value,
        cliente: document.getElementById("clienteEdicao").value,
        endereco: document.getElementById("enderecoEdicao").value,
        tema: document.getElementById("temaEdicao").value,
        cidade: document.getElementById("cidadeEdicao").value,
        telefone: document.getElementById("contatoEdicao").value,
        cores: document.getElementById("coresEdicao").value,
        produtos: [],
        pagamento: Array.from(document.querySelectorAll('input[name="pagamentoEdicao"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFreteEdicao").value),
        valorPedido: converterMoedaParaNumero(document.getElementById("valorPedidoEdicao").value),
        total: converterMoedaParaNumero(document.getElementById("totalEdicao").value),
        entrada: converterMoedaParaNumero(document.getElementById("entradaEdicao").value),
        restante: converterMoedaParaNumero(document.getElementById("restanteEdicao").value),
        margemLucro: converterMoedaParaNumero(document.getElementById("margemLucroEdicao").value) || 0,
        custoMaoDeObra: converterMoedaParaNumero(document.getElementById("custoMaoDeObraEdicao").value) || 0,
        observacoes: document.getElementById("observacoesEdicao").value,
        tipo: 'pedido'
    };

    const produtos = document.querySelectorAll("#tabelaProdutosEdicao tbody tr");
    produtos.forEach(row => {
        pedidoAtualizado.produtos.push({
            quantidade: parseFloat(row.querySelector(".produto-quantidade").value),
            descricao: row.querySelector(".produto-descricao").value,
            valorUnit: converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value),
            valorTotal: converterMoedaParaNumero(row.cells[3].textContent)
        });
    });

    const pedidoIndex = pedidos.findIndex(p => p.id === pedidoEditando); // Encontra o índice usando pedidoEditando
    if (pedidoIndex !== -1) {
        pedidos[pedidoIndex] = pedidoAtualizado; // Atualiza o array local
    }
    await salvarDados(pedidoAtualizado, 'pedido'); // Salva no Firebase

    alert("Pedido atualizado com sucesso!");
    pedidoEditando = null; // Limpa o pedidoEditando após salvar
    mostrarPagina('lista-pedidos');
    mostrarPedidosRealizados();
}


/* ==== FIM SEÇÃO - PEDIDOS REALIZADOS ==== */

/* ==== INÍCIO SEÇÃO - RELATÓRIO ==== */
function filtrarPedidosRelatorio() {
    const dataInicio = document.getElementById('filtroDataInicio').value;
    const dataFim = document.getElementById('filtroDataFim').value;

    const pedidosFiltrados = pedidos.filter(pedido => {
        const dataPedido = new Date(pedido.dataPedido);
        const inicio = dataInicio ? new Date(dataInicio) : new Date('1970-01-01');
        const fim = dataFim ? new Date(dataFim) : new Date('2100-01-01');

        return dataPedido >= inicio && dataPedido <= fim;
    });

    gerarRelatorio(pedidosFiltrados);
}

function gerarRelatorio(pedidosFiltrados) {
    let totalPedidos = 0;
    let totalFrete = 0;
    let totalMargemLucro = 0;
    let totalCustoMaoDeObra = 0;

    pedidosFiltrados.forEach(pedido => {
        totalPedidos += pedido.total;
        totalFrete += pedido.valorFrete;
        totalMargemLucro += converterMoedaParaNumero(String(pedido.margemLucro));
        totalCustoMaoDeObra += converterMoedaParaNumero(String(pedido.custoMaoDeObra));
    });

    const quantidadePedidos = pedidosFiltrados.length;

    let relatorioHTML = `
        <table class="relatorio-table">
            <thead>
                <tr>
                    <th>Total de Pedidos</th>
                    <th>Total de Frete</th>
                    <th>Total de Margem de Lucro</th>
                    <th>Total de Custo de Mão de Obra</th>
                    <th>Quantidade de Pedidos</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${formatarMoeda(totalPedidos)}</td>
                    <td>${formatarMoeda(totalFrete)}</td>
                    <td>${formatarMoeda(totalMargemLucro)}</td>
                    <td>${formatarMoeda(totalCustoMaoDeObra)}</td>
                    <td>${quantidadePedidos}</td>
                </tr>
            </tbody>
        </table>
        <table class="relatorio-table" style="margin-top: 20px;">
            <thead>
                <tr>
                    <th>Número do Pedido</th>
                    <th>Data do Pedido</th>
                    <th>Cliente</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    pedidosFiltrados.forEach(pedido => {
        relatorioHTML += `
                <tr>
                    <td>${pedido.numero}</td>
                    <td>${pedido.dataPedido}</td>
                    <td>${pedido.cliente}</td>
                    <td>${formatarMoeda(pedido.total)}</td>
                </tr>
        `;
    });

    relatorioHTML += `
            </tbody>
        </table>
    `;


    document.getElementById('relatorio-conteudo').innerHTML = relatorioHTML;
}


function gerarRelatorioXLSX() {
    const relatorioTable = document.querySelector('#relatorio-conteudo'); // Seleciona o container do relatório
    if (!relatorioTable || !relatorioTable.innerHTML.includes('<table')) { // Verifica se a tabela está dentro do container
        alert('Erro: Tabela de relatório não encontrada. Gere o relatório primeiro.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(relatorioTable.querySelector('table')); // Seleciona a tabela dentro do container
    XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
    XLSX.writeFile(wb, "relatorio_pedidos.xlsx");
}
/* ==== FIM SEÇÃO - RELATÓRIO ==== */

/* ==== INÍCIO SEÇÃO - FUNÇÕES DE CONTROLE DE PÁGINA ==== */
function mostrarPagina(idPagina) {
    const paginas = document.querySelectorAll('.pagina');
    paginas.forEach(pagina => {
        pagina.style.display = 'none';
    });

    document.getElementById(idPagina).style.display = 'block';
}

/* ==== FIM SEÇÃO - FUNÇÕES DE CONTROLE DE PÁGINA ==== */

document.addEventListener('DOMContentLoaded', () => {
    // ==== EVENT LISTENERS PARA OS MENUS ====
    const menuLinks = document.querySelectorAll('nav ul li a[data-pagina]'); // Seleciona links do menu com data-pagina
    menuLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // Evita o comportamento padrão do link (ir para # e recarregar a página)
            const paginaId = link.dataset.pagina; // Pega o ID da página do atributo data-pagina
            mostrarPagina(paginaId); // Chama sua função mostrarPagina
            // Funções adicionais a serem chamadas ao clicar em certos menus (se necessário)
            if (paginaId === 'orcamentos-gerados') mostrarOrcamentosGerados();
            if (paginaId === 'lista-pedidos') mostrarPedidosRealizados();
        });
    });

    // ==== EVENT LISTENERS PARA BOTÕES DOS FORMULÁRIOS ====
    // Botão "Adicionar Produto" (Formulário de Orçamento)
    const btnAdicionarProdutoOrcamento = document.querySelector('#btnAddProdutoOrcamento');
    if (btnAdicionarProdutoOrcamento) { // Verifica se o botão existe no DOM
        btnAdicionarProdutoOrcamento.addEventListener('click', adicionarProduto); // Associa a função adicionarProduto ao evento de clique
    }

    // Botão "Adicionar Produto" (Formulário de Edição de Pedido)
    const btnAdicionarProdutoEdicaoForm = document.querySelector('#btnAddProdutoEdicao');
    if (btnAdicionarProdutoEdicaoForm) {
        btnAdicionarProdutoEdicaoForm.addEventListener('click', adicionarProdutoEdicao);
    }

    // Botão "Gerar Orçamento"
    const btnGerarOrcamentoForm = document.querySelector('#btnGerarOrcamento');
    if (btnGerarOrcamentoForm) {
        btnGerarOrcamentoForm.addEventListener('click', gerarOrcamento);
    }

    // Botão "Atualizar Orçamento"
    const btnAtualizarOrcamentoForm = document.querySelector('#btnAtualizarOrcamento');
    if (btnAtualizarOrcamentoForm) {
        btnAtualizarOrcamentoForm.addEventListener('click', atualizarOrcamento);
    }

    // Botão "Salvar Alterações" (Formulário de Edição de Pedido)
    const btnSalvarAlteracoesPedido = document.querySelector('#btnSalvarPedidoEdicao');
    if (btnSalvarAlteracoesPedido) {
        btnSalvarAlteracoesPedido.addEventListener('click', atualizarPedido);
    }

    // Botões "Filtrar" (Orçamentos Gerados)
    const btnFiltrarOrcamentos = document.querySelector('#orcamentos-gerados .filtro-data button');
    if (btnFiltrarOrcamentos) {
        btnFiltrarOrcamentos.addEventListener('click', filtrarOrcamentos);
    }

    // Botões "Filtrar" (Pedidos Realizados)
    const btnFiltrarPedidos = document.querySelector('#lista-pedidos .filtro-data button');
    if (btnFiltrarPedidos) {
        btnFiltrarPedidos.addEventListener('click', filtrarPedidos);
    }

     // Botões "Gerar Relatório" (Relatório)
    const btnGerarRelatorio = document.querySelector('#relatorio .filtro-data button');
    if (btnGerarRelatorio) {
        btnGerarRelatorio.addEventListener('click', filtrarPedidosRelatorio); // Use filtrarPedidosRelatorio para o relatório
    }

    // Botão "Exportar Relatório (XLSX)" (Relatório)
    const btnExportarRelatorioXLSX = document.querySelector('#relatorio button[onclick="gerarRelatorioXLSX()"]');
    if (btnExportarRelatorioXLSX) {
        btnExportarRelatorioXLSX.addEventListener('click', gerarRelatorioXLSX);
    }

    // ==== RECUPERAÇÃO DE SENHA ====
    //Removida a recuperação de senha

    // ==== ADICIONANDO EVENT LISTENERS PROGRAMATICAMENTE ====

    // Event listeners para inputs de quantidade de produtos (tabela de orçamento)
    document.querySelectorAll('#tabelaProdutos tbody').forEach(tbody => {
        tbody.addEventListener('change', function(event) {
            if (event.target.classList.contains('produto-quantidade')) {
                atualizarTotais();
            }
        });
    });

    // Event listeners para inputs de valor unitário de produtos (tabela de orçamento)
    document.querySelectorAll('#tabelaProdutos tbody').forEach(tbody => {
        tbody.addEventListener('input', function(event) {
            if (event.target.classList.contains('produto-valor-unit')) {
                formatarEntradaMoeda(event.target);
                atualizarTotais(); // CHAME A FUNÇÃO AQUI TAMBÉM NO EVENTO 'input'
            }
        });
        tbody.addEventListener('blur', function(event) {
            if (event.target.classList.contains('produto-valor-unit')) {
                atualizarTotais();
            }
        });
    });

    // Event listeners para o input de valor do frete (formulário de orçamento)
    const valorFreteInput = document.getElementById('valorFrete');
    if (valorFreteInput) {
        valorFreteInput.addEventListener('input', function() {
            formatarEntradaMoeda(this);
        });
        valorFreteInput.addEventListener('blur', atualizarTotais);
    }

     // Event listeners para inputs de quantidade de produtos (tabela de edição de pedido)
    document.querySelectorAll('#tabelaProdutosEdicao tbody').forEach(tbody => {
        tbody.addEventListener('change', function(event) {
            if (event.target.classList.contains('produto-quantidade')) {
                atualizarTotaisEdicao();
            }
        });
    });

    // Event listeners para inputs de valor unitário de produtos (tabela de edição de pedido)
    document.querySelectorAll('#tabelaProdutosEdicao tbody').forEach(tbody => {
        tbody.addEventListener('input', function(event) {
            if (event.target.classList.contains('produto-valor-unit')) {
                formatarEntradaMoeda(event.target);
                atualizarTotaisEdicao(); // CHAME A FUNÇÃO AQUI TAMBÉM NO EVENTO 'input'
            }
        });
        tbody.addEventListener('blur', function(event) {
            if (event.target.classList.contains('produto-valor-unit')) {
                atualizarTotaisEdicao();
            }
        });
    });

    // Event listeners para o input de valor do frete (formulário de edição de pedido)
    const valorFreteEdicaoInput = document.getElementById('valorFreteEdicao');
    if (valorFreteEdicaoInput) {
        valorFreteEdicaoInput.addEventListener('input', function() {
            formatarEntradaMoeda(this);
        });
        valorFreteEdicaoInput.addEventListener('blur', atualizarTotaisEdicao);
    }

     // Event listeners para o input de valor do pedido (formulário de edição de pedido)
    const valorPedidoEdicaoInput = document.getElementById('valorPedidoEdicao');
    if (valorPedidoEdicaoInput) {
        valorPedidoEdicaoInput.addEventListener('input', function() {
            formatarEntradaMoeda(this);
        });
        valorPedidoEdicaoInput.addEventListener('blur', atualizarTotaisEdicao);
    }

    // Event listener para o input de Entrada no formulário de edição de pedido
    const entradaEdicaoInput = document.getElementById('entradaEdicao');
    if (entradaEdicaoInput) {
        entradaEdicaoInput.addEventListener('input', function() {
            formatarEntradaMoeda(this);
            atualizarRestanteEdicao(); // Atualiza o restante ao digitar a entrada
        });
        entradaEdicaoInput.addEventListener('blur', atualizarRestanteEdicao); // Garante que atualiza no blur também
    }

    // ==== FIM - ADICIONANDO EVENT LISTENERS PROGRAMATICAMENTE ====

       // Monitor de estado de autenticação (agora em script.js)
    onAuthStateChanged(auth, (user) => {
        usuarioAtual = user;
        if (user) {
           //Se tiver usuário logado
            console.log("Usuário autenticado:", user.email);
            btnLogout.style.display = "inline-block"; // Mostra o botão de logout
            carregarDados(); // Carrega os dados
        } else {
            // Se não tiver usuário logado
            console.log("Nenhum usuário autenticado.");
            btnLogout.style.display = "none";  // Oculta o botão de logout
            // Limpa os dados (opcional, dependendo do seu caso de uso)
            orcamentos = [];
            pedidos = [];
            numeroOrcamento = 1;
            numeroPedido = 1;
            mostrarOrcamentosGerados();
            mostrarPedidosRealizados();
             window.location.href = "./login/login.html"; // Redireciona para login
        }
    });


    // Inicializar campos moeda para 'R$ 0,00' no carregamento da página
    limparCamposMoeda();
});
