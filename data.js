// ============================================
// SPLENDOR - Dane gry (karty, szlachcice)
// ============================================

const GEM_COLORS = ['white', 'blue', 'green', 'red', 'black'];
const ALL_COLORS = [...GEM_COLORS, 'gold'];

const GEM_SYMBOLS = {
    white: '💎',
    blue: '🔷',
    green: '🟢',
    red: '🔴',
    black: '⬛',
    gold: '⭐'
};

const GEM_NAMES = {
    white: 'Diament',
    blue: 'Szafir',
    green: 'Szmaragd',
    red: 'Rubin',
    black: 'Onyks',
    gold: 'Złoto'
};

// Tier 1 cards (40 cards)
const TIER1_CARDS = [
    // White bonus (8)
    { gem: 'white', points: 0, cost: { blue: 1, green: 1, red: 1, black: 1 } },
    { gem: 'white', points: 0, cost: { blue: 1, green: 2, red: 1, black: 1 } },
    { gem: 'white', points: 0, cost: { blue: 2, green: 2, black: 1 } },
    { gem: 'white', points: 0, cost: { green: 3 } },
    { gem: 'white', points: 0, cost: { blue: 1, black: 2 } },
    { gem: 'white', points: 0, cost: { red: 2, black: 1 } },
    { gem: 'white', points: 0, cost: { blue: 2, green: 2, red: 1 } },
    { gem: 'white', points: 1, cost: { green: 4 } },

    // Blue bonus (8)
    { gem: 'blue', points: 0, cost: { white: 1, green: 1, red: 1, black: 1 } },
    { gem: 'blue', points: 0, cost: { white: 1, green: 1, red: 2, black: 1 } },
    { gem: 'blue', points: 0, cost: { white: 1, green: 2, red: 2 } },
    { gem: 'blue', points: 0, cost: { black: 3 } },
    { gem: 'blue', points: 0, cost: { white: 1, black: 2 } },
    { gem: 'blue', points: 0, cost: { green: 2, black: 2 } },
    { gem: 'blue', points: 0, cost: { white: 1, green: 1, red: 1, black: 2 } },
    { gem: 'blue', points: 1, cost: { red: 4 } },

    // Green bonus (8)
    { gem: 'green', points: 0, cost: { white: 1, blue: 1, red: 1, black: 1 } },
    { gem: 'green', points: 0, cost: { white: 1, blue: 1, red: 1, black: 2 } },
    { gem: 'green', points: 0, cost: { blue: 2, red: 2 } },
    { gem: 'green', points: 0, cost: { red: 3 } },
    { gem: 'green', points: 0, cost: { white: 2, blue: 1 } },
    { gem: 'green', points: 0, cost: { blue: 1, red: 2, black: 2 } },
    { gem: 'green', points: 0, cost: { white: 1, blue: 1, red: 2, black: 1 } },
    { gem: 'green', points: 1, cost: { black: 4 } },

    // Red bonus (8)
    { gem: 'red', points: 0, cost: { white: 1, blue: 1, green: 1, black: 1 } },
    { gem: 'red', points: 0, cost: { white: 2, blue: 1, green: 1, black: 1 } },
    { gem: 'red', points: 0, cost: { white: 2, green: 1, black: 2 } },
    { gem: 'red', points: 0, cost: { white: 3 } },
    { gem: 'red', points: 0, cost: { blue: 2, green: 1 } },
    { gem: 'red', points: 0, cost: { white: 2, red: 2 } },
    { gem: 'red', points: 0, cost: { white: 1, blue: 2, green: 1, black: 1 } },
    { gem: 'red', points: 1, cost: { white: 4 } },

    // Black bonus (8)
    { gem: 'black', points: 0, cost: { white: 1, blue: 1, green: 1, red: 1 } },
    { gem: 'black', points: 0, cost: { white: 1, blue: 2, green: 1, red: 1 } },
    { gem: 'black', points: 0, cost: { green: 2, red: 2 } },
    { gem: 'black', points: 0, cost: { blue: 3 } },
    { gem: 'black', points: 0, cost: { green: 2, red: 1 } },
    { gem: 'black', points: 0, cost: { white: 2, blue: 2 } },
    { gem: 'black', points: 0, cost: { white: 2, blue: 1, green: 1, red: 1 } },
    { gem: 'black', points: 1, cost: { blue: 4 } },
];

