import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot, addDoc, query, orderBy, limit, runTransaction } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD7_KJswuaK3zl9DWGEPrSXdv58t4WvWZs",
  authDomain: "sb-garten.firebaseapp.com",
  projectId: "sb-garten",
  storageBucket: "sb-garten.firebasestorage.app",
  messagingSenderId: "577533547222",
  appId: "1:577533547222:web:e5ce7af8d02196473e6f77",
  measurementId: "G-76J7H92VV0"
};

const useDummy = false; // Real Firebase is configured
let app, auth, db;

app = initializeApp(firebaseConfig);
auth = getAuth(app);
db = getFirestore(app);

// ─── Auth Service ──────────────────────────────────────────────────────────
export const authService = {
    login: async (email, password) => {
        // Check if email is banned before allowing login
        const bannedRef = doc(db, 'banned_users', email.toLowerCase());
        const bannedSnap = await getDoc(bannedRef);
        if (bannedSnap.exists() && bannedSnap.data().banned === true) {
            throw new Error('Du wurdest von diesem Server gebannt. Wende dich an einen Admin.');
        }
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
    },
    register: async (email, password, username) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (username) await updateProfile(cred.user, { displayName: username });
        // Create player profile in Firestore on first register
        await userService.createProfile(cred.user.uid, username || email);
        return cred.user;
    },
    logout: async () => {
        await signOut(auth);
    },
    onAuthStateChanged: (callback) => {
        onAuthStateChanged(auth, callback);
    }
};

// ─── User Profile Service (Inventory & Coins) ─────────────────────────────
export const userService = {
    createProfile: async (uid, username) => {
        const ref = doc(db, 'players', uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, {
                username,
                coins: 20, // Startguthaben
                inventory: {}
            });
        }
    },
    getProfile: async (uid) => {
        const ref = doc(db, 'players', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data();
        return { coins: 20, inventory: {} };
    },
    saveProfile: async (uid, username, coins, inventory) => {
        const ref = doc(db, 'players', uid);
        await setDoc(ref, { username, coins, inventory }, { merge: true });
    },
    getTopPlayers: async (limitCount = 10) => {
        const ref = collection(db, 'players');
        const q = query(ref, orderBy('coins', 'desc'), limit(limitCount));
        const snap = await getDocs(q);
        const topPlayers = [];
        snap.forEach(d => topPlayers.push({ uid: d.id, ...d.data() }));
        return topPlayers;
    },
    getAllPlayers: async () => {
        const ref = collection(db, 'players');
        const snap = await getDocs(ref);
        const players = [];
        snap.forEach(d => players.push({ uid: d.id, ...d.data() }));
        return players;
    }
};

