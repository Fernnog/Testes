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
        console.log("Nenhum usuário logado, carregamento de dados ignorado.");
        return;
    }

    console.log("Usuário logado, carregando dados...");
    try {
        orcamentos = [];
        pedidos = [];
        numeroOrcamento = 1; // Resetar contadores ao carregar
        numeroPedido = 1;    // Resetar contadores ao carregar

        // Consulta com ordenação por número (assumindo formato '0001/YYYY')
        const q = query(orcamentosPedidosRef, orderBy("numero"));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id; // Guarda o ID do documento

            // Extrai o número sequencial para cálculo do próximo
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
    // Adiciona verificação para garantir que valor seja número
    const valorNumerico = Number(valor) || 0;
    return valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
        // console.warn('converterMoedaParaNumero recebeu um valor não string:', valor);
        return Number(valor) || 0; // Tenta converter diretamente se não for string
    }
    return parseFloat(valor.replace(/R\$\s?|\./g, '').replace(',', '.')) || 0;
}

function limparCamposMoeda() {
    const camposMoeda = ['valorFrete', 'valorOrcamento', 'total', 'entrada', 'restante', 'margemLucro', 'custoMaoDeObra',
                         'valorFreteEdicao', 'valorPedidoEdicao', 'totalEdicao', 'entradaEdicao', 'restanteEdicao', 'margemLucroEdicao', 'custoMaoDeObraEdicao'];
    camposMoeda.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.value = 'R$ 0,00'; // Define para 'R$ 0,00'
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

    cellQuantidade.innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1" style="width: 60px;" onchange="atualizarTotais()">'; // Adicionado onchange
    cellDescricao.innerHTML = '<input type="text" class="produto-descricao">';
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotais()">'; // Adicionado oninput e onblur
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

    cellQuantidade.innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1" style="width: 60px;" onchange="atualizarTotaisEdicao()">';
    cellDescricao.innerHTML = '<input type="text" class="produto-descricao">';
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotaisEdicao()">';
    cellValorTotal.textContent = formatarMoeda(0);
    cellAcoes.innerHTML = '<button type="button" onclick="excluirProdutoEdicao(this)">Excluir</button>';
}

function excluirProduto(botaoExcluir) {
    const row = botaoExcluir.closest('tr'); // Método mais robusto
    if (row) {
        row.remove();
        atualizarTotais();
    }
}

function excluirProdutoEdicao(botaoExcluir) {
    const row = botaoExcluir.closest('tr'); // Método mais robusto
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
            const quantidade = parseFloat(quantidadeInput.value) || 0; // Default para 0 se inválido
            const valorUnit = converterMoedaParaNumero(valorUnitInput.value);
            const valorTotalProduto = quantidade * valorUnit;

            valorTotalCell.textContent = formatarMoeda(valorTotalProduto); // Atualiza o valor total do produto na tabela
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
    let valorTotalProdutosEdicao = 0; // Renomeado para clareza

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
    const valorPedidoEdicaoInput = document.getElementById("valorPedidoEdicao"); // Este é o valor base do pedido, não a soma dos produtos
    const totalEdicaoInput = document.getElementById("totalEdicao");

    if(valorFreteEdicaoInput && valorPedidoEdicaoInput && totalEdicaoInput) {
        const valorFrete = converterMoedaParaNumero(valorFreteEdicaoInput.value);
        // O valor do pedido é editável separadamente, não é a soma dos produtos necessariamente
        const valorPedido = converterMoedaParaNumero(valorPedidoEdicaoInput.value);

        // O total GERAL do pedido é a soma do valor base do pedido + frete
        const total = valorPedido + valorFrete;

        // Atualiza apenas o campo TOTAL GERAL
        totalEdicaoInput.value = formatarMoeda(total);

        // **Importante:** O campo valorPedidoEdicao NÃO deve ser atualizado aqui, pois ele é editável
        // e representa o valor negociado do pedido, independentemente da soma exata dos itens listados.
        // O campo valorTotalProdutosEdicao calculado acima pode ser usado para referência interna ou validação, se necessário.

        atualizarRestanteEdicao(); // Chama a atualização do restante, pois o total pode ter mudado
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
        const restante = total - entrada; // Cálculo: Restante = Total - Entrada

        restanteEdicaoInput.value = formatarMoeda(restante);
    } else {
        console.error("Não foi possível encontrar os campos total, entrada ou restante na edição.");
    }
}

function gerarNumeroFormatado(numero) {
    return numero.toString().padStart(4, '0') + '/' + anoAtual;
}

/* ==== FIM DA SEÇÃO - FUNÇÕES AUXILIARES ==== */

