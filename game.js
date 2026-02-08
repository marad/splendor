// ============================================
// SPLENDOR - Logika gry
// ============================================

class SplendorGame {
    constructor(numPlayers) {
        this.numPlayers = numPlayers;
        this.currentPlayer = 0;
        this.turnNumber = 0;
        this.lastRound = false;
        this.lastRoundTriggerPlayer = -1;
        this.gameOver = false;
        this.winner = null;

        this.initBank(numPlayers);
        this.initDecks();
        this.initNobles(numPlayers);
        this.initPlayers(numPlayers);
        this.dealCards();
    }

    initBank(numPlayers) {
        // Token counts depend on player count
        const gemCount = numPlayers === 2 ? 4 : numPlayers === 3 ? 5 : 7;
        const goldCount = 5;

        this.bank = {};
        GEM_COLORS.forEach(c => this.bank[c] = gemCount);
        this.bank.gold = goldCount;
    }

    initDecks() {
        this.decks = {
            1: this.shuffle([...TIER1_CARDS].map((c, i) => ({ ...c, id: `t1_${i}`, tier: 1 }))),
            2: this.shuffle([...TIER2_CARDS].map((c, i) => ({ ...c, id: `t2_${i}`, tier: 2 }))),
            3: this.shuffle([...TIER3_CARDS].map((c, i) => ({ ...c, id: `t3_${i}`, tier: 3 }))),
        };

        this.board = { 1: [], 2: [], 3: [] };
    }

    initNobles(numPlayers) {
        const nobleCount = numPlayers + 1;
        const shuffled = this.shuffle([...NOBLES].map((n, i) => ({ ...n, id: `n_${i}` })));
        this.nobles = shuffled.slice(0, nobleCount);
    }

    initPlayers(numPlayers) {
        this.players = [];
        for (let i = 0; i < numPlayers; i++) {
            this.players.push({
                id: i,
                name: `Gracz ${i + 1}`,
                tokens: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
                bonuses: { white: 0, blue: 0, green: 0, red: 0, black: 0 },
                reserved: [],
                nobles: [],
                points: 0,
            });
        }
    }

