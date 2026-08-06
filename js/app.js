import { authService, userService, dbService, adminService } from './firebase-init.js';
import { GardenLogic, PLANT_CONFIG, getMarketPrices, getCurrentWeather } from './garden-logic.js';
import { audioService } from './audio.js';

document.addEventListener('DOMContentLoaded', async () => {
    // State
    let currentUser = null;
    let inventory = {};
    let coins = 20; // Default start balance
    let marketPrices = getMarketPrices();
    const adminEmail = 'timo410@icloud.com';

    // UI Elements
    const garden = new GardenLogic('garden-grid');
    const viewGarden = document.getElementById('view-garden');
    const viewMarket = document.getElementById('view-market');
    const viewLeaderboard = document.getElementById('view-leaderboard');
    const viewAdmin = document.getElementById('view-admin');
    const navGarden = document.getElementById('nav-garden');
    const navMarket = document.getElementById('nav-market');
    const navLeaderboard = document.getElementById('nav-leaderboard');
    const navAdmin = document.getElementById('nav-admin');
    const actionPanel = document.getElementById('action-panel');
    const tickerContent = document.getElementById('ticker-content');
    const weatherBadge = document.getElementById('weather-badge');
    const weatherOverlay = document.getElementById('weather-overlay');

    // Mobile nav
    const mobNavGarden = document.getElementById('mob-nav-garden');
    const mobNavMarket = document.getElementById('mob-nav-market');
    const mobNavLeaderboard = document.getElementById('mob-nav-leaderboard');
    const mobNavInfo   = document.getElementById('mob-nav-info');
    const mobNavLogin  = document.getElementById('mob-nav-login');
    const mobNavManual = document.getElementById('mob-nav-manual');
    const mobUserLabel = document.getElementById('mob-user-label');

    const actionDetailsMsg = document.querySelector('#action-details > p');
    const plotDetailsView = document.getElementById('plot-details');
    const emptyPlotView = document.getElementById('empty-plot');
    const plotTitle = document.getElementById('plot-title');
    const plantName = document.querySelector('.plant-name');
    const progressFill = document.querySelector('.progress-fill');
    
    const btnWater = document.getElementById('btn-water');
    const btnHarvest = document.getElementById('btn-harvest');
    const btnFertilize = document.getElementById('btn-fertilize');
    const btnPlant = document.getElementById('btn-plant');
    const seedSelector = document.getElementById('seed-selector');

    // Auth Elements
    const loginModal = document.getElementById('auth-modal');
    const btnShowLogin = document.getElementById('btn-show-login');
    const btnCloseModal = document.getElementById('btn-close-modal');
    
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const btnSubmitAuth = document.getElementById('btn-submit-auth');
    const groupUsername = document.getElementById('group-username');
    const authModalTitle = document.getElementById('auth-modal-title');
    let currentAuthMode = 'login'; // 'login' or 'register'

    // Manual Elements
    const manualModal = document.getElementById('manual-modal');
    const btnCloseManual = document.getElementById('btn-close-manual');
    const navManual = document.getElementById('nav-manual');

    const emailInput = document.getElementById('auth-email');
    const pwdInput = document.getElementById('auth-password');
    const usernameInput = document.getElementById('auth-username');
    const authErrorMsg = document.getElementById('auth-error-msg');
    const loginPrompt = document.getElementById('login-prompt');
    const userInfoDisplay = document.getElementById('user-info-display');
    const userEmailEl = document.getElementById('user-email');
    const userRoleEl = document.getElementById('user-role');
    const btnLogout = document.getElementById('btn-logout');

    const personalSeedsEl = document.getElementById('personal-seeds');
    const personalHarvestEl = document.getElementById('personal-harvest');
    const globalCoinsEl = document.getElementById('global-coins');
    const shopSpecialEl = document.getElementById('shop-special');
    const shopSeedsEl = document.getElementById('shop-seeds');

    // ─── Utility: Save player data to Firebase ───────────────────────────────
    async function saveProfile() {
        if (currentUser) {
            const displayName = currentUser.displayName || currentUser.email;
            await userService.saveProfile(currentUser.uid, displayName, coins, inventory);
        }
    }

    // ─── Navigation Logic (Desktop & Mobile) ─────────────────────────────────
    function showGarden() {
        navGarden.classList.add('active'); navMarket.classList.remove('active'); navAdmin.classList.remove('active'); navLeaderboard.classList.remove('active');
        viewGarden.classList.remove('hidden'); viewMarket.classList.add('hidden'); viewAdmin.classList.add('hidden'); viewLeaderboard.classList.add('hidden');
        mobNavGarden.classList.add('active'); mobNavMarket.classList.remove('active'); mobNavLeaderboard.classList.remove('active');
        actionPanel.classList.remove('open');
        mobNavInfo.classList.remove('active');
    }
    async function showMarket() {
        navMarket.classList.add('active'); navGarden.classList.remove('active'); navAdmin.classList.remove('active'); navLeaderboard.classList.remove('active');
        viewMarket.classList.remove('hidden'); viewGarden.classList.add('hidden'); viewAdmin.classList.add('hidden'); viewLeaderboard.classList.add('hidden');
        mobNavMarket.classList.add('active'); mobNavGarden.classList.remove('active'); mobNavLeaderboard.classList.remove('active');
        actionPanel.classList.remove('open');
        mobNavInfo.classList.remove('active');
        marketPrices = getMarketPrices();
        await renderShop();
    }
    async function showLeaderboard() {
        navLeaderboard.classList.add('active'); navGarden.classList.remove('active'); navMarket.classList.remove('active'); navAdmin.classList.remove('active');
        viewLeaderboard.classList.remove('hidden'); viewGarden.classList.add('hidden'); viewMarket.classList.add('hidden'); viewAdmin.classList.add('hidden');
        mobNavLeaderboard.classList.add('active'); mobNavGarden.classList.remove('active'); mobNavMarket.classList.remove('active');
        actionPanel.classList.remove('open');
        mobNavInfo.classList.remove('active');
        await renderLeaderboard();
    }
    function showAdmin() {
        navAdmin.classList.add('active'); navGarden.classList.remove('active'); navMarket.classList.remove('active'); navLeaderboard.classList.remove('active');
        viewAdmin.classList.remove('hidden'); viewGarden.classList.add('hidden'); viewMarket.classList.add('hidden'); viewLeaderboard.classList.add('hidden');
        actionPanel.classList.remove('open');
        mobNavInfo.classList.remove('active');
    }

    navGarden.addEventListener('click', showGarden);
    navMarket.addEventListener('click', showMarket);
    navLeaderboard.addEventListener('click', showLeaderboard);
    navAdmin.addEventListener('click', showAdmin);

    // ─── Mobile Nav ──────────────────────────────────────────────────────────
    mobNavGarden.addEventListener('click', showGarden);
    mobNavMarket.addEventListener('click', showMarket);
    mobNavLeaderboard.addEventListener('click', showLeaderboard);
    mobNavInfo.addEventListener('click', () => {
        const isOpen = actionPanel.classList.toggle('open');
        mobNavInfo.classList.toggle('active', isOpen);
    });
    // Close drawer when clicking outside (on garden)
    viewGarden.addEventListener('click', (e) => {
        // Only close if clicking the background, not a plot
        if (!e.target.closest('.plot')) {
            actionPanel.classList.remove('open');
            mobNavInfo.classList.remove('active');
        }
    });
    mobNavLogin.addEventListener('click', () => {
        if (currentUser) {
            // Already logged in - show logout confirm
            if (confirm("Möchtest du dich ausloggen?")) {
                authService.logout();
            }
        } else {
            loginModal.classList.remove('hidden');
        }
    });

    // ─── Manual Handlers ─────────────────────────────────────────────────────
    function showManual() {
        manualModal.classList.remove('hidden');
    }
    navManual?.addEventListener('click', showManual);
    mobNavManual?.addEventListener('click', showManual);
    btnCloseManual?.addEventListener('click', () => manualModal.classList.add('hidden'));

    // ─── Authentication Logic ─────────────────────────────────────────────────
    btnShowLogin.addEventListener('click', () => loginModal.classList.remove('hidden'));
    btnCloseModal.addEventListener('click', () => loginModal.classList.add('hidden'));

    tabLogin.addEventListener('click', () => {
        currentAuthMode = 'login';
        groupUsername.classList.add('hidden');
        authModalTitle.innerText = 'Einloggen';
        btnSubmitAuth.innerText = 'Einloggen';
        tabLogin.style.backgroundColor = 'var(--gold)';
        tabRegister.style.backgroundColor = 'var(--wood-light)';
    });

    tabRegister.addEventListener('click', () => {
        currentAuthMode = 'register';
        groupUsername.classList.remove('hidden');
        authModalTitle.innerText = 'Registrieren';
        btnSubmitAuth.innerText = 'Registrieren';
        tabRegister.style.backgroundColor = 'var(--gold)';
        tabLogin.style.backgroundColor = 'var(--wood-light)';
    });

    const handleAuthAction = async () => {
        authErrorMsg.classList.add('hidden');
        authErrorMsg.innerText = '';
        const email = emailInput.value.trim();
        const pwd = pwdInput.value;
        const username = usernameInput.value.trim();
        if (!email || !pwd) {
            authErrorMsg.innerText = "Bitte E-Mail und Passwort eingeben!";
            authErrorMsg.classList.remove('hidden');
            return;
        }
        try {
            if (currentAuthMode === 'login') {
                currentUser = await authService.login(email, pwd);
                // Load profile from Firebase
                const profile = await userService.getProfile(currentUser.uid);
                coins = profile.coins ?? 20;
                inventory = profile.inventory ?? {};
            } else {
                currentUser = await authService.register(email, pwd, username);
                // createProfile is called inside authService.register
                coins = 20;
                inventory = {};
            }
            updateUserUI();
            updateInventoryUI();
            loginModal.classList.add('hidden');
        } catch (error) {
            console.error("Auth Error:", error);
            authErrorMsg.innerText = "Fehler: " + error.message;
            authErrorMsg.classList.remove('hidden');
            audioService.playError();
        }
    };

    btnSubmitAuth.addEventListener('click', handleAuthAction);
    btnLogout.addEventListener('click', async () => {
        await authService.logout();
        currentUser = null;
        coins = 20;
        inventory = {};
        updateUserUI();
        updateInventoryUI();
    });

    authService.onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            const profile = await userService.getProfile(user.uid);
            coins = profile.coins ?? 20;
            inventory = profile.inventory ?? {};
            updateInventoryUI();
            
            // Auto-sync username for old accounts that don't have it in Firestore yet
            if (!profile.username) {
                await saveProfile();
            }
        }
        updateUserUI();
    });

    function updateUserUI() {
        if (currentUser) {
            loginPrompt.classList.add('hidden');
            userInfoDisplay.classList.remove('hidden');
            userEmailEl.innerText = currentUser.displayName || currentUser.email;
            mobUserLabel.innerText = currentUser.displayName || 'Ich';
            if (currentUser.email === adminEmail) {
                userRoleEl.innerHTML = '<span class="admin-badge">Admin</span>';
                navAdmin.classList.remove('hidden');
            } else {
                userRoleEl.innerText = "Gärtner";
                navAdmin.classList.add('hidden');
            }
        } else {
            loginPrompt.classList.remove('hidden');
            userInfoDisplay.classList.add('hidden');
            navAdmin.classList.add('hidden');
            mobUserLabel.innerText = 'Login';
        }
    }

    // ─── Inventory & Market UI ────────────────────────────────────────────────
    function getTrendHtml(trend) {
        if (trend === 'up')   return '<span style="color:#16a34a;font-size:1.3rem;">▲</span>';
        if (trend === 'down') return '<span style="color:#dc2626;font-size:1.3rem;">▼</span>';
        return '<span style="color:#ca8a04;font-size:1.3rem;">─</span>';
    }

    function updateInventoryUI() {
        globalCoinsEl.innerText = coins;
        
        // Update seed dropdown
        seedSelector.innerHTML = '<option value="">-- Samen wählen --</option>';
        personalSeedsEl.innerHTML = '';
        let hasSeeds = false;

        for (const [key, amount] of Object.entries(inventory)) {
            if (key === 'item_fertilizer' && amount > 0) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'inventory-item';
                itemDiv.innerHTML = `<span>🧪 Magischer Dünger x${amount}</span>`;
                personalSeedsEl.prepend(itemDiv); // put it at top of seeds
            }
            if (key.startsWith('seed_') && amount > 0) {
                hasSeeds = true;
                const emoji = key.split('_')[1];
                const config = PLANT_CONFIG[emoji];
                const itemDiv = document.createElement('div');
                itemDiv.className = 'inventory-item';
                itemDiv.innerHTML = `<span>${config.seed} ${config.name}-Samen x${amount}</span>`;
                personalSeedsEl.appendChild(itemDiv);
                const opt = document.createElement('option');
                opt.value = emoji;
                opt.innerText = `${config.seed} ${config.name} (${amount}x)`;
                seedSelector.appendChild(opt);
            }
        }
        if (!hasSeeds) personalSeedsEl.innerHTML = '<p class="text-muted" style="font-size:1rem;">Keine Samen. Kaufe im Markt!</p>';

        btnPlant.disabled = seedSelector.value === "";
        btnPlant.classList.toggle('btn-disabled', seedSelector.value === "");

        // Update harvest inventory with live market prices
        personalHarvestEl.innerHTML = '';
        const marketSellContainer = document.getElementById('market-sell-container');
        if (marketSellContainer) marketSellContainer.innerHTML = '';
        let hasHarvest = false;
        
        for (const [key, amount] of Object.entries(inventory)) {
            if (key.startsWith('harvest_') && amount > 0) {
                hasHarvest = true;
                const emoji = key.split('_')[1];
                const config = PLANT_CONFIG[emoji];
                const price = marketPrices[emoji];
                
                // Sidebar: Just text
                const itemDiv = document.createElement('div');
                itemDiv.className = 'inventory-item';
                itemDiv.style.justifyContent = 'flex-start';
                itemDiv.innerHTML = `<span style="font-size:1.1rem; margin-right:10px;">${emoji}</span> <span>${config.name} (x${amount})</span>`;
                personalHarvestEl.appendChild(itemDiv);

                // Market: Sell Card
                if (marketSellContainer) {
                    const trendHtml = getTrendHtml(price.trend);
                    const sellCard = document.createElement('div');
                    sellCard.className = 'shop-item stardew-panel';
                    sellCard.style.padding = '10px';
                    sellCard.style.display = 'flex';
                    sellCard.style.flexDirection = 'column';
                    sellCard.style.alignItems = 'center';
                    sellCard.innerHTML = `
                        <div style="font-size:2.5rem; margin-bottom:5px;">${emoji}</div>
                        <h4 style="margin:0; font-size:1.1rem;">${config.name} (x${amount})</h4>
                        <div class="price" style="margin:8px 0; font-size:1.2rem;">${price.current} G ${trendHtml}</div>
                        <button class="btn btn-small" style="width:100%; background:var(--gold); color:black;">Verkaufen</button>
                    `;
                    sellCard.querySelector('button').addEventListener('click', async () => {
                        inventory[key]--;
                        coins += price.current;
                        updateInventoryUI();
                        await saveProfile();
                        audioService.playCoin();
                        if (currentUser) {
                            const plantedBy = currentUser.displayName || currentUser.email;
                            dbService.logActivity(`${plantedBy} hat ${emoji} für ${price.current}G verkauft.`);
                        }
                    });
                    marketSellContainer.appendChild(sellCard);
                }
            }
        }
        if (!hasHarvest) {
            personalHarvestEl.innerHTML = '<p class="text-muted" style="font-size:1rem;">Nichts geerntet.</p>';
            if (marketSellContainer) {
                marketSellContainer.innerHTML = '<p class="text-muted" style="grid-column: 1 / -1;">Du hast aktuell nichts zum Verkaufen. Ernte zuerst etwas!</p>';
            }
        }
    }

    seedSelector.addEventListener('change', () => {
        btnPlant.disabled = seedSelector.value === "";
        btnPlant.classList.toggle('btn-disabled', seedSelector.value === "");
    });

    async function renderShop() {
        const scrollContainer = document.getElementById('view-market');
        const savedScroll = scrollContainer ? scrollContainer.scrollTop : 0;

        shopSpecialEl.innerHTML = '';
        shopSeedsEl.innerHTML = '';

        // Market status banner
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1, 0, 0, 0);
        const diffMin = Math.round((nextHour - now) / 60000);
        
        const banner = document.createElement('div');
        banner.style.cssText = 'grid-column:1/-1; background:rgba(0,0,0,0.15); border:3px solid var(--wood-dark); padding:10px; margin-bottom:10px; font-size:1.2rem;';
        banner.innerHTML = `📈 <strong>Aktueller Kurs</strong> &mdash; Ändert sich in <strong>${diffMin} Minuten</strong>`;
        shopSeedsEl.appendChild(banner);

        // Add fertilizer item with live server stock
        const fertDiv = document.createElement('div');
        fertDiv.className = 'shop-item';
        const fertStock = await dbService.getFertilizerStock();
        const now2 = new Date();
        const nextHour2 = new Date(now2);
        nextHour2.setHours(now2.getHours() + 1, 0, 0, 0);
        const fertMinLeft = Math.round((nextHour2 - now2) / 60000);
        const fertSoldOut = fertStock <= 0;
        const fertCantAfford = coins < 300;
        fertDiv.innerHTML = `
            <h4 style="color:#9333ea;">🧪 Magischer Dünger</h4>
            <div class="text-muted" style="font-size:1rem; margin-bottom:5px;">
                Halbiert die Wachstumszeit sofort! (Einmal pro Pflanze)<br>
                <strong style="color:${fertSoldOut ? '#e11d48' : '#16a34a'}">
                    ${fertSoldOut ? '❌ Ausverkauft' : `✅ Noch ${fertStock} verfügbar`}
                </strong>
                &mdash; <span style="font-size:0.9rem;">Neuer Vorrat in ${fertMinLeft} Min.</span>
            </div>
            <div class="price">Preis: 300G</div>
            <button class="btn w-100 btn-buy" ${fertSoldOut || fertCantAfford ? 'disabled' : ''}>
                ${fertSoldOut ? 'Ausverkauft' : fertCantAfford ? 'Nicht genug Gold' : 'Kaufen'}
            </button>
        `;
        fertDiv.querySelector('.btn-buy').addEventListener('click', async () => {
            if (coins >= 300 && !fertSoldOut) {
                const buyBtn = fertDiv.querySelector('.btn-buy');
                buyBtn.disabled = true;
                buyBtn.innerText = '⌛ Kaufe...';
                const success = await dbService.buyFertilizer();
                if (success) {
                    coins -= 300;
                    inventory['item_fertilizer'] = (inventory['item_fertilizer'] || 0) + 1;
                    updateInventoryUI();
                    await saveProfile();
                    audioService.playCoin();
                    await renderShop(); // refresh to show updated stock
                    if (currentUser) {
                        const userDisplayName = currentUser.displayName || currentUser.email;
                        dbService.logActivity(`${userDisplayName} hat 🧪 Magischen Dünger für 300G ergattert!`);
                    }
                } else {
                    audioService.playError();
                    buyBtn.innerText = 'Ausverkauft!';
                    await renderShop();
                }
            } else {
                audioService.playError();
            }
        });
        shopSpecialEl.appendChild(fertDiv);

        for (const [emoji, config] of Object.entries(PLANT_CONFIG)) {
            const price = marketPrices[emoji];
            const trendHtml = getTrendHtml(price.trend);
            const timeInHours = config.growTimeMs / (60 * 60 * 1000);
            const timeStr = timeInHours < 1 ? `${Math.round(timeInHours * 60)} Min` : `${timeInHours} Std.`;
            const canAfford = coins >= config.cost;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.innerHTML = `
                <h4>${config.seed} ${config.name}</h4>
                <div class="text-muted" style="font-size:1rem; margin-bottom:5px;">⏱️ Wachstum: ${timeStr}</div>
                <div style="font-size:1.3rem; margin-bottom:10px;">
                    Verkauf heute: ${trendHtml} <strong>${price.current}G</strong>
                    <div class="text-muted" style="font-size:0.9rem;">Basiswert: ${config.baseValue}G</div>
                </div>
                <div class="price">Samen: ${config.cost}G</div>
                <button class="btn w-100 btn-buy" ${!canAfford ? 'disabled' : ''}>Kaufen</button>
            `;
            itemDiv.querySelector('.btn-buy').addEventListener('click', async () => {
                if (coins >= config.cost) {
                    coins -= config.cost;
                    inventory[`seed_${emoji}`] = (inventory[`seed_${emoji}`] || 0) + 1;
                    updateInventoryUI();
                    updateShopButtonsState();
                    await saveProfile();
                    audioService.playCoin();
                    if (currentUser) {
                        const userDisplayName = currentUser.displayName || currentUser.email;
                        dbService.logActivity(`${userDisplayName} hat ${config.seed} ${config.name} für ${config.cost}G gekauft.`);
                    }
                } else {
                    audioService.playError();
                }
            });
            shopSeedsEl.appendChild(itemDiv);
        }

        if (scrollContainer) {
            scrollContainer.scrollTop = savedScroll;
        }
    }

    function updateShopButtonsState() {
        const fertBtn = shopSpecialEl.querySelector('.btn-buy');
        if (fertBtn && !fertBtn.innerText.includes('Ausverkauft')) {
            fertBtn.disabled = coins < 300;
            fertBtn.innerText = coins < 300 ? 'Nicht genug Gold' : 'Kaufen';
        }

        const seedBtns = shopSeedsEl.querySelectorAll('.shop-item .btn-buy');
        let idx = 0;
        for (const [emoji, config] of Object.entries(PLANT_CONFIG)) {
            const btn = seedBtns[idx++];
            if (btn) {
                btn.disabled = coins < config.cost;
            }
        }
    }

    async function renderLeaderboard() {
        const listEl = document.getElementById('leaderboard-list');
        listEl.innerHTML = '<p class="text-muted" style="text-align:center;">Lade Bestenliste...</p>';
        try {
            const topPlayers = await userService.getTopPlayers(10);
            listEl.innerHTML = '';
            if (topPlayers.length === 0) {
                listEl.innerHTML = '<p class="text-muted" style="text-align:center;">Noch keine Spieler registriert.</p>';
                return;
            }
            topPlayers.forEach((player, index) => {
                const rankText = `#${index + 1}`;
                const itemDiv = document.createElement('div');
                itemDiv.className = `leaderboard-item`;
                itemDiv.innerHTML = `
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span style="font-size: 1.5rem; font-weight: bold; width: 40px;">${rankText}</span>
                        <span>${player.username || 'Gärtner'}</span>
                    </div>
                    <div>💰 ${player.coins} G</div>
                `;
                listEl.appendChild(itemDiv);
            });
        } catch (error) {
            listEl.innerHTML = `<p style="color:#e11d48; text-align:center;">Fehler: ${error.message}</p>`;
        }
    }

    // ─── Garden Actions ───────────────────────────────────────────────────────
    garden.onPlotSelect = (plotData, index) => {
        actionDetailsMsg.classList.add('hidden');
            
        if (plotData && plotData.isPlanted) {
            plotDetailsView.classList.remove('hidden');
            emptyPlotView.classList.add('hidden');
            plotTitle.innerText = `Feld #${index + 1}`;
            
            const config = PLANT_CONFIG[plotData.plantType];
            const progress = garden.getGrowthProgress(plotData);
            plantName.innerText = `Pflanze: ${config.name}`;
            progressFill.style.width = `${progress}%`;
            
            // Guest mode check
            if (!currentUser) {
                btnWater.disabled = true;
                btnWater.classList.add('btn-disabled');
                btnWater.innerText = 'Logge dich ein';
                btnHarvest.disabled = true;
                btnHarvest.classList.add('btn-disabled');
                btnHarvest.innerText = 'Logge dich ein';
                return;
            }

            const canWaterNow = garden.canWater(plotData);
            btnWater.disabled = !canWaterNow || progress >= 100;
            btnWater.classList.toggle('btn-disabled', btnWater.disabled);
            if (!canWaterNow && progress < 100) {
                const remainingMin = Math.ceil(((plotData.lastWateredAt + 3600000) - Date.now()) / 60000);
                btnWater.innerText = `💧 (Warten: ${remainingMin}m)`;
            } else {
                btnWater.innerText = `💧 Gießen (+10%)`;
            }
            
            
            const isOwner = plotData.planterUid === currentUser.uid;
            const rotted = garden.isRotted(plotData);
            const canHarvest = progress >= 100 && !rotted;
            
            // Fertilizer logic
            if (rotted || !isOwner || plotData.isFertilized || progress >= 100 || !(inventory['item_fertilizer'] > 0)) {
                btnFertilize.disabled = true;
                btnFertilize.classList.add('btn-disabled');
                if (rotted) btnFertilize.innerText = "🥀 Verdorrt";
                else if (plotData.isFertilized) btnFertilize.innerText = "🧪 Gedüngt";
                else if (progress >= 100) btnFertilize.innerText = "🧪 Düngen";
                else if (!(inventory['item_fertilizer'] > 0)) btnFertilize.innerText = "🧪 Kein Dünger";
                else btnFertilize.innerText = "Nicht dein Feld";
            } else {
                btnFertilize.disabled = false;
                btnFertilize.classList.remove('btn-disabled');
                btnFertilize.innerText = "🧪 Düngen (-50%)";
            }

            if (rotted) {
                // Anyone can clear a rotted plant
                btnHarvest.disabled = false;
                btnHarvest.classList.remove('btn-disabled');
                btnHarvest.innerText = '🗑️ Entfernen';
            } else if (!isOwner) {
                btnHarvest.disabled = true;
                btnHarvest.classList.add('btn-disabled');
                btnHarvest.innerText = 'Nicht dein Feld';
            } else {
                btnHarvest.disabled = !canHarvest;
                btnHarvest.classList.toggle('btn-disabled', !canHarvest);
                btnHarvest.innerText = '🌾 Ernten';
            }
            
        } else {
            plotDetailsView.classList.add('hidden');
            emptyPlotView.classList.remove('hidden');
            
            if (!currentUser) {
                btnPlant.disabled = true;
                btnPlant.classList.add('btn-disabled');
                btnPlant.innerText = 'Logge dich ein';
                seedSelector.disabled = true;
            } else {
                seedSelector.disabled = false;
                btnPlant.innerText = 'Samen säen';
                btnPlant.disabled = seedSelector.value === "";
                btnPlant.classList.toggle('btn-disabled', seedSelector.value === "");
            }
        }
    };

    btnPlant.addEventListener('click', async () => {
        if (!currentUser) {
            audioService.playError();
            return alert("Bitte melde dich an, um zu pflanzen!");
        }

        // Check plot limit (max 6)
        const userPlotsCount = garden.plots.filter(p => p && p.isPlanted && p.planterUid === currentUser.uid).length;
        if (userPlotsCount >= 6) {
            audioService.playError();
            return alert("Du bewirtschaftest bereits dein Maximum von 6 Feldern! Ernte zuerst etwas, um Platz zu machen.");
        }

        const selectedSeed = seedSelector.value;
        if (garden.activePlotIndex !== null && selectedSeed) {
            if (inventory[`seed_${selectedSeed}`] > 0) {
                btnPlant.disabled = true;
                const plantedBy = currentUser.displayName || currentUser.email;
                const success = await garden.plantSeed(garden.activePlotIndex, selectedSeed, plantedBy, currentUser.uid);
                if (success) {
                    inventory[`seed_${selectedSeed}`]--;
                    updateInventoryUI();
                    await saveProfile();
                    audioService.playPlant();
                    const plotEl = garden.gridContainer.children[garden.activePlotIndex];
                    plotEl.classList.add('bounce-animation');
                    setTimeout(() => plotEl.classList.remove('bounce-animation'), 400);
                    dbService.logActivity(`${plantedBy} hat ${PLANT_CONFIG[selectedSeed].emoji} ${PLANT_CONFIG[selectedSeed].name} gepflanzt.`);
                }
                btnPlant.disabled = false;
            }
        }
    });

    btnWater.addEventListener('click', async () => {
        if (!currentUser) return alert("Bitte melde dich an!");
        if (garden.activePlotIndex !== null) {
            await garden.waterPlant(garden.activePlotIndex);
            audioService.playWater();
        }
    });

    btnHarvest.addEventListener('click', async () => {
        if (!currentUser) return alert("Bitte melde dich an!");
        if (garden.activePlotIndex !== null) {
            const plotData = garden.plots[garden.activePlotIndex];
            const rotted = garden.isRotted(plotData);
            
            // If it's not rotted, only the owner can harvest
            if (!rotted && plotData.planterUid !== currentUser.uid) {
                audioService.playError();
                return alert("Du kannst nur deine eigenen Pflanzen ernten!");
            }
            
            const harvestedItem = await garden.harvestPlant(garden.activePlotIndex);
            
            const plotEl = garden.gridContainer.children[garden.activePlotIndex];
            garden.handlePlotClick(garden.activePlotIndex, plotEl);

            if (harvestedItem) {
                inventory[`harvest_${harvestedItem}`] = (inventory[`harvest_${harvestedItem}`] || 0) + 1;
                updateInventoryUI();
                await saveProfile();
                
                audioService.playHarvest();
                const floatingText = document.createElement('div');
                floatingText.className = 'floating-text';
                floatingText.innerText = `+1 ${PLANT_CONFIG[harvestedItem].emoji}`;
                plotEl.appendChild(floatingText);
                setTimeout(() => floatingText.remove(), 1000);
                
                const plantedBy = currentUser.displayName || currentUser.email;
                dbService.logActivity(`${plantedBy} hat eine ${PLANT_CONFIG[harvestedItem].emoji} geerntet!`);
            } else if (rotted) {
                audioService.playHarvest(); // Reuse sound for clearing
                const floatingText = document.createElement('div');
                floatingText.className = 'floating-text';
                floatingText.innerText = `Entfernt`;
                plotEl.appendChild(floatingText);
                setTimeout(() => floatingText.remove(), 1000);
            }
        }
    });

    btnFertilize.addEventListener('click', async () => {
        if (!currentUser) return alert("Bitte melde dich an!");
        if (garden.activePlotIndex !== null && inventory['item_fertilizer'] > 0) {
            const plotData = garden.plots[garden.activePlotIndex];
            if (plotData.planterUid !== currentUser.uid) {
                audioService.playError();
                return alert("Du kannst nur deine eigenen Pflanzen düngen!");
            }
            if (plotData.isFertilized) return;
            
            inventory['item_fertilizer']--;
            updateInventoryUI();
            await saveProfile();
            
            await garden.applyFertilizer(garden.activePlotIndex);
            audioService.playWater(); // re-use water sound for fertilizer
            garden.handlePlotClick(garden.activePlotIndex, garden.gridContainer.children[garden.activePlotIndex]);
            
            const plantedBy = currentUser.displayName || currentUser.email;
            dbService.logActivity(`${plantedBy} hat ein Feld mit 🧪 Magischem Dünger verzaubert!`);
        }
    });

    // ─── Admin Panel ─────────────────────────────────────────────────────────
    const adminPlayerList = document.getElementById('admin-player-list');
    const adminBanList = document.getElementById('admin-ban-list');
    const btnAdminReloadPlayers = document.getElementById('btn-admin-reload-players');
    const btnAdminBanManual = document.getElementById('btn-admin-ban-manual');
    const adminBanEmailInput = document.getElementById('admin-ban-email-input');

    // Extra Admin Tools
    const adminPlotIdInput = document.getElementById('admin-plot-id');
    const btnAdminClearPlot = document.getElementById('btn-admin-clear');
    const adminUserIdInput = document.getElementById('admin-user-id');
    const adminGoldAmountInput = document.getElementById('admin-gold-amount');
    const btnAdminGiveGold = document.getElementById('btn-admin-give-gold');

    async function renderAdminPlayerList() {
        adminPlayerList.innerHTML = '<p class="text-muted">Lade Spieler...</p>';
        try {
            const players = await userService.getAllPlayers();
            adminPlayerList.innerHTML = '';
            if (players.length === 0) {
                adminPlayerList.innerHTML = '<p class="text-muted">Keine Spieler gefunden.</p>';
                return;
            }
            players.forEach(player => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex; align-items:center; gap:10px; background:#fff8f8; border:2px solid #e11d48; padding:8px 12px; border-radius:4px; flex-wrap:wrap;';
                row.innerHTML = `
                    <span style="flex:1; font-size:1.1rem;"><strong>${player.username || 'Unbekannt'}</strong> — 💰 ${player.coins}G</span>
                    <span style="color:#888; font-size:0.8rem; font-family:monospace;">${player.uid}</span>
                    <button class="btn btn-small" style="background:#e11d48; color:white;" data-uid="${player.uid}" data-action="delete">🗑️ Löschen</button>
                    <button class="btn btn-small" style="background:#7c1a1a; color:white;" data-uid="${player.uid}" data-username="${player.username || ''}" data-action="ban">🚫 Bannen</button>
                `;
                adminPlayerList.appendChild(row);
            });

            adminPlayerList.querySelectorAll('button[data-action="delete"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const uid = btn.dataset.uid;
                    if (!confirm(`Spieler wirklich löschen? Diese Aktion kann NICHT rückgängig gemacht werden!`)) return;
                    try {
                        await adminService.deletePlayer(uid);
                        dbService.logActivity(`🗑️ Admin hat einen Spieler gelöscht.`);
                        await renderAdminPlayerList();
                        alert('Spieler wurde aus der Datenbank gelöscht.');
                    } catch(e) {
                        alert('Fehler beim Löschen: ' + e.message);
                    }
                });
            });

            adminPlayerList.querySelectorAll('button[data-action="ban"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const email = prompt('E-Mail des Spielers zum Bannen eingeben:');
                    if (!email) return;
                    if (!confirm(`Spieler "${email}" wirklich bannen?`)) return;
                    try {
                        await adminService.banEmail(email);
                        dbService.logActivity(`🚫 Admin hat ${email} gebannt.`);
                        await renderAdminBanList();
                        alert(`${email} wurde gebannt.`);
                    } catch(e) {
                        alert('Fehler beim Bannen: ' + e.message);
                    }
                });
            });
        } catch(e) {
            adminPlayerList.innerHTML = `<p style="color:#e11d48;">Fehler: ${e.message}</p>`;
        }
    }

    async function renderAdminBanList() {
        adminBanList.innerHTML = '<p class="text-muted">Lade Bans...</p>';
        try {
            const banned = await adminService.getBannedUsers();
            adminBanList.innerHTML = '';
            if (banned.length === 0) {
                adminBanList.innerHTML = '<p class="text-muted" style="color:#aaa;">Keine aktiven Bans.</p>';
                return;
            }
            banned.forEach(entry => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex; align-items:center; gap:10px; background:#2d0000; border:2px solid #e11d48; padding:8px 12px; border-radius:4px; flex-wrap:wrap;';
                const date = entry.bannedAt ? new Date(entry.bannedAt).toLocaleDateString('de-DE') : '?';
                row.innerHTML = `
                    <span style="flex:1; color:#ff8888; font-size:1.1rem;">🚫 ${entry.email}</span>
                    <span style="color:#888; font-size:0.85rem;">gebannt am ${date}</span>
                    <button class="btn btn-small" style="background:#2d6a2d; color:white;" data-email="${entry.email}">✅ Entsperren</button>
                `;
                adminBanList.appendChild(row);
            });

            adminBanList.querySelectorAll('button[data-email]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const email = btn.dataset.email;
                    if (!confirm(`Ban für "${email}" wirklich aufheben?`)) return;
                    try {
                        await adminService.unbanEmail(email);
                        dbService.logActivity(`✅ Admin hat den Ban von ${email} aufgehoben.`);
                        await renderAdminBanList();
                        alert(`${email} wurde entsperrt.`);
                    } catch(e) {
                        alert('Fehler beim Entsperren: ' + e.message);
                    }
                });
            });
        } catch(e) {
            adminBanList.innerHTML = `<p style="color:#e11d48;">Fehler: ${e.message}</p>`;
        }
    }

    if (btnAdminReloadPlayers) {
        btnAdminReloadPlayers.addEventListener('click', async () => {
            await renderAdminPlayerList();
            await renderAdminBanList();
        });
    }

    if (btnAdminBanManual) {
        btnAdminBanManual.addEventListener('click', async () => {
            const email = adminBanEmailInput.value.trim();
            if (!email) return alert('Bitte E-Mail eingeben.');
            if (!confirm(`"${email}" wirklich bannen?`)) return;
            try {
                await adminService.banEmail(email);
                dbService.logActivity(`🚫 Admin hat ${email} gebannt.`);
                adminBanEmailInput.value = '';
                await renderAdminBanList();
                alert(`${email} wurde erfolgreich gebannt.`);
            } catch(e) {
                alert('Fehler: ' + e.message);
            }
        });
    }

    if (btnAdminClearPlot) {
        btnAdminClearPlot.addEventListener('click', async () => {
            const plotId = parseInt(adminPlotIdInput.value);
            if (isNaN(plotId) || plotId < 0 || plotId >= 48) return alert("Ungültige Feld ID (0-47).");
            if (!confirm(`Feld ${plotId} wirklich zwangsräumen?`)) return;
            try {
                // Clear the plot via dbService
                await dbService.savePlotState(1, plotId, {
                    isPlanted: false, plantType: null, waterCount: 0,
                    lastWateredAt: 0, plantedAt: null, plantedBy: null,
                    planterUid: null, isFertilized: false
                });
                dbService.logActivity(`🧹 Admin hat Feld ${plotId} geräumt.`);
                adminPlotIdInput.value = '';
                alert(`Feld ${plotId} wurde geräumt.`);
            } catch(e) {
                alert('Fehler: ' + e.message);
            }
        });
    }

    if (btnAdminGiveGold) {
        btnAdminGiveGold.addEventListener('click', async () => {
            const uid = adminUserIdInput.value.trim();
            const amount = parseInt(adminGoldAmountInput.value);
            if (!uid) return alert("Bitte Spieler-ID eingeben.");
            if (isNaN(amount) || amount <= 0) return alert("Bitte gültigen Betrag eingeben.");
            if (!confirm(`Wirklich ${amount}G an Spieler ${uid} senden?`)) return;
            try {
                await adminService.giveGold(uid, amount);
                dbService.logActivity(`💰 Admin hat einem Spieler ${amount}G überwiesen.`);
                adminUserIdInput.value = '';
                adminGoldAmountInput.value = '';
                await renderAdminPlayerList();
                alert("Gold erfolgreich überwiesen!");
            } catch(e) {
                alert('Fehler: ' + e.message);
            }
        });
    }

    // Auto-load admin panel when navigating there
    navAdmin?.addEventListener('click', async () => {
        if (currentUser?.email === adminEmail) {
            await renderAdminPlayerList();
            await renderAdminBanList();
        }
    });

    // ─── Weather & Night UI ─────────────────────────────────────────────────
    function updateWeatherUI() {
        const weather = getCurrentWeather();
        weatherBadge.innerText = `${weather.icon} ${weather.name}`;
        weatherOverlay.className = '';
        if (weather.type !== 'cloud') {
            weatherOverlay.classList.add(weather.type);
        }
        
        // Day / Night cycle logic
        const hours = new Date().getHours();
        const nightOverlay = document.getElementById('night-overlay');
        if (hours >= 19 || hours < 7) {
            nightOverlay.classList.add('active');
        } else {
            nightOverlay.classList.remove('active');
        }
    }
    setInterval(updateWeatherUI, 60000);

    // Initialize
    updateWeatherUI();
    updateInventoryUI();
    await garden.initialize();
});