/* ==== INÍCIO SEÇÃO - SALVAR DADOS NO FIREBASE (COM VERIFICAÇÃO DE AUTENTICAÇÃO) ==== */
async function salvarDados(dados, tipo) {
    if (!usuarioAtual) {
        alert("Você precisa estar autenticado para salvar dados.");
        console.warn("Tentativa de salvar dados sem autenticação.");
        return; // Não salva se não estiver autenticado
    }
    try {
        // Remove o campo 'id' antes de salvar/atualizar para evitar salvá-lo no documento
        const dadosParaSalvar = { ...dados };
        delete dadosParaSalvar.id;

        if (dados.id) { // Se tem ID, é uma atualização
            const docRef = doc(orcamentosPedidosRef, dados.id);
            await setDoc(docRef, dadosParaSalvar, { merge: true }); // Usa merge: true para atualizar
            console.log(`Dados ${tipo} atualizados no Firebase com ID:`, dados.id);
        } else { // Se não tem ID, é um novo documento
            // Garante que o tipo está definido antes de adicionar
             if (!dadosParaSalvar.tipo) {
                dadosParaSalvar.tipo = tipo;
            }
            const docRef = await addDoc(orcamentosPedidosRef, dadosParaSalvar);
            console.log(`Novos dados ${tipo} salvos no Firebase com ID:`, docRef.id);
            dados.id = docRef.id; // Adiciona o ID de volta ao objeto original na memória
        }
    } catch (error) {
        console.error(`Erro ao salvar dados (${tipo}) no Firebase:`, error);
        alert(`Erro ao salvar ${tipo} no Firebase. Veja o console.`);
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

     // Validação básica
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
        tipo: 'orcamento' // Definição do tipo aqui
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

        // Valida se há descrição e quantidade > 0
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
        await salvarDados(orcamento, 'orcamento'); // Salva no Firebase
        numeroOrcamento++; // Incrementa SÓ DEPOIS de salvar com sucesso
        orcamentos.push(orcamento); // Adiciona ao array local

        document.getElementById("orcamento").reset();
        limparCamposMoeda();
        document.querySelector("#tabelaProdutos tbody").innerHTML = "";
         // Definir data atual como padrão para próximo orçamento
        document.getElementById('dataOrcamento').value = new Date().toISOString().split('T')[0];

        alert("Orçamento gerado com sucesso!");
        mostrarPagina('orcamentos-gerados'); // Adicionado
        mostrarOrcamentosGerados();          // Adicionado
        exibirOrcamentoEmHTML(orcamento);    // Chamar a função para exibir o orçamento aqui

    } catch (error) {
        console.error("Erro ao processar geração de orçamento:", error)
        // Não incrementa numeroOrcamento se salvar falhar
    }
}

