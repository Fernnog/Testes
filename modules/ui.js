// --- START OF FILE ui.js (COMPLETO E MODIFICADO) ---

// modules/ui.js
// RESPONSABILIDADE ÚNICA: Manipular o DOM, renderizar elementos, ler dados de formulários
// e gerenciar a visibilidade das seções da UI. Não contém lógica de negócio.

import * as DOMElements from './dom-elements.js';
import * as planoLogic from './plano-logic.js';

// --- Funções de Formatação e Helpers ---

/**
 * Formata um objeto Date para uma string legível (dd/mm/aaaa).
 * @param {Date} date - O objeto Date a ser formatado.
 * @returns {string} A data formatada ou '' se a data for inválida.
 */
function formatarData(date) {
    if (date instanceof Date && !isNaN(date)) {
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); // UTC para evitar problemas de fuso
    }
    return '';
}

/**
 * Rola a tela até o card do plano e aplica um destaque visual temporário.
 * @param {number} planoIndex - O índice do plano a ser destacado.
 */
export function highlightAndScrollToPlano(planoIndex) {
    const planoCard = document.getElementById(`plano-${planoIndex}`);
    if (!planoCard) return;

    planoCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    planoCard.classList.add('flash-highlight');

    setTimeout(() => {
        planoCard.classList.remove('flash-highlight');
    }, 1500);
}

// --- Funções de Controle de Visibilidade ---

/** Mostra a seção principal com a lista de planos. */
export function showPlanosList(planos, user) {
    DOMElements.cadastroPlanoSection.style.display = 'none';
    DOMElements.planosLeituraSection.style.display = 'block';
    renderApp(planos, user);
}

/** Mostra o formulário de cadastro/edição de plano. */
export function showCadastroForm(planoParaEditar = null) {
    DOMElements.planosLeituraSection.style.display = 'none';
    DOMElements.leiturasAtrasadasSection.style.display = 'none';
    DOMElements.proximasLeiturasSection.style.display = 'none';
    DOMElements.planosPausadosSection.style.display = 'none';
    DOMElements.cadastroPlanoSection.style.display = 'block';

    DOMElements.formPlano.reset();
    togglePeriodoFields(); // MODIFICAÇÃO: Garante o estado visual inicial correto
    toggleDiasSemana();   // MODIFICAÇÃO: Garante o estado visual inicial correto

    if (planoParaEditar) {
        DOMElements.cadastroPlanoSection.querySelector('h2').textContent = 'Editar Plano de Leitura';
        DOMElements.tituloLivroInput.value = planoParaEditar.titulo;
        DOMElements.linkDriveInput.value = planoParaEditar.linkDrive || '';
        DOMElements.paginaInicioInput.value = planoParaEditar.paginaInicio;
        DOMElements.paginaFimInput.value = planoParaEditar.paginaFim;

        DOMElements.definirPorDatasRadio.checked = true;
        DOMElements.periodoPorDatasDiv.style.display = 'block';
        DOMElements.periodoPorDiasDiv.style.display = 'none';

        if (planoParaEditar.dataInicio) {
            DOMElements.dataInicio.value = planoParaEditar.dataInicio.toISOString().split('T')[0];
        }
        if (planoParaEditar.dataFim) {
            DOMElements.dataFim.value = planoParaEditar.dataFim.toISOString().split('T')[0];
        }

        DOMElements.periodicidadeSelect.value = planoParaEditar.periodicidade;
        if (planoParaEditar.periodicidade === 'semanal') {
            DOMElements.diasSemanaSelecao.style.display = 'block';
            const checkboxes = DOMElements.diasSemanaSelecao.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = planoParaEditar.diasSemana.includes(parseInt(cb.value));
            });
        } else {
            DOMElements.diasSemanaSelecao.style.display = 'none';
        }
    } else {
        DOMElements.cadastroPlanoSection.querySelector('h2').textContent = 'Novo Plano de Leitura';
    }
}

