// Offline storage utilities for LivyFlow PWA
const DB_NAME = 'LivyFlowDB';
const DB_VERSION = 1;

// IndexedDB wrapper for offline storage
class OfflineStorage {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          transactionStore.createIndex('date', 'date');
          transactionStore.createIndex('category', 'category');
          transactionStore.createIndex('amount', 'amount');
          transactionStore.createIndex('synced', 'synced');
        }

        // Budgets store
        if (!db.objectStoreNames.contains('budgets')) {
          const budgetStore = db.createObjectStore('budgets', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          budgetStore.createIndex('category', 'category');
          budgetStore.createIndex('synced', 'synced');
        }

        // Accounts store
        if (!db.objectStoreNames.contains('accounts')) {
          const accountStore = db.createObjectStore('accounts', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          accountStore.createIndex('synced', 'synced');
        }

        // Pending actions store (for offline actions)
        if (!db.objectStoreNames.contains('pendingActions')) {
          const pendingStore = db.createObjectStore('pendingActions', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          pendingStore.createIndex('timestamp', 'timestamp');
          pendingStore.createIndex('type', 'type');
        }

        // Cache store for API responses
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { 
            keyPath: 'key' 
          });
          cacheStore.createIndex('timestamp', 'timestamp');
          cacheStore.createIndex('expiry', 'expiry');
        }
      };
    });
  }

  async add(storeName, data) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const dataWithTimestamp = {
      ...data,
      createdAt: Date.now(),
      synced: false
    };
    
    return store.add(dataWithTimestamp);
  }

  async update(storeName, data) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const dataWithTimestamp = {
      ...data,
      updatedAt: Date.now(),
      synced: false
    };
    
    return store.put(dataWithTimestamp);
  }

  async get(storeName, key) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName, index = null, value = null) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      let request;
      
      if (index && value !== null) {
        const indexObj = store.index(index);
        request = indexObj.getAll(value);
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return store.delete(key);
  }

  async clear(storeName) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return store.clear();
  }

  // Cache API responses
  async cacheResponse(key, data, ttl = 300000) { // 5 minutes default
    const cacheData = {
      key,
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    };
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    return store.put(cacheData);
  }

  async getCachedResponse(key) {
    const cached = await this.get('cache', key);
    
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      await this.delete('cache', key);
      return null;
    }
    
    return cached.data;
  }

  // Add pending action for when online
  async addPendingAction(type, data) {
    const action = {
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };
    
    return this.add('pendingActions', action);
  }

  async getPendingActions() {
    return this.getAll('pendingActions');
  }

  async removePendingAction(id) {
    return this.delete('pendingActions', id);
  }

  async getUnsyncedItems(storeName) {
    return this.getAll(storeName, 'synced', false);
  }

  async markAsSynced(storeName, id) {
    const item = await this.get(storeName, id);
    if (item) {
      item.synced = true;
      item.syncedAt = Date.now();
      return this.update(storeName, item);
    }
  }
}

// Singleton instance
const offlineStorage = new OfflineStorage();

