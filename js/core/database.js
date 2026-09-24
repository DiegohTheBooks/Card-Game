const DB_NAME = "CardDuelsV6";
const DB_VERSION = 1;

export const STORES = {
    COLLECTION: "cardCollection",
    INVENTORY: "playerInventory",
    DECK: "playerDeck",
    PROGRESS: "gameProgress",
    CAMPAIGN: "campaignProgress"
};

let dbPromise = null;

export function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(STORES.COLLECTION)) {
                db.createObjectStore(STORES.COLLECTION, { keyPath: "originalId" });
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
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

export async function getAll(storeName) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).getAll();

        request.onsuccess = () => resolve(request.result);
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
    });
}

export async function clearStore(storeName) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).clear();
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}