// --- NOVAS FUNÇÕES PARA CONTROLE DO FORMULÁRIO ---
/**
 * Controla a visibilidade dos campos de definição de período no formulário.
 * Esta função corrige os bugs de interface reportados.
 */
export function togglePeriodoFields() {
    const isPorDatas = DOMElements.definirPorDatasRadio.checked;
    const isPorDias = DOMElements.definirPorDiasRadio.checked;
    const isPorPaginas = DOMElements.definirPorPaginasRadio.checked;

    DOMElements.periodoPorDatasDiv.style.display = isPorDatas ? 'block' : 'none';
    DOMElements.periodoPorDiasDiv.style.display = isPorDias ? 'block' : 'none';
    DOMElements.periodoPorPaginasDiv.style.display = isPorPaginas ? 'block' : 'none';

    // Garante que os inputs 'required' só sejam exigidos se estiverem visíveis
    DOMElements.dataInicio.required = isPorDatas;
    DOMElements.dataFim.required = isPorDatas;
    DOMElements.dataInicioDias.required = isPorDias;
    DOMElements.numeroDias.required = isPorDias;
    DOMElements.dataInicioPaginas.required = isPorPaginas;
    DOMElements.paginasPorDiaInput.required = isPorPaginas;
}

/**
 * Controla a visibilidade da seleção de dias da semana.
 * Corrige o bug em que a seleção não aparecia.
 */
export function toggleDiasSemana() {
    if (DOMElements.periodicidadeSelect.value === 'semanal') {
        DOMElements.diasSemanaSelecao.style.display = 'block';
    } else {
        DOMElements.diasSemanaSelecao.style.display = 'none';
    }
}

/**
 * Renderiza a estimativa da data de término no formulário.
 * Implementa a melhoria de UX (2.B).
 * @param {Date | null} data - A data estimada ou null se não puder ser calculada.
 */
export function renderizarDataFimEstimada(data) {
    const feedbackElement = DOMElements.estimativaDataFim; // Supondo que você adicionará este elemento no HTML e dom-elements.js
    if (!feedbackElement) return;

    if (data instanceof Date && !isNaN(data)) {
        feedbackElement.textContent = `Estimativa de término: ${formatarData(data)}`;
        feedbackElement.style.display = 'block';
    } else {
        feedbackElement.textContent = '';
        feedbackElement.style.display = 'none';
    }
}
// --- FIM DAS NOVAS FUNÇÕES ---

/** Mostra o formulário de autenticação. */
export function showAuthForm() {
    DOMElements.authFormDiv.style.display = 'flex';
    DOMElements.cancelAuthButton.style.display = 'inline-flex';
    DOMElements.showAuthButton.style.display = 'none';
}

/** Esconde o formulário de autenticação. */
export function hideAuthForm() {
    DOMElements.authFormDiv.style.display = 'none';
    DOMElements.cancelAuthButton.style.display = 'none';
    if (!DOMElements.logoutButton.style.display || DOMElements.logoutButton.style.display === 'none') {
        DOMElements.showAuthButton.style.display = 'inline-flex';
    }
}

/** Mostra o modal de reavaliação. */
export function showReavaliacaoModal() {
    DOMElements.reavaliacaoModal.classList.add('visivel');
}

/** Esconde o modal de reavaliação. */
export function hideReavaliacaoModal() {
    DOMElements.reavaliacaoModal.classList.remove('visivel');
}

/**
 * Configura os eventos de interação para o modal de recálculo.
 */
function setupRecalculoInteractions() {
    DOMElements.recalculoPorDataRadio.addEventListener('change', () => {
        DOMElements.recalculoOpcaoDataDiv.style.display = 'block';
        DOMElements.recalculoOpcaoPaginasDiv.style.display = 'none';
    });

    DOMElements.recalculoPorPaginasRadio.addEventListener('change', () => {
        DOMElements.recalculoOpcaoDataDiv.style.display = 'none';
        DOMElements.recalculoOpcaoPaginasDiv.style.display = 'block';
    });
}
setupRecalculoInteractions(); // Chamada da função movida para dentro do módulo

