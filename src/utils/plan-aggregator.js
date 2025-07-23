/**
 * @file plan-aggregator.js
 * @description Módulo utilitário para agregar e processar dados de múltiplos planos de leitura.
 * Centraliza lógicas de negócio complexas que operam sobre o conjunto completo de planos do usuário.
 */

/**
 * Agrega os dados de todos os planos de um usuário para fornecer uma visão consolidada.
 *
 * @param {Array<object>} userPlans - A lista completa de planos de leitura do usuário.
 * @returns {{booksInPlans: Map<string, {icons: string[], names: string[]}>, allChaptersInPlans: Set<string>}}
 *          Um objeto contendo:
 *          - booksInPlans: Um Map onde a chave é o nome de um livro e o valor é um objeto
 *                          com um array de ícones e um array de nomes dos planos que o contêm.
 *          - allChaptersInPlans: Um Set com todas as strings de capítulo de todos os planos.
 */
export function aggregateAllPlansScope(userPlans) {
    // Mapa: "Gênesis" -> { icons: ["📖", "🔥"], names: ["Jornada", "Anual"] }
    const booksInPlans = new Map();
    // Set: { "Gênesis 1", "Gênesis 2", "Êxodo 1", ... }
    const allChaptersInPlans = new Set();

    if (!userPlans || userPlans.length === 0) {
        return { booksInPlans, allChaptersInPlans };
    }

    userPlans.forEach(plan => {
        // Pula planos que são inválidos ou não contêm uma lista de capítulos.
        if (!plan.chaptersList || plan.chaptersList.length === 0) {
            return;
        }

        // 1. Agrega todos os capítulos de todos os planos em um único Set para consulta rápida.
        plan.chaptersList.forEach(chapter => allChaptersInPlans.add(chapter));

        // 2. Cria um Set de livros apenas para o plano atual para evitar processamento duplicado dentro do mesmo plano.
        const booksInCurrentPlan = new Set();
        plan.chaptersList.forEach(chapterString => {
            // Usa uma expressão regular para extrair o nome do livro de uma string como "1 Coríntios 13"
            const bookNameMatch = chapterString.match(/^(.*)\s+\d+$/);
            if (bookNameMatch && bookNameMatch[1]) {
                booksInCurrentPlan.add(bookNameMatch[1].trim());
            }
        });

        // 3. Itera sobre os livros únicos do plano atual e atualiza o mapa agregado.
        booksInCurrentPlan.forEach(bookName => {
            // Se o livro ainda não está no mapa, inicializa sua estrutura.
            if (!booksInPlans.has(bookName)) {
                booksInPlans.set(bookName, { icons: [], names: [] });
            }
            // Adiciona o ícone e o nome do plano atual ao livro correspondente no mapa.
            const bookData = booksInPlans.get(bookName);
            bookData.icons.push(plan.icon || '📖');
            bookData.names.push(plan.name || 'Plano sem nome');
        });
    });

    return { booksInPlans, allChaptersInPlans };
}
