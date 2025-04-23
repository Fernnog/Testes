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
                // Ajuste para evitar NaN se o número não estiver no formato esperado
                const numeroParte = data.numero ? data.numero.split('/')[0] : '0';
                numeroOrcamento = Math.max(numeroOrcamento, parseInt(numeroParte) + 1);
            } else if (data.tipo === 'pedido') {
                pedidos.push(data);
                 // Ajuste para evitar NaN se o número não estiver no formato esperado
                const numeroParte = data.numero ? data.numero.split('/')[0] : '0';
                numeroPedido = Math.max(numeroPedido, parseInt(numeroParte) + 1);
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
    // Adiciona verificação se o valor é numérico
    if (typeof valor !== 'number' || isNaN(valor)) {
        return 'R$ 0,00'; // Retorna zero formatado se não for um número válido
    }
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarEntradaMoeda(input) {
    if (!input || input.value === undefined || input.value === null) {
        console.warn('formatarEntradaMoeda recebeu input inválido:', input);
        return; // Sai se o input for inválido
    }
    // Mantém 'R$ 0,00' se o valor for vazio ou inválido após limpeza
    let valorLimpo = input.value.replace(/\D/g, '');
    if (!valorLimpo) {
        input.value = 'R$ 0,00';
        return;
    }
    let valorNumerico = parseFloat(valorLimpo) / 100;
    input.value = formatarMoeda(valorNumerico); // Usa a função formatarMoeda existente
}


function converterMoedaParaNumero(valor) {
    if (typeof valor !== 'string') {
        console.warn('converterMoedaParaNumero recebeu um valor não string:', valor);
        // Tenta converter se for número, senão retorna 0
        return typeof valor === 'number' && !isNaN(valor) ? valor : 0;
    }
    // Remove 'R$', espaços, pontos de milhar e substitui vírgula por ponto decimal
    const valorNumerico = parseFloat(valor.replace(/R\$\s?|\./g, '').replace(',', '.')) || 0;
     // Retorna 0 se o resultado for NaN (após parseFloat)
    return isNaN(valorNumerico) ? 0 : valorNumerico;
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
    if (!tbody) return; // Verifica se tbody existe
    const newRow = tbody.insertRow();

    const cellQuantidade = newRow.insertCell();
    const cellDescricao = newRow.insertCell();
    const cellValorUnit = newRow.insertCell();
    const cellValorTotal = newRow.insertCell();
    const cellAcoes = newRow.insertCell();

    // Adiciona onchange e onblur para atualizar totais ao modificar quantidade/valor
    cellQuantidade.innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1" onchange="atualizarTotais()" onblur="atualizarTotais()">';
    cellDescricao.innerHTML = '<input type="text" class="produto-descricao">';
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotais()">'; // Valor inicial formatado e onblur
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

    cellQuantidade.innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1" onchange="atualizarTotaisEdicao()" onblur="atualizarTotaisEdicao()">'; // Adicionado onblur
    cellDescricao.innerHTML = '<input type="text" class="produto-descricao">';
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotaisEdicao()">'; // Valor inicial formatado e onblur
    cellValorTotal.textContent = formatarMoeda(0);
    cellAcoes.innerHTML = '<button type="button" onclick="excluirProdutoEdicao(this)">Excluir</button>';
}

function excluirProduto(botaoExcluir) {
    if (!botaoExcluir || !botaoExcluir.parentNode || !botaoExcluir.parentNode.parentNode) return;
    const row = botaoExcluir.parentNode.parentNode;
    row.remove();
    atualizarTotais();
}

function excluirProdutoEdicao(botaoExcluir) {
     if (!botaoExcluir || !botaoExcluir.parentNode || !botaoExcluir.parentNode.parentNode) return;
    const row = botaoExcluir.parentNode.parentNode;
    row.remove();
    atualizarTotaisEdicao();
}

function atualizarTotais() {
    let valorTotalOrcamento = 0;
    const produtos = document.querySelectorAll("#tabelaProdutos tbody tr");
    const valorFreteInput = document.getElementById("valorFrete");
    const valorOrcamentoInput = document.getElementById("valorOrcamento");
    const totalInput = document.getElementById("total");

    if (!valorFreteInput || !valorOrcamentoInput || !totalInput) return; // Verifica se os elementos existem

    produtos.forEach(row => {
        const quantidadeInput = row.querySelector(".produto-quantidade");
        const valorUnitInput = row.querySelector(".produto-valor-unit");
        if (!quantidadeInput || !valorUnitInput) return; // Pula linha se inputs não encontrados

        const quantidade = parseFloat(quantidadeInput.value) || 0; // Usa 0 se NaN
        const valorUnit = converterMoedaParaNumero(valorUnitInput.value); // converterMoedaParaNumero já retorna 0 se inválido
        const valorTotal = quantidade * valorUnit;

        // Verifica se a célula existe antes de definir textContent
        if (row.cells[3]) {
            row.cells[3].textContent = formatarMoeda(valorTotal); // Atualiza o valor total do produto na tabela
        }
        valorTotalOrcamento += valorTotal;
    });

    const valorFrete = converterMoedaParaNumero(valorFreteInput.value);
    const total = valorTotalOrcamento + valorFrete;

    valorOrcamentoInput.value = formatarMoeda(valorTotalOrcamento);
    totalInput.value = formatarMoeda(total);
}

function atualizarTotaisEdicao() {
    let valorTotalProdutos = 0; // Renomeado para clareza
    const valorFreteInput = document.getElementById("valorFreteEdicao");
    const valorPedidoInput = document.getElementById("valorPedidoEdicao"); // Campo para valor base do pedido
    const totalInput = document.getElementById("totalEdicao");

    if (!valorFreteInput || !valorPedidoInput || !totalInput) return;

    document.querySelectorAll("#tabelaProdutosEdicao tbody tr").forEach(row => {
        const quantidadeInput = row.querySelector(".produto-quantidade");
        const valorUnitInput = row.querySelector(".produto-valor-unit");
        if (!quantidadeInput || !valorUnitInput) return;

        const quantidade = parseFloat(quantidadeInput.value) || 0;
        const valorUnit = converterMoedaParaNumero(valorUnitInput.value);
        const valorTotalProduto = quantidade * valorUnit;

        if (row.cells[3]) {
            row.cells[3].textContent = formatarMoeda(valorTotalProduto);
        }
        valorTotalProdutos += valorTotalProduto;
    });

    // Atualiza o campo "Valor do Pedido" com a soma dos produtos
    valorPedidoInput.value = formatarMoeda(valorTotalProdutos);

    // Calcula o total geral (Valor do Pedido + Frete)
    const valorFrete = converterMoedaParaNumero(valorFreteInput.value);
    const total = valorTotalProdutos + valorFrete; // Total é a soma dos produtos + frete

    totalInput.value = formatarMoeda(total);
    atualizarRestanteEdicao(); // Chama para recalcular o restante
}


function atualizarRestanteEdicao() {
    const totalInput = document.getElementById("totalEdicao");
    const entradaInput = document.getElementById("entradaEdicao");
    const restanteInput = document.getElementById("restanteEdicao");

    if (!totalInput || !entradaInput || !restanteInput) return; // Verifica se os inputs existem

    const total = converterMoedaParaNumero(totalInput.value);
    const entrada = converterMoedaParaNumero(entradaInput.value);
    // Cálculo simplificado: Restante = Total - Entrada
    const restante = total - entrada;

    restanteInput.value = formatarMoeda(restante);
}

function gerarNumeroFormatado(numero) {
    // Garante que 'numero' seja tratado como número
    const num = Number(numero);
    if (isNaN(num)) return `0000/${anoAtual}`; // Retorna um padrão se não for número
    return num.toString().padStart(4, '0') + '/' + anoAtual;
}

/* ==== FIM DA SEÇÃO - FUNÇÕES AUXILIARES ==== */

/* ==== INÍCIO SEÇÃO - SALVAR DADOS NO FIREBASE (COM VERIFICAÇÃO DE AUTENTICAÇÃO) ==== */
async function salvarDados(dados, tipo) {
    if (!usuarioAtual) {
        alert("Você precisa estar autenticado para salvar dados.");
        return; // Não salva se não estiver autenticado
    }
    if (!dados || typeof dados !== 'object') {
         console.error("Tentativa de salvar dados inválidos:", dados);
         alert("Erro: Dados inválidos para salvar.");
         return;
    }
    try {
        // Remove propriedades indefinidas antes de salvar
        const dadosParaSalvar = Object.entries(dados).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {});

         // Garante que o tipo está definido
        dadosParaSalvar.tipo = tipo;

        if (dados.id) {
            const docRef = doc(orcamentosPedidosRef, dados.id);
            await setDoc(docRef, dadosParaSalvar, { merge: true });
            console.log(`Dados ${tipo} atualizados no Firebase com ID:`, dados.id);
        } else {
            // Garante que dados essenciais como 'numero' existem antes de adicionar
             if (!dadosParaSalvar.numero) {
                 console.error("Erro: Tentativa de salvar novo documento sem número.");
                 alert("Erro interno: Não foi possível gerar o número do documento.");
                 return;
             }
            const docRef = await addDoc(orcamentosPedidosRef, dadosParaSalvar);
            console.log(`Novos dados ${tipo} salvos no Firebase com ID:`, docRef.id);
            dados.id = docRef.id; // Atualiza o objeto original com o novo ID
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
    // MODIFICAÇÃO: Ler o valor do novo campo
    const previsaoEntrega = document.getElementById("previsaoEntrega").value;

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
        // MODIFICAÇÃO: Adicionar o novo campo ao objeto
        previsaoEntrega: previsaoEntrega,
        pedidoGerado: false,
        numeroPedido: null,
        tipo: 'orcamento' // Definição do tipo aqui
    };

    const produtos = document.querySelectorAll("#tabelaProdutos tbody tr");
    produtos.forEach(row => {
        const quantidadeInput = row.querySelector(".produto-quantidade");
        const descricaoInput = row.querySelector(".produto-descricao");
        const valorUnitInput = row.querySelector(".produto-valor-unit");
        const valorTotalCell = row.cells[3]; // Assume que a célula do valor total é a quarta

        // Verifica se todos os elementos necessários existem
        if (quantidadeInput && descricaoInput && valorUnitInput && valorTotalCell) {
            orcamento.produtos.push({
                quantidade: parseFloat(quantidadeInput.value) || 0,
                descricao: descricaoInput.value,
                valorUnit: converterMoedaParaNumero(valorUnitInput.value),
                valorTotal: converterMoedaParaNumero(valorTotalCell.textContent)
            });
        } else {
            console.warn("Linha de produto incompleta ignorada:", row);
        }
    });

    await salvarDados(orcamento, 'orcamento'); // Salva no Firebase
    numeroOrcamento++;
    orcamentos.push(orcamento); //Adiciona para renderizar

    document.getElementById("orcamento").reset();
    // MODIFICAÇÃO: Limpar o novo campo também
    document.getElementById("previsaoEntrega").value = "";
    limparCamposMoeda();
    const tbodyProdutos = document.querySelector("#tabelaProdutos tbody");
    if (tbodyProdutos) tbodyProdutos.innerHTML = "";

    alert("Orçamento gerado com sucesso!");
     mostrarPagina('orcamentos-gerados'); //Adicionado
     mostrarOrcamentosGerados();          //Adicionado
     exibirOrcamentoEmHTML(orcamento); // Chamar a função para exibir o orçamento aqui
}

function exibirOrcamentoEmHTML(orcamento) {
    if (!orcamento) {
        console.error("exibirOrcamentoEmHTML chamado sem objeto orcamento.");
        return;
    }
    console.log("Função exibirOrcamentoEmHTML chamada com orçamento:", orcamento);
    const janelaOrcamento = window.open('orcamento.html', '_blank');

    if (!janelaOrcamento) {
        alert("Não foi possível abrir a janela de visualização do orçamento. Verifique as permissões de pop-up do seu navegador.");
        return;
    }

    janelaOrcamento.addEventListener('load', () => {
        console.log("Página orcamento.html carregada.");
        const conteudoOrcamento = janelaOrcamento.document.getElementById("conteudo-orcamento");

        if (!conteudoOrcamento) {
            console.error("Elemento #conteudo-orcamento não encontrado em orcamento.html");
            janelaOrcamento.close(); // Fecha a janela se o elemento não for encontrado
            return;
        }

        // Formata datas apenas se existirem
        const dataOrcamentoFormatada = orcamento.dataOrcamento ? orcamento.dataOrcamento.split('-').reverse().join('/') : 'N/A';
        const dataValidadeFormatada = orcamento.dataValidade ? orcamento.dataValidade.split('-').reverse().join('/') : 'N/A';

        const pagamentoFormatado = Array.isArray(orcamento.pagamento) ? orcamento.pagamento.map(pag => {
            // Mapeamento dos valores para texto legível
            switch(pag) {
                case 'pix': return 'PIX';
                case 'dinheiro': return 'Dinheiro';
                case 'cartaoCredito': return 'Cartão de Crédito';
                case 'cartaoDebito': return 'Cartão de Débito';
                default: return pag; // Retorna o valor original se não houver mapeamento
            }
        }).join(', ') : 'Não especificado'; // Valor padrão se não for array

        let html = `
            <h2>Orçamento Nº ${orcamento.numero || 'N/D'}</h2>
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
                        <th>Quantidade</th>
                        <th>Descrição do Produto</th>
                        <th>Valor Unit.</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Garante que orcamento.produtos é um array antes de iterar
        if (Array.isArray(orcamento.produtos)) {
            orcamento.produtos.forEach(produto => {
                 // Verifica se produto é um objeto válido
                 if (produto && typeof produto === 'object') {
                    html += `
                        <tr>
                            <td>${produto.quantidade || 0}</td>
                            <td>${produto.descricao || 'Sem descrição'}</td>
                            <td>${formatarMoeda(produto.valorUnit)}</td>
                            <td>${formatarMoeda(produto.valorTotal)}</td>
                        </tr>
                    `;
                }
            });
        } else {
            html += '<tr><td colspan="4">Nenhum produto listado.</td></tr>';
        }


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
                <!-- MODIFICAÇÃO: Exibir o novo campo se tiver valor -->
                ${orcamento.previsaoEntrega ? `<strong>Previsão de entrega:</strong> ${orcamento.previsaoEntrega}<br>` : ''}
            </div>
        `;

        conteudoOrcamento.innerHTML = html;
        console.log("Conteúdo do orçamento inserido em orcamento.html");

        // Opcional: Chamar a função de impressão da janela
        // janelaOrcamento.print();

    }, { once: true }); // Garante que o listener seja chamado apenas uma vez
}

/* ==== FIM SEÇÃO - GERAÇÃO DE ORÇAMENTO ==== */

/* ==== INÍCIO SEÇÃO - ORÇAMENTOS GERADOS ==== */
function mostrarOrcamentosGerados() {
    const tbody = document.querySelector("#tabela-orcamentos tbody");
    if (!tbody) return;
    tbody.innerHTML = '';

    // Verifica se 'orcamentos' é um array
     if (!Array.isArray(orcamentos)) {
        console.error("Erro: 'orcamentos' não é um array.");
        return;
    }


    orcamentos.forEach(orcamento => {
        // Verifica se 'orcamento' é um objeto válido e possui 'id'
        if (!orcamento || typeof orcamento !== 'object' || !orcamento.id) {
            console.warn("Item inválido no array de orçamentos ignorado:", orcamento);
            return; // Pula para o próximo item
        }
        const row = tbody.insertRow();
        const cellNumero = row.insertCell();
        const cellData = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellNumeroPedido = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = orcamento.numero || 'N/D'; // Valor padrão
        // Formata a data ou usa 'N/D'
        cellData.textContent = orcamento.dataOrcamento ? orcamento.dataOrcamento.split('-').reverse().join('/') : 'N/D';
        cellCliente.textContent = orcamento.cliente || 'N/D';
        cellTotal.textContent = formatarMoeda(orcamento.total); // formatarMoeda já lida com NaN
        cellNumeroPedido.textContent = orcamento.numeroPedido || 'N/A';

        // Botão Visualizar (sempre presente)
        let buttonVisualizar = document.createElement('button');
        buttonVisualizar.textContent = 'Visualizar';
        buttonVisualizar.classList.add('btnVisualizarOrcamento');
        buttonVisualizar.dataset.orcamentoId = orcamento.id; // Adiciona ID para fácil busca
        cellAcoes.appendChild(buttonVisualizar);

        // Botões Editar e Gerar Pedido (condicionais)
        if (!orcamento.pedidoGerado) {
            let buttonEditar = document.createElement('button');
            buttonEditar.textContent = 'Editar';
            buttonEditar.classList.add('btnEditarOrcamento');
            buttonEditar.dataset.orcamentoId = orcamento.id;
            cellAcoes.appendChild(buttonEditar);

            let buttonGerarPedido = document.createElement('button');
            buttonGerarPedido.textContent = 'Gerar Pedido';
            buttonGerarPedido.classList.add('btnGerarPedido');
            buttonGerarPedido.dataset.orcamentoId = orcamento.id;
            cellAcoes.appendChild(buttonGerarPedido);
        }
    });

    // Adicionar event listeners APÓS criar todos os botões
    adicionarEventListenersBotoesOrcamento();
}

// Função separada para adicionar listeners aos botões de orçamento
function adicionarEventListenersBotoesOrcamento() {
     // Remove listeners antigos para evitar duplicidade (se a função for chamada múltiplas vezes)
    document.querySelectorAll('.btnEditarOrcamento').forEach(btn => {
        const newBtn = btn.cloneNode(true); // Clona para remover listeners antigos
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', function() {
            const orcamentoId = this.dataset.orcamentoId;
            editarOrcamento(orcamentoId);
        });
    });

    document.querySelectorAll('.btnGerarPedido').forEach(btn => {
         const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', function() {
            const orcamentoId = this.dataset.orcamentoId;
            gerarPedido(orcamentoId);
        });
    });

    document.querySelectorAll('.btnVisualizarOrcamento').forEach(btn => {
         const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', function() {
            const orcamentoId = this.dataset.orcamentoId; // Usa o ID para buscar
            const orcamentoParaVisualizar = orcamentos.find(orc => orc.id === orcamentoId);
            if (orcamentoParaVisualizar) {
                exibirOrcamentoEmHTML(orcamentoParaVisualizar);
            } else {
                console.error("Orçamento não encontrado para visualização com ID:", orcamentoId);
                alert("Erro: Orçamento não encontrado para visualização.");
            }
        });
    });
}


