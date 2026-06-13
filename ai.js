// ============================================
// SPLENDOR - Sztuczna inteligencja (AI)
// ============================================

class SplendorAI {
    constructor(game, playerIndex, difficulty = 'medium') {
        this.game = game;
        this.playerIndex = playerIndex;
        this.difficulty = difficulty;
        
        // Wagi zależne od trudności
        this.weights = this.getWeightsForDifficulty(difficulty);
    }

    // Wagi dla różnych poziomów trudności
    getWeightsForDifficulty(difficulty) {
        const configs = {
            easy: {
                points: 10,
                nobleProgress: 4,
                futureValue: 2,
                costPenalty: 0.3,
                pointsBonus: 5,
                blockingBonus: 0,
                randomness: 0.3,  // 30% szans na suboptymalne ruchy
                lookAhead: false,
                reserveThreshold: 30
            },
            medium: {
                points: 15,
                nobleProgress: 8,
                futureValue: 3,
                costPenalty: 0.5,
                pointsBonus: 10,
                blockingBonus: 5,
                randomness: 0.1,  // 10% szans na suboptymalne ruchy
                lookAhead: false,
                reserveThreshold: 20
            },
            hard: {
                points: 20,
                nobleProgress: 12,
                futureValue: 5,
                costPenalty: 0.7,
                pointsBonus: 15,
                blockingBonus: 15,
                randomness: 0,
                lookAhead: true,
                reserveThreshold: 15
            }
        };
        return configs[difficulty] || configs.medium;
    }

    // Główna metoda - wybiera najlepszą akcję
    chooseAction() {
        const player = this.game.players[this.playerIndex];
        const w = this.weights;
        
        const winningMove = this.findWinningCard(player);
        if (winningMove) {
            return winningMove;
        }

        // Hard: Blokuj przeciwnika bliskiego wygranej
        if (w.blockingBonus > 0) {
            const blockingMove = this.findBlockingMove(player);
            if (blockingMove) {
                return blockingMove;
            }
        }

        // Hard: Patrzenie w przyszłość - wybierz najlepszą akcję ze wszystkich możliwych
        if (w.lookAhead) {
            const bestMove = this.findBestMoveWithLookAhead(player);
            if (bestMove) {
                return bestMove;
            }
        }

        const bestBuyFromBoard = this.findBestCardToBuy(player, false);
        if (bestBuyFromBoard && bestBuyFromBoard.score > 0) {
            return { action: 'buy', card: bestBuyFromBoard.card, fromReserved: false };
        }

        const bestBuyFromReserved = this.findBestCardToBuy(player, true);
        if (bestBuyFromReserved && bestBuyFromReserved.score > 0) {
            return { action: 'buy', card: bestBuyFromReserved.card, fromReserved: true };
        }

        const reserveMove = this.considerReserve(player);
        if (reserveMove) {
            return reserveMove;
        }

        const tokenMove = this.chooseBestTokens(player);
        if (tokenMove) {
            return tokenMove;
        }

        if (this.game.canReserve(player)) {
            const cardToReserve = this.findBestCardToReserve(player);
            if (cardToReserve) {
                return { action: 'reserve', card: cardToReserve, fromDeck: false };
            }
        }

        return this.takeAnyTokens();
    }

    // Znajdź ruch blokujący przeciwnika bliskiego wygranej
    findBlockingMove(player) {
        const dominated = this.findDominatingOpponent();
        if (!dominated) return null;

        const dominated_player = dominated.player;
        const dominated_cards = this.findCardsOpponentCanAlmostAfford(dominated_player);
        
        // Zarezerwuj kartę, którą przeciwnik chce kupić
        if (this.game.canReserve(player) && dominated_cards.length > 0) {
            const cardToBlock = dominated_cards[0];
            if (!player.reserved.includes(cardToBlock)) {
                return { action: 'reserve', card: cardToBlock, fromDeck: false };
            }
        }

        return null;
    }

    // Znajdź przeciwnika dominującego (blisko wygranej)
    findDominatingOpponent() {
        let dominated = null;
        let maxThreat = 0;

        for (let i = 0; i < this.game.players.length; i++) {
            if (i === this.playerIndex) continue;
            
            const opponent = this.game.players[i];
            const threat = opponent.points + this.countPotentialPoints(opponent);
            
            if (opponent.points >= 10 && threat > maxThreat) {
                maxThreat = threat;
                dominated = { player: opponent, index: i, threat };
            }
        }

        return dominated;
    }

    // Policz potencjalne punkty (karty które przeciwnik może kupić)
    countPotentialPoints(opponent) {
        let potential = 0;
        const cards = this.getBoardCards();
        
        for (const card of cards) {
            const cost = this.getEffectiveCostFor(opponent, card);
            const totalMissing = Object.values(cost).reduce((a, b) => a + Math.max(0, b), 0);
            
            if (totalMissing <= 3) {
                potential += card.points;
            }
        }
        
        return potential;
    }

