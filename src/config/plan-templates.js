/**
 * @file plan-templates.js
 * @description Contém as configurações para os modelos de planos de leitura predefinidos,
 * como os "Planos Favoritos Anuais". Isso isola a configuração da lógica de criação de planos.
 * Qualquer ajuste nos planos predefinidos deve ser feito aqui.
 */

/**
 * Configuração para o conjunto de planos de leitura anuais favoritos.
 * Cada objeto no array define um plano com suas propriedades específicas,
 * como nome, lista de livros, dias de leitura e ritmo.
 * @type {Array<object>}
 */
export const FAVORITE_ANNUAL_PLAN_CONFIG = [
    {
        name: "A Jornada dos Patriarcas",
        books: [
            "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", 
            "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel", 
            "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", 
            "Neemias", "Ester"
        ],
        allowedDays: [1, 4, 6], // Seg, Qui, Sáb
        chaptersPerReadingDay: 3
    },
    {
        name: "A Sinfonia Celestial",
        books: [
            // Livros de Sabedoria
            "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cantares",
            // Profetas Menores
            "Oséias", "Joel", "Amós", "Obadias", "Jonas", "Miquéias",
            "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias"
        ],
        allowedDays: [3, 0], // Qua, Dom
        chaptersPerReadingDay: 3
    },
    {
        name: "A Promessa Revelada",
        // Este plano usa uma estrutura especial 'bookBlocks' para a lógica de intercalação.
        // A lista de capítulos será gerada de forma customizada, não a partir de uma lista 'books' simples.
        bookBlocks: {
            profetasMaiores: [
                "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel"
            ],
            novoTestamento: [
                "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos",
                "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses",
                "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses",
                "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago",
                "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"
            ]
        },
        allowedDays: [2, 5, 0], // Ter, Sex, Dom
        chaptersPerReadingDay: 3,
        intercalate: true // Sinalizador especial para a lógica de criação saber que deve intercalar os blocos.
    }
];