function filtrarOrcamentos() {
    const dataInicio = document.getElementById('filtroDataInicioOrcamento')?.value; // Optional chaining
    const dataFim = document.getElementById('filtroDataFimOrcamento')?.value;
    const numeroOrcamentoFiltroStr = document.getElementById('filtroNumeroOrcamento')?.value;
    const anoOrcamentoFiltroStr = document.getElementById('filtroAnoOrcamento')?.value;
    const clienteOrcamentoFiltro = document.getElementById('filtroClienteOrcamento')?.value.toLowerCase() || '';

    // Validações e conversões
    const numeroOrcamentoFiltro = numeroOrcamentoFiltroStr ? parseInt(numeroOrcamentoFiltroStr) : null;
    const anoOrcamentoFiltro = anoOrcamentoFiltroStr ? parseInt(anoOrcamentoFiltroStr) : null;
    const dataInicioDate = dataInicio ? new Date(dataInicio + 'T00:00:00') : null; // Adiciona T00:00:00 para comparar início do dia
    const dataFimDate = dataFim ? new Date(dataFim + 'T23:59:59') : null; // Adiciona T23:59:59 para comparar fim do dia


    // Verifica se 'orcamentos' é um array
    if (!Array.isArray(orcamentos)) {
        console.error("Erro ao filtrar: 'orcamentos' não é um array.");
        atualizarListaOrcamentos([]); // Mostra tabela vazia
        return;
    }

    const orcamentosFiltrados = orcamentos.filter(orcamento => {
         // Verifica se 'orcamento' é um objeto válido e tem as propriedades necessárias
        if (!orcamento || typeof orcamento !== 'object' || !orcamento.numero || !orcamento.dataOrcamento || typeof orcamento.cliente !== 'string') {
            console.warn("Orçamento inválido ou incompleto ignorado na filtragem:", orcamento);
            return false; // Ignora este orçamento
        }

        const [numOrcamentoStr, anoOrcamentoStr] = orcamento.numero.split('/');
        const numOrcamento = parseInt(numOrcamentoStr);
        const anoOrcamento = parseInt(anoOrcamentoStr);
        // Cria data considerando o fuso horário local para evitar problemas de comparação
        const dataOrcamento = new Date(orcamento.dataOrcamento + 'T00:00:00');
        const nomeCliente = orcamento.cliente.toLowerCase();


        // Condições de filtro (usando os valores convertidos/validados)
        const passaDataInicio = !dataInicioDate || dataOrcamento >= dataInicioDate;
        const passaDataFim = !dataFimDate || dataOrcamento <= dataFimDate;
        const passaNumero = numeroOrcamentoFiltro === null || isNaN(numeroOrcamentoFiltro) || numOrcamento === numeroOrcamentoFiltro;
        const passaAno = anoOrcamentoFiltro === null || isNaN(anoOrcamentoFiltro) || anoOrcamento === anoOrcamentoFiltro;
        const passaCliente = !clienteOrcamentoFiltro || nomeCliente.includes(clienteOrcamentoFiltro);


        return passaDataInicio && passaDataFim && passaNumero && passaAno && passaCliente;
    });

    atualizarListaOrcamentos(orcamentosFiltrados);
}