/** Mostra o modal de recálculo com os dados do plano e texto do botão customizável. */
export function showRecalculoModal(plano, planoIndex, buttonText) {
    DOMElements.recalculoPlanoTitulo.textContent = `"${plano.titulo}"`;
    DOMElements.confirmRecalculoBtn.dataset.planoIndex = planoIndex;
    DOMElements.confirmRecalculoBtn.textContent = buttonText || 'Confirmar Remanejamento';

    const recalculoCheckboxes = document.querySelectorAll('#recalculo-dias-semana-selecao input[type="checkbox"]');
    recalculoCheckboxes.forEach(cb => {
        cb.checked = plano.diasSemana.includes(parseInt(cb.value));
    });

    DOMElements.recalculoPorDataRadio.checked = true;
    DOMElements.recalculoOpcaoDataDiv.style.display = 'block';
    DOMElements.recalculoOpcaoPaginasDiv.style.display = 'none';
    DOMElements.novaPaginasPorDiaInput.value = '';

    const hoje = new Date();
    const amanha = new Date(hoje.setDate(hoje.getDate() + 1));
    DOMElements.novaDataFimInput.min = amanha.toISOString().split('T')[0];
    DOMElements.novaDataFimInput.value = '';

    DOMElements.recalculoModal.classList.add('visivel');
}

/** Esconde o modal de recálculo. */
export function hideRecalculoModal() {
    DOMElements.recalculoModal.classList.remove('visivel');
}

/** Mostra o modal de exportação para agenda. */
export function showAgendaModal() {
    DOMElements.agendaStartTimeInput.value = "16:30";
    DOMElements.agendaEndTimeInput.value = "17:00";
    DOMElements.agendaModal.classList.add('visivel');
}

/** Esconde o modal de exportação para agenda. */
export function hideAgendaModal() {
    DOMElements.agendaModal.classList.remove('visivel');
}

/**
 * Cria um arquivo em memória e aciona o download no navegador.
 * @param {string} filename - O nome do arquivo a ser baixado.
 * @param {string} content - O conteúdo do arquivo.
 */
export function triggerDownload(filename, content) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/calendar;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

// --- Funções de Leitura de Dados da UI (Formulário) ---
/**
 * Coleta e valida os dados do formulário de plano.
 * Versão atualizada para lidar com as 3 opções de período.
 */
export function getFormData() {
    const definicaoPeriodo = document.querySelector('input[name="definicao-periodo"]:checked').value;
    
    let dataInicio;
    if (definicaoPeriodo === 'datas') {
        dataInicio = new Date(DOMElements.dataInicio.value + 'T00:00:00');
    } else if (definicaoPeriodo === 'dias') {
        dataInicio = new Date(DOMElements.dataInicioDias.value + 'T00:00:00');
    } else { // 'paginas'
        dataInicio = new Date(DOMElements.dataInicioPaginas.value + 'T00:00:00');
    }

    const formData = {
        titulo: DOMElements.tituloLivroInput.value.trim(),
        linkDrive: DOMElements.linkDriveInput.value.trim(),
        paginaInicio: parseInt(DOMElements.paginaInicioInput.value, 10),
        paginaFim: parseInt(DOMElements.paginaFimInput.value, 10),
        periodicidade: DOMElements.periodicidadeSelect.value,
        diasSemana: [],
        definicaoPeriodo: definicaoPeriodo,
        dataInicio: dataInicio,
    };

    if (formData.definicaoPeriodo === 'datas') {
        formData.dataFim = new Date(DOMElements.dataFim.value + 'T00:00:00');
    } else if (formData.definicaoPeriodo === 'dias') {
        formData.numeroDias = parseInt(DOMElements.numeroDias.value, 10);
    } else { // 'paginas'
        formData.paginasPorDia = parseInt(DOMElements.paginasPorDiaInput.value, 10);
    }

    if (formData.periodicidade === 'semanal') {
        const checkboxes = DOMElements.diasSemanaSelecao.querySelectorAll('input[type="checkbox"]:checked');
        formData.diasSemana = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));
        if (formData.diasSemana.length === 0) {
            throw new Error("Selecione pelo menos um dia da semana para a leitura semanal.");
        }
    }

    if (!formData.titulo) throw new Error("O título do livro é obrigatório.");
    if (isNaN(formData.paginaInicio) || isNaN(formData.paginaFim) || formData.paginaFim < formData.paginaInicio) {
        throw new Error("As páginas de início e fim são inválidas.");
    }
    if (isNaN(formData.dataInicio.getTime())) {
        throw new Error("A data de início é obrigatória.");
    }

    return formData;
}

