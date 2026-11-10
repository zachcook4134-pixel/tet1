// marketUI.js
export class MarketUI {
    constructor(marketManager, player) {
        this.market = marketManager;
        this.player = player;
        this.isOpen = false;
        this.activeTab = 'BUY';

        this.buildDOM();
        this.bindEvents();
    }

    buildDOM() {
        this.container = document.createElement('div');
        this.container.id = 'market-ui';
        this.container.className = 'hidden';

        this.container.innerHTML = `
            <div class="market-dialog">
                <div class="market-header">
                    <div class="header-left">
                        <h2>🏪 Market Stand</h2>
                        <span id="market-event-badge" class="event-badge">Normal Market</span>
                    </div>
                    <div class="header-right">
                        <span class="coin-display">🪙 <strong id="market-player-coins">0</strong> Coins</span>
                        <button id="close-market-btn" class="close-btn">&times;</button>
                    </div>
                </div>

                <div class="market-tabs">
                    <button id="market-tab-buy" class="market-tab-btn active">Buy Items</button>
                    <button id="market-tab-sell" class="market-tab-btn">Sell Items</button>
                </div>

                <div id="market-item-grid" class="market-grid"></div>

                <div class="market-footer">
                    <span class="hint">Press [M] or [ESC] to exit market. Prices adjust automatically every 15s.</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);

        this.gridEl = document.getElementById('market-item-grid');
        this.coinsEl = document.getElementById('market-player-coins');
        this.eventBadgeEl = document.getElementById('market-event-badge');
    }

    bindEvents() {
        document.getElementById('close-market-btn').addEventListener('click', () => this.close());

        document.getElementById('market-tab-buy').addEventListener('click', (e) => {
            this.activeTab = 'BUY';
            this.updateTabStyles(e.target);
            this.render();
        });

        document.getElementById('market-tab-sell').addEventListener('click', (e) => {
            this.activeTab = 'SELL';
            this.updateTabStyles(e.target);
            this.render();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') {
                this.toggle();
            } else if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    updateTabStyles(activeBtn) {
        document.querySelectorAll('.market-tab-btn').forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    open() {
        this.isOpen = true;
        this.container.classList.remove('hidden');
        if (this.player.controls) this.player.controls.unlock();
        this.render();
    }

    close() {
        this.isOpen = false;
        this.container.classList.add('hidden');
        if (this.player.controls) this.player.controls.lock();
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    render() {
        if (!this.isOpen) return;

        this.coinsEl.innerText = this.player.coins || 0;
        this.eventBadgeEl.innerText = `📢 ${this.market.currentEvent.name}`;

        this.gridEl.innerHTML = '';

        for (const [name, item] of Object.entries(this.market.items)) {
            const buyPrice = this.market.getBuyPrice(name);
            const sellPrice = this.market.getSellPrice(name);
            const trendIcon = item.trend === 'UP' ? '📈' : item.trend === 'DOWN' ? '📉' : '➡️';
            const trendClass = item.trend === 'UP' ? 'trend-up' : item.trend === 'DOWN' ? 'trend-down' : 'trend-stable';

            const card = document.createElement('div');
            card.className = 'market-card';

            if (this.activeTab === 'BUY') {
                card.innerHTML = `
                    <div class="card-info">
                        <span class="card-icon">${item.icon}</span>
                        <div class="card-details">
                            <span class="card-name">${name}</span>
                            <span class="card-stock">Stock: ${item.supply}</span>
                        </div>
                    </div>
                    <div class="card-trading">
                        <div class="price-tag ${trendClass}">
                            <span>${buyPrice} Coins</span>
                            <small>${trendIcon}</small>
                        </div>
                        <div class="btn-group">
                            <button class="trade-btn buy-btn" data-name="${name}" data-count="1">Buy x1</button>
                            <button class="trade-btn buy-btn" data-name="${name}" data-count="5">x5</button>
                        </div>
                    </div>
                `;
            } else {
                const countInInv = this.getPlayerItemCount(name);
                card.innerHTML = `
                    <div class="card-info">
                        <span class="card-icon">${item.icon}</span>
                        <div class="card-details">
                            <span class="card-name">${name}</span>
                            <span class="card-stock">In Inventory: ${countInInv}</span>
                        </div>
                    </div>
                    <div class="card-trading">
                        <div class="price-tag sell-price ${trendClass}">
                            <span>${sellPrice} Coins</span>
                            <small>${trendIcon}</small>
                        </div>
                        <div class="btn-group">
                            <button class="trade-btn sell-btn" data-name="${name}" data-count="1" ${countInInv < 1 ? 'disabled' : ''}>Sell x1</button>
                            <button class="trade-btn sell-btn" data-name="${name}" data-count="${countInInv}" ${countInInv < 1 ? 'disabled' : ''}>All (${countInInv})</button>
                        </div>
                    </div>
                `;
            }

            this.gridEl.appendChild(card);
        }

        this.gridEl.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.target.getAttribute('data-name');
                const count = parseInt(e.target.getAttribute('data-count'));
                const res = this.market.buyItem(this.player, name, count);
                if (!res.success) alert(res.reason);
                this.render();
                if (this.player.inventory) this.player.inventory.render();
            });
        });

        this.gridEl.querySelectorAll('.sell-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.target.getAttribute('data-name');
                const count = parseInt(e.target.getAttribute('data-count'));
                if (count <= 0) return;
                const res = this.market.sellItem(this.player, name, count);
                if (!res.success) alert(res.reason);
                this.render();
                if (this.player.inventory) this.player.inventory.render();
            });
        });
    }

    getPlayerItemCount(itemName) {
        if (!this.player || !this.player.inventory) return 0;
        let total = 0;
        const allSlots = [
            ...(this.player.inventory.inventorySlots || []),
            ...(this.player.inventory.hotbarSlots || []),
            ...(this.player.inventory.backpackSlots || [])
        ];

        allSlots.forEach(slot => {
            if (slot && slot.name === itemName) {
                total += slot.count;
            }
        });
        return total;
    }
}