// Tier 2 cards (30 cards)
const TIER2_CARDS = [
    // White bonus (6)
    { gem: 'white', points: 1, cost: { green: 3, red: 2, black: 2 } },
    { gem: 'white', points: 1, cost: { white: 2, blue: 3, red: 3 } },
    { gem: 'white', points: 2, cost: { green: 1, red: 4, black: 2 } },
    { gem: 'white', points: 2, cost: { red: 5 } },
    { gem: 'white', points: 2, cost: { red: 5, black: 3 } },
    { gem: 'white', points: 3, cost: { white: 6 } },

    // Blue bonus (6)
    { gem: 'blue', points: 1, cost: { blue: 2, green: 2, red: 3 } },
    { gem: 'blue', points: 1, cost: { blue: 2, green: 3, black: 3 } },
    { gem: 'blue', points: 2, cost: { white: 5 } },
    { gem: 'blue', points: 2, cost: { white: 2, red: 1, black: 4 } },
    { gem: 'blue', points: 2, cost: { blue: 5, green: 3 } },
    { gem: 'blue', points: 3, cost: { blue: 6 } },

    // Green bonus (6)
    { gem: 'green', points: 1, cost: { white: 3, green: 2, red: 3 } },
    { gem: 'green', points: 1, cost: { white: 2, blue: 3, black: 2 } },
    { gem: 'green', points: 2, cost: { green: 5 } },
    { gem: 'green', points: 2, cost: { white: 4, blue: 2, black: 1 } },
    { gem: 'green', points: 2, cost: { blue: 5, green: 3 } },
    { gem: 'green', points: 3, cost: { green: 6 } },

    // Red bonus (6)
    { gem: 'red', points: 1, cost: { white: 2, red: 2, black: 3 } },
    { gem: 'red', points: 1, cost: { blue: 3, black: 3 } },
    { gem: 'red', points: 2, cost: { black: 5 } },
    { gem: 'red', points: 2, cost: { white: 1, blue: 4, green: 2 } },
    { gem: 'red', points: 2, cost: { white: 3, black: 5 } },
    { gem: 'red', points: 3, cost: { red: 6 } },

    // Black bonus (6)
    { gem: 'black', points: 1, cost: { white: 3, blue: 2, green: 2 } },
    { gem: 'black', points: 1, cost: { white: 3, green: 3, black: 2 } },
    { gem: 'black', points: 2, cost: { blue: 1, green: 4, red: 2 } },
    { gem: 'black', points: 2, cost: { green: 5 } },
    { gem: 'black', points: 2, cost: { white: 5, green: 3 } },
    { gem: 'black', points: 3, cost: { black: 6 } },
];

// Tier 3 cards (20 cards)
const TIER3_CARDS = [
    // White bonus (4)
    { gem: 'white', points: 3, cost: { blue: 3, green: 3, red: 5, black: 3 } },
    { gem: 'white', points: 4, cost: { white: 3, red: 3, black: 6 } },
    { gem: 'white', points: 4, cost: { black: 7 } },
    { gem: 'white', points: 5, cost: { white: 3, black: 7 } },

    // Blue bonus (4)
    { gem: 'blue', points: 3, cost: { white: 3, green: 3, red: 3, black: 5 } },
    { gem: 'blue', points: 4, cost: { white: 6, blue: 3, black: 3 } },
    { gem: 'blue', points: 4, cost: { white: 7 } },
    { gem: 'blue', points: 5, cost: { white: 7, blue: 3 } },

    // Green bonus (4)
    { gem: 'green', points: 3, cost: { white: 5, blue: 3, red: 3, black: 3 } },
    { gem: 'green', points: 4, cost: { white: 3, blue: 6, green: 3 } },
    { gem: 'green', points: 4, cost: { blue: 7 } },
    { gem: 'green', points: 5, cost: { blue: 7, green: 3 } },

    // Red bonus (4)
    { gem: 'red', points: 3, cost: { white: 3, blue: 5, green: 3, black: 3 } },
    { gem: 'red', points: 4, cost: { blue: 3, green: 6, red: 3 } },
    { gem: 'red', points: 4, cost: { green: 7 } },
    { gem: 'red', points: 5, cost: { green: 7, red: 3 } },

    // Black bonus (4)
    { gem: 'black', points: 3, cost: { white: 3, blue: 3, green: 5, red: 3 } },
    { gem: 'black', points: 4, cost: { green: 3, red: 6, black: 3 } },
    { gem: 'black', points: 4, cost: { red: 7 } },
    { gem: 'black', points: 5, cost: { red: 7, black: 3 } },
];

// Nobles (10 tiles)
const NOBLES = [
    { points: 3, requirements: { white: 3, blue: 3, black: 3 } },
    { points: 3, requirements: { white: 3, green: 3, red: 3 } },
    { points: 3, requirements: { blue: 3, green: 3, red: 3 } },
    { points: 3, requirements: { white: 3, red: 3, black: 3 } },
    { points: 3, requirements: { blue: 3, green: 3, black: 3 } },
    { points: 3, requirements: { white: 4, red: 4 } },
    { points: 3, requirements: { blue: 4, green: 4 } },
    { points: 3, requirements: { green: 4, red: 4 } },
    { points: 3, requirements: { white: 4, black: 4 } },
    { points: 3, requirements: { blue: 4, black: 4 } },
];