function atualizarListaOrcamentos(orcamentosFiltrados) {
    const tbody = document.querySelector("#tabela-orcamentos tbody");
     if (!tbody) return; // Sai se a tabela não for encontrada
    tbody.innerHTML = '';

    // Verifica se 'orcamentosFiltrados' é um array
    if (!Array.isArray(orcamentosFiltrados)) {
        console.error("Erro ao atualizar lista: 'orcamentosFiltrados' não é um array.");
        return;
    }

    orcamentosFiltrados.forEach(orcamento => {
        // Verifica se 'orcamento' é um objeto válido e possui 'id'
        if (!orcamento || typeof orcamento !== 'object' || !orcamento.id) {
            console.warn("Item inválido no array de orçamentos filtrados ignorado:", orcamento);
            return; // Pula para o próximo item
        }

        const row = tbody.insertRow();
        const cellNumero = row.insertCell();
        const cellData = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellNumeroPedido = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = orcamento.numero || 'N/D';
        cellData.textContent = orcamento.dataOrcamento ? orcamento.dataOrcamento.split('-').reverse().join('/') : 'N/D';
        cellCliente.textContent = orcamento.cliente || 'N/D';
        cellTotal.textContent = formatarMoeda(orcamento.total);
        cellNumeroPedido.textContent = orcamento.numeroPedido || 'N/A';

        // Botão Visualizar (sempre presente)
        let buttonVisualizar = document.createElement('button');
        buttonVisualizar.textContent = 'Visualizar';
        buttonVisualizar.classList.add('btnVisualizarOrcamento');
        buttonVisualizar.dataset.orcamentoId = orcamento.id;
        cellAcoes.appendChild(buttonVisualizar);

         // Botões Editar e Gerar Pedido (condicionais)
         if (!orcamento.pedidoGerado) {
            let buttonEditar = document.createElement('button');
            buttonEditar.textContent = 'Editar';
            buttonEditar.classList.add('btnEditarOrcamento');
            buttonEditar.dataset.orcamentoId = orcamento.id;
            cellAcoes.appendChild(buttonEditar);

            let buttonGerarPedido = document.createElement('button');
            buttonGerarPedido.textContent = 'Gerar Pedido';
            buttonGerarPedido.classList.add('btnGerarPedido');
            buttonGerarPedido.dataset.orcamentoId = orcamento.id;
            cellAcoes.appendChild(buttonGerarPedido);
        }
    });

    // Adicionar event listeners APÓS criar todos os botões na lista filtrada
    adicionarEventListenersBotoesOrcamento();
}