// --- Funções de Renderização ---

function renderizarPlanos(planos, user) {
    if (!user) {
        DOMElements.listaPlanos.innerHTML = '<p>Faça login ou cadastre-se para ver e criar seus planos de leitura.</p>';
        return;
    }
    if (planos.length === 0) {
        DOMElements.listaPlanos.innerHTML = '<p>Você ainda não tem planos. Clique em "Novo" para criar o seu primeiro!</p>';
        return;
    }

    let html = '';
    planos.forEach((plano, index) => {
        const status = planoLogic.determinarStatusPlano(plano);
        const progresso = plano.totalPaginas > 0 ? (plano.paginasLidas / plano.totalPaginas) * 100 : 0;
        const numeroPlano = planos.length - index;
        const isPausado = status === 'pausado';
        const proximoDiaIndex = planoLogic.encontrarProximoDiaDeLeituraIndex(plano);

        let statusTagHTML = '';
        switch (status) {
            case 'proximo': statusTagHTML = '<span class="status-tag status-proximo">Próximo</span>'; break;
            case 'em_dia': statusTagHTML = '<span class="status-tag status-em-dia">Em Dia</span>'; break;
            case 'atrasado': statusTagHTML = '<span class="status-tag status-atrasado">Atrasado</span>'; break;
            case 'concluido': statusTagHTML = '<span class="status-tag status-concluido">Concluído</span>'; break;
            case 'pausado': statusTagHTML = '<span class="status-tag status-concluido">Pausado</span>'; break;
        }

        const botaoPausarRetomarHTML = isPausado
            ? `<button data-action="retomar" data-plano-index="${index}" title="Retomar Plano" class="acao-retomar"><span class="material-symbols-outlined">play_circle</span></button>`
            : `<button data-action="pausar" data-plano-index="${index}" title="Pausar Plano"><span class="material-symbols-outlined">pause</span></button>`;
        
        const diasLeituraHTML = plano.diasPlano.map((dia, diaIndex) => {
            let acoesDiaHTML = '';
            if (diaIndex === proximoDiaIndex && !isPausado) {
                acoesDiaHTML = `
                    <div class="dia-leitura-acoes">
                        <div class="leitura-parcial-container">
                            <label for="parcial-${index}-${diaIndex}">Parei na pág:</label>
                            <input type="number" id="parcial-${index}-${diaIndex}" class="leitura-parcial-input" 
                                   min="${dia.paginaInicioDia}" max="${dia.paginaFimDia}"
                                   placeholder="${dia.paginaInicioDia}"
                                   value="${dia.ultimaPaginaLida || ''}">
                            <button class="leitura-parcial-save-btn" data-action="salvar-parcial" 
                                    data-plano-index="${index}" data-dia-index="${diaIndex}">
                                <span class="material-symbols-outlined">save</span>
                            </button>
                        </div>
                    </div>
                `;
            }

            return `
            <div class="dia-leitura ${dia.lido ? 'lido' : ''}">
                <input type="checkbox" id="dia-${index}-${diaIndex}" data-action="marcar-lido" data-plano-index="${index}" data-dia-index="${diaIndex}" ${dia.lido ? 'checked' : ''}>
                <label for="dia-${index}-${diaIndex}">
                    <strong>${formatarData(dia.data)}:</strong> Pág. ${dia.paginaInicioDia} a ${dia.paginaFimDia} (${dia.paginas} pág.)
                </label>
                ${acoesDiaHTML}
            </div>
        `}).join('');

        const podeRecalcular = status === 'atrasado' || status === 'em_dia';
        const avisoAtrasoHTML = podeRecalcular ? `
            <div class="aviso-atraso">
                <p>${status === 'atrasado' ? 'Este plano tem leituras atrasadas!' : 'Ajuste o ritmo do seu plano, se desejar.'}</p>
                <div class="acoes-dados">
                    <button data-action="recalcular" data-plano-index="${index}" title="Recalcular o plano com uma nova data de término">
                        <span class="material-symbols-outlined">restart_alt</span> Recalcular
                    </button>
                </div>
            </div>
        ` : '';

        html += `
            <div class="plano-leitura card-${status}" id="plano-${index}">
                <div class="plano-header">
                    <h3><span class="plano-numero">${numeroPlano}</span>${plano.titulo}</h3>
                    ${statusTagHTML}
                    <div class="plano-acoes-principais">
                        ${botaoPausarRetomarHTML}
                        <button data-action="editar" data-plano-index="${index}" title="Editar Plano"><span class="material-symbols-outlined">edit</span></button>
                        <button data-action="excluir" data-plano-index="${index}" title="Excluir Plano"><span class="material-symbols-outlined">delete</span></button>
                    </div>
                </div>
                ${plano.linkDrive ? `
                    <div class="link-drive-container">
                        <a href="${plano.linkDrive}" target="_blank" class="button-link-drive">
                            <span class="material-symbols-outlined">link</span> Acessar Anotações
                        </a>
                    </div>` : ''
                }
                ${avisoAtrasoHTML}
                <p>Progresso: ${progresso.toFixed(0)}% (${plano.paginasLidas} de ${plano.totalPaginas} páginas)</p>
                <div class="progresso-container">
                    <span class="barra-progresso" style="width: ${progresso}%;"></span>
                </div>
                
                <h4 class="dias-leitura-titulo">Cronograma de Leitura:</h4>
                <div class="dias-leitura">${diasLeituraHTML}</div>
            </div>
        `;
    });
    DOMElements.listaPlanos.innerHTML = html;
}