    dealCards() {
        for (let tier = 1; tier <= 3; tier++) {
            while (this.board[tier].length < 4 && this.decks[tier].length > 0) {
                this.board[tier].push(this.decks[tier].pop());
            }
        }
    }

    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayer];
    }

    getPlayerTokenCount(player) {
        return Object.values(player.tokens).reduce((s, v) => s + v, 0);
    }

    // --- ACTIONS ---

    // Take tokens (up to 3 different or 2 same)
    canTakeTokens(colors) {
        if (colors.length === 0) return false;

        const counts = {};
        colors.forEach(c => counts[c] = (counts[c] || 0) + 1);
        const uniqueColors = Object.keys(counts);

        // Cannot take gold
        if (counts.gold) return false;

        // Case: 2 of same color
        if (colors.length === 2 && uniqueColors.length === 1) {
            const color = uniqueColors[0];
            return this.bank[color] >= 4;
        }

        // Case: 1-3 different colors
        if (uniqueColors.length === colors.length && colors.length <= 3) {
            return uniqueColors.every(c => this.bank[c] >= 1);
        }

        return false;
    }

    takeTokens(colors) {
        if (!this.canTakeTokens(colors)) return false;

        const player = this.getCurrentPlayer();
        this._pendingPlayer = this.currentPlayer;

        colors.forEach(c => {
            this.bank[c]--;
            player.tokens[c]++;
        });

        // Check if player needs to return tokens
        const totalTokens = this.getPlayerTokenCount(player);
        if (totalTokens > 10) {
            return { needsReturn: true, excess: totalTokens - 10 };
        }

        this.endTurn();
        return { needsReturn: false };
    }

    returnToken(playerIdx, color) {
        const player = this.players[playerIdx];
        if (player.tokens[color] <= 0) return false;
        player.tokens[color]--;
        this.bank[color]++;
        return true;
    }

    // Calculate actual cost after bonuses and check if player can afford
    getEffectiveCost(player, card) {
        const cost = {};
        let goldNeeded = 0;

        GEM_COLORS.forEach(color => {
            const cardCost = card.cost[color] || 0;
            const bonus = player.bonuses[color] || 0;
            const remaining = Math.max(0, cardCost - bonus);
            const fromTokens = Math.min(remaining, player.tokens[color]);
            const deficit = remaining - fromTokens;

            cost[color] = fromTokens;
            goldNeeded += deficit;
        });

        cost.gold = goldNeeded;
        return cost;
    }

    canAfford(player, card) {
        const cost = this.getEffectiveCost(player, card);
        return cost.gold <= player.tokens.gold;
    }

    buyCard(card, fromReserved = false) {
        const player = this.getCurrentPlayer();
        if (!this.canAfford(player, card)) return false;

        const cost = this.getEffectiveCost(player, card);

        // Pay tokens
        GEM_COLORS.forEach(color => {
            player.tokens[color] -= cost[color];
            this.bank[color] += cost[color];
        });
        player.tokens.gold -= cost.gold;
        this.bank.gold += cost.gold;

        // Add bonus
        player.bonuses[card.gem]++;
        player.points += card.points;

        // Remove from board or reserved
        if (fromReserved) {
            const idx = player.reserved.findIndex(c => c.id === card.id);
            if (idx !== -1) player.reserved.splice(idx, 1);
        } else {
            const tier = card.tier;
            const idx = this.board[tier].findIndex(c => c.id === card.id);
            if (idx !== -1) {
                this.board[tier].splice(idx, 1);
                // Refill
                if (this.decks[tier].length > 0) {
                    this.board[tier].push(this.decks[tier].pop());
                }
            }
        }

        this.endTurn();
        return true;
    }

    canReserve(player) {
        return player.reserved.length < 3;
    }

    reserveCard(card, fromDeck = false, tier = null) {
        const player = this.getCurrentPlayer();
        if (!this.canReserve(player)) return false;

        this._pendingPlayer = this.currentPlayer;
        let reservedCard;

        if (fromDeck) {
            if (!tier || this.decks[tier].length === 0) return false;
            reservedCard = this.decks[tier].pop();
        } else {
            const cardTier = card.tier;
            const idx = this.board[cardTier].findIndex(c => c.id === card.id);
            if (idx === -1) return false;
            reservedCard = this.board[cardTier].splice(idx, 1)[0];
            // Refill
            if (this.decks[cardTier].length > 0) {
                this.board[cardTier].push(this.decks[cardTier].pop());
            }
        }

        player.reserved.push(reservedCard);

        // Give gold token if available
        if (this.bank.gold > 0) {
            this.bank.gold--;
            player.tokens.gold++;
        }

        // Check if player needs to return tokens
        const totalTokens = this.getPlayerTokenCount(player);
        if (totalTokens > 10) {
            return { needsReturn: true, excess: totalTokens - 10 };
        }

        this.endTurn();
        return { needsReturn: false };
    }

    // Check noble visits
    checkNobles(player) {
        const visitingNobles = [];

        for (let i = this.nobles.length - 1; i >= 0; i--) {
            const noble = this.nobles[i];
            let qualifies = true;

            for (const [color, count] of Object.entries(noble.requirements)) {
                if ((player.bonuses[color] || 0) < count) {
                    qualifies = false;
                    break;
                }
            }

            if (qualifies) {
                visitingNobles.push(noble);
            }
        }

        return visitingNobles;
    }

    claimNoble(player, noble) {
        const idx = this.nobles.findIndex(n => n.id === noble.id);
        if (idx === -1) return false;

        this.nobles.splice(idx, 1);
        player.nobles.push(noble);
        player.points += noble.points;
        return true;
    }

    endTurn() {
        const player = this.getCurrentPlayer();

        // Check nobles
        const visitingNobles = this.checkNobles(player);

        // Auto-claim if only one noble visits
        if (visitingNobles.length === 1) {
            this.claimNoble(player, visitingNobles[0]);
        } else if (visitingNobles.length > 1) {
            // In a simplified version, auto-claim first one
            // In full version, player would choose
            this.claimNoble(player, visitingNobles[0]);
        }

        // Check win condition
        if (player.points >= 15 && !this.lastRound) {
            this.lastRound = true;
            this.lastRoundTriggerPlayer = this.currentPlayer;
        }

        // Next player
        this.currentPlayer = (this.currentPlayer + 1) % this.numPlayers;
        this.turnNumber++;

        // Check if last round is complete (all players had equal turns)
        if (this.lastRound && this.currentPlayer === 0) {
            this.resolveGame();
        }
    }

    resolveGame() {
        this.gameOver = true;

        // Find winner - highest points, then fewest purchased cards (bonuses) as tiebreaker
        let maxPoints = -1;
        let winner = null;

        for (const player of this.players) {
            if (player.points > maxPoints) {
                maxPoints = player.points;
                winner = player;
            } else if (player.points === maxPoints) {
                const totalBonuses = p => Object.values(p.bonuses).reduce((s, v) => s + v, 0);
                if (totalBonuses(player) < totalBonuses(winner)) {
                    winner = player;
                }
            }
        }

        this.winner = winner;
    }

    // Get available actions for current player
    getAvailableActions() {
        const player = this.getCurrentPlayer();
        const actions = [];

        // Check if any tokens can be taken
        const availableGems = GEM_COLORS.filter(c => this.bank[c] > 0);
        if (availableGems.length > 0) {
            actions.push('take_tokens');
        }

        // Check if any card can be bought
        for (let tier = 1; tier <= 3; tier++) {
            for (const card of this.board[tier]) {
                if (this.canAfford(player, card)) {
                    actions.push('buy_card');
                    break;
                }
            }
        }

        // Check reserved cards
        for (const card of player.reserved) {
            if (this.canAfford(player, card)) {
                actions.push('buy_reserved');
                break;
            }
        }

        // Check if can reserve
        if (this.canReserve(player)) {
            actions.push('reserve_card');
        }

        return [...new Set(actions)];
    }
}