// Offline manager for handling network state
export class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.syncInProgress = false;
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Initialize storage
    offlineStorage.init().catch(console.error);
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.isOnline));
  }

  handleOnline() {
    console.log('App is now online');
    this.isOnline = true;
    this.notifyListeners();
    
    // Start sync process
    this.syncOfflineData();
  }

  handleOffline() {
    console.log('App is now offline');
    this.isOnline = false;
    this.notifyListeners();
  }

  async syncOfflineData() {
    if (this.syncInProgress) return;
    
    console.log('Starting offline data sync...');
    this.syncInProgress = true;
    
    try {
      // Sync pending actions
      await this.syncPendingActions();
      
      // Sync unsynced transactions
      await this.syncUnsyncedData('transactions');
      
      // Sync unsynced budgets
      await this.syncUnsyncedData('budgets');
      
      // Sync unsynced accounts
      await this.syncUnsyncedData('accounts');
      
      console.log('Offline data sync completed');
      
      // Notify service worker of successful sync
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ 
          type: 'SYNC_COMPLETED' 
        });
      }
    } catch (error) {
      console.error('Offline data sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncPendingActions() {
    const actions = await offlineStorage.getPendingActions();
    
    for (const action of actions) {
      try {
        await this.processPendingAction(action);
        await offlineStorage.removePendingAction(action.id);
      } catch (error) {
        console.error('Failed to process pending action:', error);
        
        // Increment retry count
        action.retries = (action.retries || 0) + 1;
        
        // Remove if too many retries
        if (action.retries >= 3) {
          await offlineStorage.removePendingAction(action.id);
        } else {
          await offlineStorage.update('pendingActions', action);
        }
      }
    }
  }

  async processPendingAction(action) {
    switch (action.type) {
      case 'CREATE_TRANSACTION':
        // Make API call to create transaction
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        if (!response.ok) throw new Error('Failed to create transaction');
        break;
        
      case 'UPDATE_BUDGET':
        // Make API call to update budget
        const budgetResponse = await fetch(`/api/budgets/${action.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        if (!budgetResponse.ok) throw new Error('Failed to update budget');
        break;
        
      default:
        console.warn('Unknown pending action type:', action.type);
    }
  }

  async syncUnsyncedData(storeName) {
    const unsyncedItems = await offlineStorage.getUnsyncedItems(storeName);
    
    for (const item of unsyncedItems) {
      try {
        // Determine if this is a new item or update
        const isNew = !item.serverId;
        const endpoint = isNew 
          ? `/api/${storeName}`
          : `/api/${storeName}/${item.serverId}`;
        
        const method = isNew ? 'POST' : 'PUT';
        
        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        
        if (response.ok) {
          const serverData = await response.json();
          
          // Update local item with server data
          const updatedItem = {
            ...item,
            serverId: serverData.id,
            synced: true,
            syncedAt: Date.now()
          };
          
          await offlineStorage.update(storeName, updatedItem);
        }
      } catch (error) {
        console.error(`Failed to sync ${storeName} item:`, error);
      }
    }
  }

  // Store data for offline use
  async storeTransaction(transaction) {
    await offlineStorage.add('transactions', transaction);
    
    if (!this.isOnline) {
      await offlineStorage.addPendingAction('CREATE_TRANSACTION', transaction);
    }
  }

  async storeBudget(budget) {
    await offlineStorage.add('budgets', budget);
    
    if (!this.isOnline) {
      await offlineStorage.addPendingAction('UPDATE_BUDGET', budget);
    }
  }

  async getOfflineTransactions() {
    return offlineStorage.getAll('transactions');
  }

  async getOfflineBudgets() {
    return offlineStorage.getAll('budgets');
  }

  async cacheApiResponse(key, data, ttl) {
    return offlineStorage.cacheResponse(key, data, ttl);
  }

  async getCachedApiResponse(key) {
    return offlineStorage.getCachedResponse(key);
  }
}

// React hook for offline functionality
export function useOffline() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [offlineManager] = React.useState(() => new OfflineManager());

  React.useEffect(() => {
    const handleConnectionChange = (online) => {
      setIsOnline(online);
    };

    offlineManager.addListener(handleConnectionChange);

    return () => {
      offlineManager.removeListener(handleConnectionChange);
    };
  }, [offlineManager]);

  return {
    isOnline,
    offlineManager,
    storeTransaction: offlineManager.storeTransaction.bind(offlineManager),
    storeBudget: offlineManager.storeBudget.bind(offlineManager),
    getOfflineTransactions: offlineManager.getOfflineTransactions.bind(offlineManager),
    getOfflineBudgets: offlineManager.getOfflineBudgets.bind(offlineManager)
  };
}

export default offlineStorage;