function renderizarPaginador(planos) {
    const totalPlanos = planos.length;
    if (totalPlanos <= 1) {
        DOMElements.paginadorPlanosDiv.innerHTML = '';
        DOMElements.paginadorPlanosDiv.classList.add('hidden');
        return;
    }

    let paginadorHTML = `<a href="#" id="paginador-home-btn" title="Ir para o topo">
                            <span class="material-symbols-outlined">home</span>
                         </a>`;
    
    planos.forEach((plano, index) => {
        const numeroPlano = totalPlanos - index;
        const status = planoLogic.determinarStatusPlano(plano);
        const classePausado = status === 'pausado' ? 'paginador-pausado' : '';

        paginadorHTML += `<a href="#plano-${index}" title="Ir para o plano '${plano.titulo}'" class="${classePausado}">${numeroPlano}</a>`;
    });
    
    DOMElements.paginadorPlanosDiv.innerHTML = paginadorHTML;
    DOMElements.paginadorPlanosDiv.classList.remove('hidden');
}


function renderizarPainelProximasLeituras(planos, totalPlanos) {
    const planosAtivos = planos.filter(p => !p.isPaused);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const todasAsProximasLeituras = planosAtivos.flatMap((plano, planoIndexOriginal) => {
        const planoIndexGlobal = planos.findIndex(p => p.id === plano.id);
        return plano.diasPlano
            .filter(dia => dia.data && new Date(dia.data) >= hoje && !dia.lido)
            .map(dia => ({ ...dia, titulo: plano.titulo, planoIndex: planoIndexGlobal }));
    }).sort((a, b) => a.data - b.data);
    
    const proximas3 = todasAsProximasLeituras.slice(0, 3);

    if (proximas3.length > 0) {
        const html = proximas3.map(dia => `
            <div class="proxima-leitura-item">
                <span class="proxima-leitura-data">${formatarData(dia.data)}</span>
                <span class="numero-plano-tag">${totalPlanos - dia.planoIndex}</span>
                <span class="proxima-leitura-titulo">${dia.titulo}</span>
                <span class="proxima-leitura-paginas">Pág. ${dia.paginaInicioDia}-${dia.paginaFimDia}</span>
            </div>
        `).join('');
        DOMElements.listaProximasLeiturasDiv.innerHTML = html;
        DOMElements.semProximasLeiturasP.style.display = 'none';
        DOMElements.proximasLeiturasSection.style.display = 'block';
    } else {
        DOMElements.proximasLeiturasSection.style.display = 'none';
    }
}

