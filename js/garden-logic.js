import { dbService } from './firebase-init.js';

export const PLANT_CONFIG = {
    '🥔': { name: 'Kartoffel',  emoji: '🥔', seed: '🌱', cost: 2,   baseValue: 8,    growTimeMs: 0.5 * 60 * 60 * 1000 },
    '🥕': { name: 'Karotte',    emoji: '🥕', seed: '🌱', cost: 5,   baseValue: 15,   growTimeMs: 1  * 60 * 60 * 1000 },
    '🧅': { name: 'Zwiebel',    emoji: '🧅', seed: '🌱', cost: 8,   baseValue: 22,   growTimeMs: 2  * 60 * 60 * 1000 },
    '🍓': { name: 'Erdbeere',   emoji: '🍓', seed: '🌱', cost: 10,  baseValue: 28,   growTimeMs: 3  * 60 * 60 * 1000 },
    '🍅': { name: 'Tomate',     emoji: '🍅', seed: '🌱', cost: 15,  baseValue: 40,   growTimeMs: 6  * 60 * 60 * 1000 },
    '🌶️': { name: 'Chili',      emoji: '🌶️', seed: '🌱', cost: 20,  baseValue: 55,   growTimeMs: 9  * 60 * 60 * 1000 },
    '🌽': { name: 'Mais',       emoji: '🌽', seed: '🌱', cost: 30,  baseValue: 85,   growTimeMs: 12 * 60 * 60 * 1000 },
    '🥦': { name: 'Brokkoli',   emoji: '🥦', seed: '🌱', cost: 40,  baseValue: 115,  growTimeMs: 18 * 60 * 60 * 1000 },
    '🌻': { name: 'Sonnenblume',emoji: '🌻', seed: '🌱', cost: 50,  baseValue: 150,  growTimeMs: 24 * 60 * 60 * 1000 },
    '🍆': { name: 'Aubergine',  emoji: '🍆', seed: '🌱', cost: 65,  baseValue: 190,  growTimeMs: 18 * 60 * 60 * 1000 },
    '🫐': { name: 'Blaubeere',  emoji: '🫐', seed: '🌱', cost: 75,  baseValue: 220,  growTimeMs: 12 * 60 * 60 * 1000 },
    '🍎': { name: 'Apfel',      emoji: '🍎', seed: '🌱', cost: 100, baseValue: 280,  growTimeMs: 24 * 60 * 60 * 1000 },
    '🍇': { name: 'Weintraube', emoji: '🍇', seed: '🌱', cost: 120, baseValue: 350,  growTimeMs: 36 * 60 * 60 * 1000 },
    '🍍': { name: 'Ananas',     emoji: '🍍', seed: '🌱', cost: 150, baseValue: 450,  growTimeMs: 42 * 60 * 60 * 1000 },
    '🍉': { name: 'Melone',     emoji: '🍉', seed: '🌱', cost: 200, baseValue: 600,  growTimeMs: 48 * 60 * 60 * 1000 },
    '🎃': { name: 'Kürbis',     emoji: '🎃', seed: '🌱', cost: 500, baseValue: 2000, growTimeMs: 72 * 60 * 60 * 1000 }
};

