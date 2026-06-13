// ============================================
// SPLENDOR - Testy
// ============================================

class SplendorTests {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.results = [];
    }

    assert(condition, testName, details = '') {
        if (condition) {
            this.passed++;
            this.results.push({ name: testName, passed: true });
            console.log(`✅ ${testName}`);
        } else {
            this.failed++;
            this.results.push({ name: testName, passed: false, details });
            console.error(`❌ ${testName}${details ? ': ' + details : ''}`);
        }
    }

    assertEqual(actual, expected, testName) {
        this.assert(
            actual === expected,
            testName,
            `expected ${expected}, got ${actual}`
        );
    }

    // ============================================
    // GAME LOGIC TESTS
    // ============================================

    testGameInitialization() {
        const game = new SplendorGame(2);
        
        this.assertEqual(game.numPlayers, 2, 'Game initializes with correct player count');
        this.assertEqual(game.players.length, 2, 'Game creates correct number of players');
        this.assertEqual(game.currentPlayer, 0, 'Game starts with player 0');
        this.assert(!game.gameOver, 'Game is not over at start');
        this.assert(!game.lastRound, 'Last round flag is false at start');
        
        this.assertEqual(game.bank.gold, 5, 'Bank has 5 gold tokens');
        this.assertEqual(game.bank.white, 4, 'Bank has 4 white tokens (2 players)');
        
        this.assertEqual(game.board[1].length, 4, 'Tier 1 has 4 cards');
        this.assertEqual(game.board[2].length, 4, 'Tier 2 has 4 cards');
        this.assertEqual(game.board[3].length, 4, 'Tier 3 has 4 cards');
        
        this.assertEqual(game.nobles.length, 3, '3 nobles for 2 players');
    }

    testPlayerInitialization() {
        const game = new SplendorGame(2);
        const player = game.players[0];
        
        this.assertEqual(player.points, 0, 'Player starts with 0 points');
        this.assertEqual(player.reserved.length, 0, 'Player starts with no reserved cards');
        
        const totalTokens = Object.values(player.tokens).reduce((a, b) => a + b, 0);
        this.assertEqual(totalTokens, 0, 'Player starts with no tokens');
        
        const totalBonuses = Object.values(player.bonuses).reduce((a, b) => a + b, 0);
        this.assertEqual(totalBonuses, 0, 'Player starts with no bonuses');
    }

    testTakeTokens() {
        const game = new SplendorGame(2);
        
        const result = game.takeTokens(['white', 'blue', 'green']);
        this.assert(result, 'Taking 3 different tokens succeeds');
        
        const player = game.players[0];
        this.assertEqual(player.tokens.white, 1, 'Player has 1 white token');
        this.assertEqual(player.tokens.blue, 1, 'Player has 1 blue token');
        this.assertEqual(player.tokens.green, 1, 'Player has 1 green token');
        
        this.assertEqual(game.bank.white, 3, 'Bank has 3 white tokens left');
        this.assertEqual(game.currentPlayer, 1, 'Turn passed to next player');
    }

    testTakeTwoSameTokens() {
        const game = new SplendorGame(2);
        
        const result = game.takeTokens(['white', 'white']);
        this.assert(result, 'Taking 2 same tokens succeeds when bank has 4+');
        
        const player = game.players[0];
        this.assertEqual(player.tokens.white, 2, 'Player has 2 white tokens');
        this.assertEqual(game.bank.white, 2, 'Bank has 2 white tokens left');
    }

    testCannotTakeTwoSameWhenBankLow() {
        const game = new SplendorGame(2);
        game.bank.white = 3;
        
        const result = game.canTakeTokens(['white', 'white']);
        this.assert(!result, 'Cannot take 2 same tokens when bank < 4');
    }

    testBuyCard() {
        const game = new SplendorGame(2);
        const player = game.players[0];
        
        player.tokens = { white: 5, blue: 5, green: 5, red: 5, black: 5, gold: 0 };
        
        const card = game.board[1][0];
        const canAfford = game.canAfford(player, card);
        this.assert(canAfford, 'Player with tokens can afford tier 1 card');
        
        const initialPoints = player.points;
        const cardGem = card.gem;
        const cardPoints = card.points;
        
        const result = game.buyCard(card, false);
        this.assert(result, 'Buying card succeeds');
        
        this.assertEqual(player.bonuses[cardGem], 1, 'Player gets gem bonus from card');
        this.assertEqual(player.points, initialPoints + cardPoints, 'Player gets points from card');
        this.assertEqual(game.board[1].length, 4, 'Board refills after purchase');
    }

    testReserveCard() {
        const game = new SplendorGame(2);
        const player = game.players[0];
        
        const card = game.board[2][0];
        const result = game.reserveCard(card, false);
        
        this.assert(result, 'Reserving card succeeds');
        this.assertEqual(player.reserved.length, 1, 'Player has 1 reserved card');
        this.assertEqual(player.tokens.gold, 1, 'Player gets gold token');
        this.assertEqual(game.bank.gold, 4, 'Bank has 4 gold tokens left');
    }

    testCannotReserveMoreThanThree() {
        const game = new SplendorGame(2);
        const player = game.players[0];
        
        player.reserved = [{}, {}, {}];
        
        const canReserve = game.canReserve(player);
        this.assert(!canReserve, 'Cannot reserve when already have 3');
    }

    testGoldAsWildcard() {
        const game = new SplendorGame(2);
        const player = game.players[0];
        
        const card = { id: 'test', tier: 1, gem: 'white', points: 0, cost: { white: 3 } };
        player.tokens = { white: 1, blue: 0, green: 0, red: 0, black: 0, gold: 2 };
        
        const canAfford = game.canAfford(player, card);
        this.assert(canAfford, 'Gold tokens work as wildcards');
        
        const cost = game.getEffectiveCost(player, card);
        this.assertEqual(cost.white, 1, 'Effective white cost is 1');
        this.assertEqual(cost.gold, 2, 'Need 2 gold to cover rest');
    }

    testBonusReducesCost() {
        const game = new SplendorGame(2);
        const player = game.players[0];
        
        const card = { id: 'test', tier: 1, gem: 'blue', points: 0, cost: { white: 3 } };
        player.bonuses = { white: 2, blue: 0, green: 0, red: 0, black: 0 };
        player.tokens = { white: 1, blue: 0, green: 0, red: 0, black: 0, gold: 0 };
        
        const canAfford = game.canAfford(player, card);
        this.assert(canAfford, 'Bonuses reduce card cost');
    }

    testWinConditionTrigger() {
        const game = new SplendorGame(2);
        const player = game.players[0];
        
        player.points = 14;
        
        const card = { id: 'test', tier: 3, gem: 'white', points: 1, cost: {} };
        game.board[3].unshift(card);
        
        game.buyCard(card, false);
        
        this.assert(game.lastRound, 'Last round triggered when player reaches 15 points');
        this.assertEqual(game.lastRoundTriggerPlayer, 0, 'Trigger player is recorded');
    }

    testGameEndsAfterLastRound() {
        const game = new SplendorGame(2);
        
        game.players[0].points = 15;
        game.lastRound = true;
        game.lastRoundTriggerPlayer = 0;
        game.currentPlayer = 1;
        
        game.players[1].tokens = { white: 1, blue: 1, green: 1, red: 0, black: 0, gold: 0 };
        game.takeTokens(['red']);
        
        this.assert(game.gameOver, 'Game ends after last round completes');
        this.assert(game.winner !== null, 'Winner is determined');
        this.assertEqual(game.winner, game.players[0], 'Player with most points wins');
    }

    testTiebreakerFewerCards() {
        const game = new SplendorGame(2);
        
        game.players[0].points = 15;
        game.players[0].bonuses = { white: 5, blue: 5, green: 0, red: 0, black: 0 };
        
        game.players[1].points = 15;
        game.players[1].bonuses = { white: 3, blue: 0, green: 0, red: 0, black: 0 };
        
        game.resolveGame();
        
        this.assertEqual(game.winner, game.players[1], 'Player with fewer cards wins tiebreaker');
    }

    // ============================================
    // AI TESTS
    // ============================================

    testAIInitialization() {
        const game = new SplendorGame(2);
        
        const aiEasy = new SplendorAI(game, 1, 'easy');
        const aiMedium = new SplendorAI(game, 1, 'medium');
        const aiHard = new SplendorAI(game, 1, 'hard');
        
        this.assertEqual(aiEasy.difficulty, 'easy', 'AI stores easy difficulty');
        this.assertEqual(aiMedium.difficulty, 'medium', 'AI stores medium difficulty');
        this.assertEqual(aiHard.difficulty, 'hard', 'AI stores hard difficulty');
        
        this.assert(aiEasy.weights.randomness > 0, 'Easy AI has randomness');
        this.assertEqual(aiHard.weights.randomness, 0, 'Hard AI has no randomness');
        this.assert(aiHard.weights.lookAhead, 'Hard AI uses look-ahead');
    }

    testAIChoosesAction() {
        const game = new SplendorGame(2);
        game.currentPlayer = 1;
        
        const ai = new SplendorAI(game, 1, 'medium');
        const action = ai.chooseAction();
        
        this.assert(action !== null, 'AI chooses an action');
        this.assert(['buy', 'reserve', 'reserveDeck', 'tokens'].includes(action.action), 
            'AI action is valid type');
    }

    testAIBuysWinningCard() {
        const game = new SplendorGame(2);
        game.currentPlayer = 1;
        
        const player = game.players[1];
        player.points = 14;
        player.tokens = { white: 10, blue: 10, green: 10, red: 10, black: 10, gold: 5 };
        
        const winningCard = { id: 'winner', tier: 1, gem: 'white', points: 2, cost: { white: 1 } };
        game.board[1][0] = winningCard;
        
        const ai = new SplendorAI(game, 1, 'hard');
        const action = ai.chooseAction();
        
        this.assertEqual(action.action, 'buy', 'AI buys card when it can win');
        this.assertEqual(action.card.id, 'winner', 'AI buys the winning card');
    }

    testAITokenReturn() {
        const game = new SplendorGame(2);
        const player = game.players[1];
        
        player.tokens = { white: 3, blue: 3, green: 3, red: 2, black: 2, gold: 0 };
        
        const ai = new SplendorAI(game, 1, 'medium');
        const toReturn = ai.chooseTokensToReturn(3);
        
        const totalReturned = Object.values(toReturn).reduce((a, b) => a + b, 0);
        this.assertEqual(totalReturned, 3, 'AI returns correct number of tokens');
    }

    // ============================================
    // UI / INTEGRATION TESTS
    // ============================================

    testVictoryModalExists() {
        const modal = document.getElementById('game-over-modal');
        this.assert(modal !== null, 'Victory modal exists in DOM');
        this.assert(modal.classList.contains('hidden'), 'Victory modal is hidden initially');
    }

    testVictoryModalShows() {
        const game = new SplendorGame(2);
        game.players[0].points = 15;
        game.players[0].name = 'Test Player';
        game.gameOver = true;
        game.winner = game.players[0];
        
        const modal = document.getElementById('game-over-modal');
        const winnerText = document.getElementById('winner-text');
        
        winnerText.textContent = `${game.winner.name} wygrywa z ${game.winner.points} punktami prestiżu!`;
        modal.classList.remove('hidden');
        
        this.assert(!modal.classList.contains('hidden'), 'Victory modal can be shown');
        this.assert(winnerText.textContent.includes('Test Player'), 'Winner name is displayed');
        
        modal.classList.add('hidden');
    }

    testTokenSelectionBarExists() {
        const bar = document.getElementById('token-selection-bar');
        this.assert(bar !== null, 'Token selection bar exists in DOM');
    }

    // ============================================
    // RUN ALL TESTS
    // ============================================

    runAll() {
        console.log('🧪 Running Splendor Tests...\n');
        
        console.log('--- Game Logic Tests ---');
        this.testGameInitialization();
        this.testPlayerInitialization();
        this.testTakeTokens();
        this.testTakeTwoSameTokens();
        this.testCannotTakeTwoSameWhenBankLow();
        this.testBuyCard();
        this.testReserveCard();
        this.testCannotReserveMoreThanThree();
        this.testGoldAsWildcard();
        this.testBonusReducesCost();
        this.testWinConditionTrigger();
        this.testGameEndsAfterLastRound();
        this.testTiebreakerFewerCards();
        
        console.log('\n--- AI Tests ---');
        this.testAIInitialization();
        this.testAIChoosesAction();
        this.testAIBuysWinningCard();
        this.testAITokenReturn();
        
        console.log('\n--- UI Tests ---');
        this.testVictoryModalExists();
        this.testVictoryModalShows();
        this.testTokenSelectionBarExists();
        
        console.log('\n========================================');
        console.log(`Tests: ${this.passed + this.failed}`);
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log('========================================');
        
        return this.failed === 0;
    }
}

function runTests() {
    const tests = new SplendorTests();
    return tests.runAll();
}
