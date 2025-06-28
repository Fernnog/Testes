/**
 * @file chapter-helpers.js
 * @description Módulo de utilitários com funções puras para gerar, analisar,
 * distribuir e manipular listas de capítulos da Bíblia.
 */

// Importa os dados da Bíblia, que são a dependência principal deste módulo.
import { BIBLE_BOOKS_CHAPTERS, CANONICAL_BOOK_ORDER, BOOK_NAME_MAP } from '../config/bible-data.js';

/**
 * Gera uma lista ordenada de capítulos dentro de um intervalo contínuo.
 * @param {string} startBook - O nome do livro inicial.
 * @param {number} startChap - O número do capítulo inicial.
 * @param {string} endBook - O nome do livro final.
 * @param {number} endChap - O número do capítulo final.
 * @returns {Array<string>} Uma lista de capítulos (ex: ["Gênesis 1", "Gênesis 2"]).
 * @throws {Error} Lança um erro se os parâmetros de entrada forem inválidos.
 */
export function generateChaptersInRange(startBook, startChap, endBook, endChap) {
    const chapters = [];
    const startIndex = CANONICAL_BOOK_ORDER.indexOf(startBook);
    const endIndex = CANONICAL_BOOK_ORDER.indexOf(endBook);

    // Validações de entrada
    if (startIndex === -1 || endIndex === -1) throw new Error("Livro inicial ou final inválido.");
    if (startIndex > endIndex) throw new Error("O livro inicial deve vir antes do livro final.");
    if (isNaN(startChap) || startChap < 1 || startChap > BIBLE_BOOKS_CHAPTERS[startBook]) throw new Error(`Capítulo inicial inválido para ${startBook}.`);
    if (isNaN(endChap) || endChap < 1 || endChap > BIBLE_BOOKS_CHAPTERS[endBook]) throw new Error(`Capítulo final inválido para ${endBook}.`);
    if (startIndex === endIndex && startChap > endChap) throw new Error("Capítulo inicial maior que o final no mesmo livro.");

    for (let i = startIndex; i <= endIndex; i++) {
        const currentBook = CANONICAL_BOOK_ORDER[i];
        const totalChapters = BIBLE_BOOKS_CHAPTERS[currentBook];
        const chapStart = (i === startIndex) ? startChap : 1;
        const chapEnd = (i === endIndex) ? endChap : totalChapters;

        for (let j = chapStart; j <= chapEnd; j++) {
            chapters.push(`${currentBook} ${j}`);
        }
    }
    return chapters;
}

/**
 * Analisa uma string de entrada do usuário e a converte em uma lista ordenada de capítulos.
 * Suporta formatos como: "Gênesis 1-3, Êxodo 5, Salmos 119", "1 Coríntios".
 * @param {string} inputString - A string de entrada.
 * @returns {Array<string>} Uma lista única e ordenada de capítulos.
 */