function editarOrcamento(orcamentoId) {
    // Verifica se 'orcamentos' é um array
     if (!Array.isArray(orcamentos)) {
         alert("Erro: Lista de orçamentos não carregada.");
         return;
     }
    const orcamento = orcamentos.find(o => o && o.id === orcamentoId); // Adiciona verificação de 'o'
    if (!orcamento) {
        alert("Orçamento não encontrado.");
        return;
    }

    if (orcamento.pedidoGerado) {
        alert("Não é possível editar um orçamento que já gerou um pedido.");
        return;
    }

    orcamentoEditando = orcamento.id; // Usando o ID agora

    // Define valores dos campos, usando valor padrão '' se a propriedade não existir
    document.getElementById("dataOrcamento").value = orcamento.dataOrcamento || '';
    document.getElementById("dataValidade").value = orcamento.dataValidade || '';
    document.getElementById("cliente").value = orcamento.cliente || '';
    document.getElementById("endereco").value = orcamento.endereco || '';
    document.getElementById("tema").value = orcamento.tema || '';
    document.getElementById("cidade").value = orcamento.cidade || '';
    document.getElementById("telefone").value = orcamento.telefone || '';
    document.getElementById("clienteEmail").value = orcamento.email || ''; // Alterado para clienteEmail
    document.getElementById("cores").value = orcamento.cores || '';
    document.getElementById("valorFrete").value = formatarMoeda(orcamento.valorFrete); // formatarMoeda lida com 0 ou NaN
    document.getElementById("valorOrcamento").value = formatarMoeda(orcamento.valorOrcamento);
    document.getElementById("total").value = formatarMoeda(orcamento.total);
    document.getElementById("observacoes").value = orcamento.observacoes || '';
    // MODIFICAÇÃO: Carregar o valor do novo campo
    document.getElementById("previsaoEntrega").value = orcamento.previsaoEntrega || '';


    const tbody = document.querySelector("#tabelaProdutos tbody");
    if (!tbody) return;
    tbody.innerHTML = '';

    // Verifica se orcamento.produtos é um array
    if (Array.isArray(orcamento.produtos)) {
        orcamento.produtos.forEach(produto => {
            // Verifica se produto é um objeto válido
            if (produto && typeof produto === 'object') {
                const row = tbody.insertRow();
                const cellQuantidade = row.insertCell();
                const cellDescricao = row.insertCell();
                const cellValorUnit = row.insertCell();
                const cellValorTotal = row.insertCell();
                const cellAcoes = row.insertCell();

                // Adiciona onchange e onblur para atualizar totais ao editar
                cellQuantidade.innerHTML = `<input type="number" class="produto-quantidade" value="${produto.quantidade || 1}" min="1" onchange="atualizarTotais()" onblur="atualizarTotais()">`;
                cellDescricao.innerHTML = `<input type="text" class="produto-descricao" value="${produto.descricao || ''}">`;
                cellValorUnit.innerHTML = `<input type="text" class="produto-valor-unit" value="${formatarMoeda(produto.valorUnit)}" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotais()">`;
                cellValorTotal.textContent = formatarMoeda(produto.valorTotal);
                cellAcoes.innerHTML = '<button type="button" onclick="excluirProduto(this)">Excluir</button>';
            }
        });
    }

    // Limpa todos os checkboxes antes de marcar os corretos
    document.querySelectorAll('input[name="pagamento"]').forEach(el => el.checked = false);
    // Marca os checkboxes baseados no array 'pagamento' do orçamento
    if (Array.isArray(orcamento.pagamento)) {
        orcamento.pagamento.forEach(pagValue => {
            const checkbox = document.querySelector(`input[name="pagamento"][value="${pagValue}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    mostrarPagina('form-orcamento');
    // Garante que os botões corretos estão visíveis
    const btnGerar = document.getElementById("btnGerarOrcamento");
    const btnAtualizar = document.getElementById("btnAtualizarOrcamento");
    if (btnGerar) btnGerar.style.display = "none";
    if (btnAtualizar) btnAtualizar.style.display = "inline-block";
}

async function atualizarOrcamento() {
    if (orcamentoEditando === null) {
        alert("Nenhum orçamento está sendo editado.");
        return;
    }

    // Verifica se 'orcamentos' é um array
     if (!Array.isArray(orcamentos)) {
         alert("Erro: Lista de orçamentos não carregada.");
         orcamentoEditando = null; // Reseta estado de edição
         return;
     }

    const orcamentoIndex = orcamentos.findIndex(o => o && o.id === orcamentoEditando); // Find by ID, verifica 'o'
    if (orcamentoIndex === -1) {
        alert("Orçamento não encontrado para atualização.");
         orcamentoEditando = null; // Reseta estado de edição
        return;
    }

    // MODIFICAÇÃO: Ler o valor do novo campo
    const previsaoEntrega = document.getElementById("previsaoEntrega").value;

    const orcamentoAtualizado = {
        ...orcamentos[orcamentoIndex], // Mantém os dados existentes (incluindo ID e numero)
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
        // MODIFICAÇÃO: Adicionar o novo campo ao objeto atualizado
        previsaoEntrega: previsaoEntrega,
        tipo: 'orcamento' // Garante que o tipo seja mantido
    };

    const produtosTableRows = document.querySelectorAll("#tabelaProdutos tbody tr");
    produtosTableRows.forEach(row => {
        const quantidadeInput = row.querySelector(".produto-quantidade");
        const descricaoInput = row.querySelector(".produto-descricao");
        const valorUnitInput = row.querySelector(".produto-valor-unit");
        const valorTotalCell = row.cells[3];

         // Verifica se todos os elementos necessários existem na linha
        if (quantidadeInput && descricaoInput && valorUnitInput && valorTotalCell) {
            orcamentoAtualizado.produtos.push({
                quantidade: parseFloat(quantidadeInput.value) || 0,
                descricao: descricaoInput.value,
                valorUnit: converterMoedaParaNumero(valorUnitInput.value),
                valorTotal: converterMoedaParaNumero(valorTotalCell.textContent)
            });
        } else {
             console.warn("Linha de produto incompleta ignorada durante atualização:", row);
        }
    });

    orcamentos[orcamentoIndex] = orcamentoAtualizado; // Atualiza no array local
    await salvarDados(orcamentoAtualizado, 'orcamento'); // Salva no Firebase

    // Limpa o formulário após a atualização
    const formOrcamento = document.getElementById("orcamento");
     if (formOrcamento) formOrcamento.reset();
    // MODIFICAÇÃO: Limpar o novo campo também
    const previsaoEntregaInput = document.getElementById("previsaoEntrega");
    if (previsaoEntregaInput) previsaoEntregaInput.value = "";
    limparCamposMoeda();
    const tbodyProdutos = document.querySelector("#tabelaProdutos tbody");
     if (tbodyProdutos) tbodyProdutos.innerHTML = "";

    alert("Orçamento atualizado com sucesso!");

    orcamentoEditando = null; // Reseta o estado de edição
    // Garante que os botões voltem ao estado inicial
     const btnGerar = document.getElementById("btnGerarOrcamento");
    const btnAtualizar = document.getElementById("btnAtualizarOrcamento");
    if (btnGerar) btnGerar.style.display = "inline-block";
    if (btnAtualizar) btnAtualizar.style.display = "none";


    mostrarPagina('orcamentos-gerados');
    mostrarOrcamentosGerados();
}
/* ==== FIM SEÇÃO - ORÇAMENTOS GERADOS ==== */

/* ==== INÍCIO SEÇÃO - GERAR PEDIDO A PARTIR DO ORÇAMENTO ==== */
async function gerarPedido(orcamentoId) {
     // Verifica se 'orcamentos' é um array
     if (!Array.isArray(orcamentos)) {
        alert("Erro: Lista de orçamentos não carregada.");
        return;
    }
    const orcamento = orcamentos.find(o => o && o.id === orcamentoId); // Adiciona verificação de 'o'
    if (!orcamento) {
        alert("Orçamento não encontrado.");
        return;
    }

    if (orcamento.pedidoGerado) {
        alert("Um pedido já foi gerado para este orçamento.");
        return;
    }

    // Verifica se 'orcamento' tem as propriedades necessárias
    if (typeof orcamento.cliente !== 'string' || typeof orcamento.total !== 'number') {
        alert("Erro: Dados do orçamento estão incompletos ou inválidos.");
        return;
    }


    const pedido = {
        numero: gerarNumeroFormatado(numeroPedido),
        dataPedido: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
        // Usa data de validade do orçamento como data de entrega inicial, ou string vazia
        dataEntrega: orcamento.dataValidade || '',
        cliente: orcamento.cliente,
        endereco: orcamento.endereco || '', // Usa valor padrão '' se não existir
        tema: orcamento.tema || '',
        cidade: orcamento.cidade || '',
        telefone: orcamento.telefone || '',
        email: orcamento.email || '',
        cores: orcamento.cores || '',
        // Copia pagamento se for array, senão array vazio
        pagamento: Array.isArray(orcamento.pagamento) ? [...orcamento.pagamento] : [],
        // Usa 0 como padrão se valorFrete/valorOrcamento não existirem ou forem inválidos
        valorFrete: typeof orcamento.valorFrete === 'number' ? orcamento.valorFrete : 0,
        valorOrcamento: typeof orcamento.valorOrcamento === 'number' ? orcamento.valorOrcamento : 0,
        total: orcamento.total, // Total já deve ser número
        observacoes: orcamento.observacoes || '',
        // MODIFICAÇÃO: Copiar o novo campo para o pedido
        previsaoEntrega: orcamento.previsaoEntrega || '',
        // Campos específicos do pedido inicializados
        entrada: 0,
        restante: orcamento.total, // Inicialmente, restante é o total
        // Inicializa margem e custo com 0 se não existirem no orçamento
        margemLucro: typeof orcamento.margemLucro === 'number' ? orcamento.margemLucro : 0,
        custoMaoDeObra: typeof orcamento.custoMaoDeObra === 'number' ? orcamento.custoMaoDeObra : 0,
        // Valor do pedido inicializado com valor do orçamento
        valorPedido: typeof orcamento.valorOrcamento === 'number' ? orcamento.valorOrcamento : 0,
        // Mapeia produtos, garantindo estrutura e cálculo corretos
        produtos: Array.isArray(orcamento.produtos) ? orcamento.produtos.map(p => {
            // Verifica se 'p' é um objeto válido com quantidade e valorUnit
            if (p && typeof p === 'object' && typeof p.quantidade === 'number' && typeof p.valorUnit === 'number') {
               return {
                   quantidade: p.quantidade,
                   descricao: p.descricao || '',
                   valorUnit: p.valorUnit,
                   // Recalcula valorTotal para garantir consistência
                   valorTotal: p.quantidade * p.valorUnit
               };
            }
            return null; // Retorna null para produtos inválidos
        }).filter(p => p !== null) : [], // Filtra produtos inválidos (null)
        tipo: 'pedido' // Adicionado tipo 'pedido'
    };

    // Remove propriedades que não pertencem ao pedido (ex: dataValidade original)
    // delete pedido.dataValidade; // dataEntrega já foi definida acima

     // Verifica se 'pedidos' é um array antes de push
     if (!Array.isArray(pedidos)) {
         console.error("Erro: 'pedidos' não é um array. Inicializando como array vazio.");
         pedidos = [];
     }

    await salvarDados(pedido, 'pedido');
    // Somente incrementa se o salvamento for bem-sucedido (pedido.id será definido)
    if (pedido.id) {
        numeroPedido++;
        pedidos.push(pedido); // Adiciona o novo pedido ao array local
         // Atualiza o orçamento original para marcar como gerado e linkar ao pedido
        orcamento.numeroPedido = pedido.numero;
        orcamento.pedidoGerado = true;
        await salvarDados(orcamento, 'orcamento'); // Salva a atualização do orçamento

        alert(`Pedido Nº ${pedido.numero} gerado com sucesso a partir do orçamento Nº ${orcamento.numero}!`);
        mostrarPagina('lista-pedidos');
        mostrarPedidosRealizados(); // Atualiza a lista de pedidos na tela
        mostrarOrcamentosGerados(); // Atualiza a lista de orçamentos (status do botão)
    } else {
        // Se o ID não foi definido, o salvamento falhou
        alert("Erro ao salvar o novo pedido. O pedido não foi gerado.");
    }
}
/* ==== FIM SEÇÃO - GERAR PEDIDO A PARTIR DO ORÇAMENTO ==== */

/* ==== INÍCIO SEÇÃO - PEDIDOS REALIZADOS ==== */
function mostrarPedidosRealizados() {
    const tbody = document.querySelector("#tabela-pedidos tbody");
     if (!tbody) return; // Sai se a tabela não for encontrada
    tbody.innerHTML = '';

     // Verifica se 'pedidos' é um array
    if (!Array.isArray(pedidos)) {
        console.error("Erro: 'pedidos' não é um array.");
        return;
    }

    pedidos.forEach(pedido => {
         // Verifica se 'pedido' é um objeto válido e possui 'id'
        if (!pedido || typeof pedido !== 'object' || !pedido.id) {
            console.warn("Item inválido no array de pedidos ignorado:", pedido);
            return; // Pula para o próximo item
        }
        const row = tbody.insertRow();
        const cellNumero = row.insertCell();
        const cellDataPedido = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = pedido.numero || 'N/D';
        // Formata data do pedido ou usa 'N/D'
        cellDataPedido.textContent = pedido.dataPedido ? pedido.dataPedido.split('-').reverse().join('/') : 'N/D';
        cellCliente.textContent = pedido.cliente || 'N/D';
        cellTotal.textContent = formatarMoeda(pedido.total);
        // Cria o botão de editar e adiciona o listener dinamicamente
        cellAcoes.innerHTML = `<button type="button" class="btnEditarPedido" data-pedido-id="${pedido.id}">Editar</button>`;
    });

    // Adicionar event listeners para botões dinâmicos (depois de inseridos no DOM)
    adicionarEventListenersBotoesPedido();
}

// Função separada para adicionar listeners aos botões de pedido
function adicionarEventListenersBotoesPedido() {
     // Remove listeners antigos para evitar duplicidade
     document.querySelectorAll('.btnEditarPedido').forEach(btn => {
         const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', function() {
            const pedidoId = this.dataset.pedidoId;
            editarPedido(pedidoId);
        });
    });
}

function filtrarPedidos() {
    const dataInicio = document.getElementById('filtroDataInicioPedido')?.value;
    const dataFim = document.getElementById('filtroDataFimPedido')?.value;
    const numeroPedidoFiltroStr = document.getElementById('filtroNumeroPedido')?.value;
    const anoPedidoFiltroStr = document.getElementById('filtroAnoPedido')?.value;
    const clientePedidoFiltro = document.getElementById('filtroClientePedido')?.value.toLowerCase() || '';

    // Validações e conversões
    const numeroPedidoFiltro = numeroPedidoFiltroStr ? parseInt(numeroPedidoFiltroStr) : null;
    const anoPedidoFiltro = anoPedidoFiltroStr ? parseInt(anoPedidoFiltroStr) : null;
    const dataInicioDate = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const dataFimDate = dataFim ? new Date(dataFim + 'T23:59:59') : null;

    // Verifica se 'pedidos' é um array
     if (!Array.isArray(pedidos)) {
        console.error("Erro ao filtrar: 'pedidos' não é um array.");
        atualizarListaPedidos([]); // Mostra tabela vazia
        return;
    }

    const pedidosFiltrados = pedidos.filter(pedido => {
        // Verifica se 'pedido' é um objeto válido e tem as propriedades necessárias
        if (!pedido || typeof pedido !== 'object' || !pedido.numero || !pedido.dataPedido || typeof pedido.cliente !== 'string') {
             console.warn("Pedido inválido ou incompleto ignorado na filtragem:", pedido);
             return false; // Ignora este pedido
        }
        const [numPedidoStr, anoPedidoStr] = pedido.numero.split('/');
        const numPedido = parseInt(numPedidoStr);
        const anoPedido = parseInt(anoPedidoStr);
        const dataPedido = new Date(pedido.dataPedido + 'T00:00:00'); // Considera fuso local
        const nomeCliente = pedido.cliente.toLowerCase();

        // Condições de filtro
        const passaDataInicio = !dataInicioDate || dataPedido >= dataInicioDate;
        const passaDataFim = !dataFimDate || dataPedido <= dataFimDate;
        const passaNumero = numeroPedidoFiltro === null || isNaN(numeroPedidoFiltro) || numPedido === numeroPedidoFiltro;
        const passaAno = anoPedidoFiltro === null || isNaN(anoPedidoFiltro) || anoPedido === anoPedidoFiltro;
        const passaCliente = !clientePedidoFiltro || nomeCliente.includes(clientePedidoFiltro);

        return passaDataInicio && passaDataFim && passaNumero && passaAno && passaCliente;
    });

    atualizarListaPedidos(pedidosFiltrados);
}

function atualizarListaPedidos(pedidosFiltrados) {
    const tbody = document.querySelector("#tabela-pedidos tbody");
    if (!tbody) return;
    tbody.innerHTML = '';

     // Verifica se 'pedidosFiltrados' é um array
    if (!Array.isArray(pedidosFiltrados)) {
        console.error("Erro ao atualizar lista: 'pedidosFiltrados' não é um array.");
        return;
    }

    pedidosFiltrados.forEach(pedido => {
         // Verifica se 'pedido' é um objeto válido e possui 'id'
        if (!pedido || typeof pedido !== 'object' || !pedido.id) {
            console.warn("Item inválido no array de pedidos filtrados ignorado:", pedido);
            return; // Pula para o próximo item
        }
        const row = tbody.insertRow();
        const cellNumero = row.insertCell();
        const cellDataPedido = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = pedido.numero || 'N/D';
        cellDataPedido.textContent = pedido.dataPedido ? pedido.dataPedido.split('-').reverse().join('/') : 'N/D';
        cellCliente.textContent = pedido.cliente || 'N/D';
        cellTotal.textContent = formatarMoeda(pedido.total);
        cellAcoes.innerHTML = `<button type="button" class="btnEditarPedido" data-pedido-id="${pedido.id}">Editar</button>`;
    });

    // Adicionar event listeners para botões dinâmicos (depois de inseridos no DOM)
   adicionarEventListenersBotoesPedido();
}

function editarPedido(pedidoId) {
     // Verifica se 'pedidos' é um array
     if (!Array.isArray(pedidos)) {
        alert("Erro: Lista de pedidos não carregada.");
        return;
    }
    const pedido = pedidos.find(p => p && p.id === pedidoId); // Adiciona verificação de 'p'
    if (!pedido) {
        alert("Pedido não encontrado.");
        return;
    }

    pedidoEditando = pedidoId; // Define o pedidoEditando para o ID do pedido que está sendo editado

    // Define valores dos campos, usando valor padrão se a propriedade não existir
    document.getElementById("dataPedidoEdicao").value = pedido.dataPedido || '';
    document.getElementById("dataEntregaEdicao").value = pedido.dataEntrega || '';
    document.getElementById("clienteEdicao").value = pedido.cliente || '';
    document.getElementById("enderecoEdicao").value = pedido.endereco || '';
    document.getElementById("temaEdicao").value = pedido.tema || '';
    document.getElementById("cidadeEdicao").value = pedido.cidade || '';
    document.getElementById("contatoEdicao").value = pedido.telefone || ''; // Usa 'telefone' como 'contato'
    document.getElementById("coresEdicao").value = pedido.cores || '';
    document.getElementById("valorFreteEdicao").value = formatarMoeda(pedido.valorFrete);
    document.getElementById("valorPedidoEdicao").value = formatarMoeda(pedido.valorPedido); // Valor base do pedido
    //document.getElementById("valorPedidoEdicao").onblur = atualizarTotaisEdicao; // Garante que o onblur está definido
    document.getElementById("totalEdicao").value = formatarMoeda(pedido.total); // Total geral
    document.getElementById("entradaEdicao").value = formatarMoeda(pedido.entrada);
    document.getElementById("restanteEdicao").value = formatarMoeda(pedido.restante);
    document.getElementById("margemLucroEdicao").value = formatarMoeda(pedido.margemLucro);
    document.getElementById("custoMaoDeObraEdicao").value = formatarMoeda(pedido.custoMaoDeObra);
    document.getElementById("observacoesEdicao").value = pedido.observacoes || '';
     // NOTE: O campo 'previsaoEntrega' não está no formulário de edição de pedido,
     // então não é carregado aqui. Ele permanece no objeto 'pedido' mas não é editável nesta tela.

    const tbody = document.querySelector("#tabelaProdutosEdicao tbody");
     if (!tbody) return;
    tbody.innerHTML = '';

    // Verifica se pedido.produtos é um array
     if (Array.isArray(pedido.produtos)) {
        pedido.produtos.forEach(produto => {
            // Verifica se produto é um objeto válido
            if (produto && typeof produto === 'object') {
                const row = tbody.insertRow();
                const cellQuantidade = row.insertCell();
                const cellDescricao = row.insertCell();
                const cellValorUnit = row.insertCell();
                const cellValorTotal = row.insertCell();
                const cellAcoes = row.insertCell();

                // Adiciona onchange e onblur para atualizar totais
                cellQuantidade.innerHTML = `<input type="number" class="produto-quantidade" value="${produto.quantidade || 1}" min="1" onchange="atualizarTotaisEdicao()" onblur="atualizarTotaisEdicao()">`;
                cellDescricao.innerHTML = `<input type="text" class="produto-descricao" value="${produto.descricao || ''}">`;
                cellValorUnit.innerHTML = `<input type="text" class="produto-valor-unit" value="${formatarMoeda(produto.valorUnit)}" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotaisEdicao()">`;
                cellValorTotal.textContent = formatarMoeda(produto.valorTotal);
                cellAcoes.innerHTML = '<button type="button" onclick="excluirProdutoEdicao(this)">Excluir</button>';
            }
        });
    }


    const pagamentoCheckboxes = document.querySelectorAll('input[name="pagamentoEdicao"]');
    // Limpa todos os checkboxes antes de marcar
    pagamentoCheckboxes.forEach(el => el.checked = false);
     // Marca os checkboxes baseados no array 'pagamento' do pedido
    if (Array.isArray(pedido.pagamento)) {
        pedido.pagamento.forEach(pagValue => {
            const checkbox = document.querySelector(`input[name="pagamentoEdicao"][value="${pagValue}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }


    mostrarPagina('form-edicao-pedido');
    atualizarTotaisEdicao(); // Chama para garantir que os totais estejam corretos ao carregar
}

async function atualizarPedido() {
    if (pedidoEditando === null) {
        alert("Nenhum pedido está sendo editado.");
        return;
    }

     // Verifica se 'pedidos' é um array
     if (!Array.isArray(pedidos)) {
        alert("Erro: Lista de pedidos não carregada.");
        pedidoEditando = null; // Reseta estado de edição
        return;
    }

    const pedidoIndex = pedidos.findIndex(p => p && p.id === pedidoEditando); // Verifica 'p'
    if (pedidoIndex === -1) {
        alert("Pedido não encontrado para atualização.");
        pedidoEditando = null; // Reseta estado de edição
        return;
    }
     const pedidoOriginal = pedidos[pedidoIndex];

    const pedidoAtualizado = {
        ...pedidoOriginal, // Mantém os dados existentes (incluindo ID, numero, previsaoEntrega, etc.)
        dataPedido: document.getElementById("dataPedidoEdicao").value,
        dataEntrega: document.getElementById("dataEntregaEdicao").value,
        cliente: document.getElementById("clienteEdicao").value,
        endereco: document.getElementById("enderecoEdicao").value,
        tema: document.getElementById("temaEdicao").value,
        cidade: document.getElementById("cidadeEdicao").value,
        telefone: document.getElementById("contatoEdicao").value, // Salva 'contato' como 'telefone'
        cores: document.getElementById("coresEdicao").value,
        produtos: [], // Recalcula a lista de produtos
        pagamento: Array.from(document.querySelectorAll('input[name="pagamentoEdicao"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFreteEdicao").value),
        valorPedido: converterMoedaParaNumero(document.getElementById("valorPedidoEdicao").value), // Valor base vindo do form
        total: converterMoedaParaNumero(document.getElementById("totalEdicao").value),       // Total geral vindo do form
        entrada: converterMoedaParaNumero(document.getElementById("entradaEdicao").value),
        restante: converterMoedaParaNumero(document.getElementById("restanteEdicao").value),   // Restante vindo do form
        margemLucro: converterMoedaParaNumero(document.getElementById("margemLucroEdicao").value),
        custoMaoDeObra: converterMoedaParaNumero(document.getElementById("custoMaoDeObraEdicao").value),
        observacoes: document.getElementById("observacoesEdicao").value,
        tipo: 'pedido' // Garante que o tipo seja mantido
    };

    const produtosTableRowsEdicao = document.querySelectorAll("#tabelaProdutosEdicao tbody tr");
    produtosTableRowsEdicao.forEach(row => {
         const quantidadeInput = row.querySelector(".produto-quantidade");
        const descricaoInput = row.querySelector(".produto-descricao");
        const valorUnitInput = row.querySelector(".produto-valor-unit");
        const valorTotalCell = row.cells[3];

         // Verifica se todos os elementos necessários existem na linha
        if (quantidadeInput && descricaoInput && valorUnitInput && valorTotalCell) {
            pedidoAtualizado.produtos.push({
                quantidade: parseFloat(quantidadeInput.value) || 0,
                descricao: descricaoInput.value,
                valorUnit: converterMoedaParaNumero(valorUnitInput.value),
                valorTotal: converterMoedaParaNumero(valorTotalCell.textContent) // Pega o valor calculado da célula
            });
        } else {
              console.warn("Linha de produto incompleta ignorada durante atualização do pedido:", row);
        }
    });

     // Atualiza o array local ANTES de salvar no Firebase
    pedidos[pedidoIndex] = pedidoAtualizado;

    await salvarDados(pedidoAtualizado, 'pedido'); // Salva no Firebase

    alert("Pedido atualizado com sucesso!");
    pedidoEditando = null; // Limpa o pedidoEditando após salvar
    mostrarPagina('lista-pedidos');
    mostrarPedidosRealizados(); // Atualiza a lista na tela
}


/* ==== FIM SEÇÃO - PEDIDOS REALIZADOS ==== */

/* ==== INÍCIO SEÇÃO - RELATÓRIO ==== */
function filtrarPedidosRelatorio() {
    const dataInicio = document.getElementById('filtroDataInicio')?.value; // Optional chaining
    const dataFim = document.getElementById('filtroDataFim')?.value;

    // Validações e conversões
    const dataInicioDate = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const dataFimDate = dataFim ? new Date(dataFim + 'T23:59:59') : null;

    // Verifica se 'pedidos' é um array
    if (!Array.isArray(pedidos)) {
        console.error("Erro ao gerar relatório: 'pedidos' não é um array.");
        gerarRelatorio([]); // Gera relatório vazio
        return;
    }


    const pedidosFiltrados = pedidos.filter(pedido => {
        // Verifica se 'pedido' é um objeto válido e tem dataPedido
        if (!pedido || typeof pedido !== 'object' || !pedido.dataPedido) {
             console.warn("Pedido inválido ou sem data ignorado no relatório:", pedido);
            return false;
        }
        const dataPedido = new Date(pedido.dataPedido + 'T00:00:00');

        const passaDataInicio = !dataInicioDate || dataPedido >= dataInicioDate;
        const passaDataFim = !dataFimDate || dataPedido <= dataFimDate;

        return passaDataInicio && passaDataFim;
    });

    gerarRelatorio(pedidosFiltrados);
}

function gerarRelatorio(pedidosFiltrados) {
    let totalPedidosValor = 0; // Renomeado para clareza
    let totalFrete = 0;
    let totalMargemLucro = 0;
    let totalCustoMaoDeObra = 0;

    // Verifica se 'pedidosFiltrados' é um array
    if (!Array.isArray(pedidosFiltrados)) {
        console.error("Erro ao gerar relatório: 'pedidosFiltrados' não é um array.");
        document.getElementById('relatorio-conteudo').innerHTML = "<p>Erro ao processar dados do relatório.</p>";
        return;
    }

    pedidosFiltrados.forEach(pedido => {
         // Verifica se 'pedido' é um objeto válido e tem as propriedades numéricas
        if (pedido && typeof pedido === 'object') {
            totalPedidosValor += typeof pedido.total === 'number' ? pedido.total : 0;
            totalFrete += typeof pedido.valorFrete === 'number' ? pedido.valorFrete : 0;
            // Usa converterMoedaParaNumero pois margem/custo podem vir formatados ou como número
            totalMargemLucro += converterMoedaParaNumero(String(pedido.margemLucro)); // Converte para string antes, se necessário
            totalCustoMaoDeObra += converterMoedaParaNumero(String(pedido.custoMaoDeObra));
        }
    });


    const quantidadePedidos = pedidosFiltrados.length;
    const relatorioConteudoDiv = document.getElementById('relatorio-conteudo');
     if (!relatorioConteudoDiv) return; // Sai se o container não existe

    let relatorioHTML = `
        <h3>Resumo do Período</h3>
        <table class="relatorio-table">
            <thead>
                <tr>
                    <th>Total Geral Pedidos</th>
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
        <table class="relatorio-table">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Data Pedido</th>
                    <th>Cliente</th>
                    <th>Total</th>
                     <th>Frete</th>
                     <th>Margem Lucro</th>
                     <th>Custo M.O.</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (quantidadePedidos > 0) {
        pedidosFiltrados.forEach(pedido => {
             // Verifica se 'pedido' é um objeto válido
             if (pedido && typeof pedido === 'object') {
                 relatorioHTML += `
                    <tr>
                        <td>${pedido.numero || 'N/D'}</td>
                        <td>${pedido.dataPedido ? pedido.dataPedido.split('-').reverse().join('/') : 'N/D'}</td>
                        <td>${pedido.cliente || 'N/D'}</td>
                        <td>${formatarMoeda(pedido.total)}</td>
                        <td>${formatarMoeda(pedido.valorFrete)}</td>
                        <td>${formatarMoeda(pedido.margemLucro)}</td>
                         <td>${formatarMoeda(pedido.custoMaoDeObra)}</td>
                    </tr>
                `;
             }
        });
    } else {
        relatorioHTML += '<tr><td colspan="7">Nenhum pedido encontrado para o período selecionado.</td></tr>';
    }


    relatorioHTML += `
            </tbody>
        </table>
    `;

    relatorioConteudoDiv.innerHTML = relatorioHTML;
}


function gerarRelatorioXLSX() {
     // Seleciona todas as tabelas dentro do container do relatório
    const tabelas = document.querySelectorAll('#relatorio-conteudo table.relatorio-table');
    if (!tabelas || tabelas.length === 0) {
        alert('Nenhum dado de relatório encontrado para exportar. Gere o relatório primeiro.');
        return;
    }

     try {
        const wb = XLSX.utils.book_new();

         // Adiciona cada tabela como uma planilha separada (ou concatena, se preferir)
         tabelas.forEach((tabela, index) => {
             // Remove cabeçalhos H3 antes de converter a tabela (se eles estiverem dentro do escopo da tabela no DOM)
             // Alternativamente, selecione apenas a tabela como feito abaixo.
              const ws = XLSX.utils.table_to_sheet(tabela);
              // Define um nome para a planilha (ex: Resumo, Detalhes)
             const nomePlanilha = index === 0 ? "Resumo" : `Detalhes_Pedidos`;
             XLSX.utils.book_append_sheet(wb, ws, nomePlanilha);
         });


        // Gera o arquivo XLSX
        XLSX.writeFile(wb, "relatorio_pedidos.xlsx");
     } catch (error) {
         console.error("Erro ao gerar XLSX:", error);
         alert("Ocorreu um erro ao gerar o arquivo XLSX. Verifique o console.");
     }
}
/* ==== FIM SEÇÃO - RELATÓRIO ==== */

/* ==== INÍCIO SEÇÃO - FUNÇÕES DE CONTROLE DE PÁGINA ==== */
function mostrarPagina(idPagina) {
    const paginas = document.querySelectorAll('.pagina');
    paginas.forEach(pagina => {
         if (pagina) pagina.style.display = 'none'; // Verifica se a página existe
    });

    const paginaParaMostrar = document.getElementById(idPagina);
    if (paginaParaMostrar) {
        paginaParaMostrar.style.display = 'block';

        // Limpa formulário de edição de pedido ao sair dele
        if (idPagina !== 'form-edicao-pedido' && pedidoEditando !== null) {
            console.log("Limpando estado de edição de pedido ao trocar de página.");
             const formEdicao = document.getElementById("edicaoPedido");
             if (formEdicao) formEdicao.reset();
             limparCamposMoeda(); // Limpa campos moeda específicos da edição
             const tbodyEdicao = document.querySelector("#tabelaProdutosEdicao tbody");
             if (tbodyEdicao) tbodyEdicao.innerHTML = "";
            pedidoEditando = null; // Reseta o ID do pedido sendo editado
        }
        // Limpa formulário de orçamento ao sair dele (se estiver em modo de edição)
         if (idPagina !== 'form-orcamento' && orcamentoEditando !== null) {
            console.log("Limpando estado de edição de orçamento ao trocar de página.");
             const formOrcamento = document.getElementById("orcamento");
             if (formOrcamento) formOrcamento.reset();
             limparCamposMoeda(); // Limpa campos moeda do orçamento
             const tbodyOrcamento = document.querySelector("#tabelaProdutos tbody");
             if (tbodyOrcamento) tbodyOrcamento.innerHTML = "";
              const previsaoEntregaInput = document.getElementById("previsaoEntrega");
             if (previsaoEntregaInput) previsaoEntregaInput.value = ""; // Limpa novo campo
             orcamentoEditando = null; // Reseta o ID do orçamento sendo editado
             // Garante que botões voltem ao estado inicial
             const btnGerar = document.getElementById("btnGerarOrcamento");
             const btnAtualizar = document.getElementById("btnAtualizarOrcamento");
             if (btnGerar) btnGerar.style.display = "inline-block";
             if (btnAtualizar) btnAtualizar.style.display = "none";
         }


    } else {
        console.warn(`Página com ID "${idPagina}" não encontrada.`);
        // Opcional: Mostrar uma página padrão ou mensagem de erro
        const formOrcamentoPage = document.getElementById('form-orcamento');
        if (formOrcamentoPage) formOrcamentoPage.style.display = 'block';
    }
}

/* ==== FIM SEÇÃO - FUNÇÕES DE CONTROLE DE PÁGINA ==== */

// ==== INÍCIO FUNÇÃO GLOBAL DE INICIALIZAÇÃO ====
function inicializarApp() {
    // ==== EVENT LISTENERS PARA OS MENUS ====
    const menuLinks = document.querySelectorAll('nav ul li a[data-pagina]');
    menuLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const paginaId = link.dataset.pagina;
            if (paginaId) {
                mostrarPagina(paginaId);
                // Atualiza listas ao navegar para elas
                if (paginaId === 'orcamentos-gerados') mostrarOrcamentosGerados();
                if (paginaId === 'lista-pedidos') mostrarPedidosRealizados();
                // Limpa relatório ao navegar para ele (para forçar nova geração)
                 if (paginaId === 'relatorio') {
                      const relatorioConteudo = document.getElementById('relatorio-conteudo');
                      if (relatorioConteudo) relatorioConteudo.innerHTML = '';
                      const filtroInicio = document.getElementById('filtroDataInicio');
                      const filtroFim = document.getElementById('filtroDataFim');
                       if (filtroInicio) filtroInicio.value = '';
                       if (filtroFim) filtroFim.value = '';
                 }
            } else {
                console.warn("Link de menu sem data-pagina:", link);
            }
        });
    });

    // ==== EVENT LISTENERS PARA BOTÕES GERAIS E FILTROS ====
    const btnAddProdutoOrcamento = document.querySelector('#btnAddProdutoOrcamento');
    if (btnAddProdutoOrcamento) btnAddProdutoOrcamento.addEventListener('click', adicionarProduto);

    const btnAddProdutoEdicaoForm = document.querySelector('#btnAddProdutoEdicao');
    if (btnAddProdutoEdicaoForm) btnAddProdutoEdicaoForm.addEventListener('click', adicionarProdutoEdicao);

    const btnGerarOrcamentoForm = document.querySelector('#btnGerarOrcamento');
    if (btnGerarOrcamentoForm) btnGerarOrcamentoForm.addEventListener('click', gerarOrcamento);

    const btnAtualizarOrcamentoForm = document.querySelector('#btnAtualizarOrcamento');
    if (btnAtualizarOrcamentoForm) btnAtualizarOrcamentoForm.addEventListener('click', atualizarOrcamento);

    const btnSalvarAlteracoesPedido = document.querySelector('#btnSalvarPedidoEdicao');
    if (btnSalvarAlteracoesPedido) btnSalvarAlteracoesPedido.addEventListener('click', atualizarPedido);

    const btnFiltrarOrcamentos = document.querySelector('#orcamentos-gerados .filtro-data button');
    if (btnFiltrarOrcamentos) btnFiltrarOrcamentos.addEventListener('click', filtrarOrcamentos);

    const btnFiltrarPedidos = document.querySelector('#lista-pedidos .filtro-data button');
    if (btnFiltrarPedidos) btnFiltrarPedidos.addEventListener('click', filtrarPedidos);

    const btnGerarRelatorio = document.querySelector('#relatorio .filtro-data button');
    if (btnGerarRelatorio) btnGerarRelatorio.addEventListener('click', filtrarPedidosRelatorio);

    const btnExportarRelatorioXLSX = document.querySelector('#relatorio button[onclick="gerarRelatorioXLSX()"]');
     if (btnExportarRelatorioXLSX) {
         // Remove o onclick inline se existir e adiciona listener JS
         if (btnExportarRelatorioXLSX.getAttribute('onclick')) {
             btnExportarRelatorioXLSX.removeAttribute('onclick');
         }
        btnExportarRelatorioXLSX.addEventListener('click', gerarRelatorioXLSX);
    }

     // ==== EVENT LISTENERS PARA INPUTS (delegação de evento) ====

     // Delegação para tabelas de produtos (Orçamento e Edição)
     document.body.addEventListener('input', function(event) {
        const target = event.target;
        // Formatação de moeda em campos de valor unitário
        if (target.classList.contains('produto-valor-unit')) {
            formatarEntradaMoeda(target);
            // Determina qual função de atualização chamar baseado na tabela pai
            if (target.closest('#tabelaProdutos')) {
                atualizarTotais();
            } else if (target.closest('#tabelaProdutosEdicao')) {
                atualizarTotaisEdicao();
            }
        }
         // Formatação de moeda em outros campos específicos
        if (['valorFrete', 'valorFreteEdicao', 'valorPedidoEdicao', 'entradaEdicao', 'custoMaoDeObraEdicao', 'margemLucroEdicao'].includes(target.id)) {
            formatarEntradaMoeda(target);
        }
        // Atualiza restante na edição de pedido ao digitar entrada
        if (target.id === 'entradaEdicao') {
             atualizarRestanteEdicao();
        }

     });

     document.body.addEventListener('change', function(event) {
         const target = event.target;
          // Atualiza totais ao mudar quantidade
        if (target.classList.contains('produto-quantidade')) {
             if (target.closest('#tabelaProdutos')) {
                 atualizarTotais();
             } else if (target.closest('#tabelaProdutosEdicao')) {
                 atualizarTotaisEdicao();
             }
        }
     });

      document.body.addEventListener('blur', function(event) {
        const target = event.target;
         // Atualiza totais ao sair dos campos de valor ou frete
        if (target.classList.contains('produto-valor-unit') || target.id === 'valorFrete') {
             if (target.closest('#form-orcamento')) { // Verifica se está no form de orçamento
                atualizarTotais();
             }
        }
        if (target.classList.contains('produto-valor-unit') || ['valorFreteEdicao', 'valorPedidoEdicao'].includes(target.id)) {
             if (target.closest('#form-edicao-pedido')) { // Verifica se está no form de edição
                 atualizarTotaisEdicao();
             }
        }
          // Atualiza restante ao sair do campo de entrada na edição
        if (target.id === 'entradaEdicao') {
            if (target.closest('#form-edicao-pedido')) {
                atualizarRestanteEdicao();
            }
        }
     }, true); // Usa capturing para garantir que o blur seja pego

      // Adiciona listeners para botões que são adicionados dinamicamente (Excluir produto)
     document.body.addEventListener('click', function(event) {
         const target = event.target;
          if (target.tagName === 'BUTTON' && target.textContent === 'Excluir') {
              if (target.closest('#tabelaProdutos')) {
                  excluirProduto(target);
              } else if (target.closest('#tabelaProdutosEdicao')) {
                  excluirProdutoEdicao(target);
              }
          }
     });


    // ==== MONITOR DE AUTENTICAÇÃO E CARREGAMENTO INICIAL ====
    onAuthStateChanged(auth, async (user) => {
        usuarioAtual = user;
        const appContent = document.getElementById('appContent'); // Div que contém as páginas
        const btnLogoutNav = document.getElementById('btnLogout'); // Botão no menu de navegação

        if (user) {
            console.log("Usuário autenticado:", user.email);
             if (btnLogoutNav) btnLogoutNav.style.display = "inline-block"; // Mostra botão Sair no menu
             if (appContent) appContent.style.display = "block"; // Mostra conteúdo principal
             mostrarPagina('form-orcamento'); // Mostra a página inicial após login
            await carregarDados(); // Carrega os dados do Firebase
             limparCamposMoeda(); // Garante que campos moeda iniciem formatados
        } else {
            console.log("Nenhum usuário autenticado.");
            if (btnLogoutNav) btnLogoutNav.style.display = "none"; // Esconde botão Sair
            if (appContent) appContent.style.display = "none"; // Esconde conteúdo principal
            // Limpa dados locais
            orcamentos = [];
            pedidos = [];
            numeroOrcamento = 1;
            numeroPedido = 1;
            orcamentoEditando = null;
            pedidoEditando = null;
            // Não precisa redirecionar aqui se já estiver na página de login
            // Verifica se a página atual NÃO é a de login antes de redirecionar
             if (!window.location.pathname.includes('/login/login.html')) {
                 window.location.href = "./login/login.html"; // Redireciona para login
             }
        }
    });
}
// ==== FIM FUNÇÃO GLOBAL DE INICIALIZAÇÃO ====


// ==== INICIALIZAÇÃO QUANDO O DOM ESTÁ PRONTO ====
document.addEventListener('DOMContentLoaded', inicializarApp);
