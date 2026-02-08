// ============================================
// SPLENDOR - Sztuczna inteligencja (AI)
// ============================================

class SplendorAI {
    constructor(game, playerIndex) {
        this.game = game;
        this.playerIndex = playerIndex;
    }

    // Główna metoda - wybiera najlepszą akcję
    chooseAction() {
        const player = this.game.players[this.playerIndex];
        
        // Priorytet 1: Kup kartę dającą punkty, którą stać
        const winningMove = this.findWinningCard(player);
        if (winningMove) {
            return winningMove;
        }

        // Priorytet 2: Kup kartę z planszy (najlepsza wartość)
        const bestBuyFromBoard = this.findBestCardToBuy(player, false);
        if (bestBuyFromBoard && bestBuyFromBoard.score > 0) {
            return { action: 'buy', card: bestBuyFromBoard.card, fromReserved: false };
        }

        // Priorytet 3: Kup zarezerwowaną kartę
        const bestBuyFromReserved = this.findBestCardToBuy(player, true);
        if (bestBuyFromReserved && bestBuyFromReserved.score > 0) {
            return { action: 'buy', card: bestBuyFromReserved.card, fromReserved: true };
        }

        // Priorytet 4: Zarezerwuj wartościową kartę, której prawie stać
        const reserveMove = this.considerReserve(player);
        if (reserveMove) {
            return reserveMove;
        }

        // Priorytet 5: Weź żetony (najlepszy wybór)
        const tokenMove = this.chooseBestTokens(player);
        if (tokenMove) {
            return tokenMove;
        }

        // Fallback: Zarezerwuj najlepszą kartę jeśli można
        if (this.game.canReserve(player)) {
            const cardToReserve = this.findBestCardToReserve(player);
            if (cardToReserve) {
                return { action: 'reserve', card: cardToReserve, fromDeck: false };
            }
        }

        // Ostateczność: Weź jakiekolwiek żetony
        return this.takeAnyTokens();
    }

    // Znajdź kartę, która da wygraną (15+ punktów)
    findWinningCard(player) {
        const currentPoints = player.points;
        const allCards = this.getAllAffordableCards(player);
        
        for (const { card, fromReserved } of allCards) {
            if (currentPoints + card.points >= 15) {
                return { action: 'buy', card, fromReserved };
            }
        }
        return null;
    }

    // Wszystkie karty, które gracza stać
    getAllAffordableCards(player) {
        const affordable = [];
        
        // Z planszy
        for (let tier = 1; tier <= 3; tier++) {
            for (const card of this.game.board[tier]) {
                if (this.game.canAfford(player, card)) {
                    affordable.push({ card, fromReserved: false });
                }
            }
        }
        
        // Z zarezerwowanych
        for (const card of player.reserved) {
            if (this.game.canAfford(player, card)) {
                affordable.push({ card, fromReserved: true });
            }
        }
        
        return affordable;
    }

    // Znajdź najlepszą kartę do kupienia
    findBestCardToBuy(player, fromReserved) {
        const cards = fromReserved ? player.reserved : this.getBoardCards();
        let bestCard = null;
        let bestScore = -Infinity;

        for (const card of cards) {
            if (!this.game.canAfford(player, card)) continue;

            const score = this.evaluateCard(player, card);
            if (score > bestScore) {
                bestScore = score;
                bestCard = card;
            }
        }

        return bestCard ? { card: bestCard, score: bestScore } : null;
    }

    // Pobierz wszystkie karty z planszy
    getBoardCards() {
        const cards = [];
        for (let tier = 1; tier <= 3; tier++) {
            cards.push(...this.game.board[tier]);
        }
        return cards;
    }

