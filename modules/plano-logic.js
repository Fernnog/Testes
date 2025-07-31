// modules/plano-logic.js
// RESPONSABILIDADE ÚNICA: Conter toda a lógica de negócio, cálculos e manipulação
// de dados dos planos. Funções "puras" que não tocam no DOM.

/**
 * Retorna a data de hoje normalizada (sem horas, minutos, segundos).
 * @returns {Date}
 */
function getHojeNormalizado() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
}

/**
 * Determina o status de um plano (pausado, proximo, em_dia, atrasado, concluido, invalido).
 * @param {object} plano - O objeto do plano a ser analisado.
 * @returns {string} O status do plano.
 */
export function determinarStatusPlano(plano) {
    if (!plano || !plano.diasPlano || !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date) || isNaN(plano.dataInicio) || isNaN(plano.dataFim)) {
        return 'invalido';
    }
    
    if (plano.isPaused) {
        return 'pausado';
    }

    const hoje = getHojeNormalizado();
    const dataInicioPlano = new Date(plano.dataInicio); dataInicioPlano.setHours(0,0,0,0);

    const todosLidos = plano.diasPlano.length > 0 && plano.diasPlano.every(dia => dia.lido);
    if (todosLidos) return 'concluido';

    if (dataInicioPlano > hoje) return 'proximo';

    const temDiaPassadoNaoLido = plano.diasPlano.some(dia => {
        if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
             const dataDiaNormalizada = new Date(dia.data); dataDiaNormalizada.setHours(0, 0, 0, 0);
             return dataDiaNormalizada < hoje && !dia.lido;
        }
        return false;
     });
     if (temDiaPassadoNaoLido) return 'atrasado';

    return 'em_dia';
}

/**
 * Encontra o índice do primeiro dia de leitura não concluído no plano.
 * @param {object} plano - O objeto do plano.
 * @returns {number} O índice do próximo dia a ser lido, ou -1 se todos estiverem lidos.
 */
export function encontrarProximoDiaDeLeituraIndex(plano) {
    if (!plano || !plano.diasPlano) return -1;
    return plano.diasPlano.findIndex(dia => !dia.lido);
}

/**
 * Recalcula e atualiza a propriedade `paginasLidas` de um plano, considerando leituras parciais.
 * @param {object} plano - O objeto do plano a ser modificado.
 */
export function atualizarPaginasLidas(plano) {
    if (!plano || !plano.diasPlano) {
        if(plano) plano.paginasLidas = 0;
        return;
    };

    plano.paginasLidas = plano.diasPlano.reduce((sum, dia) => {
        if (!dia) return sum;
        if (dia.lido) {
            return sum + (typeof dia.paginas === 'number' ? dia.paginas : 0);
        }
        if (dia.ultimaPaginaLida && dia.ultimaPaginaLida >= dia.paginaInicioDia) {
            const paginasParciais = (dia.ultimaPaginaLida - dia.paginaInicioDia) + 1;
            return sum + paginasParciais;
        }
        return sum;
    }, 0);
}

/**
 * Gera um array de dias de leitura com base em datas de início/fim e periodicidade.
 * @param {Date} dataInicio
 * @param {Date} dataFim
 * @param {string} periodicidade - 'diario' ou 'semanal'
 * @param {number[]} diasSemana - Array de números de 0 (Dom) a 6 (Sáb).
 * @returns {Array<object>}
 */
export function gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana) {
    const dias = [];
    if (!(dataInicio instanceof Date) || !(dataFim instanceof Date) || isNaN(dataInicio) || isNaN(dataFim) || dataFim < dataInicio) {
        throw new Error("Datas inválidas para gerar os dias do plano.");
    }
    let dataAtual = new Date(dataInicio);
    const dataFimNormalizada = new Date(dataFim);

    while (dataAtual <= dataFimNormalizada) {
        const diaSemanaAtual = dataAtual.getDay();
        if (periodicidade === 'diario' || (periodicidade === 'semanal' && diasSemana.includes(diaSemanaAtual))) {
            dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
        }
        dataAtual.setDate(dataAtual.getDate() + 1);
    }
    return dias;
}

/**
 * Gera um array de dias de leitura com base na data de início, número de dias e periodicidade.
 * @param {Date} dataInicio
 * @param {number} numeroDias
 * @param {string} periodicidade
 * @param {number[]} diasSemana
 * @returns {Array<object>}
 */
export function gerarDiasPlanoPorDias(dataInicio, numeroDias, periodicidade, diasSemana) {
    const dias = [];
    if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
        throw new Error("Dados inválidos para gerar os dias do plano.");
    }
    let dataAtual = new Date(dataInicio);
    let diasAdicionados = 0;

    while (diasAdicionados < numeroDias) {
        const diaSemanaAtual = dataAtual.getDay();
        if (periodicidade === 'diario' || (periodicidade === 'semanal' && diasSemana.includes(diaSemanaAtual))) {
            dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            diasAdicionados++;
        }
         dataAtual.setDate(dataAtual.getDate() + 1);
    }
    return dias;
}

/**
 * Gera um array de dias de leitura com base na meta de páginas por dia.
 * @param {Date} dataInicio
 * @param {number} paginasPorDia
 * @param {number} paginaInicioLivro
 * @param {number} paginaFimLivro
 * @param {string} periodicidade
 * @param {number[]} diasSemana
 * @returns {Array<object>}
 */
export function gerarDiasPlanoPorPaginas(dataInicio, paginasPorDia, paginaInicioLivro, paginaFimLivro, periodicidade, diasSemana) {
    if (!paginasPorDia || paginasPorDia <= 0) {
        throw new Error("A meta de páginas por dia deve ser um número positivo.");
    }
    const totalPaginas = (paginaFimLivro - paginaInicioLivro) + 1;
    if (totalPaginas <= 0) {
        throw new Error("O intervalo de páginas do livro é inválido.");
    }
    const diasLeituraNecessarios = Math.ceil(totalPaginas / paginasPorDia);
    return gerarDiasPlanoPorDias(dataInicio, diasLeituraNecessarios, periodicidade, diasSemana);
}