function exibirOrcamentoEmHTML(orcamento) {
    console.log("Função exibirOrcamentoEmHTML chamada com orçamento:", orcamento);

    // Garante que o objeto orcamento e seus campos existam
    if (!orcamento || !orcamento.dataOrcamento || !orcamento.dataValidade || !orcamento.produtos) {
        console.error("Objeto orçamento inválido ou incompleto para exibição:", orcamento);
        alert("Erro: Dados do orçamento estão incompletos para visualização.");
        return;
    }

    const janelaOrcamento = window.open('./orcamento.html', '_blank'); // Abre orcamento.html

     if (!janelaOrcamento) {
        alert("Não foi possível abrir a janela de visualização do orçamento. Verifique as permissões de pop-up do seu navegador.");
        return;
    }

    janelaOrcamento.addEventListener('load', () => {
        console.log("Página orcamento.html carregada.");
        const conteudoOrcamento = janelaOrcamento.document.getElementById("conteudo-orcamento");

        if (!conteudoOrcamento) {
            console.error("Elemento #conteudo-orcamento não encontrado em orcamento.html");
             janelaOrcamento.alert("Erro interno ao tentar exibir o orçamento na nova janela."); // Alerta na nova janela
            return;
        }

        try {
            // Formatação segura das datas
            const dataOrcamentoFormatada = orcamento.dataOrcamento ? new Date(orcamento.dataOrcamento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
            const dataValidadeFormatada = orcamento.dataValidade ? new Date(orcamento.dataValidade + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';

            const pagamentoFormatado = (orcamento.pagamento || []).map(pag => {
                if (pag === 'pix') return 'PIX';
                if (pag === 'dinheiro') return 'Dinheiro';
                if (pag === 'cartaoCredito') return 'Cartão de Crédito';
                if (pag === 'cartaoDebito') return 'Cartão de Débito';
                return pag; // Retorna o valor original se não for conhecido
            }).join(', ') || 'Não especificado'; // Default se array for vazio ou nulo

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

            (orcamento.produtos || []).forEach(produto => { // Fallback para array vazio
                html += `
                    <tr>
                        <td>${produto.quantidade || 0}</td>
                        <td>${produto.descricao || 'Sem descrição'}</td>
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
                    ${orcamento.observacoes ? `<strong>Observações:</strong> ${orcamento.observacoes.replace(/\n/g, '<br>')}<br>` : ''}
                </div>
            `;

            conteudoOrcamento.innerHTML = html;
            console.log("Conteúdo do orçamento inserido em orcamento.html");

            // Opcional: Focar e/ou imprimir a janela
            // janelaOrcamento.focus();
            // janelaOrcamento.print();

        } catch (error) {
            console.error("Erro ao gerar HTML do orçamento:", error);
            conteudoOrcamento.innerHTML = `<p style="color: red;">Erro ao gerar a visualização do orçamento. Verifique os dados e tente novamente.</p>`;
            janelaOrcamento.alert("Ocorreu um erro ao formatar os dados do orçamento para visualização.");
        }
    });

     // Adiciona um listener para erro ao carregar a janela (ex: arquivo não encontrado)
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
    tbody.innerHTML = ''; // Limpa a tabela antes de preencher

    // Ordena os orçamentos pelo número (decrescente, mais recentes primeiro)
    const orcamentosOrdenados = [...orcamentos].sort((a, b) => {
        // Extrai número e ano para comparação correta
        const [numA, anoA] = a.numero.split('/');
        const [numB, anoB] = b.numero.split('/');
        if (anoB !== anoA) return anoB - anoA; // Ano mais recente primeiro
        return parseInt(numB) - parseInt(numA); // Número maior primeiro dentro do mesmo ano
    });


    orcamentosOrdenados.forEach(orcamento => {
        const row = tbody.insertRow();
        row.dataset.orcamentoId = orcamento.id; // Adiciona o ID ao TR para fácil acesso

        const cellNumero = row.insertCell();
        const cellData = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellNumeroPedido = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = orcamento.numero || 'N/D';
        // Formata a data de forma segura
        cellData.textContent = orcamento.dataOrcamento ? new Date(orcamento.dataOrcamento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D';
        cellCliente.textContent = orcamento.cliente || 'N/D';
        cellTotal.textContent = formatarMoeda(orcamento.total);
        cellNumeroPedido.textContent = orcamento.numeroPedido || '---'; // Usa '---' se não houver pedido

        // Botão Visualizar (sempre presente)
        const btnVisualizar = document.createElement('button');
        btnVisualizar.textContent = 'Visualizar';
        btnVisualizar.classList.add('btnVisualizarOrcamento');
        btnVisualizar.onclick = () => exibirOrcamentoEmHTML(orcamento); // Chama a função diretamente
        cellAcoes.appendChild(btnVisualizar);

        // Botões Editar e Gerar Pedido (condicionais)
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
             // Adiciona um espaço ou indicador visual se não houver ações condicionais
             cellAcoes.appendChild(document.createTextNode('\u00A0')); // Espaço não quebrável
        }
    });

    // **Removido:** Não precisa mais adicionar event listeners aqui, pois o onclick é direto no botão
}


function filtrarOrcamentos() {
    const dataInicio = document.getElementById('filtroDataInicioOrcamento').value;
    const dataFim = document.getElementById('filtroDataFimOrcamento').value;
    const numeroOrcamentoFiltro = document.getElementById('filtroNumeroOrcamento').value.trim(); // Pega como string
    const anoOrcamentoFiltro = document.getElementById('filtroAnoOrcamento').value.trim();
    const clienteOrcamentoFiltro = document.getElementById('filtroClienteOrcamento').value.toLowerCase().trim();

    const orcamentosFiltrados = orcamentos.filter(orcamento => {
        // Fallback para campos que podem não existir
        const numCompleto = orcamento.numero || '0000/0000';
        const [numOrcamentoStr, anoOrcamentoStr] = numCompleto.split('/');
        const dataOrc = orcamento.dataOrcamento; // Assume que sempre existe após validação na criação
        const nomeCliente = (orcamento.cliente || '').toLowerCase(); // Fallback para string vazia

        // Converte datas do filtro para comparação (adiciona hora para incluir o dia final)
        const dtInicioFiltro = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
        const dtFimFiltro = dataFim ? new Date(dataFim + 'T23:59:59') : null;
        const dtOrcamento = dataOrc ? new Date(dataOrc + 'T00:00:00') : null;

        // Verifica condições do filtro
        const passaData = (!dtInicioFiltro || (dtOrcamento && dtOrcamento >= dtInicioFiltro)) &&
                          (!dtFimFiltro || (dtOrcamento && dtOrcamento <= dtFimFiltro));
        const passaNumero = !numeroOrcamentoFiltro || numOrcamentoStr.padStart(4, '0') === numeroOrcamentoFiltro.padStart(4, '0'); // Compara formatado
        const passaAno = !anoOrcamentoFiltro || anoOrcamentoStr === anoOrcamentoFiltro;
        const passaCliente = !clienteOrcamentoFiltro || nomeCliente.includes(clienteOrcamentoFiltro);

        return passaData && passaNumero && passaAno && passaCliente;
    });

    atualizarListaOrcamentos(orcamentosFiltrados); // Chama função para redesenhar a tabela
}


// Função para atualizar a tabela de orçamentos (usada por mostrarOrcamentosGerados e filtrarOrcamentos)
function atualizarListaOrcamentos(listaOrcamentos) {
    const tbody = document.querySelector("#tabela-orcamentos tbody");
     if (!tbody) {
        console.error("Elemento tbody da tabela de orçamentos não encontrado para atualização.");
        return;
    }
    tbody.innerHTML = ''; // Limpa a tabela

    // Ordena a lista filtrada também (opcional, mas mantém consistência)
    const orcamentosOrdenados = [...listaOrcamentos].sort((a, b) => {
        const [numA, anoA] = (a.numero || '0/0').split('/');
        const [numB, anoB] = (b.numero || '0/0').split('/');
        if (anoB !== anoA) return anoB - anoA;
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

    orcamentoEditando = orcamento.id; // Armazena o ID do orçamento sendo editado

    // Preenche os campos do formulário
    document.getElementById("dataOrcamento").value = orcamento.dataOrcamento || '';
    document.getElementById("dataValidade").value = orcamento.dataValidade || '';
    document.getElementById("cliente").value = orcamento.cliente || '';
    document.getElementById("endereco").value = orcamento.endereco || '';
    document.getElementById("tema").value = orcamento.tema || '';
    document.getElementById("cidade").value = orcamento.cidade || '';
    document.getElementById("telefone").value = orcamento.telefone || '';
    document.getElementById("clienteEmail").value = orcamento.email || ''; // Corrigido para 'email'
    document.getElementById("cores").value = orcamento.cores || '';
    document.getElementById("valorFrete").value = formatarMoeda(orcamento.valorFrete);
    document.getElementById("valorOrcamento").value = formatarMoeda(orcamento.valorOrcamento); // Deve ser recalculado, mas preenche inicialmente
    document.getElementById("total").value = formatarMoeda(orcamento.total); // Deve ser recalculado, mas preenche inicialmente
    document.getElementById("observacoes").value = orcamento.observacoes || '';

    // Limpa e preenche a tabela de produtos
    const tbody = document.querySelector("#tabelaProdutos tbody");
     if (!tbody) {
        console.error("Tbody de produtos do orçamento não encontrado para edição.");
        return;
    }
    tbody.innerHTML = '';
    (orcamento.produtos || []).forEach(produto => { // Fallback para array vazio
        const row = tbody.insertRow();
        const cellQuantidade = row.insertCell();
        const cellDescricao = row.insertCell();
        const cellValorUnit = row.insertCell();
        const cellValorTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellQuantidade.innerHTML = `<input type="number" class="produto-quantidade" value="${produto.quantidade || 1}" min="1" style="width: 60px;" onchange="atualizarTotais()">`;
        cellDescricao.innerHTML = `<input type="text" class="produto-descricao" value="${produto.descricao || ''}">`;
        cellValorUnit.innerHTML = `<input type="text" class="produto-valor-unit" value="${formatarMoeda(produto.valorUnit)}" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotais()">`;
        cellValorTotal.textContent = formatarMoeda(produto.valorTotal); // Será recalculado
        cellAcoes.innerHTML = '<button type="button" onclick="excluirProduto(this)">Excluir</button>';
    });

    // Marca os checkboxes de pagamento
    document.querySelectorAll('input[name="pagamento"]').forEach(el => {
        el.checked = (orcamento.pagamento || []).includes(el.value); // Fallback para array vazio
    });

    // Atualiza os totais com base nos produtos carregados
    atualizarTotais();

    // Ajusta a visibilidade dos botões e mostra a página do formulário
    mostrarPagina('form-orcamento');
    document.getElementById("btnGerarOrcamento").style.display = "none";
    document.getElementById("btnAtualizarOrcamento").style.display = "inline-block";
     // Opcional: Scroll para o topo do formulário
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
        orcamentoEditando = null; // Limpa o estado de edição
        // Restaura botões
        document.getElementById("btnGerarOrcamento").style.display = "inline-block";
        document.getElementById("btnAtualizarOrcamento").style.display = "none";
        return;
    }

     const dataOrcamento = document.getElementById("dataOrcamento").value;
     const dataValidade = document.getElementById("dataValidade").value;
     const cliente = document.getElementById("cliente").value;

      // Validação básica
    if (!dataOrcamento || !dataValidade || !cliente) {
        alert("Preencha pelo menos a Data do Orçamento, Data de Validade e Cliente.");
        return;
    }

    // Cria o objeto atualizado MESCLANDO com o original para manter campos não editáveis (numero, pedidoGerado, etc.)
    const orcamentoOriginal = orcamentos[orcamentoIndex];
    const orcamentoAtualizado = {
        ...orcamentoOriginal, // Copia TUDO do original primeiro
        // Sobrescreve com os dados do formulário
        dataOrcamento: dataOrcamento,
        dataValidade: dataValidade,
        cliente: cliente,
        endereco: document.getElementById("endereco").value,
        tema: document.getElementById("tema").value,
        cidade: document.getElementById("cidade").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("clienteEmail").value,
        cores: document.getElementById("cores").value,
        produtos: [], // Recria o array de produtos a partir do formulário
        pagamento: Array.from(document.querySelectorAll('input[name="pagamento"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFrete").value),
        valorOrcamento: converterMoedaParaNumero(document.getElementById("valorOrcamento").value), // Recalculado
        total: converterMoedaParaNumero(document.getElementById("total").value), // Recalculado
        observacoes: document.getElementById("observacoes").value,
        tipo: 'orcamento' // Garante que o tipo está correto
    };

    // Preenche os produtos atualizados
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
                valorTotal: converterMoedaParaNumero(row.cells[3].textContent) // Pega o valor já calculado na célula
            });
        }
    });

      if (orcamentoAtualizado.produtos.length === 0) {
        alert("Nenhum produto válido encontrado. Verifique as descrições e quantidades.");
        return;
    }

    try {
        await salvarDados(orcamentoAtualizado, 'orcamento'); // Salva no Firebase (usará o ID existente)

        orcamentos[orcamentoIndex] = orcamentoAtualizado; // Atualiza no array local

        document.getElementById("orcamento").reset();
        limparCamposMoeda();
        document.querySelector("#tabelaProdutos tbody").innerHTML = "";
        document.getElementById('dataOrcamento').value = new Date().toISOString().split('T')[0]; // Data padrão

        alert("Orçamento atualizado com sucesso!");

        orcamentoEditando = null; // Reseta o estado de edição
        document.getElementById("btnGerarOrcamento").style.display = "inline-block";
        document.getElementById("btnAtualizarOrcamento").style.display = "none";

        mostrarPagina('orcamentos-gerados');
        mostrarOrcamentosGerados(); // Atualiza a lista exibida

    } catch (error) {
         console.error("Erro ao processar atualização de orçamento:", error)
        // Não limpa o formulário se a atualização falhar, permitindo tentar novamente
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
        // Opcional: redirecionar para a edição do pedido existente?
        // const pedidoExistente = pedidos.find(p => p.numero === orcamento.numeroPedido);
        // if (pedidoExistente) editarPedido(pedidoExistente.id);
        return;
    }

     if (!usuarioAtual) {
        alert("Você precisa estar logado para gerar um pedido.");
        return;
    }

    // Cria o objeto Pedido baseado no Orçamento
    const pedido = {
        numero: gerarNumeroFormatado(numeroPedido),
        dataPedido: new Date().toISOString().split('T')[0], // Data atual
        dataEntrega: orcamento.dataValidade || '', // Usa validade do orçamento como data de entrega inicial
        cliente: orcamento.cliente,
        endereco: orcamento.endereco || '',
        tema: orcamento.tema || '',
        cidade: orcamento.cidade || '',
        telefone: orcamento.telefone || '', // Mantém o campo telefone
        email: orcamento.email || '',
        cores: orcamento.cores || '',
        pagamento: orcamento.pagamento || [], // Copia formas de pagamento
        valorFrete: orcamento.valorFrete || 0,
        valorOrcamento: orcamento.valorOrcamento || 0, // Guarda valor original do orçamento como referência
        total: orcamento.total || 0, // Total inicial vem do orçamento
        observacoes: orcamento.observacoes || '',
        entrada: 0, // Entrada inicial zero
        restante: orcamento.total || 0, // Restante inicial é o total do orçamento
        margemLucro: 0, // Campos financeiros específicos do pedido começam zerados
        custoMaoDeObra: 0,
        valorPedido: orcamento.valorOrcamento || 0, // Valor do pedido (editável) inicia com valor do orçamento
        produtos: (orcamento.produtos || []).map(p => ({ // Copia produtos
            ...p,
            valorTotal: (p.quantidade || 0) * (p.valorUnit || 0) // Recalcula total do produto por segurança
        })),
        previsaoEntrega: '', // **** ADICIONADO: Inicializa o campo de previsão de entrega ****
        idOrcamentoOrigem: orcamento.id, // Guarda referência ao ID do orçamento
        numeroOrcamentoOrigem: orcamento.numero, // Guarda número do orçamento
        tipo: 'pedido' // Define o tipo
    };

    try {
        await salvarDados(pedido, 'pedido'); // Salva o novo pedido
        numeroPedido++; // Incrementa SÓ APÓS salvar pedido

        // Atualiza o orçamento original para marcar como gerado e linkar ao pedido
        orcamento.numeroPedido = pedido.numero;
        orcamento.pedidoGerado = true;
        await salvarDados(orcamento, 'orcamento'); // Salva a atualização no orçamento

        pedidos.push(pedido); // Adiciona o novo pedido ao array local

        alert(`Pedido Nº ${pedido.numero} gerado com sucesso a partir do orçamento Nº ${orcamento.numero}!`);

        // Atualiza as listas exibidas
        mostrarOrcamentosGerados();
        mostrarPedidosRealizados();
        mostrarPagina('lista-pedidos'); // Muda para a lista de pedidos

    } catch (error) {
        console.error("Erro ao processar geração de pedido:", error);
         // Não incrementa numeroPedido nem atualiza orçamento se salvar pedido falhar
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

    // Ordena os pedidos pelo número (decrescente)
    const pedidosOrdenados = [...pedidos].sort((a, b) => {
        const [numA, anoA] = (a.numero || '0/0').split('/');
        const [numB, anoB] = (b.numero || '0/0').split('/');
        if (anoB !== anoA) return anoB - anoA;
        return parseInt(numB) - parseInt(numA);
    });

    pedidosOrdenados.forEach(pedido => {
        const row = tbody.insertRow();
        row.dataset.pedidoId = pedido.id; // Guarda o ID no TR

        const cellNumero = row.insertCell();
        const cellDataPedido = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = pedido.numero || 'N/D';
        cellDataPedido.textContent = pedido.dataPedido ? new Date(pedido.dataPedido + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D';
        cellCliente.textContent = pedido.cliente || 'N/D';
        cellTotal.textContent = formatarMoeda(pedido.total);

        // Botão Editar
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.classList.add('btnEditarPedido');
        btnEditar.onclick = () => editarPedido(pedido.id); // Chama a função diretamente
        cellAcoes.appendChild(btnEditar);

         // Adicionar mais botões aqui se necessário (ex: Visualizar Pedido Completo)
         // const btnVisualizarPedido = document.createElement('button');
         // btnVisualizarPedido.textContent = 'Visualizar';
         // btnVisualizarPedido.onclick = () => visualizarPedidoCompleto(pedido.id);
         // cellAcoes.appendChild(btnVisualizarPedido);
    });

     // **Removido:** Não precisa mais adicionar event listeners aqui
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
        if (anoB !== anoA) return anoB - anoA;
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

        // Outros botões, se houver
    });
}

function editarPedido(pedidoId) {
    pedidoEditando = pedidoId; // Define o ID do pedido sendo editado globalmente
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) {
        alert("Erro: Pedido não encontrado na memória local para edição.");
        pedidoEditando = null; // Limpa o estado
        return;
    }

    console.log("Editando pedido:", pedido); // Log para depuração

    // Preenche os campos do formulário de edição
    document.getElementById("dataPedidoEdicao").value = pedido.dataPedido || '';
    document.getElementById("dataEntregaEdicao").value = pedido.dataEntrega || '';
    document.getElementById("clienteEdicao").value = pedido.cliente || '';
    document.getElementById("enderecoEdicao").value = pedido.endereco || '';
    document.getElementById("temaEdicao").value = pedido.tema || '';
    document.getElementById("cidadeEdicao").value = pedido.cidade || '';
    document.getElementById("contatoEdicao").value = pedido.telefone || ''; // Usa o campo telefone do pedido
    document.getElementById("coresEdicao").value = pedido.cores || '';
    document.getElementById("valorFreteEdicao").value = formatarMoeda(pedido.valorFrete);
    document.getElementById("valorPedidoEdicao").value = formatarMoeda(pedido.valorPedido); // Valor base do pedido
    document.getElementById("totalEdicao").value = formatarMoeda(pedido.total); // Total geral (calculado)
    document.getElementById("entradaEdicao").value = formatarMoeda(pedido.entrada);
    document.getElementById("restanteEdicao").value = formatarMoeda(pedido.restante); // (calculado)
    document.getElementById("margemLucroEdicao").value = formatarMoeda(pedido.margemLucro || 0);
    document.getElementById("custoMaoDeObraEdicao").value = formatarMoeda(pedido.custoMaoDeObra || 0);

    // **** ADICIONADO: Carregar o campo de previsão de entrega ****
    document.getElementById("previsaoEntregaEdicao").value = pedido.previsaoEntrega || ''; // Usa || '' para fallback

    document.getElementById("observacoesEdicao").value = pedido.observacoes || '';

    // Preenche a tabela de produtos da edição
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
        cellValorTotal.textContent = formatarMoeda(produto.valorTotal); // Será recalculado
        cellAcoes.innerHTML = '<button type="button" onclick="excluirProdutoEdicao(this)">Excluir</button>';
    });

    // Marca os checkboxes de pagamento
    const pagamentoCheckboxes = document.querySelectorAll('input[name="pagamentoEdicao"]');
    pagamentoCheckboxes.forEach(el => el.checked = (pedido.pagamento || []).includes(el.value));

    // Garante que os cálculos sejam refeitos ao carregar
    atualizarTotaisEdicao(); // Isso recalcula totais e o restante

    // Mostra a página de edição
    mostrarPagina('form-edicao-pedido');
    window.scrollTo(0, 0); // Rola para o topo
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

     // Validações básicas (exemplo)
    const dataPedido = document.getElementById("dataPedidoEdicao").value;
    const cliente = document.getElementById("clienteEdicao").value;
    if (!dataPedido || !cliente) {
        alert("Preencha pelo menos a Data do Pedido e o Cliente.");
        return;
    }


    const pedidoOriginal = pedidos[pedidoIndex];
    const pedidoAtualizado = {
        ...pedidoOriginal, // Mantém campos não editáveis (numero, idOrcamentoOrigem, etc.) e o ID
        dataPedido: dataPedido,
        dataEntrega: document.getElementById("dataEntregaEdicao").value,
        cliente: cliente,
        endereco: document.getElementById("enderecoEdicao").value,
        tema: document.getElementById("temaEdicao").value,
        cidade: document.getElementById("cidadeEdicao").value,
        telefone: document.getElementById("contatoEdicao").value, // Campo 'Contato' agora mapeia para 'telefone'
        cores: document.getElementById("coresEdicao").value,
        produtos: [], // Recria a partir do formulário
        pagamento: Array.from(document.querySelectorAll('input[name="pagamentoEdicao"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFreteEdicao").value),
        valorPedido: converterMoedaParaNumero(document.getElementById("valorPedidoEdicao").value), // Valor base do pedido
        total: converterMoedaParaNumero(document.getElementById("totalEdicao").value), // Total recalculado
        entrada: converterMoedaParaNumero(document.getElementById("entradaEdicao").value),
        restante: converterMoedaParaNumero(document.getElementById("restanteEdicao").value), // Restante recalculado
        margemLucro: converterMoedaParaNumero(document.getElementById("margemLucroEdicao").value) || 0,
        custoMaoDeObra: converterMoedaParaNumero(document.getElementById("custoMaoDeObraEdicao").value) || 0,

        // **** ADICIONADO: Ler o valor do novo campo Previsão de Entrega ****
        previsaoEntrega: document.getElementById("previsaoEntregaEdicao").value,

        observacoes: document.getElementById("observacoesEdicao").value,
        tipo: 'pedido' // Garante tipo
    };

    // Preenche os produtos atualizados
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
                valorTotal: converterMoedaParaNumero(row.cells[3].textContent) // Pega valor calculado
            });
        }
    });

    if (pedidoAtualizado.produtos.length === 0) {
        alert("Nenhum produto válido encontrado. Verifique as descrições e quantidades.");
        return;
    }

    try {
        await salvarDados(pedidoAtualizado, 'pedido'); // Salva no Firebase

        pedidos[pedidoIndex] = pedidoAtualizado; // Atualiza no array local

        alert("Pedido atualizado com sucesso!");
        pedidoEditando = null; // Limpa o estado de edição
        mostrarPagina('lista-pedidos');
        mostrarPedidosRealizados(); // Atualiza a lista exibida

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
        if (!dataPed) return false; // Ignora pedidos sem data

        // Cria objetos Date para comparação
        const dtPedido = new Date(dataPed + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso
        const dtInicioFiltro = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
        const dtFimFiltro = dataFim ? new Date(dataFim + 'T23:59:59') : null; // Inclui o dia final

        // Verifica se a data do pedido está dentro do intervalo
        const dentroDoIntervalo =
            (!dtInicioFiltro || dtPedido >= dtInicioFiltro) &&
            (!dtFimFiltro || dtPedido <= dtFimFiltro);

        return dentroDoIntervalo;
    });

    gerarRelatorio(pedidosFiltrados);
}