    // Oceń wartość karty
    evaluateCard(player, card) {
        let score = 0;

        // Punkty prestiżu są bardzo ważne
        score += card.points * 15;

        // Bonus, który przybliża do szlachcica
        const nobleProgress = this.evaluateNobleProgress(player, card.gem);
        score += nobleProgress * 8;

        // Bonus przydatny do innych kart na planszy
        const futureValue = this.evaluateFutureValue(player, card.gem);
        score += futureValue * 3;

        // Preferuj tańsze karty (efektywność)
        const totalCost = Object.values(card.cost).reduce((a, b) => a + b, 0);
        score -= totalCost * 0.5;

        // Bonus za karty dające punkty
        if (card.points > 0) {
            score += 10;
        }

        return score;
    }

    // Sprawdź jak bardzo bonus przybliża do szlachcica
    evaluateNobleProgress(player, gemColor) {
        let maxProgress = 0;

        for (const noble of this.game.nobles) {
            const required = noble.requirements[gemColor] || 0;
            if (required === 0) continue;

            const current = player.bonuses[gemColor] || 0;
            if (current < required) {
                // Ten bonus przybliża nas do szlachcica
                const progress = 1 / (required - current);
                maxProgress = Math.max(maxProgress, progress);
            }
        }

        return maxProgress;
    }

    // Oceń przyszłą wartość bonusu
    evaluateFutureValue(player, gemColor) {
        let value = 0;
        const cards = this.getBoardCards();

        for (const card of cards) {
            const costOfColor = card.cost[gemColor] || 0;
            if (costOfColor > 0) {
                // Ten bonus pomoże kupić inne karty
                value += costOfColor * (card.points + 1);
            }
        }

        return value / 10;
    }

    // Rozważ rezerwację karty
    considerReserve(player) {
        if (!this.game.canReserve(player)) return null;
        if (player.tokens.gold >= 3) return null; // Mamy dużo złota, nie rezerwujmy

        // Szukaj karty, której prawie stać (brakuje 1-2 żetonów)
        const cards = this.getBoardCards();
        let bestCard = null;
        let bestScore = -Infinity;

        for (const card of cards) {
            if (this.game.canAfford(player, card)) continue; // Już stać, nie rezerwuj

            const cost = this.game.getEffectiveCost(player, card);
            const goldNeeded = cost.gold;
            
            // Ile żetonów brakuje (bez złota)
            let tokensNeeded = 0;
            GEM_COLORS.forEach(color => {
                const remaining = (card.cost[color] || 0) - (player.bonuses[color] || 0);
                const fromTokens = player.tokens[color] || 0;
                if (remaining > fromTokens) {
                    tokensNeeded += remaining - fromTokens;
                }
            });

            // Jeśli brakuje mało i karta jest wartościowa
            if (tokensNeeded <= 3 && card.points >= 2) {
                const score = this.evaluateCard(player, card) + (5 - tokensNeeded) * 5;
                if (score > bestScore) {
                    bestScore = score;
                    bestCard = card;
                }
            }
        }

        // Rezerwuj tylko jeśli karta jest naprawdę warta
        if (bestCard && bestScore > 20) {
            return { action: 'reserve', card: bestCard, fromDeck: false };
        }

        return null;
    }

    // Znajdź najlepszą kartę do rezerwacji (fallback)
    findBestCardToReserve(player) {
        const cards = this.getBoardCards();
        let bestCard = null;
        let bestScore = -Infinity;

        for (const card of cards) {
            const score = this.evaluateCard(player, card);
            if (score > bestScore) {
                bestScore = score;
                bestCard = card;
            }
        }

        return bestCard;
    }