/**
 * Distribui as páginas de um plano entre seus dias de leitura.
 * @param {object} plano - O objeto do plano a ser modificado.
 */
export function distribuirPaginasPlano(plano) {
    if (!plano || !plano.diasPlano || plano.diasPlano.length === 0) return;

    const totalPaginasLivro = plano.paginaFim - plano.paginaInicio + 1;
    const numeroDeDias = plano.diasPlano.length;
    plano.totalPaginas = totalPaginasLivro;
    const paginasPorDiaBase = Math.floor(totalPaginasLivro / numeroDeDias);
    const paginasRestantes = totalPaginasLivro % numeroDeDias;
    let paginaAtual = plano.paginaInicio;

    plano.diasPlano.forEach((dia, index) => {
        let paginasNesteDia = paginasPorDiaBase + (index < paginasRestantes ? 1 : 0);
        dia.paginaInicioDia = paginaAtual;
        dia.paginaFimDia = Math.min(plano.paginaFim, paginaAtual + paginasNesteDia - 1);
        dia.paginas = dia.paginaFimDia - dia.paginaInicioDia + 1;
        paginaAtual = dia.paginaFimDia + 1;
    });
    atualizarPaginasLidas(plano);
}


/**
 * Recalcula um plano atrasado com base em uma nova data de fim.
 * @param {object} planoOriginal - O plano a ser recalculado.
 * @param {Date} novaDataFim - A nova data de término.
 * @returns {object} Um novo objeto de plano recalculado.
 */
export function recalcularPlanoComNovaData(planoOriginal, novaDataFim) {
    if (!planoOriginal || !(novaDataFim instanceof Date) || isNaN(novaDataFim)) {
        throw new Error("Dados inválidos para o recálculo do plano.");
    }
    const hoje = getHojeNormalizado();
    if (novaDataFim <= hoje) {
        throw new Error("A nova data de fim deve ser posterior à data de hoje.");
    }
    
    const planoRecalculado = JSON.parse(JSON.stringify(planoOriginal));
    const paginasLidas = planoRecalculado.diasPlano.filter(d => d.lido).reduce((sum, d) => sum + d.paginas, 0);
    const paginaInicioRecalculo = planoRecalculado.paginaInicio + paginasLidas;
    
    let dataInicioRecalculo = hoje;
    const diasSemanaPlano = planoRecalculado.diasSemana || [];
    const periodicidadePlano = planoRecalculado.periodicidade || 'diario';
    
    const isDiaValido = (data) => {
        const diaSem = data.getDay();
        return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
    };

    while (!isDiaValido(dataInicioRecalculo)) {
        dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);
    }
    
    const novosDiasGerados = gerarDiasPlanoPorDatas(dataInicioRecalculo, novaDataFim, periodicidadePlano, diasSemanaPlano);
    if (novosDiasGerados.length === 0) {
        throw new Error("Não há dias de leitura válidos no novo período.");
    }

    const diasLidosPreservados = planoRecalculado.diasPlano.filter(dia => dia.lido);
    
    const planoParaDistribuicao = {
        paginaInicio: paginaInicioRecalculo,
        paginaFim: planoRecalculado.paginaFim,
        diasPlano: novosDiasGerados,
    };
    distribuirPaginasPlano(planoParaDistribuicao);

    planoRecalculado.diasPlano = [...diasLidosPreservados, ...novosDiasGerados].sort((a,b) => new Date(a.data) - new Date(b.data));
    planoRecalculado.dataFim = novaDataFim;
    atualizarPaginasLidas(planoRecalculado);
    
    return planoRecalculado;
}

function gerarDiasDoPlano(formData) {
    if (formData.definicaoPeriodo === 'datas') {
        return gerarDiasPlanoPorDatas(formData.dataInicio, formData.dataFim, formData.periodicidade, formData.diasSemana);
    } else if (formData.definicaoPeriodo === 'dias') {
        return gerarDiasPlanoPorDias(formData.dataInicio, formData.numeroDias, formData.periodicidade, formData.diasSemana);
    } else { // 'paginas'
        return gerarDiasPlanoPorPaginas(formData.dataInicio, formData.paginasPorDia, formData.paginaInicio, formData.paginaFim, formData.periodicidade, formData.diasSemana);
    }
}

export function construirObjetoPlano(formData, planoEditado) {
    const diasPlano = gerarDiasDoPlano(formData);
    if (!diasPlano || diasPlano.length === 0) {
        throw new Error("Não foi possível gerar dias de leitura com as configurações fornecidas.");
    }

    const id = planoEditado ? planoEditado.id : crypto.randomUUID();
    const dataFim = formData.definicaoPeriodo === 'datas' ? formData.dataFim : (diasPlano[diasPlano.length - 1]?.data || new Date());

    return {
        id: id,
        titulo: formData.titulo,
        linkDrive: formData.linkDrive,
        paginaInicio: formData.paginaInicio,
        paginaFim: formData.paginaFim,
        dataInicio: formData.dataInicio,
        dataFim: dataFim,
        periodicidade: formData.periodicidade,
        diasSemana: formData.diasSemana,
        diasPlano: diasPlano,
        paginasLidas: 0,
        totalPaginas: formData.paginaFim - formData.paginaInicio + 1,
        isPaused: planoEditado ? planoEditado.isPaused : false,
        dataPausa: planoEditado ? planoEditado.dataPausa : null,
    };
}
