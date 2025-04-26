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
// Botão de logout no menu
const btnLogout = document.getElementById('btnLogout');

// Função de logout (chamada pelo botão no menu)
if (btnLogout) { // Verifica se existe o botão
    btnLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log("Usuário desconectado.");
            // A limpeza e redirecionamento agora são feitos pelo onAuthStateChanged
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    });
}
/* ==== FIM SEÇÃO - AUTENTICAÇÃO ==== */

/* ==== INÍCIO SEÇÃO - CARREGAR DADOS DO FIREBASE ==== */
async function carregarDados() {
    if (!usuarioAtual) {
        console.log("Nenhum usuário logado, carregamento de dados ignorado.");
        return;
    }

    console.log("Usuário logado, carregando dados...");
    try {
        orcamentos = [];
        pedidos = [];
        numeroOrcamento = 1; // Resetar contadores ao carregar
        numeroPedido = 1;    // Resetar contadores ao carregar

        const q = query(orcamentosPedidosRef, orderBy("numero"));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;

            const numeroSequencial = parseInt(data.numero.split('/')[0]);

            if (data.tipo === 'orcamento') {
                orcamentos.push(data);
                numeroOrcamento = Math.max(numeroOrcamento, numeroSequencial + 1);
            } else if (data.tipo === 'pedido') {
                pedidos.push(data);
                numeroPedido = Math.max(numeroPedido, numeroSequencial + 1);
            }
        });
        console.log("Dados carregados do Firebase:");
        console.log("Orçamentos:", orcamentos);
        console.log("Pedidos:", pedidos);
        console.log("Próximo Nº Orçamento:", numeroOrcamento);
        console.log("Próximo Nº Pedido:", numeroPedido);

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
    const valorNumerico = Number(valor) || 0;
    return valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarEntradaMoeda(input) {
    if (!input || input.value === undefined || input.value === null) return; // Verifica se input existe
    if (!input.value) {
        input.value = 'R$ 0,00';
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
        return Number(valor) || 0;
    }
    return parseFloat(valor.replace(/R\$\s?|\./g, '').replace(',', '.')) || 0;
}

function limparCamposMoeda() {
    const camposMoeda = ['valorFrete', 'valorOrcamento', 'total', 'entrada', 'restante', 'margemLucro', 'custoMaoDeObra',
                         'valorFreteEdicao', 'valorPedidoEdicao', 'totalEdicao', 'entradaEdicao', 'restanteEdicao', 'margemLucroEdicao', 'custoMaoDeObraEdicao'];
    camposMoeda.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.value = 'R$ 0,00';
        }
    });
}

function adicionarProduto() {
    const tbody = document.querySelector("#tabelaProdutos tbody");
    if (!tbody) return;
    const newRow = tbody.insertRow();

    const cellQuantidade = newRow.insertCell();
    const cellDescricao = newRow.insertCell();
    const cellValorUnit = newRow.insertCell();
    const cellValorTotal = newRow.insertCell();
    const cellAcoes = newRow.insertCell();

    cellQuantidade.innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1" style="width: 60px;" onchange="atualizarTotais()">';
    cellDescricao.innerHTML = '<input type="text" class="produto-descricao">';
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotais()">';
    cellValorTotal.textContent = formatarMoeda(0);
    cellAcoes.innerHTML = '<button type="button" onclick="excluirProduto(this)">Excluir</button>';
}

function adicionarProdutoEdicao() {
    const tbody = document.querySelector("#tabelaProdutosEdicao tbody");
     if (!tbody) return;
    const newRow = tbody.insertRow();

    const cellQuantidade = newRow.insertCell();
    const cellDescricao = newRow.insertCell();
    const cellValorUnit = newRow.insertCell();
    const cellValorTotal = newRow.insertCell();
    const cellAcoes = newRow.insertCell();

    cellQuantidade.innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1" style="width: 60px;" onchange="atualizarTotaisEdicao()">';
    cellDescricao.innerHTML = '<input type="text" class="produto-descricao">';
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotaisEdicao()">';
    cellValorTotal.textContent = formatarMoeda(0);
    cellAcoes.innerHTML = '<button type="button" onclick="excluirProdutoEdicao(this)">Excluir</button>';
}

function excluirProduto(botaoExcluir) {
    const row = botaoExcluir.closest('tr');
    if (row) {
        row.remove();
        atualizarTotais();
    }
}

function excluirProdutoEdicao(botaoExcluir) {
    const row = botaoExcluir.closest('tr');
     if (row) {
        row.remove();
        atualizarTotaisEdicao();
    }
}

function atualizarTotais() {
    let valorTotalOrcamento = 0;
    const produtos = document.querySelectorAll("#tabelaProdutos tbody tr");

    produtos.forEach(row => {
        const quantidadeInput = row.querySelector(".produto-quantidade");
        const valorUnitInput = row.querySelector(".produto-valor-unit");
        const valorTotalCell = row.cells[3];

        if (quantidadeInput && valorUnitInput && valorTotalCell) {
            const quantidade = parseFloat(quantidadeInput.value) || 0;
            const valorUnit = converterMoedaParaNumero(valorUnitInput.value);
            const valorTotalProduto = quantidade * valorUnit;
            valorTotalCell.textContent = formatarMoeda(valorTotalProduto);
            valorTotalOrcamento += valorTotalProduto;
        } else {
            console.warn("Não foi possível encontrar elementos em uma linha da tabela de produtos (orçamento).");
        }
    });

    const valorFreteInput = document.getElementById("valorFrete");
    const valorOrcamentoInput = document.getElementById("valorOrcamento");
    const totalInput = document.getElementById("total");

    if(valorFreteInput && valorOrcamentoInput && totalInput) {
        const valorFrete = converterMoedaParaNumero(valorFreteInput.value);
        const total = valorTotalOrcamento + valorFrete;
        valorOrcamentoInput.value = formatarMoeda(valorTotalOrcamento);
        totalInput.value = formatarMoeda(total);
    } else {
        console.error("Não foi possível encontrar os campos de frete, valor do orçamento ou total.");
    }
}

function atualizarTotaisEdicao() {
    let valorTotalProdutosEdicao = 0;
    document.querySelectorAll("#tabelaProdutosEdicao tbody tr").forEach(row => {
        const quantidadeInput = row.querySelector(".produto-quantidade");
        const valorUnitInput = row.querySelector(".produto-valor-unit");
        const valorTotalCell = row.cells[3];

        if (quantidadeInput && valorUnitInput && valorTotalCell) {
            const quantidade = parseFloat(quantidadeInput.value) || 0;
            const valorUnit = converterMoedaParaNumero(valorUnitInput.value);
            const valorTotalProduto = quantidade * valorUnit;
            valorTotalCell.textContent = formatarMoeda(valorTotalProduto);
            valorTotalProdutosEdicao += valorTotalProduto;
        } else {
             console.warn("Não foi possível encontrar elementos em uma linha da tabela de produtos (edição).");
        }
    });

    const valorFreteEdicaoInput = document.getElementById("valorFreteEdicao");
    const valorPedidoEdicaoInput = document.getElementById("valorPedidoEdicao");
    const totalEdicaoInput = document.getElementById("totalEdicao");

    if(valorFreteEdicaoInput && valorPedidoEdicaoInput && totalEdicaoInput) {
        const valorFrete = converterMoedaParaNumero(valorFreteEdicaoInput.value);
        const valorPedido = converterMoedaParaNumero(valorPedidoEdicaoInput.value);
        const total = valorPedido + valorFrete;
        totalEdicaoInput.value = formatarMoeda(total);
        atualizarRestanteEdicao();
    } else {
         console.error("Não foi possível encontrar os campos de frete, valor do pedido ou total na edição.");
    }
}