export function parseChaptersInput(inputString) {
    const chapters = new Set();
    const parts = inputString.split(',').map(p => p.trim()).filter(Boolean);
    
    const bookPartRegex = `(?:\\d+\\s*)?[a-zA-ZÀ-úçõãíáéóú]+(?:\\s+[a-zA-ZÀ-úçõãíáéóú]+)*`;
    const chapterRegex = new RegExp(`^\\s*(${bookPartRegex})\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i');

    parts.forEach(part => {
        const match = part.match(chapterRegex);
        if (!match) {
            console.warn(`Não foi possível analisar a parte da entrada: "${part}"`);
            return;
        }

        const inputBookNameRaw = match[1].trim();
        const bookName = BOOK_NAME_MAP.get(inputBookNameRaw.toLowerCase().replace(/\s+/g, '')) || BOOK_NAME_MAP.get(inputBookNameRaw.toLowerCase());
        
        if (!bookName) {
            console.warn(`Nome de livro não reconhecido: "${inputBookNameRaw}"`);
            return;
        }

        const startChapter = match[2] ? parseInt(match[2], 10) : null;
        const endChapter = match[3] ? parseInt(match[3], 10) : null;
        const maxChapters = BIBLE_BOOKS_CHAPTERS[bookName];

        if (startChapter === null && endChapter === null) { // Livro inteiro
            for (let i = 1; i <= maxChapters; i++) chapters.add(`${bookName} ${i}`);
        } else if (startChapter !== null && endChapter === null) { // Capítulo único
            if (startChapter >= 1 && startChapter <= maxChapters) chapters.add(`${bookName} ${startChapter}`);
        } else if (startChapter !== null && endChapter !== null) { // Intervalo de capítulos
            if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) {
                for (let i = startChapter; i <= endChapter; i++) chapters.add(`${bookName} ${i}`);
            }
        }
    });
    
    // Converte o Set para Array e ordena canonicamente
    return sortChaptersCanonically(Array.from(chapters));
}

/**
 * Gera uma lista de todos os capítulos para uma lista de nomes de livros.
 * @param {Array<string>} bookList - Uma lista de nomes de livros (ex: ["Gênesis", "Êxodo"]).
 * @returns {Array<string>} Uma lista ordenada de todos os capítulos dos livros fornecidos.
 */
export function generateChaptersForBookList(bookList) {
    const chapters = [];
    if (!Array.isArray(bookList)) return chapters;

    bookList.forEach(bookName => {
        if (BIBLE_BOOKS_CHAPTERS.hasOwnProperty(bookName)) {
            const totalChaptersInBook = BIBLE_BOOKS_CHAPTERS[bookName];
            for (let i = 1; i <= totalChaptersInBook; i++) {
                chapters.push(`${bookName} ${i}`);
            }
        }
    });
    return sortChaptersCanonically(chapters);
}

/**
 * Distribui uma lista de capítulos de forma uniforme por um número de dias de leitura.
 * @param {Array<string>} chaptersToRead - A lista de capítulos a ser distribuída.
 * @param {number} totalReadingDays - O número de dias para distribuir os capítulos.
 * @returns {Object<string, Array<string>>} Um mapa onde a chave é o número do dia (como string) e o valor é um array de capítulos.
 */
export function distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays) {
    const planMap = {};
    const totalChapters = chaptersToRead?.length || 0;

    if (totalChapters === 0 || isNaN(totalReadingDays) || totalReadingDays <= 0) {
        return {};
    }

    const baseChaptersPerDay = Math.floor(totalChapters / totalReadingDays);
    let extraChapters = totalChapters % totalReadingDays;
    let chapterIndex = 0;

    for (let dayNumber = 1; dayNumber <= totalReadingDays; dayNumber++) {
        const chaptersForThisDayCount = baseChaptersPerDay + (extraChapters > 0 ? 1 : 0);
        const endSliceIndex = Math.min(chapterIndex + chaptersForThisDayCount, totalChapters);
        planMap[dayNumber.toString()] = chaptersToRead.slice(chapterIndex, endSliceIndex);
        chapterIndex = endSliceIndex;
        if (extraChapters > 0) {
            extraChapters--;
        }
    }
    return planMap;
}

/**
 * Lógica de intercalação customizada para o plano "A Promessa Revelada".
 * @param {object} bookBlocks - Objeto com `profetasMaiores` e `novoTestamento`.
 * @param {number} [chaptersPerBlockAT=15] - Número de capítulos do AT a serem lidos em bloco.
 * @returns {Array<string>} A lista de capítulos intercalada.
 */
export function generateIntercalatedChapters(bookBlocks, chaptersPerBlockAT = 15) {
    const finalList = [];
    const ntBooks = [...bookBlocks.novoTestamento];
    
    // Gera listas completas de capítulos para cada bloco
    const allNTChapters = generateChaptersForBookList(ntBooks);
    const allATChapters = generateChaptersForBookList(bookBlocks.profetasMaiores);

    let ntIndex = 0;
    let atIndex = 0;

    // Começa com o primeiro livro do NT (Mateus)
    const firstNTBook = ntBooks[0];
    const firstNTBookChapters = BIBLE_BOOKS_CHAPTERS[firstNTBook];
    for (let i = 0; i < firstNTBookChapters; i++) {
        finalList.push(allNTChapters[ntIndex++]);
    }

    // Loop principal de intercalação
    while (ntIndex < allNTChapters.length || atIndex < allATChapters.length) {
        // Adiciona um bloco do AT
        const atBlockEnd = Math.min(atIndex + chaptersPerBlockAT, allATChapters.length);
        for (let i = atIndex; i < atBlockEnd; i++) {
            finalList.push(allATChapters[i]);
        }
        atIndex = atBlockEnd;

        // Adiciona o próximo livro completo do NT
        if (ntIndex < allNTChapters.length) {
            const currentBookName = allNTChapters[ntIndex].split(' ').slice(0, -1).join(' ');
            while (ntIndex < allNTChapters.length) {
                const nextChapter = allNTChapters[ntIndex];
                const nextBookName = nextChapter.split(' ').slice(0, -1).join(' ');
                finalList.push(nextChapter);
                ntIndex++;
                if (nextBookName !== currentBookName) {
                    break; // Terminou de adicionar o livro, sai do loop interno
                }
            }
        }
    }
    return finalList;
}

/**
 * Ordena um array de capítulos (ex: ["João 3", "Gênesis 1"]) na ordem canônica da Bíblia.
 * @param {Array<string>} chaptersArray - O array de capítulos a ser ordenado.
 * @returns {Array<string>} O array de capítulos ordenado.
 */
export function sortChaptersCanonically(chaptersArray) {
    return chaptersArray.sort((a, b) => {
        const matchA = a.match(/^(.*)\s+(\d+)$/);
        const matchB = b.match(/^(.*)\s+(\d+)$/);
        if (!matchA || !matchB) return 0; // Não deve acontecer com dados válidos

        const bookA = matchA[1];
        const chapA = parseInt(matchA[2], 10);
        const bookB = matchB[1];
        const chapB = parseInt(matchB[2], 10);

        const indexA = CANONICAL_BOOK_ORDER.indexOf(bookA);
        const indexB = CANONICAL_BOOK_ORDER.indexOf(bookB);

        if (indexA !== indexB) {
            return indexA - indexB; // Ordena pelo índice do livro
        }
        return chapA - chapB; // Se os livros são os mesmos, ordena pelo capítulo
    });
}