function gerarRelatorio(pedidosFiltrados) {
    let totalPedidosValor = 0; // Renomeado para clareza
    let totalFrete = 0;
    let totalMargemLucro = 0;
    let totalCustoMaoDeObra = 0;

    pedidosFiltrados.forEach(pedido => {
        totalPedidosValor += pedido.total || 0; // Soma o valor total do pedido
        totalFrete += pedido.valorFrete || 0;
        // Certifica que são números antes de somar
        totalMargemLucro += Number(pedido.margemLucro) || 0;
        totalCustoMaoDeObra += Number(pedido.custoMaoDeObra) || 0;
    });

    const quantidadePedidos = pedidosFiltrados.length;

    // Ordena pedidos por data para o relatório
     const pedidosOrdenadosRelatorio = [...pedidosFiltrados].sort((a, b) => {
        const dateA = new Date(a.dataPedido + 'T00:00:00');
        const dateB = new Date(b.dataPedido + 'T00:00:00');
        return dateA - dateB; // Ordena do mais antigo para o mais recente
    });


    let relatorioHTML = `
        <h3>Resumo do Período</h3>
        <table class="relatorio-table">
            <thead>
                <tr>
                    <th>Total Pedidos (Valor)</th>
                    <th>Total Frete</th>
                    <th>Total Margem Lucro</th>
                    <th>Total Custo M.O.</th>
                    <th>Quantidade Pedidos</th>
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
        <h3 style="margin-top: 30px;">Lista de Pedidos no Período</h3>
        <table class="relatorio-table">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Data Pedido</th>
                    <th>Cliente</th>
                    <th>Total (R$)</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (pedidosOrdenadosRelatorio.length > 0) {
        pedidosOrdenadosRelatorio.forEach(pedido => {
             const dataFormatada = pedido.dataPedido ? new Date(pedido.dataPedido + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D';
            relatorioHTML += `
                    <tr>
                        <td>${pedido.numero || 'N/D'}</td>
                        <td>${dataFormatada}</td>
                        <td>${pedido.cliente || 'N/D'}</td>
                        <td>${formatarMoeda(pedido.total)}</td>
                    </tr>
            `;
        });
    } else {
        relatorioHTML += `<tr><td colspan="4">Nenhum pedido encontrado para o período selecionado.</td></tr>`;
    }


    relatorioHTML += `
            </tbody>
        </table>
    `;

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

     // Verificar se a biblioteca XLSX está carregada
    if (typeof XLSX === 'undefined') {
        alert('Erro: Biblioteca de exportação (XLSX) não carregada.');
        console.error("XLSX library is not defined. Make sure it's included in index.html.");
        return;
    }


    try {
        const wb = XLSX.utils.book_new(); // Cria um novo workbook

        // Adiciona a tabela de Resumo
        if (tabelas[0]) {
            const wsResumo = XLSX.utils.table_to_sheet(tabelas[0]);
            XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
        }

        // Adiciona a tabela de Lista de Pedidos
        if (tabelas[1]) {
            const wsLista = XLSX.utils.table_to_sheet(tabelas[1]);
            XLSX.utils.book_append_sheet(wb, wsLista, "Lista Pedidos");
        }

        // Gera o arquivo XLSX
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
        pagina.style.display = 'none';
    });

     const paginaAtiva = document.getElementById(idPagina);
    if (paginaAtiva) {
        paginaAtiva.style.display = 'block';

        // Resetar estado de edição ao mudar de página (exceto se for a própria página de edição)
        if (orcamentoEditando !== null && idPagina !== 'form-orcamento') {
            orcamentoEditando = null;
            document.getElementById("btnGerarOrcamento").style.display = "inline-block";
            document.getElementById("btnAtualizarOrcamento").style.display = "none";
             // Opcional: limpar formulário de orçamento se sair dele
             // document.getElementById("orcamento").reset();
             // limparCamposMoeda();
             // document.querySelector("#tabelaProdutos tbody").innerHTML = "";
        }
         if (pedidoEditando !== null && idPagina !== 'form-edicao-pedido') {
            pedidoEditando = null;
             // Opcional: limpar formulário de edição se sair dele
             // document.getElementById("edicaoPedido").reset();
             // limparCamposMoeda(); // Pode precisar ser mais específico aqui
             // document.querySelector("#tabelaProdutosEdicao tbody").innerHTML = "";
        }


         // Define data atual no form de orçamento se ele for exibido
        if (idPagina === 'form-orcamento' && !orcamentoEditando) {
           const dataOrcamentoInput = document.getElementById('dataOrcamento');
            if (dataOrcamentoInput && !dataOrcamentoInput.value) { // Só define se estiver vazio
                dataOrcamentoInput.value = new Date().toISOString().split('T')[0];
            }
        }


    } else {
        console.warn(`Página com ID "${idPagina}" não encontrada.`);
        // Opcional: mostrar a página inicial por padrão se a ID for inválida
        document.getElementById('form-orcamento').style.display = 'block';
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
            // Atualiza dados se necessário ao navegar
            if (paginaId === 'orcamentos-gerados') mostrarOrcamentosGerados();
            if (paginaId === 'lista-pedidos') mostrarPedidosRealizados();
            if (paginaId === 'relatorio') {
                 // Limpa relatório anterior ao navegar para a página
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

    const btnExportarXLSX = document.querySelector('#relatorio button[onclick="gerarRelatorioXLSX()"]'); // Seleciona pelo onclick
     if (btnExportarXLSX) {
         // Previne o comportamento padrão do onclick no HTML e chama a função JS
         btnExportarXLSX.addEventListener('click', (event) => {
             event.preventDefault(); // Impede o onclick="gerarRelatorioXLSX()" do HTML
             gerarRelatorioXLSX();   // Chama a função diretamente
         });
     }


    // ==== EVENT LISTENERS PARA INPUTS DE VALOR (Formatação e Recálculo) ====

    // Inputs de Valor (Formulário Orçamento)
    const valorFreteOrcamento = document.getElementById('valorFrete');
    if (valorFreteOrcamento) {
        valorFreteOrcamento.addEventListener('input', () => formatarEntradaMoeda(valorFreteOrcamento));
        valorFreteOrcamento.addEventListener('blur', atualizarTotais);
    }

    // Inputs de Valor (Formulário Edição Pedido)
    const valorFreteEdicao = document.getElementById('valorFreteEdicao');
    if (valorFreteEdicao) {
        valorFreteEdicao.addEventListener('input', () => formatarEntradaMoeda(valorFreteEdicao));
        valorFreteEdicao.addEventListener('blur', atualizarTotaisEdicao);
    }
    const valorPedidoEdicao = document.getElementById('valorPedidoEdicao');
    if (valorPedidoEdicao) {
        valorPedidoEdicao.addEventListener('input', () => formatarEntradaMoeda(valorPedidoEdicao));
        valorPedidoEdicao.addEventListener('blur', atualizarTotaisEdicao); // Atualiza total geral e restante
    }
     const entradaEdicao = document.getElementById('entradaEdicao');
    if (entradaEdicao) {
        entradaEdicao.addEventListener('input', () => formatarEntradaMoeda(entradaEdicao));
        // O blur já chama atualizarRestanteEdicao, mas podemos chamar no input também se quisermos atualização instantânea
        entradaEdicao.addEventListener('input', atualizarRestanteEdicao); // Atualiza restante ao digitar
        entradaEdicao.addEventListener('blur', atualizarRestanteEdicao);
    }
    const custoMaoDeObraEdicao = document.getElementById('custoMaoDeObraEdicao');
    if (custoMaoDeObraEdicao) {
        custoMaoDeObraEdicao.addEventListener('input', () => formatarEntradaMoeda(custoMaoDeObraEdicao));
        // Não recalcula totais automaticamente, é apenas informativo
    }
    const margemLucroEdicao = document.getElementById('margemLucroEdicao');
    if (margemLucroEdicao) {
        margemLucroEdicao.addEventListener('input', () => formatarEntradaMoeda(margemLucroEdicao));
         // Não recalcula totais automaticamente, é apenas informativo
    }

    // ==== LISTENERS PARA TABELAS DE PRODUTOS (Delegação de Eventos) ====
    // Usar delegação de eventos é mais eficiente para tabelas dinâmicas

    const tabelaProdutosBody = document.querySelector("#tabelaProdutos tbody");
    if (tabelaProdutosBody) {
        tabelaProdutosBody.addEventListener('input', (event) => {
            if (event.target.classList.contains('produto-valor-unit')) {
                formatarEntradaMoeda(event.target);
                atualizarTotais(); // Atualiza ao digitar no valor unitário
            }
        });
        tabelaProdutosBody.addEventListener('change', (event) => {
            if (event.target.classList.contains('produto-quantidade')) {
                atualizarTotais(); // Atualiza ao mudar quantidade
            }
        });
         tabelaProdutosBody.addEventListener('blur', (event) => {
            if (event.target.classList.contains('produto-valor-unit')) {
                 // Blur já chama atualizarTotais indiretamente pelo input, mas podemos garantir aqui
                 atualizarTotais();
            }
        }, true); // Usa captura para garantir que blur seja pego
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


    // ==== MONITOR DE AUTENTICAÇÃO ====
    onAuthStateChanged(auth, (user) => {
        usuarioAtual = user; // Atualiza a variável global
        const appContent = document.getElementById('appContent'); // Div principal da aplicação
        const navMenu = document.querySelector('nav ul'); // Menu de navegação

        if (user) {
            console.log("Usuário autenticado:", user.email);
             if (appContent) appContent.style.display = "block"; // Mostra conteúdo principal
             if (btnLogout) btnLogout.style.display = "inline-block"; // Mostra botão Sair
             if(navMenu) navMenu.style.display = "block"; // Mostra menu de navegação

             carregarDados(); // Carrega os dados do usuário logado
             mostrarPagina('form-orcamento'); // Vai para a página inicial após login

             // Inicializa campos de moeda após o login e carregamento
             limparCamposMoeda();
              // Define a data de hoje no form de orçamento
             const dataOrcamentoInput = document.getElementById('dataOrcamento');
             if (dataOrcamentoInput) {
                 dataOrcamentoInput.value = new Date().toISOString().split('T')[0];
             }


        } else {
            console.log("Nenhum usuário autenticado.");
             if (appContent) appContent.style.display = "none"; // Esconde conteúdo principal
             if (btnLogout) btnLogout.style.display = "none"; // Esconde botão Sair
             if(navMenu) navMenu.style.display = "none"; // Esconde menu

            // Limpa dados locais ao deslogar
            orcamentos = [];
            pedidos = [];
            numeroOrcamento = 1;
            numeroPedido = 1;
            orcamentoEditando = null;
            pedidoEditando = null;

            // Limpa tabelas visuais
             const tbodyOrcamentos = document.querySelector("#tabela-orcamentos tbody");
             const tbodyPedidos = document.querySelector("#tabela-pedidos tbody");
             if(tbodyOrcamentos) tbodyOrcamentos.innerHTML = '';
             if(tbodyPedidos) tbodyPedidos.innerHTML = '';

            // Limpa formulários
             const formOrcamento = document.getElementById('orcamento');
             const formEdicaoPedido = document.getElementById('edicaoPedido');
             if(formOrcamento) formOrcamento.reset();
             if(formEdicaoPedido) formEdicaoPedido.reset();
             limparCamposMoeda(); // Limpa campos de moeda formatados
             const tbodyProdutosOrc = document.querySelector("#tabelaProdutos tbody");
             const tbodyProdutosEd = document.querySelector("#tabelaProdutosEdicao tbody");
             if (tbodyProdutosOrc) tbodyProdutosOrc.innerHTML = '';
             if (tbodyProdutosEd) tbodyProdutosEd.innerHTML = '';


             // Redireciona para login SE NÃO ESTIVER JÁ NA PÁGINA DE LOGIN
            if (!window.location.pathname.includes('/login/login.html')) {
                console.log("Redirecionando para login...");
                window.location.href = "./login/login.html";
            }
        }
    });

    console.log("Listeners configurados.");
    // Não chama mostrarPagina aqui, pois onAuthStateChanged cuidará disso.
    // limparCamposMoeda(); // Limpa campos no carregamento inicial (antes do login)
});
/* ==== FIM SEÇÃO - INICIALIZAÇÃO E EVENT LISTENERS GLOBAIS ==== */

// Adiciona as funções auxiliares ao escopo global para que possam ser chamadas pelo onclick no HTML
// (Alternativa seria usar addEventListener para os botões de excluir, como feito para outros botões)
window.excluirProduto = excluirProduto;
window.excluirProdutoEdicao = excluirProdutoEdicao;
window.formatarEntradaMoeda = formatarEntradaMoeda; // Torna global se precisar chamar de outro lugar
window.atualizarTotais = atualizarTotais; // Torna global se precisar
window.atualizarTotaisEdicao = atualizarTotaisEdicao; // Torna global se precisar
window.atualizarRestanteEdicao = atualizarRestanteEdicao; // Torna global se precisar
// Funções de filtro também precisam ser globais se chamadas por onclick
window.filtrarOrcamentos = filtrarOrcamentos;
window.filtrarPedidos = filtrarPedidos;
window.filtrarPedidosRelatorio = filtrarPedidosRelatorio;
window.gerarRelatorioXLSX = gerarRelatorioXLSX; // Já era chamada por onclick, mantém global