    // Wybierz najlepsze żetony do wzięcia
    chooseBestTokens(player) {
        const availableColors = GEM_COLORS.filter(c => this.game.bank[c] > 0);
        if (availableColors.length === 0) return null;

        // Oceń które kolory są najbardziej potrzebne
        const colorScores = {};
        GEM_COLORS.forEach(c => {
            colorScores[c] = this.evaluateColorNeed(player, c);
        });

        // Sortuj kolory według potrzeby
        const sortedColors = availableColors
            .filter(c => this.game.bank[c] > 0)
            .sort((a, b) => colorScores[b] - colorScores[a]);

        // Opcja 1: Weź 2 tego samego koloru (jeśli bank >= 4)
        for (const color of sortedColors) {
            if (this.game.bank[color] >= 4 && colorScores[color] > 5) {
                const tokens = [color, color];
                if (this.game.canTakeTokens(tokens)) {
                    return { action: 'tokens', colors: tokens };
                }
            }
        }

        // Opcja 2: Weź 3 różne kolory
        const topThree = sortedColors.slice(0, 3);
        if (topThree.length >= 1 && this.game.canTakeTokens(topThree)) {
            return { action: 'tokens', colors: topThree };
        }

        // Opcja 3: Weź 2 różne kolory
        if (topThree.length >= 2) {
            const tokens = topThree.slice(0, 2);
            if (this.game.canTakeTokens(tokens)) {
                return { action: 'tokens', colors: tokens };
            }
        }

        // Opcja 4: Weź 1 kolor
        if (topThree.length >= 1) {
            const tokens = [topThree[0]];
            if (this.game.canTakeTokens(tokens)) {
                return { action: 'tokens', colors: tokens };
            }
        }

        return null;
    }

    // Oceń jak bardzo potrzebny jest dany kolor
    evaluateColorNeed(player, color) {
        let need = 0;
        const cards = [...this.getBoardCards(), ...player.reserved];

        for (const card of cards) {
            const costOfColor = card.cost[color] || 0;
            if (costOfColor === 0) continue;

            const bonus = player.bonuses[color] || 0;
            const tokens = player.tokens[color] || 0;
            const deficit = costOfColor - bonus - tokens;

            if (deficit > 0) {
                // Ważone przez wartość karty
                need += deficit * (card.points + 2);
            }
        }

        // Dodatkowa waga dla szlachciców
        for (const noble of this.game.nobles) {
            const required = noble.requirements[color] || 0;
            if (required > 0) {
                const current = player.bonuses[color] || 0;
                if (current < required) {
                    need += (required - current) * 3;
                }
            }
        }

        return need;
    }

    // Weź jakiekolwiek dostępne żetony
    takeAnyTokens() {
        const available = GEM_COLORS.filter(c => this.game.bank[c] > 0);
        
        if (available.length >= 3) {
            return { action: 'tokens', colors: available.slice(0, 3) };
        }
        if (available.length >= 2) {
            return { action: 'tokens', colors: available.slice(0, 2) };
        }
        if (available.length >= 1) {
            return { action: 'tokens', colors: [available[0]] };
        }

        // Brak żetonów - zarezerwuj kartę z talii
        for (let tier = 3; tier >= 1; tier--) {
            if (this.game.decks[tier].length > 0 && this.game.canReserve(this.game.players[this.playerIndex])) {
                return { action: 'reserveDeck', tier };
            }
        }

        return null;
    }

    // Wybierz żetony do zwrotu (gdy masz > 10)
    chooseTokensToReturn(excess) {
        const player = this.game.players[this.playerIndex];
        const toReturn = {};
        let remaining = excess;

        // Zwróć żetony, które są najmniej potrzebne
        const colorScores = {};
        ALL_COLORS.forEach(c => {
            if (c === 'gold') {
                colorScores[c] = 100; // Złoto zawsze trzymaj
            } else {
                colorScores[c] = this.evaluateColorNeed(player, c);
            }
        });

        const sortedColors = ALL_COLORS
            .filter(c => player.tokens[c] > 0)
            .sort((a, b) => colorScores[a] - colorScores[b]);

        for (const color of sortedColors) {
            if (remaining <= 0) break;
            
            const available = player.tokens[color] - (toReturn[color] || 0);
            const toReturnCount = Math.min(available, remaining);
            
            if (toReturnCount > 0) {
                toReturn[color] = toReturnCount;
                remaining -= toReturnCount;
            }
        }

        return toReturn;
    }
}