function atualizarRestanteEdicao() {
    const totalEdicaoInput = document.getElementById("totalEdicao");
    const entradaEdicaoInput = document.getElementById("entradaEdicao");
    const restanteEdicaoInput = document.getElementById("restanteEdicao");

    if(totalEdicaoInput && entradaEdicaoInput && restanteEdicaoInput) {
        const total = converterMoedaParaNumero(totalEdicaoInput.value);
        const entrada = converterMoedaParaNumero(entradaEdicaoInput.value);
        const restante = total - entrada;
        restanteEdicaoInput.value = formatarMoeda(restante);
    } else {
        console.error("Não foi possível encontrar os campos total, entrada ou restante na edição.");
    }
}

function gerarNumeroFormatado(numero) {
    return numero.toString().padStart(4, '0') + '/' + anoAtual;
}
/* ==== FIM DA SEÇÃO - FUNÇÕES AUXILIARES ==== */

/* ==== INÍCIO SEÇÃO - SALVAR DADOS NO FIREBASE ==== */
async function salvarDados(dados, tipo) {
    if (!usuarioAtual) {
        alert("Você precisa estar autenticado para salvar dados.");
        console.warn("Tentativa de salvar dados sem autenticação.");
        return;
    }
    try {
        const dadosParaSalvar = { ...dados };
        delete dadosParaSalvar.id;

        if (dados.id) {
            const docRef = doc(orcamentosPedidosRef, dados.id);
            await setDoc(docRef, dadosParaSalvar, { merge: true });
            console.log(`Dados ${tipo} atualizados no Firebase com ID:`, dados.id);
        } else {
            if (!dadosParaSalvar.tipo) {
                dadosParaSalvar.tipo = tipo;
            }
            const docRef = await addDoc(orcamentosPedidosRef, dadosParaSalvar);
            console.log(`Novos dados ${tipo} salvos no Firebase com ID:`, docRef.id);
            dados.id = docRef.id;
        }
    } catch (error) {
        console.error(`Erro ao salvar dados (${tipo}) no Firebase:`, error);
        alert(`Erro ao salvar ${tipo} no Firebase. Veja o console.`);
        // Re-throw error so calling function knows it failed
        throw error;
    }
}
/* ==== FIM SEÇÃO - SALVAR DADOS NO FIREBASE ==== */

