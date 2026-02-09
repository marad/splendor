// ============================================
// SPLENDOR - Warstwa UI v2 (z animacjami)
// ============================================

class SplendorUI {
    constructor() {
        this.game = null;
        this.selectedTokens = [];
        this.actionMode = null;
        this.activeCardEl = null;
        this.tokensToReturn = 0;
        this.returnedTokens = {};
        this._prevPlayerStates = null;
        this._animating = false;
        
        this.aiMode = false;
        this.aiPlayers = [];
        this.aiDifficulty = 'medium';
        this.aiThinking = false;
    }

    init() {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);

        document.querySelectorAll('.player-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.dataset.mode;
                const aiOptions = document.getElementById('ai-options');
                if (mode === 'ai') {
                    aiOptions.classList.remove('hidden');
                } else {
                    aiOptions.classList.add('hidden');
                }
            });
        });

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.getElementById('start-game').addEventListener('click', () => {
            const numPlayers = parseInt(document.querySelector('.player-btn.active').dataset.players);
            const mode = document.querySelector('.mode-btn.active').dataset.mode;
            const difficulty = document.querySelector('.diff-btn.active')?.dataset.diff || 'medium';
            this.startGame(numPlayers, mode === 'ai', difficulty);
        });

        document.getElementById('play-again').addEventListener('click', () => {
            document.getElementById('game-over-modal').classList.add('hidden');
            document.getElementById('game-screen').classList.remove('active');
            document.getElementById('start-menu').classList.add('active');
        });

        document.getElementById('confirm-return').addEventListener('click', () => {
            this.confirmReturnTokens();
        });
    }

    startGame(numPlayers, aiMode = false, difficulty = 'medium') {
        this.game = new SplendorGame(numPlayers);
        this.selectedTokens = [];
        this.actionMode = null;
        this._prevPlayerStates = null;
        
        this.aiMode = aiMode;
        this.aiDifficulty = difficulty;
        this.aiPlayers = [];
        this.aiThinking = false;

        if (aiMode) {
            for (let i = 1; i < numPlayers; i++) {
                this.aiPlayers.push(new SplendorAI(this.game, i));
                this.game.players[i].name = `AI ${i}`;
                this.game.players[i].isAI = true;
            }
            this.game.players[0].name = 'Ty';
        }

        document.getElementById('start-menu').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');

        this._snapshotPlayerStates();
        this.render(true);
        
        const modeText = aiMode ? `vs AI (${this.getDifficultyName(difficulty)})` : `${numPlayers} graczy`;
        this.toast(`Gra rozpoczęta! ${modeText}`, 'info');
    }

    getDifficultyName(diff) {
        const names = { easy: 'Łatwy', medium: 'Średni', hard: 'Trudny' };
        return names[diff] || diff;
    }

    isCurrentPlayerAI() {
        return this.aiMode && this.game.currentPlayer > 0;
    }

    scheduleAITurn() {
        if (!this.isCurrentPlayerAI() || this.game.gameOver || this.aiThinking) return;

        this.aiThinking = true;
        const delay = this.getAIDelay();

        setTimeout(() => {
            this.executeAITurn();
        }, delay);
    }

    getAIDelay() {
        const delays = { easy: 1500, medium: 1000, hard: 600 };
        return delays[this.aiDifficulty] || 1000;
    }

    executeAITurn() {
        if (this.game.gameOver) {
            this.aiThinking = false;
            return;
        }

        const aiIndex = this.game.currentPlayer;
        const ai = this.aiPlayers[aiIndex - 1];
        const action = ai.chooseAction();

        if (!action) {
            this.aiThinking = false;
            return;
        }

        this.toast(`🤖 ${this.game.getCurrentPlayer().name} myśli...`, 'info', 800);

        setTimeout(() => {
            this.performAIAction(ai, action);
        }, 500);
    }

    performAIAction(ai, action) {
        const player = this.game.getCurrentPlayer();

        switch (action.action) {
            case 'buy':
                this.aiDoBuy(action.card, action.fromReserved);
                break;
            case 'reserve':
                this.aiDoReserve(action.card);
                break;
            case 'reserveDeck':
                this.aiDoReserveDeck(action.tier);
                break;
            case 'tokens':
                this.aiDoTakeTokens(action.colors);
                break;
            default:
                this.aiThinking = false;
        }
    }

    aiDoBuy(card, fromReserved) {
        const player = this.game.getCurrentPlayer();
        const playerPanel = document.getElementById(`player-panel-${this.game.currentPlayer}`);
        const cost = this.game.getEffectiveCost(player, card);

        if (playerPanel) {
            let delay = 0;
            GEM_COLORS.forEach(color => {
                for (let i = 0; i < cost[color]; i++) {
                    const bankTokenEl = document.getElementById(`bank-token-${color}`);
                    if (bankTokenEl) {
                        setTimeout(() => this.flyToken(color, playerPanel, bankTokenEl, 0.4), delay);
                        delay += 80;
                    }
                }
            });
            for (let i = 0; i < cost.gold; i++) {
                const bankTokenEl = document.getElementById(`bank-token-gold`);
                if (bankTokenEl) {
                    setTimeout(() => this.flyToken('gold', playerPanel, bankTokenEl, 0.4), delay);
                    delay += 80;
                }
            }
        }

        setTimeout(() => {
            const pointsText = card.points > 0 ? ` (+${card.points} pkt)` : '';
            const success = this.game.buyCard(card, fromReserved);
            
            if (success) {
                this.toast(`🤖 AI kupuje: ${GEM_NAMES[card.gem]}${pointsText}`, 'success');
                this._checkNobleToast();
                this.flashTurn();
                this.checkGameOver();
                this.render();
                this.aiThinking = false;
                
                if (!this.game.gameOver) {
                    this.afterTurnEnd();
                }
            } else {
                this.aiThinking = false;
            }
        }, 400);
    }

    aiDoReserve(card) {
        if (this.game.bank.gold > 0) {
            const bankGoldEl = document.getElementById('bank-token-gold');
            const playerPanel = document.getElementById(`player-panel-${this.game.currentPlayer}`);
            if (bankGoldEl && playerPanel) {
                this.flyToken('gold', bankGoldEl, playerPanel, 0.45);
            }
        }

        setTimeout(() => {
            const result = this.game.reserveCard(card, false);
            if (result) {
                this.toast(`🤖 AI rezerwuje: ${GEM_NAMES[card.gem]}`, 'warning');
                
                if (result.needsReturn) {
                    this.handleAITokenReturn(result.excess);
                } else {
                    this.flashTurn();
                    this.checkGameOver();
                    this.render();
                    this.aiThinking = false;
                    if (!this.game.gameOver) {
                        this.afterTurnEnd();
                    }
                }
            } else {
                this.aiThinking = false;
            }
        }, 300);
    }

    aiDoReserveDeck(tier) {
        if (this.game.bank.gold > 0) {
            const bankGoldEl = document.getElementById('bank-token-gold');
            const playerPanel = document.getElementById(`player-panel-${this.game.currentPlayer}`);
            if (bankGoldEl && playerPanel) {
                this.flyToken('gold', bankGoldEl, playerPanel, 0.45);
            }
        }

        setTimeout(() => {
            const result = this.game.reserveCard(null, true, tier);
            if (result) {
                this.toast(`🤖 AI rezerwuje kartę z talii ${tier}`, 'warning');
                
                if (result.needsReturn) {
                    this.handleAITokenReturn(result.excess);
                } else {
                    this.flashTurn();
                    this.checkGameOver();
                    this.render();
                    this.aiThinking = false;
                    if (!this.game.gameOver) {
                        this.afterTurnEnd();
                    }
                }
            } else {
                this.aiThinking = false;
            }
        }, 300);
    }

    aiDoTakeTokens(colors) {
        const playerPanel = document.getElementById(`player-panel-${this.game.currentPlayer}`);
        if (playerPanel) {
            colors.forEach((color, i) => {
                const bankTokenEl = document.getElementById(`bank-token-${color}`);
                if (bankTokenEl) {
                    setTimeout(() => {
                        this.flyToken(color, bankTokenEl, playerPanel, 0.45);
                    }, i * 120);
                }
            });
        }

        const tokenNames = colors.map(c => GEM_NAMES[c]).join(', ');

        setTimeout(() => {
            const result = this.game.takeTokens(colors);
            
            if (result.needsReturn) {
                this.toast(`🤖 AI bierze: ${tokenNames}`, 'success');
                this.render();
                this.handleAITokenReturn(result.excess);
            } else {
                this.toast(`🤖 AI bierze: ${tokenNames}`, 'success');
                this.flashTurn();
                this.render();
                this.aiThinking = false;
                if (!this.game.gameOver) {
                    this.afterTurnEnd();
                }
            }
        }, colors.length * 120 + 300);
    }

    handleAITokenReturn(excess) {
        const aiIndex = this.game._pendingPlayer;
        const ai = this.aiPlayers[aiIndex - 1];
        const toReturn = ai.chooseTokensToReturn(excess);

        setTimeout(() => {
            Object.entries(toReturn).forEach(([color, count]) => {
                for (let i = 0; i < count; i++) {
                    this.game.returnToken(aiIndex, color);
                }
            });

            const returnedNames = Object.entries(toReturn)
                .filter(([, c]) => c > 0)
                .map(([color, count]) => `${count}x ${GEM_NAMES[color]}`)
                .join(', ');

            this.toast(`🤖 AI zwraca: ${returnedNames}`, 'info');
            this.game.endTurn();
            this.flashTurn();
            this.checkGameOver();
            this.render();
            this.aiThinking = false;
            
            if (!this.game.gameOver) {
                this.afterTurnEnd();
            }
        }, 500);
    }

    afterTurnEnd() {
        if (!this.game.gameOver) {
            this.toast(`Tura: ${this.game.getCurrentPlayer().name}`, 'info', 1500);
            this.scheduleAITurn();
        }
    }

    // --- TOAST NOTIFICATIONS ---

    toast(message, type = 'info', duration = 2400) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), duration + 400);
    }

    // --- PARTICLE EFFECTS ---

    spawnParticles(x, y, count = 8, emoji = '✨') {
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.textContent = emoji;
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const dist = 40 + Math.random() * 60;
            p.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
            p.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 900);
        }
    }

    // --- FLYING TOKEN ANIMATION ---

    flyToken(color, fromEl, toEl, duration = 0.5) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const token = document.createElement('div');
        token.className = 'flying-token';
        token.dataset.color = color;
        token.textContent = GEM_SYMBOLS[color];
        token.style.setProperty('--fromX', `${fromRect.left + fromRect.width / 2 - 15}px`);
        token.style.setProperty('--fromY', `${fromRect.top + fromRect.height / 2 - 15}px`);
        token.style.setProperty('--toX', `${toRect.left + toRect.width / 2 - 15}px`);
        token.style.setProperty('--toY', `${toRect.top + toRect.height / 2 - 15}px`);
        token.style.setProperty('--duration', `${duration}s`);
        token.style.left = `${fromRect.left + fromRect.width / 2 - 15}px`;
        token.style.top = `${fromRect.top + fromRect.height / 2 - 15}px`;

        document.body.appendChild(token);
        setTimeout(() => token.remove(), duration * 1000 + 100);
    }

    // --- TURN FLASH ---

    flashTurn() {
        const flash = document.createElement('div');
        flash.className = 'turn-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 500);
    }

    // --- CONFETTI ---

    spawnConfetti(count = 30) {
        const emojis = ['🎉', '✨', '💎', '🏆', '⭐', '🎊'];
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const c = document.createElement('div');
                c.className = 'confetti';
                c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                c.style.left = `${Math.random() * 100}vw`;
                c.style.setProperty('--duration', `${2 + Math.random() * 3}s`);
                c.style.setProperty('--rot', `${360 + Math.random() * 720}deg`);
                c.style.setProperty('--drift', `${(Math.random() - 0.5) * 150}px`);
                c.style.animationDelay = `${Math.random() * 0.5}s`;
                document.body.appendChild(c);
                setTimeout(() => c.remove(), 5500);
            }, i * 80);
        }
    }

    // --- STATE SNAPSHOT for diff animations ---

    _snapshotPlayerStates() {
        if (!this.game) return;
        this._prevPlayerStates = this.game.players.map(p => ({
            points: p.points,
            tokens: { ...p.tokens },
            bonuses: { ...p.bonuses },
            reserved: p.reserved.length,
            nobles: p.nobles.length,
        }));
    }

    // --- RENDERING ---

    render(initialDeal = false) {
        this.renderBank();
        this.renderNobles();
        this.renderCards(initialDeal);
        this.renderPlayers();
        this._snapshotPlayerStates();
    }

    getPlayerColor(idx) {
        const colors = ['#f39c12', '#3498db', '#e74c3c', '#2ecc71'];
        return colors[idx] || '#f39c12';
    }

    renderBank() {
        const container = document.getElementById('bank-tokens');
        container.innerHTML = '';

        ALL_COLORS.forEach(color => {
            const count = this.game.bank[color];
            const token = document.createElement('div');
            token.className = 'bank-token';
            token.dataset.color = color;
            token.id = `bank-token-${color}`;

            const isSelected = this.selectedTokens.includes(color);
            const isDisabled = count <= 0 || color === 'gold';

            if (isSelected) token.classList.add('selected');
            if (isDisabled && !isSelected) token.classList.add('disabled');

            token.innerHTML = `
                <span class="token-gem-icon">${GEM_SYMBOLS[color]}</span>
                ${count}
            `;

            if (color !== 'gold') {
                token.addEventListener('click', () => this.onBankTokenClick(color));
            }

            container.appendChild(token);
        });

        this.renderTokenSelectionBar();
    }

    renderTokenSelectionBar() {
        let bar = document.getElementById('token-selection-bar');
        if (bar) bar.remove();

        if (this.selectedTokens.length === 0) return;

        bar = document.createElement('div');
        bar.id = 'token-selection-bar';

        const display = document.createElement('div');
        display.className = 'selected-token-display';

        this.selectedTokens.forEach((color, index) => {
            const mini = document.createElement('div');
            mini.className = 'selected-token-mini';
            mini.dataset.color = color;
            mini.title = 'Kliknij aby usunąć';
            mini.addEventListener('click', () => this.removeSelectedToken(index));
            display.appendChild(mini);
        });

        const confirmBtn = document.createElement('button');
        confirmBtn.id = 'confirm-tokens';
        confirmBtn.textContent = 'Potwierdź ✓';
        confirmBtn.disabled = !this.game.canTakeTokens(this.selectedTokens);
        confirmBtn.addEventListener('click', () => this.confirmTakeTokens());

        bar.appendChild(display);
        bar.appendChild(confirmBtn);

        document.getElementById('bank-area').appendChild(bar);
    }

    removeSelectedToken(index) {
        this.selectedTokens.splice(index, 1);
        if (this.selectedTokens.length === 0) {
            this.actionMode = null;
        }
        this.renderBank();
    }

    renderNobles() {
        const container = document.getElementById('nobles-row');
        container.innerHTML = '';

        this.game.nobles.forEach(noble => {
            const tile = document.createElement('div');
            tile.className = 'noble-tile';
            tile.id = `noble-${noble.id}`;

            let reqsHtml = '';
            Object.entries(noble.requirements).forEach(([color, count]) => {
                reqsHtml += `<span class="noble-req" style="background:${this.getGemCSSColor(color)}">${count}</span>`;
            });

            tile.innerHTML = `
                <div class="noble-points">${noble.points}</div>
                <div class="noble-requirements">${reqsHtml}</div>
            `;

            container.appendChild(tile);
        });
    }

    renderCards(initialDeal = false) {
        for (let tier = 3; tier >= 1; tier--) {
            const deckEl = document.querySelector(`.deck-pile[data-tier="${tier}"]`);
            deckEl.querySelector('.deck-count').textContent = this.game.decks[tier].length;

            deckEl.onclick = () => {
                if (this.game.decks[tier].length > 0) this.onDeckClick(tier);
            };
            deckEl.style.opacity = this.game.decks[tier].length > 0 ? '1' : '0.3';
            deckEl.style.cursor = this.game.decks[tier].length > 0 ? 'pointer' : 'default';

            const cardsContainer = document.getElementById(`tier-${tier}-cards`);
            const prevIds = Array.from(cardsContainer.querySelectorAll('.dev-card')).map(c => c.dataset.cardId);
            cardsContainer.innerHTML = '';

            this.game.board[tier].forEach(card => {
                const isNew = initialDeal || !prevIds.includes(card.id);
                const el = this.createCardElement(card, false);
                if (isNew) el.classList.add('card-enter');
                cardsContainer.appendChild(el);
            });
        }
    }

    createCardElement(card, isReserved = false, isCurrentPlayer = true) {
        const el = document.createElement('div');
        el.className = 'dev-card';
        el.dataset.tier = card.tier;
        el.dataset.cardId = card.id;

        const player = this.game.getCurrentPlayer();
        const affordable = this.game.canAfford(player, card) && isCurrentPlayer;
        if (affordable) el.classList.add('affordable');

        let pointsHtml = card.points > 0 ? card.points : '';

        let costHtml = '';
        GEM_COLORS.forEach(color => {
            const amount = card.cost[color] || 0;
            if (amount > 0) {
                costHtml += `
                    <div class="cost-item">
                        <div class="cost-gem" data-gem="${color}">${GEM_SYMBOLS[color]}</div>
                        <span>${amount}</span>
                    </div>`;
            }
        });

        el.innerHTML = `
            <div class="card-header">
                <div class="card-points">${pointsHtml}</div>
                <div class="card-gem-bonus" data-gem="${card.gem}">${GEM_SYMBOLS[card.gem]}</div>
            </div>
            <div class="card-cost">${costHtml}</div>
            <div class="card-actions">
                <button class="card-action-btn buy-btn" ${!affordable ? 'disabled' : ''}>💰 Kup</button>
                ${isReserved ? `<button class="card-action-btn buy-btn-reserved" ${!affordable ? 'disabled' : ''}>💰 Kup</button>` :
                    `<button class="card-action-btn reserve-btn" ${!this.game.canReserve(player) ? 'disabled' : ''}>📌 Zarezerwuj</button>`}
            </div>
        `;

        // Click to show actions
        el.addEventListener('click', (e) => {
            if (e.target.closest('.card-action-btn')) return;
            document.querySelectorAll('.dev-card.show-actions').forEach(c => {
                if (c !== el) c.classList.remove('show-actions');
            });
            el.classList.toggle('show-actions');
        });

        // Buy button
        const buyBtn = el.querySelector('.buy-btn') || el.querySelector('.buy-btn-reserved');
        if (buyBtn) {
            buyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onBuyCard(card, isReserved, el);
            });
        }

        // Reserve button
        const reserveBtn = el.querySelector('.reserve-btn');
        if (reserveBtn) {
            reserveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onReserveCard(card, el);
            });
        }

        return el;
    }

    renderPlayers() {
        const container = document.getElementById('players-area');
        container.innerHTML = '';

        this.game.players.forEach((player, idx) => {
            const panel = document.createElement('div');
            panel.className = 'player-panel';
            panel.id = `player-panel-${idx}`;
            if (idx === this.game.currentPlayer && !this.game.gameOver) {
                panel.classList.add('active');
            }

            // Diff-based animations
            if (this._prevPlayerStates) {
                const prev = this._prevPlayerStates[idx];
                if (prev) {
                    if (player.points !== prev.points) {
                        panel.classList.add('score-changed');
                    }
                    const tokensChanged = ALL_COLORS.some(c =>
                        (player.tokens[c] || 0) !== (prev.tokens[c] || 0)
                    );
                    if (tokensChanged) {
                        panel.classList.add('tokens-changed');
                    }
                }
            }

            // Resources
            let resourcesHtml = '';
            GEM_COLORS.forEach(color => {
                const tokens = player.tokens[color];
                const bonuses = player.bonuses[color];
                resourcesHtml += `
                    <div class="player-resource-row">
                        <div class="player-gem-indicator" data-gem="${color}">${GEM_SYMBOLS[color]}</div>
                        <span class="resource-counts">${tokens}<span class="resource-bonuses">+${bonuses}</span></span>
                    </div>`;
            });

            if (player.tokens.gold > 0) {
                resourcesHtml += `
                    <div class="player-resource-row">
                        <div class="player-gem-indicator" data-gem="gold">${GEM_SYMBOLS.gold}</div>
                        <span class="resource-counts">${player.tokens.gold}</span>
                    </div>`;
            }

            // Reserved
            let reservedHtml = '';
            if (player.reserved.length > 0) {
                let cardsHtml = '';
                player.reserved.forEach((card, ci) => {
                    cardsHtml += `<div class="reserved-mini-card" data-tier="${card.tier}" data-idx="${ci}" data-player="${idx}">${GEM_SYMBOLS[card.gem]}</div>`;
                });
                reservedHtml = `
                    <div class="player-reserved">
                        <div class="player-reserved-label">Zarezerwowane (${player.reserved.length}/3):</div>
                        <div class="reserved-cards">${cardsHtml}</div>
                    </div>`;
            }

            // Nobles
            let noblesHtml = '';
            if (player.nobles.length > 0) {
                let nHtml = '';
                player.nobles.forEach(n => {
                    nHtml += `<div class="player-noble-mini">${n.points}</div>`;
                });
                noblesHtml = `<div class="player-nobles">${nHtml}</div>`;
            }

            const totalTokens = this.game.getPlayerTokenCount(player);

            const isAI = player.isAI ? '🤖 ' : '';

            panel.innerHTML = `
                <div class="player-header">
                    <span class="player-name" style="color:${this.getPlayerColor(idx)}">${isAI}${player.name}</span>
                    <span class="player-score">${player.points} pkt</span>
                </div>
                <div class="player-resources">${resourcesHtml}</div>
                <div class="player-token-count">Żetony: ${totalTokens}/10</div>
                ${noblesHtml}
                ${reservedHtml}
            `;

            container.appendChild(panel);

            // Reserved card click
            if (idx === this.game.currentPlayer && !this.game.gameOver) {
                panel.querySelectorAll('.reserved-mini-card').forEach(miniCard => {
                    miniCard.addEventListener('click', () => {
                        const cardIdx = parseInt(miniCard.dataset.idx);
                        const card = player.reserved[cardIdx];
                        this.showReservedCardPopup(card, miniCard);
                    });
                });
            }
        });
    }

    showReservedCardPopup(card, anchorEl) {
        document.querySelectorAll('.reserved-card-tooltip').forEach(t => t.remove());

        const tooltip = this.createCardElement(card, true, true);
        tooltip.classList.add('reserved-card-tooltip');
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = '50';
        tooltip.style.width = '120px';
        tooltip.style.height = '170px';

        const rect = anchorEl.getBoundingClientRect();
        tooltip.style.left = `${Math.min(rect.left, window.innerWidth - 130)}px`;
        tooltip.style.top = `${Math.max(10, rect.top - 180)}px`;
        tooltip.classList.add('show-actions');

        document.body.appendChild(tooltip);

        const closeHandler = (e) => {
            if (!tooltip.contains(e.target) && e.target !== anchorEl) {
                tooltip.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }

    // --- TOKEN HANDLING ---

    getMaxTokensToPick() {
        if (this.selectedTokens.length === 2) {
            return this.selectedTokens[0] === this.selectedTokens[1] ? 2 : 3;
        }
        return 3;
    }

    onBankTokenClick(color) {
        if (this.game.gameOver) return;
        if (this.isCurrentPlayerAI()) return;

        if (this.actionMode && this.actionMode !== 'tokens') {
            this.cancelAction();
        }
        this.actionMode = 'tokens';

        const count = this.game.bank[color];
        if (count <= 0) return;

        const currentSelected = [...this.selectedTokens];

        if (currentSelected.length === 0) {
            this.selectedTokens.push(color);
        } else if (currentSelected.length === 1) {
            if (currentSelected[0] === color) {
                if (this.game.bank[color] >= 4) {
                    this.selectedTokens.push(color);
                } else {
                    this.toast('Potrzebujesz min. 4 żetony tego koloru w banku!', 'error');
                    return;
                }
            } else {
                this.selectedTokens.push(color);
            }
        } else if (currentSelected.length === 2) {
            if (currentSelected[0] === currentSelected[1]) return;
            if (currentSelected.includes(color)) {
                this.toast('Musisz wybrać 3 różne kolory!', 'error');
                return;
            }
            this.selectedTokens.push(color);
        } else {
            return;
        }

        this.renderBank();
    }

    confirmTakeTokens() {
        if (!this.game.canTakeTokens(this.selectedTokens)) return;

        const playerPanel = document.getElementById(`player-panel-${this.game.currentPlayer}`);
        if (playerPanel) {
            this.selectedTokens.forEach((color, i) => {
                const bankTokenEl = document.getElementById(`bank-token-${color}`);
                if (bankTokenEl) {
                    setTimeout(() => {
                        this.flyToken(color, bankTokenEl, playerPanel, 0.45);
                    }, i * 120);
                }
            });
        }

        const tokenNames = this.selectedTokens.map(c => GEM_NAMES[c]).join(', ');

        const result = this.game.takeTokens(this.selectedTokens);
        this.selectedTokens = [];
        this.actionMode = null;

        if (result.needsReturn) {
            this.toast(`Wzięto żetony: ${tokenNames}`, 'success');
            setTimeout(() => this.showReturnTokensModal(result.excess), 500);
            this.render();
        } else {
            this.toast(`Wzięto żetony: ${tokenNames}`, 'success');
            this.flashTurn();
            this.render();
            this.afterTurnEnd();
        }
    }

    // --- CARD ACTIONS ---

    onBuyCard(card, fromReserved = false, cardEl = null) {
        if (this.game.gameOver) return;
        if (this.isCurrentPlayerAI()) return;

        const player = this.game.getCurrentPlayer();
        if (!this.game.canAfford(player, card)) {
            this.toast('Nie stać cię na tę kartę!', 'error');
            return;
        }

        if (cardEl && !cardEl.classList.contains('reserved-card-tooltip')) {
            const rect = cardEl.getBoundingClientRect();
            this.spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 10, '✨');
            cardEl.classList.add('card-bought');
        }

        const pointsText = card.points > 0 ? ` (+${card.points} pkt)` : '';

        const playerPanel = document.getElementById(`player-panel-${this.game.currentPlayer}`);
        const cost = this.game.getEffectiveCost(player, card);
        if (playerPanel) {
            let delay = 0;
            GEM_COLORS.forEach(color => {
                for (let i = 0; i < cost[color]; i++) {
                    const bankTokenEl = document.getElementById(`bank-token-${color}`);
                    if (bankTokenEl) {
                        setTimeout(() => this.flyToken(color, playerPanel, bankTokenEl, 0.4), delay);
                        delay += 80;
                    }
                }
            });
            for (let i = 0; i < cost.gold; i++) {
                const bankTokenEl = document.getElementById(`bank-token-gold`);
                if (bankTokenEl) {
                    setTimeout(() => this.flyToken('gold', playerPanel, bankTokenEl, 0.4), delay);
                    delay += 80;
                }
            }
        }

        setTimeout(() => {
            const success = this.game.buyCard(card, fromReserved);
            if (success) {
                document.querySelectorAll('.reserved-card-tooltip').forEach(t => t.remove());
                this.actionMode = null;
                this.selectedTokens = [];

                this.toast(`Kupiono kartę: ${GEM_NAMES[card.gem]}${pointsText}`, 'success');

                this._checkNobleToast();

                this.flashTurn();
                this.checkGameOver();
                if (!this.game.gameOver) {
                    this.afterTurnEnd();
                }
                this.render();
            }
        }, cardEl ? 350 : 0);
    }

    onReserveCard(card, cardEl = null) {
        if (this.game.gameOver) return;
        if (this.isCurrentPlayerAI()) return;

        const player = this.game.getCurrentPlayer();
        if (!this.game.canReserve(player)) {
            this.toast('Masz już 3 zarezerwowane karty!', 'error');
            return;
        }

        if (cardEl) {
            cardEl.classList.add('card-reserved');
        }

        if (this.game.bank.gold > 0) {
            const bankGoldEl = document.getElementById('bank-token-gold');
            const playerPanel = document.getElementById(`player-panel-${this.game.currentPlayer}`);
            if (bankGoldEl && playerPanel) {
                setTimeout(() => this.flyToken('gold', bankGoldEl, playerPanel, 0.45), 200);
            }
        }

        setTimeout(() => {
            const result = this.game.reserveCard(card, false);
            if (result) {
                this.actionMode = null;
                this.selectedTokens = [];
                this.toast(`Zarezerwowano kartę: ${GEM_NAMES[card.gem]} + złoty żeton`, 'warning');

                if (result.needsReturn) {
                    this.render();
                    setTimeout(() => this.showReturnTokensModal(result.excess), 300);
                } else {
                    this.flashTurn();
                    this.checkGameOver();
                    if (!this.game.gameOver) {
                        this.afterTurnEnd();
                    }
                    this.render();
                }
            }
        }, cardEl ? 300 : 0);
    }

    onDeckClick(tier) {
        if (this.game.gameOver) return;
        if (this.isCurrentPlayerAI()) return;

        const player = this.game.getCurrentPlayer();
        if (!this.game.canReserve(player)) {
            this.toast('Masz już 3 zarezerwowane karty!', 'error');
            return;
        }

        if (this.game.decks[tier].length === 0) {
            this.toast('Talia jest pusta!', 'error');
            return;
        }

        if (this.game.bank.gold > 0) {
            const bankGoldEl = document.getElementById('bank-token-gold');
            const playerPanel = document.getElementById(`player-panel-${this.game.currentPlayer}`);
            if (bankGoldEl && playerPanel) {
                this.flyToken('gold', bankGoldEl, playerPanel, 0.45);
            }
        }

        const result = this.game.reserveCard(null, true, tier);
        if (result) {
            this.actionMode = null;
            this.selectedTokens = [];
            this.toast(`Zarezerwowano ukrytą kartę z talii ${tier} + złoty żeton`, 'warning');

            if (result.needsReturn) {
                this.render();
                setTimeout(() => this.showReturnTokensModal(result.excess), 300);
            } else {
                this.flashTurn();
                this.checkGameOver();
                if (!this.game.gameOver) {
                    this.afterTurnEnd();
                }
                this.render();
            }
        }
    }

    _checkNobleToast() {
        // Check if a noble was just claimed by comparing nobles count
        if (this._prevPlayerStates) {
            this.game.players.forEach((player, idx) => {
                const prev = this._prevPlayerStates[idx];
                if (prev && player.nobles.length > prev.nobles) {
                    this.toast(`🎩 Szlachcic odwiedza ${player.name}! (+3 pkt)`, 'noble', 3000);
                }
            });
        }
    }

    // --- RETURN TOKENS ---

    showReturnTokensModal(excess) {
        this.tokensToReturn = excess;
        this.returnedTokens = {};
        document.getElementById('return-tokens-modal').classList.remove('hidden');
        this.updateReturnModal();
    }

    updateReturnModal() {
        const playerIdx = this.game._pendingPlayer;
        const player = this.game.players[playerIdx];
        const totalTokens = this.game.getPlayerTokenCount(player);
        const totalReturned = Object.values(this.returnedTokens).reduce((s, v) => s + v, 0);
        const remaining = this.tokensToReturn - totalReturned;

        document.getElementById('token-count-display').textContent = totalTokens;
        document.getElementById('tokens-to-return').textContent = remaining;

        const container = document.getElementById('return-token-options');
        container.innerHTML = '';

        ALL_COLORS.forEach(color => {
            const available = player.tokens[color] - (this.returnedTokens[color] || 0);
            if (player.tokens[color] > 0) {
                const btn = document.createElement('div');
                btn.className = 'return-token-btn';
                btn.dataset.color = color;
                btn.innerHTML = `${GEM_SYMBOLS[color]}<span class="return-count">${this.returnedTokens[color] || 0}</span>`;
                btn.style.opacity = available > 0 && remaining > 0 ? '1' : '0.4';

                if (available > 0 && remaining > 0) {
                    btn.addEventListener('click', () => {
                        this.returnedTokens[color] = (this.returnedTokens[color] || 0) + 1;
                        this.updateReturnModal();
                    });
                }

                container.appendChild(btn);
            }
        });

        document.getElementById('confirm-return').disabled = remaining > 0;
    }

    confirmReturnTokens() {
        const playerIdx = this.game._pendingPlayer;

        Object.entries(this.returnedTokens).forEach(([color, count]) => {
            for (let i = 0; i < count; i++) {
                this.game.returnToken(playerIdx, color);
            }
        });

        const returnedNames = Object.entries(this.returnedTokens)
            .filter(([, c]) => c > 0)
            .map(([color, count]) => `${count}x ${GEM_NAMES[color]}`)
            .join(', ');

        this.returnedTokens = {};
        this.tokensToReturn = 0;

        document.getElementById('return-tokens-modal').classList.add('hidden');

        this.toast(`Zwrócono żetony: ${returnedNames}`, 'info');

        this.game.endTurn();
        this.flashTurn();
        this.checkGameOver();
        if (!this.game.gameOver) {
            this.afterTurnEnd();
        }
        this.render();
    }

    // --- HELPERS ---

    cancelAction() {
        this.selectedTokens = [];
        this.actionMode = null;
        document.querySelectorAll('.dev-card.show-actions').forEach(c => c.classList.remove('show-actions'));
        document.querySelectorAll('.reserved-card-tooltip').forEach(t => t.remove());
        this.render();
    }

    checkGameOver() {
        if (this.game.gameOver && this.game.winner) {
            setTimeout(() => {
                this.spawnConfetti(40);
                document.getElementById('winner-text').textContent =
                    `${this.game.winner.name} wygrywa z ${this.game.winner.points} punktami prestiżu! 🎉`;
                document.getElementById('game-over-modal').classList.remove('hidden');
            }, 600);
        }
    }

    showMessage(text) {
        this.toast(text, 'error');
    }

    getGemCSSColor(color) {
        const colors = {
            white: '#bdc3c7', blue: '#2980b9', green: '#27ae60',
            red: '#e74c3c', black: '#34495e', gold: '#f1c40f'
        };
        return colors[color] || '#888';
    }
}