// Deterministic seeded RNG (Mulberry32)
function mulberry32(seed) {
    let t = seed + 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    return function() {
        let t = seed + 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export function getMarketPrices() {
    const now = new Date();
    const hourVal = 1000 + Math.floor(now.getTime() / (60 * 60 * 1000)); // offset seed
    const prices = {};
    for (const [emoji, config] of Object.entries(PLANT_CONFIG)) {
        // each plant gets slightly different sequence
        const p = mulberry32(hourVal + config.baseValue)();
        const factor = 0.5 + p; // 0.5x to 1.5x
        const currentPrice = Math.floor(config.baseValue * factor);
        
        // trend calculation
        const prevP = mulberry32(hourVal - 1 + config.baseValue)();
        const prevFactor = 0.5 + prevP;
        const prevPrice = Math.floor(config.baseValue * prevFactor);
        let trend = 'flat';
        if (currentPrice > prevPrice) trend = 'up';
        else if (currentPrice < prevPrice) trend = 'down';

        prices[emoji] = { current: currentPrice, base: config.baseValue, trend };
    }
    return prices;
}

export function getCurrentWeather() {
    const now = new Date();
    const hourVal = 5000 + Math.floor(now.getTime() / (60 * 60 * 1000)); // separate offset for weather
    const r = mulberry32(hourVal)();
    if (r < 0.2) return { type: 'rain', icon: '🌧️', name: 'Regen' };
    if (r < 0.6) return { type: 'sun', icon: '☀️', name: 'Sonnig' };
    return { type: 'cloud', icon: '☁️', name: 'Bewölkt' };
}

// Format milliseconds into a human-readable countdown
function formatTimeLeft(ms) {
    if (ms <= 0) return 'Fertig! 🌾';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export class GardenLogic {
    constructor(gridElementId) {
        this.gridContainer = document.getElementById(gridElementId);
        this.plots = [];
        this.activePlotIndex = null;
        this.onPlotSelect = null;
        this.refreshInterval = null;
        this._unsubscribe = null;
        this.currentPage = 1;
    }

    async changePage(newPage) {
        if (this._unsubscribe) {
            this._unsubscribe();
        }
        this.currentPage = newPage;
        
        // Clear active selection when switching pages
        this.activePlotIndex = null;
        this.onPlotSelect?.(null, null);
        
        const data = await dbService.getGardenState(this.currentPage);
        this.plots = data.plots;
        this.renderGrid();

        this._unsubscribe = dbService.onGardenChange(this.currentPage, (plots) => {
            this.plots = plots;
            this.renderGrid();
            if (this.activePlotIndex !== null) {
                this.onPlotSelect?.(this.plots[this.activePlotIndex], this.activePlotIndex);
            }
        });
    }

    async initialize() {
        await this.changePage(1);

        // Refresh countdown labels every second
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => {
            this._refreshCountdowns();
            // Also update right panel if active
            if (this.activePlotIndex !== null && this.plots[this.activePlotIndex]?.isPlanted) {
                this.onPlotSelect?.(this.plots[this.activePlotIndex], this.activePlotIndex);
            }
        }, 1000);
    }

    _refreshCountdowns() {
        this.plots.forEach((plot, index) => {
            if (!plot || !plot.isPlanted || !plot.plantedAt) return;
            const el = this.gridContainer.children[index];
            if (!el) return;
            const config = PLANT_CONFIG[plot.plantType];
            const progress = this.getGrowthProgress(plot);
            const remaining = plot.plantedAt + config.growTimeMs - Date.now()
                - (plot.waterCount || 0) * (config.growTimeMs * 0.1);

            const timeEl = el.querySelector('.plot-countdown');
            if (timeEl) {
                timeEl.innerText = progress >= 100 ? '🌾 Fertig' : formatTimeLeft(Math.max(0, remaining));
            }
            // Swap emoji at 50% growth
            const emojiEl = el.querySelector('.plot-emoji');
            if (emojiEl) emojiEl.innerText = progress < 50 ? config.seed : config.emoji;
        });
    }

    getGrowthProgress(plot) {
        if (!plot || !plot.isPlanted || !plot.plantedAt) return 0;
        const config = PLANT_CONFIG[plot.plantType];
        if (!config) return 0;
        let elapsed = Date.now() - plot.plantedAt;
        elapsed += (plot.waterCount || 0) * (config.growTimeMs * 0.1);
        return Math.min(100, (elapsed / config.growTimeMs) * 100);
    }

    isRotted(plot) {
        if (!plot || !plot.isPlanted || !plot.plantedAt) return false;
        const config = PLANT_CONFIG[plot.plantType];
        if (!config) return false;
        
        // Berechne den genauen Zeitpunkt, wann die Pflanze fertig war (inklusive Gieß-Bonus)
        const finishedAt = plot.plantedAt + config.growTimeMs - ((plot.waterCount || 0) * (config.growTimeMs * 0.1));
        
        // Pflanze verrottet exakt 3 Stunden (3 * 60 * 60 * 1000 ms) NACHDEM sie fertig ist
        const rotTimeMs = 3 * 60 * 60 * 1000;
        return Date.now() >= (finishedAt + rotTimeMs);
    }

    canWater(plot) {
        if (!plot || !plot.isPlanted) return false;
        
        // Block watering if it's currently raining
        const weather = getCurrentWeather();
        if (weather.type === 'rain') return false;
        
        const COOLDOWN = 60 * 60 * 1000;
        return (Date.now() - (plot.lastWateredAt || 0)) >= COOLDOWN;
    }

    renderGrid() {
        const activeIdx = this.activePlotIndex;
        this.gridContainer.innerHTML = '';

        this.plots.forEach((plot, index) => {
            const plotEl = document.createElement('div');
            plotEl.className = 'plot';
            plotEl.dataset.index = index;
            if (index === activeIdx) plotEl.classList.add('active');

            if (plot && plot.isPlanted) {
                plotEl.classList.add('planted');
                const config = PLANT_CONFIG[plot.plantType];
                const progress = this.getGrowthProgress(plot);
                const rotted = this.isRotted(plot);
                if (rotted) plotEl.classList.add('rotted');

                const remaining = plot.plantedAt + config.growTimeMs - Date.now()
                    - (plot.waterCount || 0) * (config.growTimeMs * 0.1);
                const ready = progress >= 100;

                // Build label overlay
                plotEl.innerHTML = `
                    <div class="plot-content">
                        <span class="plot-emoji">${rotted ? '🥀' : (progress < 50 ? config.seed : config.emoji)}</span>
                    </div>
                    <div class="plot-info-overlay ${ready || rotted ? 'ready' : ''}">
                        <span class="plot-countdown">${rotted ? '🥀 Verdorrt' : (ready ? '🌾 Fertig' : formatTimeLeft(Math.max(0, remaining)))}</span>
                        <span class="plot-owner">👤 ${plot.plantedBy || '?'}</span>
                    </div>
                `;

                // Water overlay
                const COOLDOWN = 60 * 60 * 1000;
                if (plot.lastWateredAt && (Date.now() - plot.lastWateredAt < COOLDOWN)) {
                    plotEl.classList.add('watered');
                    plotEl.innerHTML += `<div class="water-overlay"></div>`;
                }
            }

            plotEl.addEventListener('click', () => this.handlePlotClick(index, plotEl));
            this.gridContainer.appendChild(plotEl);
        });
    }

    handlePlotClick(index, element) {
        document.querySelectorAll('.plot').forEach(p => p.classList.remove('active'));
        element?.classList.add('active');
        this.activePlotIndex = index;
        this.onPlotSelect?.(this.plots[index], index);
    }

    async plantSeed(index, seedType, plantedBy, planterUid) {
        const plot = this.plots[index];
        if (plot && !plot.isPlanted && PLANT_CONFIG[seedType]) {
            const newPlant = {
                ...plot,
                isPlanted: true,
                plantType: seedType,
                waterCount: 0,
                lastWateredAt: 0,
                plantedAt: Date.now(),
                plantedBy: plantedBy || 'Unbekannt',
                planterUid: planterUid || null,
                isFertilized: false
            };
            this.plots[index] = newPlant;
            await dbService.savePlotState(this.currentPage, index, newPlant);
            return true;
        }
        return false;
    }

    async waterPlant(index) {
        if (this.canWater(this.plots[index])) {
            const updated = {
                ...this.plots[index],
                waterCount: (this.plots[index].waterCount || 0) + 1,
                lastWateredAt: Date.now()
            };
            this.plots[index] = updated;
            await dbService.savePlotState(this.currentPage, index, updated);
            return true;
        }
        return false;
    }

    async harvestPlant(index) {
        const plot = this.plots[index];
        if (plot && plot.isPlanted && (this.getGrowthProgress(plot) >= 100 || this.isRotted(plot))) {
            const isRotted = this.isRotted(plot);
            const harvestedType = plot.plantType;
            const updated = {
                ...plot,
                isPlanted: false,
                plantType: null,
                waterCount: 0,
                lastWateredAt: 0,
                plantedAt: null,
                plantedBy: null,
                isFertilized: false
            };
            this.plots[index] = updated;
            await dbService.savePlotState(this.currentPage, index, updated);
            this.renderGrid();
            return isRotted ? null : harvestedType;
        }
        return null;
    }

    async applyFertilizer(index) {
        const plot = this.plots[index];
        if (plot && plot.isPlanted && !plot.isFertilized) {
            const config = PLANT_CONFIG[plot.plantType];
            const timeReduction = config.growTimeMs / 2; // Reduce time by 50%
            
            const updated = {
                ...plot,
                plantedAt: plot.plantedAt - timeReduction,
                isFertilized: true
            };
            this.plots[index] = updated;
            await dbService.savePlotState(this.currentPage, index, updated);
            return true;
        }
        return false;
    }
}