/* ==== INÍCIO SEÇÃO - GERAÇÃO DE ORÇAMENTO ==== */
async function gerarOrcamento() {
    if (orcamentoEditando !== null) {
        alert("Você está no modo de edição de orçamento. Clique em 'Atualizar Orçamento' para salvar as alterações ou cancele a edição.");
        return;
    }
     if (!usuarioAtual) {
        alert("Você precisa estar logado para gerar um orçamento.");
        return;
    }

    const dataOrcamento = document.getElementById("dataOrcamento").value;
    const dataValidade = document.getElementById("dataValidade").value;
    const cliente = document.getElementById("cliente").value;

    if (!dataOrcamento || !dataValidade || !cliente) {
        alert("Preencha pelo menos a Data do Orçamento, Data de Validade e Cliente.");
        return;
    }

    const orcamento = {
        numero: gerarNumeroFormatado(numeroOrcamento),
        dataOrcamento: dataOrcamento,
        dataValidade: dataValidade,
        cliente: cliente,
        endereco: document.getElementById("endereco").value,
        tema: document.getElementById("tema").value,
        cidade: document.getElementById("cidade").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("clienteEmail").value,
        cores: document.getElementById("cores").value,
        produtos: [],
        pagamento: Array.from(document.querySelectorAll('input[name="pagamento"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFrete").value),
        valorOrcamento: converterMoedaParaNumero(document.getElementById("valorOrcamento").value),
        total: converterMoedaParaNumero(document.getElementById("total").value),
        observacoes: document.getElementById("observacoes").value,
        pedidoGerado: false,
        numeroPedido: null,
        tipo: 'orcamento'
    };

    const produtosRows = document.querySelectorAll("#tabelaProdutos tbody tr");
    if (produtosRows.length === 0) {
        alert("Adicione pelo menos um produto ao orçamento.");
        return;
    }
    produtosRows.forEach(row => {
        const quantidade = parseFloat(row.querySelector(".produto-quantidade").value);
        const descricao = row.querySelector(".produto-descricao").value;
        const valorUnit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value);
        if (descricao && quantidade > 0) {
             orcamento.produtos.push({
                quantidade: quantidade,
                descricao: descricao,
                valorUnit: valorUnit,
                valorTotal: converterMoedaParaNumero(row.cells[3].textContent)
            });
        }
    });
    if (orcamento.produtos.length === 0) {
        alert("Nenhum produto válido encontrado. Verifique as descrições e quantidades.");
        return;
    }

    try {
        await salvarDados(orcamento, 'orcamento');
        numeroOrcamento++;
        orcamentos.push(orcamento);

        document.getElementById("orcamento").reset();
        limparCamposMoeda();
        document.querySelector("#tabelaProdutos tbody").innerHTML = "";
        const dataOrcamentoInput = document.getElementById('dataOrcamento');
        if(dataOrcamentoInput) dataOrcamentoInput.value = new Date().toISOString().split('T')[0];


        alert("Orçamento gerado com sucesso!");
        mostrarPagina('orcamentos-gerados');
        mostrarOrcamentosGerados();
        exibirOrcamentoEmHTML(orcamento);

    } catch (error) {
        console.error("Erro ao processar geração de orçamento:", error);
        // Don't increment number if save failed
    }
}

function exibirOrcamentoEmHTML(orcamento) {
    console.log("Função exibirOrcamentoEmHTML chamada com orçamento:", orcamento);
    if (!orcamento || !orcamento.dataOrcamento || !orcamento.dataValidade || !orcamento.produtos) {
        console.error("Objeto orçamento inválido ou incompleto para exibição:", orcamento);
        alert("Erro: Dados do orçamento estão incompletos para visualização.");
        return;
    }

    const janelaOrcamento = window.open('./orcamento.html', '_blank');
     if (!janelaOrcamento) {
        alert("Não foi possível abrir a janela de visualização do orçamento. Verifique as permissões de pop-up do seu navegador.");
        return;
    }

    janelaOrcamento.addEventListener('load', () => {
        console.log("Página orcamento.html carregada.");
        const conteudoOrcamento = janelaOrcamento.document.getElementById("conteudo-orcamento");
        if (!conteudoOrcamento) {
            console.error("Elemento #conteudo-orcamento não encontrado em orcamento.html");
            janelaOrcamento.alert("Erro interno ao tentar exibir o orçamento na nova janela.");
            return;
        }

        try {
            const dataOrcamentoFormatada = orcamento.dataOrcamento ? new Date(orcamento.dataOrcamento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
            const dataValidadeFormatada = orcamento.dataValidade ? new Date(orcamento.dataValidade + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
            const pagamentoFormatado = (orcamento.pagamento || []).map(pag => {
                if (pag === 'pix') return 'PIX';
                if (pag === 'dinheiro') return 'Dinheiro';
                if (pag === 'cartaoCredito') return 'Cartão de Crédito';
                if (pag === 'cartaoDebito') return 'Cartão de Débito';
                return pag;
            }).join(', ') || 'Não especificado';

            let html = `
                <h2>Orçamento Nº ${orcamento.numero || 'N/A'}</h2>
                <div class="info-orcamento">
                    <strong>Data do Orçamento:</strong> ${dataOrcamentoFormatada}<br>
                    <strong>Data de Validade:</strong> ${dataValidadeFormatada}<br>
                    <strong>Cliente:</strong> ${orcamento.cliente || 'Não informado'}<br>
                    ${orcamento.endereco ? `<strong>Endereço:</strong> ${orcamento.endereco}<br>` : ''}
                    ${orcamento.cidade ? `<strong>Cidade:</strong> ${orcamento.cidade}<br>` : ''}
                    ${orcamento.telefone ? `<strong>Telefone:</strong> ${orcamento.telefone}<br>` : ''}
                    ${orcamento.email ? `<strong>E-mail:</strong> ${orcamento.email}<br>` : ''}
                    ${orcamento.tema ? `<strong>Tema:</strong> ${orcamento.tema}<br>` : ''}
                    ${orcamento.cores ? `<strong>Cores:</strong> ${orcamento.cores}<br>` : ''}
                </div>
                <h3>Produtos</h3>
                <table>
                    <thead><tr><th>Quantidade</th><th>Descrição do Produto</th><th>Valor Unit.</th><th>Valor Total</th></tr></thead>
                    <tbody>`;
            (orcamento.produtos || []).forEach(produto => {
                html += `<tr><td>${produto.quantidade || 0}</td><td>${produto.descricao || 'Sem descrição'}</td><td>${formatarMoeda(produto.valorUnit)}</td><td>${formatarMoeda(produto.valorTotal)}</td></tr>`;
            });
            html += `</tbody></table>
                <div class="espaco-tabela"></div>
                <div class="info-orcamento">
                    <strong>Pagamento:</strong> ${pagamentoFormatado}<br>
                    <strong>Valor do Frete:</strong> ${formatarMoeda(orcamento.valorFrete)}<br>
                    <strong>Valor do Orçamento:</strong> ${formatarMoeda(orcamento.valorOrcamento)}<br>
                    <strong>Total:</strong> ${formatarMoeda(orcamento.total)}<br>
                    ${orcamento.observacoes ? `<strong>Observações:</strong> ${orcamento.observacoes.replace(/\n/g, '<br>')}<br>` : ''}
                </div>`;
            conteudoOrcamento.innerHTML = html;
            console.log("Conteúdo do orçamento inserido em orcamento.html");
        } catch (error) {
            console.error("Erro ao gerar HTML do orçamento:", error);
            conteudoOrcamento.innerHTML = `<p style="color: red;">Erro ao gerar a visualização do orçamento.</p>`;
            janelaOrcamento.alert("Ocorreu um erro ao formatar os dados do orçamento para visualização.");
        }
    });
    janelaOrcamento.addEventListener('error', (event) => {
        console.error("Erro ao carregar orcamento.html:", event);
        alert("Erro ao carregar a página de visualização do orçamento.");
    });
}
/* ==== FIM SEÇÃO - GERAÇÃO DE ORÇAMENTO ==== */

/* ==== INÍCIO SEÇÃO - ORÇAMENTOS GERADOS ==== */
function mostrarOrcamentosGerados() {
    const tbody = document.querySelector("#tabela-orcamentos tbody");
     if (!tbody) {
        console.error("Elemento tbody da tabela de orçamentos não encontrado.");
        return;
    }
    tbody.innerHTML = '';

    const orcamentosOrdenados = [...orcamentos].sort((a, b) => {
        const [numA, anoA] = (a.numero || '0/0').split('/');
        const [numB, anoB] = (b.numero || '0/0').split('/');
        if (anoB !== anoA) return parseInt(anoB) - parseInt(anoA);
        return parseInt(numB) - parseInt(numA);
    });

    orcamentosOrdenados.forEach(orcamento => {
        const row = tbody.insertRow();
        row.dataset.orcamentoId = orcamento.id;
        const cellNumero = row.insertCell();
        const cellData = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellNumeroPedido = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = orcamento.numero || 'N/D';
        cellData.textContent = orcamento.dataOrcamento ? new Date(orcamento.dataOrcamento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D';
        cellCliente.textContent = orcamento.cliente || 'N/D';
        cellTotal.textContent = formatarMoeda(orcamento.total);
        cellNumeroPedido.textContent = orcamento.numeroPedido || '---';

        const btnVisualizar = document.createElement('button');
        btnVisualizar.textContent = 'Visualizar';
        btnVisualizar.classList.add('btnVisualizarOrcamento');
        btnVisualizar.onclick = () => exibirOrcamentoEmHTML(orcamento);
        cellAcoes.appendChild(btnVisualizar);

        if (!orcamento.pedidoGerado) {
            const btnEditar = document.createElement('button');
            btnEditar.textContent = 'Editar';
            btnEditar.classList.add('btnEditarOrcamento');
            btnEditar.onclick = () => editarOrcamento(orcamento.id);
            cellAcoes.appendChild(btnEditar);
            const btnGerarPedido = document.createElement('button');
            btnGerarPedido.textContent = 'Gerar Pedido';
            btnGerarPedido.classList.add('btnGerarPedido');
            btnGerarPedido.onclick = () => gerarPedido(orcamento.id);
            cellAcoes.appendChild(btnGerarPedido);
        } else {
             cellAcoes.appendChild(document.createTextNode('\u00A0'));
        }
    });
}

function filtrarOrcamentos() {
    const dataInicio = document.getElementById('filtroDataInicioOrcamento').value;
    const dataFim = document.getElementById('filtroDataFimOrcamento').value;
    const numeroOrcamentoFiltro = document.getElementById('filtroNumeroOrcamento').value.trim();
    const anoOrcamentoFiltro = document.getElementById('filtroAnoOrcamento').value.trim();
    const clienteOrcamentoFiltro = document.getElementById('filtroClienteOrcamento').value.toLowerCase().trim();

    const orcamentosFiltrados = orcamentos.filter(orcamento => {
        const numCompleto = orcamento.numero || '0000/0000';
        const [numOrcamentoStr, anoOrcamentoStr] = numCompleto.split('/');
        const dataOrc = orcamento.dataOrcamento;
        const nomeCliente = (orcamento.cliente || '').toLowerCase();
        const dtInicioFiltro = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
        const dtFimFiltro = dataFim ? new Date(dataFim + 'T23:59:59') : null;
        const dtOrcamento = dataOrc ? new Date(dataOrc + 'T00:00:00') : null;

        const passaData = (!dtInicioFiltro || (dtOrcamento && dtOrcamento >= dtInicioFiltro)) &&
                          (!dtFimFiltro || (dtOrcamento && dtOrcamento <= dtFimFiltro));
        const passaNumero = !numeroOrcamentoFiltro || numOrcamentoStr.padStart(4, '0') === numeroOrcamentoFiltro.padStart(4, '0');
        const passaAno = !anoOrcamentoFiltro || anoOrcamentoStr === anoOrcamentoFiltro;
        const passaCliente = !clienteOrcamentoFiltro || nomeCliente.includes(clienteOrcamentoFiltro);

        return passaData && passaNumero && passaAno && passaCliente;
    });
    atualizarListaOrcamentos(orcamentosFiltrados);
}

function atualizarListaOrcamentos(listaOrcamentos) {
    const tbody = document.querySelector("#tabela-orcamentos tbody");
     if (!tbody) {
        console.error("Elemento tbody da tabela de orçamentos não encontrado para atualização.");
        return;
    }
    tbody.innerHTML = '';

    const orcamentosOrdenados = [...listaOrcamentos].sort((a, b) => {
        const [numA, anoA] = (a.numero || '0/0').split('/');
        const [numB, anoB] = (b.numero || '0/0').split('/');
        if (anoB !== anoA) return parseInt(anoB) - parseInt(anoA);
        return parseInt(numB) - parseInt(numA);
    });

    orcamentosOrdenados.forEach(orcamento => {
        const row = tbody.insertRow();
        row.dataset.orcamentoId = orcamento.id;
        const cellNumero = row.insertCell();
        const cellData = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellNumeroPedido = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = orcamento.numero || 'N/D';
        cellData.textContent = orcamento.dataOrcamento ? new Date(orcamento.dataOrcamento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D';
        cellCliente.textContent = orcamento.cliente || 'N/D';
        cellTotal.textContent = formatarMoeda(orcamento.total);
        cellNumeroPedido.textContent = orcamento.numeroPedido || '---';

        const btnVisualizar = document.createElement('button');
        btnVisualizar.textContent = 'Visualizar';
        btnVisualizar.classList.add('btnVisualizarOrcamento');
        btnVisualizar.onclick = () => exibirOrcamentoEmHTML(orcamento);
        cellAcoes.appendChild(btnVisualizar);

        if (!orcamento.pedidoGerado) {
            const btnEditar = document.createElement('button');
            btnEditar.textContent = 'Editar';
            btnEditar.classList.add('btnEditarOrcamento');
             btnEditar.onclick = () => editarOrcamento(orcamento.id);
            cellAcoes.appendChild(btnEditar);
            const btnGerarPedido = document.createElement('button');
            btnGerarPedido.textContent = 'Gerar Pedido';
            btnGerarPedido.classList.add('btnGerarPedido');
            btnGerarPedido.onclick = () => gerarPedido(orcamento.id);
            cellAcoes.appendChild(btnGerarPedido);
        } else {
            cellAcoes.appendChild(document.createTextNode('\u00A0'));
        }
    });
}

function editarOrcamento(orcamentoId) {
    const orcamento = orcamentos.find(o => o.id === orcamentoId);
    if (!orcamento) {
        alert("Orçamento não encontrado para edição.");
        return;
    }
    if (orcamento.pedidoGerado) {
        alert("Não é possível editar um orçamento que já gerou um pedido.");
        return;
    }
    orcamentoEditando = orcamento.id;

    document.getElementById("dataOrcamento").value = orcamento.dataOrcamento || '';
    document.getElementById("dataValidade").value = orcamento.dataValidade || '';
    document.getElementById("cliente").value = orcamento.cliente || '';
    document.getElementById("endereco").value = orcamento.endereco || '';
    document.getElementById("tema").value = orcamento.tema || '';
    document.getElementById("cidade").value = orcamento.cidade || '';
    document.getElementById("telefone").value = orcamento.telefone || '';
    document.getElementById("clienteEmail").value = orcamento.email || '';
    document.getElementById("cores").value = orcamento.cores || '';
    document.getElementById("valorFrete").value = formatarMoeda(orcamento.valorFrete);
    document.getElementById("valorOrcamento").value = formatarMoeda(orcamento.valorOrcamento);
    document.getElementById("total").value = formatarMoeda(orcamento.total);
    document.getElementById("observacoes").value = orcamento.observacoes || '';

    const tbody = document.querySelector("#tabelaProdutos tbody");
     if (!tbody) {
        console.error("Tbody de produtos do orçamento não encontrado para edição.");
        return;
    }
    tbody.innerHTML = '';
    (orcamento.produtos || []).forEach(produto => {
        const row = tbody.insertRow();
        const cellQuantidade = row.insertCell();
        const cellDescricao = row.insertCell();
        const cellValorUnit = row.insertCell();
        const cellValorTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellQuantidade.innerHTML = `<input type="number" class="produto-quantidade" value="${produto.quantidade || 1}" min="1" style="width: 60px;" onchange="atualizarTotais()">`;
        cellDescricao.innerHTML = `<input type="text" class="produto-descricao" value="${produto.descricao || ''}">`;
        cellValorUnit.innerHTML = `<input type="text" class="produto-valor-unit" value="${formatarMoeda(produto.valorUnit)}" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotais()">`;
        cellValorTotal.textContent = formatarMoeda(produto.valorTotal);
        cellAcoes.innerHTML = '<button type="button" onclick="excluirProduto(this)">Excluir</button>';
    });

    document.querySelectorAll('input[name="pagamento"]').forEach(el => {
        el.checked = (orcamento.pagamento || []).includes(el.value);
    });

    atualizarTotais();
    mostrarPagina('form-orcamento');
    document.getElementById("btnGerarOrcamento").style.display = "none";
    document.getElementById("btnAtualizarOrcamento").style.display = "inline-block";
    window.scrollTo(0, 0);
}

async function atualizarOrcamento() {
    if (orcamentoEditando === null) {
        alert("Nenhum orçamento selecionado para atualização.");
        return;
    }
     if (!usuarioAtual) {
        alert("Você precisa estar logado para atualizar um orçamento.");
        return;
    }
    const orcamentoIndex = orcamentos.findIndex(o => o.id === orcamentoEditando);
    if (orcamentoIndex === -1) {
        alert("Erro: Orçamento não encontrado na memória local.");
        orcamentoEditando = null;
        document.getElementById("btnGerarOrcamento").style.display = "inline-block";
        document.getElementById("btnAtualizarOrcamento").style.display = "none";
        return;
    }
    const dataOrcamento = document.getElementById("dataOrcamento").value;
    const dataValidade = document.getElementById("dataValidade").value;
    const cliente = document.getElementById("cliente").value;
    if (!dataOrcamento || !dataValidade || !cliente) {
        alert("Preencha pelo menos a Data do Orçamento, Data de Validade e Cliente.");
        return;
    }
    const orcamentoOriginal = orcamentos[orcamentoIndex];
    const orcamentoAtualizado = {
        ...orcamentoOriginal,
        dataOrcamento: dataOrcamento,
        dataValidade: dataValidade,
        cliente: cliente,
        endereco: document.getElementById("endereco").value,
        tema: document.getElementById("tema").value,
        cidade: document.getElementById("cidade").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("clienteEmail").value,
        cores: document.getElementById("cores").value,
        produtos: [],
        pagamento: Array.from(document.querySelectorAll('input[name="pagamento"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFrete").value),
        valorOrcamento: converterMoedaParaNumero(document.getElementById("valorOrcamento").value),
        total: converterMoedaParaNumero(document.getElementById("total").value),
        observacoes: document.getElementById("observacoes").value,
        tipo: 'orcamento'
    };

    const produtosRows = document.querySelectorAll("#tabelaProdutos tbody tr");
    if (produtosRows.length === 0) {
        alert("Adicione pelo menos um produto ao orçamento.");
        return;
    }
    produtosRows.forEach(row => {
        const quantidade = parseFloat(row.querySelector(".produto-quantidade").value);
        const descricao = row.querySelector(".produto-descricao").value;
        const valorUnit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value);
        if (descricao && quantidade > 0) {
            orcamentoAtualizado.produtos.push({
                quantidade: quantidade,
                descricao: descricao,
                valorUnit: valorUnit,
                valorTotal: converterMoedaParaNumero(row.cells[3].textContent)
            });
        }
    });
    if (orcamentoAtualizado.produtos.length === 0) {
        alert("Nenhum produto válido encontrado. Verifique as descrições e quantidades.");
        return;
    }

    try {
        await salvarDados(orcamentoAtualizado, 'orcamento');
        orcamentos[orcamentoIndex] = orcamentoAtualizado;

        document.getElementById("orcamento").reset();
        limparCamposMoeda();
        document.querySelector("#tabelaProdutos tbody").innerHTML = "";
        const dataOrcamentoInput = document.getElementById('dataOrcamento');
        if(dataOrcamentoInput) dataOrcamentoInput.value = new Date().toISOString().split('T')[0];

        alert("Orçamento atualizado com sucesso!");

        orcamentoEditando = null;
        document.getElementById("btnGerarOrcamento").style.display = "inline-block";
        document.getElementById("btnAtualizarOrcamento").style.display = "none";

        mostrarPagina('orcamentos-gerados');
        mostrarOrcamentosGerados();
    } catch (error) {
         console.error("Erro ao processar atualização de orçamento:", error);
    }
}
/* ==== FIM SEÇÃO - ORÇAMENTOS GERADOS ==== */

/* ==== INÍCIO SEÇÃO - GERAR PEDIDO A PARTIR DO ORÇAMENTO ==== */
async function gerarPedido(orcamentoId) {
    const orcamento = orcamentos.find(o => o.id === orcamentoId);
    if (!orcamento) {
        alert("Orçamento não encontrado para gerar pedido.");
        return;
    }
    if (orcamento.pedidoGerado) {
        alert(`Um pedido (${orcamento.numeroPedido || 'N/D'}) já foi gerado para este orçamento.`);
        return;
    }
    if (!usuarioAtual) {
        alert("Você precisa estar logado para gerar um pedido.");
        return;
    }

    const pedido = {
        numero: gerarNumeroFormatado(numeroPedido),
        dataPedido: new Date().toISOString().split('T')[0],
        dataEntrega: orcamento.dataValidade || '',
        cliente: orcamento.cliente,
        endereco: orcamento.endereco || '',
        tema: orcamento.tema || '',
        cidade: orcamento.cidade || '',
        telefone: orcamento.telefone || '',
        email: orcamento.email || '',
        cores: orcamento.cores || '',
        pagamento: orcamento.pagamento || [],
        valorFrete: orcamento.valorFrete || 0,
        valorOrcamento: orcamento.valorOrcamento || 0,
        total: orcamento.total || 0,
        observacoes: orcamento.observacoes || '',
        entrada: 0,
        restante: orcamento.total || 0,
        margemLucro: 0,
        custoMaoDeObra: 0,
        valorPedido: orcamento.valorOrcamento || 0,
        produtos: (orcamento.produtos || []).map(p => ({
            ...p,
            valorTotal: (p.quantidade || 0) * (p.valorUnit || 0)
        })),
        previsaoEntrega: '', // **** Campo adicionado ****
        idOrcamentoOrigem: orcamento.id,
        numeroOrcamentoOrigem: orcamento.numero,
        tipo: 'pedido'
    };

    try {
        await salvarDados(pedido, 'pedido');
        numeroPedido++;

        orcamento.numeroPedido = pedido.numero;
        orcamento.pedidoGerado = true;
        await salvarDados(orcamento, 'orcamento');

        pedidos.push(pedido);

        alert(`Pedido Nº ${pedido.numero} gerado com sucesso a partir do orçamento Nº ${orcamento.numero}!`);

        mostrarOrcamentosGerados();
        mostrarPedidosRealizados();
        mostrarPagina('lista-pedidos');
    } catch (error) {
        console.error("Erro ao processar geração de pedido:", error);
    }
}
/* ==== FIM SEÇÃO - GERAR PEDIDO A PARTIR DO ORÇAMENTO ==== */

/* ==== INÍCIO SEÇÃO - PEDIDOS REALIZADOS ==== */
function mostrarPedidosRealizados() {
    const tbody = document.querySelector("#tabela-pedidos tbody");
     if (!tbody) {
        console.error("Elemento tbody da tabela de pedidos não encontrado.");
        return;
    }
    tbody.innerHTML = '';

    const pedidosOrdenados = [...pedidos].sort((a, b) => {
        const [numA, anoA] = (a.numero || '0/0').split('/');
        const [numB, anoB] = (b.numero || '0/0').split('/');
        if (anoB !== anoA) return parseInt(anoB) - parseInt(anoA);
        return parseInt(numB) - parseInt(numA);
    });

    pedidosOrdenados.forEach(pedido => {
        const row = tbody.insertRow();
        row.dataset.pedidoId = pedido.id;
        const cellNumero = row.insertCell();
        const cellDataPedido = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = pedido.numero || 'N/D';
        cellDataPedido.textContent = pedido.dataPedido ? new Date(pedido.dataPedido + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D';
        cellCliente.textContent = pedido.cliente || 'N/D';
        cellTotal.textContent = formatarMoeda(pedido.total);

        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.classList.add('btnEditarPedido');
        btnEditar.onclick = () => editarPedido(pedido.id);
        cellAcoes.appendChild(btnEditar);
    });
}

function filtrarPedidos() {
    const dataInicio = document.getElementById('filtroDataInicioPedido').value;
    const dataFim = document.getElementById('filtroDataFimPedido').value;
    const numeroPedidoFiltro = document.getElementById('filtroNumeroPedido').value.trim();
    const anoPedidoFiltro = document.getElementById('filtroAnoPedido').value.trim();
    const clientePedidoFiltro = document.getElementById('filtroClientePedido').value.toLowerCase().trim();

    const pedidosFiltrados = pedidos.filter(pedido => {
        const numCompleto = pedido.numero || '0000/0000';
        const [numPedidoStr, anoPedidoStr] = numCompleto.split('/');
        const dataPed = pedido.dataPedido;
        const nomeCliente = (pedido.cliente || '').toLowerCase();
        const dtInicioFiltro = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
        const dtFimFiltro = dataFim ? new Date(dataFim + 'T23:59:59') : null;
        const dtPedido = dataPed ? new Date(dataPed + 'T00:00:00') : null;

        const passaData = (!dtInicioFiltro || (dtPedido && dtPedido >= dtInicioFiltro)) &&
                          (!dtFimFiltro || (dtPedido && dtPedido <= dtFimFiltro));
        const passaNumero = !numeroPedidoFiltro || numPedidoStr.padStart(4, '0') === numeroPedidoFiltro.padStart(4, '0');
        const passaAno = !anoPedidoFiltro || anoPedidoStr === anoPedidoFiltro;
        const passaCliente = !clientePedidoFiltro || nomeCliente.includes(clientePedidoFiltro);

        return passaData && passaNumero && passaAno && passaCliente;
    });
    atualizarListaPedidos(pedidosFiltrados);
}

function atualizarListaPedidos(listaPedidos) {
    const tbody = document.querySelector("#tabela-pedidos tbody");
     if (!tbody) {
        console.error("Elemento tbody da tabela de pedidos não encontrado para atualização.");
        return;
    }
    tbody.innerHTML = '';

    const pedidosOrdenados = [...listaPedidos].sort((a, b) => {
        const [numA, anoA] = (a.numero || '0/0').split('/');
        const [numB, anoB] = (b.numero || '0/0').split('/');
        if (anoB !== anoA) return parseInt(anoB) - parseInt(anoA);
        return parseInt(numB) - parseInt(numA);
    });

    pedidosOrdenados.forEach(pedido => {
        const row = tbody.insertRow();
        row.dataset.pedidoId = pedido.id;
        const cellNumero = row.insertCell();
        const cellDataPedido = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = pedido.numero || 'N/D';
        cellDataPedido.textContent = pedido.dataPedido ? new Date(pedido.dataPedido + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D';
        cellCliente.textContent = pedido.cliente || 'N/D';
        cellTotal.textContent = formatarMoeda(pedido.total);

        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.classList.add('btnEditarPedido');
        btnEditar.onclick = () => editarPedido(pedido.id);
        cellAcoes.appendChild(btnEditar);
    });
}

function editarPedido(pedidoId) {
    pedidoEditando = pedidoId;
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) {
        alert("Erro: Pedido não encontrado na memória local para edição.");
        pedidoEditando = null;
        return;
    }
    console.log("Editando pedido:", pedido);

    document.getElementById("dataPedidoEdicao").value = pedido.dataPedido || '';
    document.getElementById("dataEntregaEdicao").value = pedido.dataEntrega || '';
    document.getElementById("clienteEdicao").value = pedido.cliente || '';
    document.getElementById("enderecoEdicao").value = pedido.endereco || '';
    document.getElementById("temaEdicao").value = pedido.tema || '';
    document.getElementById("cidadeEdicao").value = pedido.cidade || '';
    document.getElementById("contatoEdicao").value = pedido.telefone || '';
    document.getElementById("coresEdicao").value = pedido.cores || '';
    document.getElementById("valorFreteEdicao").value = formatarMoeda(pedido.valorFrete);
    document.getElementById("valorPedidoEdicao").value = formatarMoeda(pedido.valorPedido);
    document.getElementById("totalEdicao").value = formatarMoeda(pedido.total);
    document.getElementById("entradaEdicao").value = formatarMoeda(pedido.entrada);
    document.getElementById("restanteEdicao").value = formatarMoeda(pedido.restante);
    document.getElementById("margemLucroEdicao").value = formatarMoeda(pedido.margemLucro || 0);
    document.getElementById("custoMaoDeObraEdicao").value = formatarMoeda(pedido.custoMaoDeObra || 0);
    document.getElementById("previsaoEntregaEdicao").value = pedido.previsaoEntrega || ''; // **** Campo adicionado ****
    document.getElementById("observacoesEdicao").value = pedido.observacoes || '';

    const tbodyEdicao = document.querySelector("#tabelaProdutosEdicao tbody");
    if (!tbodyEdicao) {
        console.error("Tbody de produtos da edição não encontrado.");
        return;
    }
    tbodyEdicao.innerHTML = '';
    (pedido.produtos || []).forEach(produto => {
        const row = tbodyEdicao.insertRow();
        const cellQuantidade = row.insertCell();
        const cellDescricao = row.insertCell();
        const cellValorUnit = row.insertCell();
        const cellValorTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellQuantidade.innerHTML = `<input type="number" class="produto-quantidade" value="${produto.quantidade || 1}" min="1" style="width: 60px;" onchange="atualizarTotaisEdicao()">`;
        cellDescricao.innerHTML = `<input type="text" class="produto-descricao" value="${produto.descricao || ''}">`;
        cellValorUnit.innerHTML = `<input type="text" class="produto-valor-unit" value="${formatarMoeda(produto.valorUnit)}" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotaisEdicao()">`;
        cellValorTotal.textContent = formatarMoeda(produto.valorTotal);
        cellAcoes.innerHTML = '<button type="button" onclick="excluirProdutoEdicao(this)">Excluir</button>';
    });

    const pagamentoCheckboxes = document.querySelectorAll('input[name="pagamentoEdicao"]');
    pagamentoCheckboxes.forEach(el => el.checked = (pedido.pagamento || []).includes(el.value));

    atualizarTotaisEdicao();
    mostrarPagina('form-edicao-pedido');
    window.scrollTo(0, 0);
}

async function atualizarPedido() {
    if (pedidoEditando === null) {
        alert("Nenhum pedido selecionado para atualização.");
        return;
    }
     if (!usuarioAtual) {
        alert("Você precisa estar logado para atualizar um pedido.");
        return;
    }
    const pedidoIndex = pedidos.findIndex(p => p.id === pedidoEditando);
    if (pedidoIndex === -1) {
        alert("Erro: Pedido não encontrado na memória local para atualização.");
        pedidoEditando = null;
        return;
    }
    const dataPedido = document.getElementById("dataPedidoEdicao").value;
    const cliente = document.getElementById("clienteEdicao").value;
    if (!dataPedido || !cliente) {
        alert("Preencha pelo menos a Data do Pedido e o Cliente.");
        return;
    }
    const pedidoOriginal = pedidos[pedidoIndex];
    const pedidoAtualizado = {
        ...pedidoOriginal,
        dataPedido: dataPedido,
        dataEntrega: document.getElementById("dataEntregaEdicao").value,
        cliente: cliente,
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
        previsaoEntrega: document.getElementById("previsaoEntregaEdicao").value, // **** Campo adicionado ****
        observacoes: document.getElementById("observacoesEdicao").value,
        tipo: 'pedido'
    };

    const produtosRowsEdicao = document.querySelectorAll("#tabelaProdutosEdicao tbody tr");
    if (produtosRowsEdicao.length === 0) {
        alert("Adicione pelo menos um produto ao pedido.");
        return;
    }
    produtosRowsEdicao.forEach(row => {
        const quantidade = parseFloat(row.querySelector(".produto-quantidade").value);
        const descricao = row.querySelector(".produto-descricao").value;
        const valorUnit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value);
        if (descricao && quantidade > 0) {
            pedidoAtualizado.produtos.push({
                quantidade: quantidade,
                descricao: descricao,
                valorUnit: valorUnit,
                valorTotal: converterMoedaParaNumero(row.cells[3].textContent)
            });
        }
    });
    if (pedidoAtualizado.produtos.length === 0) {
        alert("Nenhum produto válido encontrado. Verifique as descrições e quantidades.");
        return;
    }

    try {
        await salvarDados(pedidoAtualizado, 'pedido');
        pedidos[pedidoIndex] = pedidoAtualizado;
        alert("Pedido atualizado com sucesso!");
        pedidoEditando = null;
        mostrarPagina('lista-pedidos');
        mostrarPedidosRealizados();
    } catch (error) {
         console.error("Erro ao processar atualização de pedido:", error);
    }
}
/* ==== FIM SEÇÃO - PEDIDOS REALIZADOS ==== */

/* ==== INÍCIO SEÇÃO - RELATÓRIO ==== */
function filtrarPedidosRelatorio() {
    const dataInicio = document.getElementById('filtroDataInicio').value;
    const dataFim = document.getElementById('filtroDataFim').value;

    const pedidosFiltrados = pedidos.filter(pedido => {
        const dataPed = pedido.dataPedido;
        if (!dataPed) return false;
        const dtPedido = new Date(dataPed + 'T00:00:00');
        const dtInicioFiltro = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
        const dtFimFiltro = dataFim ? new Date(dataFim + 'T23:59:59') : null;
        const dentroDoIntervalo =
            (!dtInicioFiltro || dtPedido >= dtInicioFiltro) &&
            (!dtFimFiltro || dtPedido <= dtFimFiltro);
        return dentroDoIntervalo;
    });
    gerarRelatorio(pedidosFiltrados);
}

function gerarRelatorio(pedidosFiltrados) {
    let totalPedidosValor = 0;
    let totalFrete = 0;
    let totalMargemLucro = 0;
    let totalCustoMaoDeObra = 0;

    pedidosFiltrados.forEach(pedido => {
        totalPedidosValor += pedido.total || 0;
        totalFrete += pedido.valorFrete || 0;
        totalMargemLucro += Number(pedido.margemLucro) || 0;
        totalCustoMaoDeObra += Number(pedido.custoMaoDeObra) || 0;
    });
    const quantidadePedidos = pedidosFiltrados.length;

    const pedidosOrdenadosRelatorio = [...pedidosFiltrados].sort((a, b) => {
        const dateA = new Date(a.dataPedido + 'T00:00:00');
        const dateB = new Date(b.dataPedido + 'T00:00:00');
        return dateA - dateB;
    });

    let relatorioHTML = `
        <h3>Resumo do Período</h3>
        <table class="relatorio-table">
            <thead><tr><th>Total Pedidos (Valor)</th><th>Total Frete</th><th>Total Margem Lucro</th><th>Total Custo M.O.</th><th>Quantidade Pedidos</th></tr></thead>
            <tbody><tr><td>${formatarMoeda(totalPedidosValor)}</td><td>${formatarMoeda(totalFrete)}</td><td>${formatarMoeda(totalMargemLucro)}</td><td>${formatarMoeda(totalCustoMaoDeObra)}</td><td>${quantidadePedidos}</td></tr></tbody>
        </table>
        <h3 style="margin-top: 30px;">Lista de Pedidos no Período</h3>
        <table class="relatorio-table">
            <thead><tr><th>Número</th><th>Data Pedido</th><th>Cliente</th><th>Total (R$)</th></tr></thead>
            <tbody>`;
    if (pedidosOrdenadosRelatorio.length > 0) {
        pedidosOrdenadosRelatorio.forEach(pedido => {
             const dataFormatada = pedido.dataPedido ? new Date(pedido.dataPedido + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D';
            relatorioHTML += `<tr><td>${pedido.numero || 'N/D'}</td><td>${dataFormatada}</td><td>${pedido.cliente || 'N/D'}</td><td>${formatarMoeda(pedido.total)}</td></tr>`;
        });
    } else {
        relatorioHTML += `<tr><td colspan="4">Nenhum pedido encontrado para o período selecionado.</td></tr>`;
    }
    relatorioHTML += `</tbody></table>`;

    const relatorioConteudoDiv = document.getElementById('relatorio-conteudo');
    if (relatorioConteudoDiv) {
       relatorioConteudoDiv.innerHTML = relatorioHTML;
    } else {
        console.error("Div #relatorio-conteudo não encontrada.");
    }
}

function gerarRelatorioXLSX() {
    const relatorioConteudoDiv = document.getElementById('relatorio-conteudo');
    if (!relatorioConteudoDiv) {
         alert('Erro: Container do relatório não encontrado.');
        return;
    }
    const tabelas = relatorioConteudoDiv.querySelectorAll('table.relatorio-table');
    if (tabelas.length === 0) {
        alert('Gere o relatório primeiro ou nenhum dado encontrado para exportar.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert('Erro: Biblioteca de exportação (XLSX) não carregada.');
        console.error("XLSX library is not defined. Make sure it's included in index.html.");
        return;
    }
    try {
        const wb = XLSX.utils.book_new();
        if (tabelas[0]) {
            const wsResumo = XLSX.utils.table_to_sheet(tabelas[0]);
            XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
        }
        if (tabelas[1]) {
            const wsLista = XLSX.utils.table_to_sheet(tabelas[1]);
            XLSX.utils.book_append_sheet(wb, wsLista, "Lista Pedidos");
        }
        const nomeArquivo = `relatorio_pedidos_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, nomeArquivo);
    } catch (error) {
        console.error("Erro ao gerar XLSX:", error);
        alert("Ocorreu um erro ao gerar o arquivo Excel. Verifique o console.");
    }
}
/* ==== FIM SEÇÃO - RELATÓRIO ==== */

/* ==== INÍCIO SEÇÃO - FUNÇÕES DE CONTROLE DE PÁGINA ==== */
function mostrarPagina(idPagina) {
    const paginas = document.querySelectorAll('.pagina');
    paginas.forEach(pagina => {
        if(pagina) pagina.style.display = 'none';
    });
    const paginaAtiva = document.getElementById(idPagina);
    if (paginaAtiva) {
        paginaAtiva.style.display = 'block';

        // Resetar estado de edição ao sair das páginas de formulário
        if (orcamentoEditando !== null && idPagina !== 'form-orcamento') {
            console.log("Saindo do modo de edição de orçamento.");
            orcamentoEditando = null;
            const btnGerar = document.getElementById("btnGerarOrcamento");
            const btnAtualizar = document.getElementById("btnAtualizarOrcamento");
            if(btnGerar) btnGerar.style.display = "inline-block";
            if(btnAtualizar) btnAtualizar.style.display = "none";
            // Não limpar o formulário automaticamente ao sair
        }
         if (pedidoEditando !== null && idPagina !== 'form-edicao-pedido') {
             console.log("Saindo do modo de edição de pedido.");
            pedidoEditando = null;
            // Não há botões para alternar na edição de pedido, então nada a fazer aqui
            // Não limpar o formulário automaticamente ao sair
        }

        // Define data atual no form de orçamento se ele for exibido E NÃO estiver em modo de edição
        if (idPagina === 'form-orcamento' && !orcamentoEditando) {
           const dataOrcamentoInput = document.getElementById('dataOrcamento');
            if (dataOrcamentoInput && !dataOrcamentoInput.value) {
                dataOrcamentoInput.value = new Date().toISOString().split('T')[0];
            }
        }
    } else {
        console.warn(`Página com ID "${idPagina}" não encontrada. Mostrando form-orcamento.`);
        const formOrcamentoPage = document.getElementById('form-orcamento');
        if(formOrcamentoPage) formOrcamentoPage.style.display = 'block';
    }
}
/* ==== FIM SEÇÃO - FUNÇÕES DE CONTROLE DE PÁGINA ==== */

/* ==== INÍCIO SEÇÃO - INICIALIZAÇÃO E EVENT LISTENERS GLOBAIS ==== */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado. Configurando listeners...");

    // ==== EVENT LISTENERS PARA OS MENUS ====
    const menuLinks = document.querySelectorAll('nav ul li a[data-pagina]');
    menuLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const paginaId = link.dataset.pagina;
            console.log(`Navegando para: ${paginaId}`);
            mostrarPagina(paginaId);
            if (paginaId === 'orcamentos-gerados') mostrarOrcamentosGerados();
            if (paginaId === 'lista-pedidos') mostrarPedidosRealizados();
            if (paginaId === 'relatorio') {
                 const relatorioConteudoDiv = document.getElementById('relatorio-conteudo');
                 if (relatorioConteudoDiv) relatorioConteudoDiv.innerHTML = '<p>Selecione o período e clique em "Gerar Relatório".</p>';
            }
        });
    });

    // ==== EVENT LISTENERS PARA BOTÕES PRINCIPAIS DOS FORMULÁRIOS ====
    const btnAddProdutoOrcamento = document.getElementById('btnAddProdutoOrcamento');
    if (btnAddProdutoOrcamento) btnAddProdutoOrcamento.addEventListener('click', adicionarProduto);
    const btnAddProdutoEdicao = document.getElementById('btnAddProdutoEdicao');
    if (btnAddProdutoEdicao) btnAddProdutoEdicao.addEventListener('click', adicionarProdutoEdicao);
    const btnGerarOrcamento = document.getElementById('btnGerarOrcamento');
    if (btnGerarOrcamento) btnGerarOrcamento.addEventListener('click', gerarOrcamento);
    const btnAtualizarOrcamento = document.getElementById('btnAtualizarOrcamento');
    if (btnAtualizarOrcamento) btnAtualizarOrcamento.addEventListener('click', atualizarOrcamento);
    const btnSalvarPedidoEdicao = document.getElementById('btnSalvarPedidoEdicao');
    if (btnSalvarPedidoEdicao) btnSalvarPedidoEdicao.addEventListener('click', atualizarPedido);

    // ==== EVENT LISTENERS PARA BOTÕES DE FILTRO E RELATÓRIO ====
    const btnFiltrarOrcamentos = document.querySelector('#orcamentos-gerados .filtro-data button');
    if (btnFiltrarOrcamentos) btnFiltrarOrcamentos.addEventListener('click', filtrarOrcamentos);
    const btnFiltrarPedidos = document.querySelector('#lista-pedidos .filtro-data button');
    if (btnFiltrarPedidos) btnFiltrarPedidos.addEventListener('click', filtrarPedidos);
    const btnGerarRelatorio = document.querySelector('#relatorio .filtro-data button');
    if (btnGerarRelatorio) btnGerarRelatorio.addEventListener('click', filtrarPedidosRelatorio);
    const btnExportarXLSX = document.querySelector('#relatorio button[onclick="gerarRelatorioXLSX()"]');
     if (btnExportarXLSX) {
         btnExportarXLSX.addEventListener('click', (event) => {
             event.preventDefault();
             gerarRelatorioXLSX();
         });
     }

    // ==== EVENT LISTENERS PARA INPUTS DE VALOR (Formatação e Recálculo) ====
    const valorFreteOrcamento = document.getElementById('valorFrete');
    if (valorFreteOrcamento) {
        valorFreteOrcamento.addEventListener('input', () => formatarEntradaMoeda(valorFreteOrcamento));
        valorFreteOrcamento.addEventListener('blur', atualizarTotais);
    }
    const valorFreteEdicao = document.getElementById('valorFreteEdicao');
    if (valorFreteEdicao) {
        valorFreteEdicao.addEventListener('input', () => formatarEntradaMoeda(valorFreteEdicao));
        valorFreteEdicao.addEventListener('blur', atualizarTotaisEdicao);
    }
    const valorPedidoEdicao = document.getElementById('valorPedidoEdicao');
    if (valorPedidoEdicao) {
        valorPedidoEdicao.addEventListener('input', () => formatarEntradaMoeda(valorPedidoEdicao));
        valorPedidoEdicao.addEventListener('blur', atualizarTotaisEdicao);
    }
    const entradaEdicao = document.getElementById('entradaEdicao');
    if (entradaEdicao) {
        entradaEdicao.addEventListener('input', () => formatarEntradaMoeda(entradaEdicao));
        entradaEdicao.addEventListener('input', atualizarRestanteEdicao);
        entradaEdicao.addEventListener('blur', atualizarRestanteEdicao);
    }
    const custoMaoDeObraEdicao = document.getElementById('custoMaoDeObraEdicao');
    if (custoMaoDeObraEdicao) {
        custoMaoDeObraEdicao.addEventListener('input', () => formatarEntradaMoeda(custoMaoDeObraEdicao));
    }
    const margemLucroEdicao = document.getElementById('margemLucroEdicao');
    if (margemLucroEdicao) {
        margemLucroEdicao.addEventListener('input', () => formatarEntradaMoeda(margemLucroEdicao));
    }

    // ==== LISTENERS PARA TABELAS DE PRODUTOS (Delegação de Eventos) ====
    const tabelaProdutosBody = document.querySelector("#tabelaProdutos tbody");
    if (tabelaProdutosBody) {
        tabelaProdutosBody.addEventListener('input', (event) => {
            if (event.target.classList.contains('produto-valor-unit')) {
                formatarEntradaMoeda(event.target);
                atualizarTotais();
            }
        });
        tabelaProdutosBody.addEventListener('change', (event) => {
            if (event.target.classList.contains('produto-quantidade')) {
                atualizarTotais();
            }
        });
         tabelaProdutosBody.addEventListener('blur', (event) => {
            if (event.target.classList.contains('produto-valor-unit')) {
                 atualizarTotais();
            }
        }, true);
    }
     const tabelaProdutosEdicaoBody = document.querySelector("#tabelaProdutosEdicao tbody");
    if (tabelaProdutosEdicaoBody) {
        tabelaProdutosEdicaoBody.addEventListener('input', (event) => {
            if (event.target.classList.contains('produto-valor-unit')) {
                formatarEntradaMoeda(event.target);
                atualizarTotaisEdicao();
            }
        });
        tabelaProdutosEdicaoBody.addEventListener('change', (event) => {
            if (event.target.classList.contains('produto-quantidade')) {
                atualizarTotaisEdicao();
            }
        });
         tabelaProdutosEdicaoBody.addEventListener('blur', (event) => {
            if (event.target.classList.contains('produto-valor-unit')) {
                atualizarTotaisEdicao();
            }
        }, true);
    }

    // ==== MONITOR DE AUTENTICAÇÃO (COM FIX DO LOOP) ====
    let authInitialized = false; // Flag to track if the first auth state has been received

    onAuthStateChanged(auth, (user) => {
        console.log("onAuthStateChanged triggered. User:", user ? user.email : null, "Auth Initialized:", authInitialized);
        usuarioAtual = user; // Update the global user variable immediately

        const appContent = document.getElementById('appContent');
        const navMenu = document.querySelector('nav ul');
        const localBtnLogout = document.getElementById('btnLogout'); // Use a different name to avoid conflict

        if (user) {
            // --- User is signed IN ---
            console.log("User is logged IN.");
            if (appContent) appContent.style.display = "block";
            if (navMenu) navMenu.style.display = "block";
            if (localBtnLogout) localBtnLogout.style.display = "inline-block";

            // Load data ONLY on the first time user state is confirmed after page load
            if (!authInitialized) {
                 console.log("Auth confirmed (Logged In) - First time load.");
                 carregarDados();
                 mostrarPagina('form-orcamento');
                 limparCamposMoeda();
                 const dataOrcamentoInput = document.getElementById('dataOrcamento');
                 if (dataOrcamentoInput && !dataOrcamentoInput.value) {
                     dataOrcamentoInput.value = new Date().toISOString().split('T')[0];
                 }
            }
            authInitialized = true; // Mark definitive state received

        } else {
            // --- User is signed OUT ---
            console.log("User is logged OUT (or initial check).");
            if (appContent) appContent.style.display = "none";
            if (navMenu) navMenu.style.display = "none";
            if (localBtnLogout) localBtnLogout.style.display = "none";

            // Only redirect and cleanup IF the initial check has *already happened*.
            if (authInitialized) {
                console.log("Auth WAS initialized, now user is null. Cleaning up and redirecting.");

                // --- Perform Cleanup ---
                orcamentos = []; pedidos = []; numeroOrcamento = 1; numeroPedido = 1;
                orcamentoEditando = null; pedidoEditando = null;
                const tbodyOrcamentos = document.querySelector("#tabela-orcamentos tbody");
                const tbodyPedidos = document.querySelector("#tabela-pedidos tbody");
                if(tbodyOrcamentos) tbodyOrcamentos.innerHTML = ''; if(tbodyPedidos) tbodyPedidos.innerHTML = '';
                const formOrcamento = document.getElementById('orcamento');
                const formEdicaoPedido = document.getElementById('edicaoPedido');
                if(formOrcamento) formOrcamento.reset(); if(formEdicaoPedido) formEdicaoPedido.reset();
                limparCamposMoeda();
                const tbodyProdutosOrc = document.querySelector("#tabelaProdutos tbody");
                const tbodyProdutosEd = document.querySelector("#tabelaProdutosEdicao tbody");
                if (tbodyProdutosOrc) tbodyProdutosOrc.innerHTML = ''; if (tbodyProdutosEd) tbodyProdutosEd.innerHTML = '';
                // --- End Cleanup ---

                // --- Redirect ---
                if (!window.location.pathname.includes('/login/login.html')) {
                    console.log("Redirecting to login page...");
                    window.location.href = "./login/login.html";
                } else {
                     console.log("Already on login page, no redirect needed.");
                }
            } else {
                 console.log("Initial auth check returned null. Waiting for Firebase confirmation...");
            }

            // Mark auth as initialized AFTER the first check completes (whether user is present or null)
            // This prevents the 'else' block above from redirecting on the very first 'null' received during startup.
            if (!authInitialized) {
                authInitialized = true;
                console.log("Auth initialization sequence complete. Final initial state:", user ? user.email : "Logged out");
                // If the very first confirmed state is indeed null, trigger the redirect logic *now*.
                if (!user) {
                     console.log("Initial state CONFIRMED as logged out. Redirecting now.");
                      if (!window.location.pathname.includes('/login/login.html')) {
                          window.location.href = "./login/login.html";
                      }
                }
            }
        }
    });

    console.log("Listeners configurados.");
});
/* ==== FIM SEÇÃO - INICIALIZAÇÃO E EVENT LISTENERS GLOBAIS ==== */

// Adiciona funções auxiliares ao escopo global para onclick no HTML
window.excluirProduto = excluirProduto;
window.excluirProdutoEdicao = excluirProdutoEdicao;
window.formatarEntradaMoeda = formatarEntradaMoeda;
window.atualizarTotais = atualizarTotais;
window.atualizarTotaisEdicao = atualizarTotaisEdicao;
window.atualizarRestanteEdicao = atualizarRestanteEdicao;
window.filtrarOrcamentos = filtrarOrcamentos;
window.filtrarPedidos = filtrarPedidos;
window.filtrarPedidosRelatorio = filtrarPedidosRelatorio;
window.gerarRelatorioXLSX = gerarRelatorioXLSX;
