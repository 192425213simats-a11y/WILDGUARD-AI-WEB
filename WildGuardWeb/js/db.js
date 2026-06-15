// db.js - IndexedDB Database Module for WildGuard Web
const DB_NAME = 'WildGuardDB';
const DB_VERSION = 1;

let dbInstance = null;

export function initDb() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 1. Users Store
            if (!db.objectStoreNames.contains('users')) {
                const userStore = db.createObjectStore('users', { keyPath: 'email' });
                // Add index for ID lookup if needed, but email is the primary key
            }

            // 2. Detections Store
            if (!db.objectStoreNames.contains('detections')) {
                db.createObjectStore('detections', { keyPath: 'id', autoIncrement: true });
            }

            // 3. Performance Logs Store
            if (!db.objectStoreNames.contains('perf_logs')) {
                db.createObjectStore('perf_logs', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            // Seed default admin account if empty
            seedDefaultAdmin().then(() => resolve(dbInstance));
        };

        request.onerror = (event) => {
            reject('IndexedDB failed to open: ' + event.target.error);
        };
    });
}

function getStore(storeName, mode) {
    const transaction = dbInstance.transaction(storeName, mode);
    return transaction.objectStore(storeName);
}

// Seed admin account
async function seedDefaultAdmin() {
    const admin = await getUser('admin@wildguard.ai');
    if (!admin) {
        await saveUser({
            email: 'admin@wildguard.ai',
            passwordHash: 'admin123', // Simple text hash representation for simulation
            fullName: 'Default Admin Node',
            role: 'admin'
        });
    }
}

// --- USER OPERATIONS ---
export function saveUser(user) {
    return new Promise((resolve, reject) => {
        const store = getStore('users', 'readwrite');
        const request = store.put(user);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function getUser(email) {
    return new Promise((resolve, reject) => {
        const store = getStore('users', 'readonly');
        const request = store.get(email);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function getAllUsers() {
    return new Promise((resolve, reject) => {
        const store = getStore('users', 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function deleteUser(email) {
    return new Promise((resolve, reject) => {
        const store = getStore('users', 'readwrite');
        const request = store.delete(email);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- DETECTION OPERATIONS ---
export function saveDetection(detection) {
    return new Promise((resolve, reject) => {
        const store = getStore('detections', 'readwrite');
        const request = store.add(detection);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function getAllDetections() {
    return new Promise((resolve, reject) => {
        const store = getStore('detections', 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function deleteDetection(id) {
    return new Promise((resolve, reject) => {
        const store = getStore('detections', 'readwrite');
        const request = store.delete(Number(id));
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export function clearAllDetections() {
    return new Promise((resolve, reject) => {
        const store = getStore('detections', 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- PERFORMANCE LOG OPERATIONS ---
export function savePerfLog(log) {
    return new Promise((resolve, reject) => {
        const store = getStore('perf_logs', 'readwrite');
        const request = store.add(log);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function getPerfLogs() {
    return new Promise((resolve, reject) => {
        const store = getStore('perf_logs', 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function clearPerfLogs() {
    return new Promise((resolve, reject) => {
        const store = getStore('perf_logs', 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