function renderizarPainelLeiturasAtrasadas(planos, totalPlanos) {
    const planosAtivos = planos.filter(p => !p.isPaused);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const todasAsLeiturasAtrasadas = planosAtivos.flatMap((plano, planoIndexOriginal) => {
        const planoIndexGlobal = planos.findIndex(p => p.id === plano.id);
        return plano.diasPlano
            .filter(dia => dia.data && new Date(dia.data) < hoje && !dia.lido)
            .map(dia => ({ ...dia, titulo: plano.titulo, planoIndex: planoIndexGlobal }));
    }).sort((a, b) => a.data - b.data);

    const atrasadas3 = todasAsLeiturasAtrasadas.slice(0, 3);

    if (atrasadas3.length > 0) {
        const html = atrasadas3.map(dia => `
            <div class="leitura-atrasada-item">
                <span class="leitura-atrasada-data">${formatarData(dia.data)}</span>
                <span class="numero-plano-tag">${totalPlanos - dia.planoIndex}</span>
                <span class="leitura-atrasada-titulo">${dia.titulo}</span>
                <span class="leitura-atrasada-paginas">Pág. ${dia.paginaInicioDia}-${dia.paginaFimDia}</span>
            </div>
        `).join('');
        DOMElements.listaLeiturasAtrasadasDiv.innerHTML = html;
        DOMElements.semLeiturasAtrasadasP.style.display = 'none';
        DOMElements.leiturasAtrasadasSection.style.display = 'block';
    } else {
        DOMElements.leiturasAtrasadasSection.style.display = 'none';
    }
}

function renderizarPainelPlanosPausados(planos, totalPlanos) {
    const planosPausados = planos.filter(plano => plano.isPaused);

    if (planosPausados.length > 0) {
        const html = planosPausados.map(plano => {
            const planoIndex = planos.findIndex(p => p.id === plano.id);
            return `
                <div class="plano-pausado-item">
                    <span class="plano-pausado-data">Pausado em: ${formatarData(plano.dataPausa)}</span>
                    <span class="numero-plano-tag">${totalPlanos - planoIndex}</span>
                    <span class="plano-pausado-titulo">${plano.titulo}</span>
                </div>
            `;
        }).join('');
        DOMElements.listaPlanosPausadosDiv.innerHTML = html;
        DOMElements.semPlanosPausadosP.style.display = 'none';
        DOMElements.planosPausadosSection.style.display = 'block';
    } else {
        DOMElements.planosPausadosSection.style.display = 'none';
    }
}

function renderizarQuadroReavaliacao(dadosCarga) {
    let html = '';
    dadosCarga.forEach(dia => {
        const planosDoDia = dia.planos.map(p => 
            `<span class="plano-carga-tag" data-action="remanejar-plano" data-plano-index="${p.planoIndex}" title="Remanejar plano '${p.numero}'">
                <span class="numero-plano-tag">${p.numero}</span> ${p.media} pág.
            </span>`
        ).join('') || 'Nenhum plano ativo';

        html += `
            <tr>
                <td>${dia.nome}</td>
                <td class="planos-dia-cell">${planosDoDia}</td>
                <td class="total-paginas-dia">${dia.totalPaginas}</td>
            </tr>
        `;
    });
    DOMElements.tabelaReavaliacaoBody.innerHTML = html;
}