// ─── Admin Service ────────────────────────────────────────────────────────
export const adminService = {
    deletePlayer: async (uid) => {
        // Delete player profile from Firestore
        const ref = doc(db, 'players', uid);
        await deleteDoc(ref);
    },
    banEmail: async (email) => {
        const ref = doc(db, 'banned_users', email.toLowerCase());
        await setDoc(ref, { email: email.toLowerCase(), banned: true, bannedAt: Date.now() });
    },
    unbanEmail: async (email) => {
        const ref = doc(db, 'banned_users', email.toLowerCase());
        await deleteDoc(ref);
    },
    getBannedUsers: async () => {
        const ref = collection(db, 'banned_users');
        const snap = await getDocs(ref);
        const banned = [];
        snap.forEach(d => banned.push({ email: d.id, ...d.data() }));
        return banned;
    },
    giveGold: async (uid, amount) => {
        const ref = doc(db, 'players', uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Spieler nicht gefunden!");
        const currentCoins = snap.data().coins || 0;
        await updateDoc(ref, { coins: currentCoins + amount });
    }
};

// ─── Garden / Plot Service ────────────────────────────────────────────────
export const dbService = {
    getGardenState: async (pageIndex = 1) => {
        try {
            const plotsRef = collection(db, 'garden_plots');
            const snap = await getDocs(plotsRef);
            const plotMap = {};
            // Filter by prefix for this page
            const prefix = `${pageIndex}_`;
            snap.forEach(d => { 
                if(d.id.startsWith(prefix)) {
                    const plotId = d.id.replace(prefix, '');
                    plotMap[plotId] = d.data(); 
                }
            });
            const plots = Array.from({ length: 48 }, (_, i) => ({
                id: i,
                isPlanted: false,
                plantType: null,
                waterCount: 0,
                lastWateredAt: 0,
                plantedAt: null,
                plantedBy: null,
                ...plotMap[String(i)]
            }));
            return { plots };
        } catch (e) {
            console.warn("Firestore not available, using empty plots:", e.message);
            return {
                plots: Array.from({ length: 48 }, (_, i) => ({
                    id: i, isPlanted: false, plantType: null,
                    waterCount: 0, lastWateredAt: 0, plantedAt: null, plantedBy: null
                }))
            };
        }
    },
    /**
     * Subscribe to real-time changes on a single plot.
     * Returns an unsubscribe function.
     */
    onPlotChange: (pageIndex = 1, plotId, callback) => {
        const docId = `${pageIndex}_${plotId}`;
        const ref = doc(db, 'garden_plots', docId);
        return onSnapshot(ref, (snap) => {
            if (snap.exists()) callback({ id: plotId, ...snap.data() });
        });
    },
    /**
     * Subscribe to all 24 plots at once.
     * Fires the callback with the full plots array on any change.
     */
    onGardenChange: (pageIndex = 1, callback) => {
        const ref = collection(db, 'garden_plots');
        return onSnapshot(ref, (snap) => {
            const plotMap = {};
            const prefix = `${pageIndex}_`;
            snap.forEach(d => { 
                if(d.id.startsWith(prefix)) {
                    const plotId = d.id.replace(prefix, '');
                    plotMap[plotId] = d.data(); 
                }
            });
            const plots = Array.from({ length: 48 }, (_, i) => ({
                id: i,
                isPlanted: false,
                plantType: null,
                waterCount: 0,
                lastWateredAt: 0,
                plantedAt: null,
                plantedBy: null,
                ...plotMap[String(i)]
            }));
            callback(plots);
        });
    },
    savePlotState: async (pageIndex = 1, plotId, data) => {
        try {
            const docId = `${pageIndex}_${plotId}`;
            const ref = doc(db, 'garden_plots', docId);
            await setDoc(ref, data);
        } catch (e) {
            console.warn("Could not save plot:", e.message);
        }
    },
    logActivity: async (message) => {
        try {
            const ref = collection(db, 'activity_feed');
            await addDoc(ref, {
                text: message,
                timestamp: Date.now()
            });
        } catch (e) {
            console.warn("Could not log activity:", e.message);
        }
    },
    getFertilizerStock: async () => {
        const now = new Date();
        // Key changes every hour so stock resets automatically
        const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
        const ref = doc(db, 'shop_stock', 'fertilizer');
        const snap = await getDoc(ref);
        if (!snap.exists() || snap.data().hourKey !== hourKey) {
            // New hour = reset to 3
            await setDoc(ref, { hourKey, stock: 3 });
            return 3;
        }
        return snap.data().stock;
    },
    buyFertilizer: async () => {
        const now = new Date();
        const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
        const ref = doc(db, 'shop_stock', 'fertilizer');
        try {
            let bought = false;
            await runTransaction(db, async (transaction) => {
                const snap = await transaction.get(ref);
                let stock = 3;
                let currentKey = '';
                if (snap.exists()) {
                    currentKey = snap.data().hourKey;
                    stock = currentKey === hourKey ? snap.data().stock : 3;
                }
                if (stock <= 0) throw new Error('Ausverkauft!');
                transaction.set(ref, { hourKey, stock: stock - 1 });
                bought = true;
            });
            return bought;
        } catch (e) {
            console.warn('Fertilizer buy failed:', e.message);
            return false;
        }
    },
    onActivityFeedChange: (callback) => {
        const ref = collection(db, 'activity_feed');
        // Get the latest 10 activities
        const q = query(ref, orderBy('timestamp', 'desc'), limit(10));
        return onSnapshot(q, (snap) => {
            const logs = [];
            snap.forEach(d => logs.push({ id: d.id, ...d.data() }));
            callback(logs);
        });
    }
};