    // Oblicz efektywny koszt karty dla gracza
    getEffectiveCostFor(player, card) {
        const cost = {};
        GEM_COLORS.forEach(color => {
            const required = card.cost[color] || 0;
            const bonus = player.bonuses[color] || 0;
            const tokens = player.tokens[color] || 0;
            cost[color] = required - bonus - tokens;
        });
        return cost;
    }

    // Znajdź karty które przeciwnik prawie może kupić
    findCardsOpponentCanAlmostAfford(opponent) {
        const cards = this.getBoardCards();
        const almostAffordable = [];

        for (const card of cards) {
            if (card.points < 2) continue;
            
            const cost = this.getEffectiveCostFor(opponent, card);
            const totalMissing = Object.values(cost).reduce((a, b) => a + Math.max(0, b), 0);
            
            if (totalMissing <= 2) {
                almostAffordable.push({ card, missing: totalMissing });
            }
        }

        almostAffordable.sort((a, b) => {
            const pointsDiff = b.card.points - a.card.points;
            if (pointsDiff !== 0) return pointsDiff;
            return a.missing - b.missing;
        });

        return almostAffordable.map(x => x.card);
    }

    // Patrzenie w przyszłość - ocena wszystkich możliwych ruchów
    findBestMoveWithLookAhead(player) {
        const moves = this.getAllPossibleMoves(player);
        if (moves.length === 0) return null;

        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of moves) {
            const score = this.evaluateMoveWithLookAhead(player, move);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    // Wszystkie możliwe ruchy gracza
    getAllPossibleMoves(player) {
        const moves = [];

        // Zakup kart z planszy
        for (const card of this.getBoardCards()) {
            if (this.game.canAfford(player, card)) {
                moves.push({ action: 'buy', card, fromReserved: false });
            }
        }

        // Zakup zarezerwowanych
        for (const card of player.reserved) {
            if (this.game.canAfford(player, card)) {
                moves.push({ action: 'buy', card, fromReserved: true });
            }
        }

        // Rezerwacja
        if (this.game.canReserve(player)) {
            for (const card of this.getBoardCards()) {
                moves.push({ action: 'reserve', card, fromDeck: false });
            }
        }

        // Żetony - 3 różne
        const available = GEM_COLORS.filter(c => this.game.bank[c] > 0);
        if (available.length >= 3) {
            for (let i = 0; i < available.length - 2; i++) {
                for (let j = i + 1; j < available.length - 1; j++) {
                    for (let k = j + 1; k < available.length; k++) {
                        const colors = [available[i], available[j], available[k]];
                        if (this.game.canTakeTokens(colors)) {
                            moves.push({ action: 'tokens', colors });
                        }
                    }
                }
            }
        }

        // Żetony - 2 takie same
        for (const color of available) {
            if (this.game.bank[color] >= 4) {
                const colors = [color, color];
                if (this.game.canTakeTokens(colors)) {
                    moves.push({ action: 'tokens', colors });
                }
            }
        }

        return moves;
    }

    // Ocena ruchu z patrzeniem w przód
    evaluateMoveWithLookAhead(player, move) {
        let score = 0;
        const w = this.weights;

        if (move.action === 'buy') {
            score += this.evaluateCard(player, move.card);
            score += move.card.points * 5;
            
            // Sprawdź czy po zakupie możemy zdobyć szlachcica
            const newBonuses = { ...player.bonuses };
            newBonuses[move.card.gem] = (newBonuses[move.card.gem] || 0) + 1;
            for (const noble of this.game.nobles) {
                if (this.canClaimNobleWith(newBonuses, noble)) {
                    score += 30;
                }
            }
        } else if (move.action === 'reserve') {
            score += this.evaluateCard(player, move.card) * 0.4;
            score += 5; // bonus za złoty żeton
        } else if (move.action === 'tokens') {
            for (const color of move.colors) {
                score += this.evaluateColorNeed(player, color) * 0.5;
            }
        }

        return score;
    }

    // Sprawdź czy z danymi bonusami można zdobyć szlachcica
    canClaimNobleWith(bonuses, noble) {
        for (const color of GEM_COLORS) {
            const required = noble.requirements[color] || 0;
            const has = bonuses[color] || 0;
            if (has < required) return false;
        }
        return true;
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
        const w = this.weights;

        score += card.points * w.points;

        const nobleProgress = this.evaluateNobleProgress(player, card.gem);
        score += nobleProgress * w.nobleProgress;

        const futureValue = this.evaluateFutureValue(player, card.gem);
        score += futureValue * w.futureValue;

        const totalCost = Object.values(card.cost).reduce((a, b) => a + b, 0);
        score -= totalCost * w.costPenalty;

        if (card.points > 0) {
            score += w.pointsBonus;
        }

        // Dodaj losowość dla łatwiejszych poziomów
        if (w.randomness > 0) {
            score *= (1 - w.randomness + Math.random() * w.randomness * 2);
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
        if (bestCard && bestScore > this.weights.reserveThreshold) {
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