function renderizarLegendaReavaliacao(planos, totalPlanos) {
    const legendaContainer = DOMElements.reavaliacaoLegenda;
    if (!planos || planos.length === 0 || !legendaContainer) {
        if(legendaContainer) legendaContainer.innerHTML = '';
        return;
    }

    const planosAtivos = planos.filter(p => planoLogic.determinarStatusPlano(p) !== 'concluido' && planoLogic.determinarStatusPlano(p) !== 'invalido');
    
    if (planosAtivos.length === 0) {
        legendaContainer.innerHTML = '';
        return;
    }
    
    let legendaHTML = '<h4>Legenda de Planos</h4><ul class="reavaliacao-legenda-lista">';
    
    const mapaPlanoNumero = {};
    planos.forEach((plano, index) => {
        mapaPlanoNumero[index] = planos.length - index;
    });

    planosAtivos.forEach((plano) => {
        const originalIndex = planos.findIndex(p => p.id === plano.id);
        const numeroPlano = mapaPlanoNumero[originalIndex];
        
        legendaHTML += `
            <li class="reavaliacao-legenda-item">
                <span class="numero-plano-tag">${numeroPlano}</span>
                <span>${plano.titulo}</span>
            </li>
        `;
    });
    legendaHTML += '</ul>';

    legendaContainer.innerHTML = legendaHTML;
}

export function renderizarModalReavaliacaoCompleto(dadosCarga, planos, totalPlanos) {
    renderizarQuadroReavaliacao(dadosCarga);
    renderizarLegendaReavaliacao(planos, totalPlanos);
}

// --- Função Principal de Renderização da Aplicação ---
export function renderApp(planos, user) {
    console.log('[UI] Renderizando a aplicação completa...');

    if (user) {
        DOMElements.showAuthButton.style.display = 'none';
        DOMElements.authFormDiv.style.display = 'none';
        DOMElements.logoutButton.style.display = 'inline-flex';
        DOMElements.novoPlanoBtn.style.display = 'inline-flex';
        DOMElements.inicioBtn.style.display = 'inline-flex';
        DOMElements.exportarAgendaBtn.style.display = 'inline-flex';
        DOMElements.reavaliarCargaBtn.style.display = 'inline-flex';
    } else {
        DOMElements.showAuthButton.style.display = 'inline-flex';
        DOMElements.logoutButton.style.display = 'none';
        DOMElements.novoPlanoBtn.style.display = 'none';
        DOMElements.inicioBtn.style.display = 'none';
        DOMElements.exportarAgendaBtn.style.display = 'none';
        DOMElements.reavaliarCargaBtn.style.display = 'none';
        hideAuthForm();
    }

    if (planos && planos.length > 0) {
        renderizarPainelProximasLeituras(planos, planos.length);
        renderizarPainelLeiturasAtrasadas(planos, planos.length);
        renderizarPainelPlanosPausados(planos, planos.length);
        renderizarPlanos(planos, user);
        renderizarPaginador(planos);
        DOMElements.paginadorPlanosDiv.classList.remove('hidden');
    } else {
        DOMElements.listaPlanos.innerHTML = user ? '<p>Você ainda não tem planos. Clique em "Novo" para criar o seu primeiro!</p>' : '<p>Faça login ou cadastre-se para ver e criar seus planos de leitura.</p>';
        DOMElements.proximasLeiturasSection.style.display = 'none';
        DOMElements.leiturasAtrasadasSection.style.display = 'none';
        DOMElements.planosPausadosSection.style.display = 'none';
        DOMElements.paginadorPlanosDiv.innerHTML = '';
        DOMElements.paginadorPlanosDiv.classList.add('hidden');
    }
}

// --- Funções Auxiliares (PWA, Loading, etc) ---

export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => console.log('Service Worker registrado com sucesso:', registration))
                .catch(error => console.log('Falha ao registrar Service Worker:', error));
        });
    }
}

export function toggleLoading(isLoading) {
    console.log(`[UI] Carregamento: ${isLoading ? 'ON' : 'OFF'}`);
    document.body.style.cursor = isLoading ? 'wait' : 'default';
}

// --- END OF FILE ui.js ---