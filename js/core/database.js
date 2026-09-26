const DB_NAME = "CardDuelsV6";
// V7 mantém o banco existente e apenas adiciona novas estruturas.
const DB_VERSION = 7;

export const STORES = {
    COLLECTION: "cardCollection",
    COLLECTIONS: "cardCollections",
    INVENTORY: "playerInventory",
    DECK: "playerDeck",
    PROGRESS: "gameProgress",
    CAMPAIGN: "campaignProgress",
    PLAYER_PROFILE: "playerProfile",
    CODEX: "codex",
    PLAYER_WALLET: "playerWallet",
    ACHIEVEMENTS: "playerAchievements",
    SHOP: "shopItems"
};

let dbPromise = null;

export function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            const transaction = request.transaction;
            let cardsStore;

            if (!db.objectStoreNames.contains(STORES.COLLECTION)) {
                cardsStore = db.createObjectStore(STORES.COLLECTION, {
                    keyPath: "originalId"
                });
            } else {
                cardsStore = transaction.objectStore(STORES.COLLECTION);
            }

            if (!cardsStore.indexNames.contains("collectionId")) {
                cardsStore.createIndex("collectionId", "collectionId", {
                    unique: false
                });
            }

            if (!db.objectStoreNames.contains(STORES.COLLECTIONS)) {
                db.createObjectStore(STORES.COLLECTIONS, {
                    keyPath: "id"
                });
            }

            if (!db.objectStoreNames.contains(STORES.INVENTORY)) {
                db.createObjectStore(STORES.INVENTORY, { keyPath: "originalId" });
            }

            if (!db.objectStoreNames.contains(STORES.DECK)) {
                db.createObjectStore(STORES.DECK, { keyPath: "slot" });
            }

            if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
                db.createObjectStore(STORES.PROGRESS, { keyPath: "key" });
            }

            if (!db.objectStoreNames.contains(STORES.CAMPAIGN)) {
                db.createObjectStore(STORES.CAMPAIGN, { keyPath: "key" });
            }

            if (!db.objectStoreNames.contains(STORES.PLAYER_PROFILE)) {
                db.createObjectStore(STORES.PLAYER_PROFILE, { keyPath: "key" });
            }

            if (!db.objectStoreNames.contains(STORES.CODEX)) {
                db.createObjectStore(STORES.CODEX, { keyPath: "originalId" });
            }

            if (!db.objectStoreNames.contains(STORES.PLAYER_WALLET)) {
                db.createObjectStore(STORES.PLAYER_WALLET, { keyPath: "key" });
            }

            if (!db.objectStoreNames.contains(STORES.ACHIEVEMENTS)) {
                db.createObjectStore(STORES.ACHIEVEMENTS, { keyPath: "key" });
            }

            if (!db.objectStoreNames.contains(STORES.SHOP)) {
                db.createObjectStore(STORES.SHOP, { keyPath: "originalId" });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => db.close();
            resolve(db);
        };

        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

export async function getAll(storeName) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

export async function get(storeName, key) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).get(key);

        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
    });
}

export async function put(storeName, value) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(value);

        tx.oncomplete = () => resolve(value);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Transação cancelada."));
    });
}

export async function clearStore(storeName) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).clear();

        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Transação cancelada."));
    });
}

export async function replaceCollection({ collections = [], cards = [] }) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(
            [STORES.COLLECTIONS, STORES.COLLECTION],
            "readwrite"
        );

        const collectionsStore = tx.objectStore(STORES.COLLECTIONS);
        const cardsStore = tx.objectStore(STORES.COLLECTION);

        // O import de álbum substitui o banco da Coleção.
        collectionsStore.clear();
        cardsStore.clear();

        for (const collection of collections) {
            collectionsStore.put(collection);
        }

        for (const card of cards) {
            cardsStore.put(card);
        }

        tx.oncomplete = () => resolve({
            collections: collections.length,
            cards: cards.length
        });

        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(
            tx.error || new Error("Importação cancelada.")
        );
    });
}
