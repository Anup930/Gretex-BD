/**
 * BillDesk DataStore — 0ms In-Memory Query & Mutation Engine
 * Loads all data once, caches encrypted in localStorage via CryptoStore,
 * and serves every subsequent read from memory (0ms latency).
 *
 * Lifecycle:
 * 1. On boot: Try encrypted cache → if valid & fresh, use it (instant boot).
 * 2. If stale (>10 min) or missing: Fetch from Google Sheets once → encrypt → cache.
 * 3. All reads: Synchronous from _allData in memory (<2ms).
 * 4. All writes: Optimistic in-memory update + async backend POST.
 * 5. On logout: clear() wipes all in-memory state.
 */

const BillDeskDataStore = (() => {
  const CACHE_KEY = "billdesk_all_data";
  const CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

  let _allData = null;
  let _isLoaded = false;
  let _isSyncing = false;
  let _lastSynced = null;
  const _listeners = new Set();

  // ---- Event Bus ----
  function subscribe(fn) {
    _listeners.add(fn);
    return function () { _listeners.delete(fn); };
  }

  function notify(event, payload) {
    _listeners.forEach(function (fn) {
      try { fn(event, payload); } catch (e) {
        console.error("BillDeskDataStore listener error:", e);
      }
    });
  }

  // ---- Empty Data Template ----
  function getEmptyData() {
    return {
      users: [],
      roles: [],
      companies: [],
      vendors: [],
      categories: [],
      bankAccounts: [],
      recurringSchedules: [],
      billCycles: [],
      attachments: [],
      approvalRoutes: [],
      approvalTasks: [],
      paymentAttempts: [],
      config: [],
      auditLog: []
    };
  }

  // ---- Cache Operations (via CryptoStore) ----
  async function loadFromCache() {
    if (typeof CryptoStore === "undefined" || !CryptoStore.isReady()) return false;
    try {
      let cached = await CryptoStore.load(CACHE_KEY);
      if (cached && cached.data && typeof cached.data === "object") {
        _allData = cached.data;
        _lastSynced = cached.lastSynced || null;
        _isLoaded = true;
        notify("loaded", { source: "encrypted_cache", count: countRecords(_allData) });
        return true;
      }
    } catch (e) {
      console.warn("BillDeskDataStore: Cache load failed:", e);
    }
    return false;
  }

  async function saveToCache() {
    if (typeof CryptoStore === "undefined" || !CryptoStore.isReady()) return false;
    try {
      await CryptoStore.save(CACHE_KEY, {
        data: _allData,
        lastSynced: _lastSynced || Date.now()
      });
      return true;
    } catch (e) {
      console.warn("BillDeskDataStore: Cache save failed:", e);
      return false;
    }
  }

  function countRecords(data) {
    if (!data) return 0;
    let count = 0;
    for (let key in data) {
      if (Array.isArray(data[key])) count += data[key].length;
    }
    return count;
  }

  // ---- Sync from Backend ----
  /**
   * Full sync from Google Sheets backend.
   * @param {boolean} silent - if true, doesn't show loading UI (background sync)
   */
  async function syncFromCloud(silent) {
    if (_isSyncing) return _allData;
    _isSyncing = true;
    notify("sync_start", { silent: !!silent });

    try {
      // Use BillDeskAPI.getInitialData() which fetches everything from Google Sheets
      let freshData = await BillDeskAPI.getInitialData();

      if (freshData && typeof freshData === "object") {
        _allData = freshData;
        _lastSynced = Date.now();
        _isLoaded = true;
        _isSyncing = false;

        // Save encrypted to cache
        saveToCache();

        notify("sync_success", {
          count: countRecords(_allData),
          lastSynced: _lastSynced,
          silent: !!silent
        });
        return _allData;
      } else {
        throw new Error("Invalid data received from backend");
      }
    } catch (err) {
      _isSyncing = false;
      notify("sync_error", { error: err.message, silent: !!silent });
      console.error("BillDeskDataStore sync error:", err);

      // If we have no data at all, initialize with empty
      if (!_allData) {
        _allData = getEmptyData();
        _isLoaded = true;
      }
      return _allData;
    }
  }

  // ---- Initialization ----
  /**
   * Initialize the DataStore. Call after CryptoStore.init().
   * 1. Try loading from encrypted cache (0ms boot).
   * 2. If cache is fresh (<10 min), use it and sync in background.
   * 3. If no cache or expired, do a full sync.
   */
  async function init() {
    let cacheHit = await loadFromCache();

    if (cacheHit && _allData) {
      let age = _lastSynced ? (Date.now() - _lastSynced) : Infinity;

      if (age > CACHE_MAX_AGE_MS) {
        // Cache is stale — use it for instant boot, but sync in background
        console.log("BillDeskDataStore: Cache is stale (" + Math.round(age / 1000) + "s old). Using cache + background sync.");
        syncFromCloud(true).catch(function () {}); // silent background sync
      } else {
        console.log("BillDeskDataStore: Fresh cache hit (" + Math.round(age / 1000) + "s old). Instant boot.");
      }
      return _allData;
    }

    // No cache — must fetch from backend
    console.log("BillDeskDataStore: No cache found. Full sync from backend.");
    return await syncFromCloud(false);
  }

  // ---- Read Operations (0ms) ----

  /**
   * Get the full data object (same shape as getInitialData response).
   * Returns immediately from memory — 0ms latency.
   */
  function getData() {
    return _allData || getEmptyData();
  }

  /**
   * Get a specific entity array by name.
   * e.g. getEntity("companies") → [{...}, {...}]
   */
  function getEntity(entityName) {
    if (!_allData) return [];
    return _allData[entityName] || [];
  }

  // ---- Write Operations (Optimistic In-Memory Mutation) ----

  /**
   * Add or update an item in an entity array.
   * Updates in-memory + re-encrypts cache + notifies listeners.
   */
  function upsertItem(entityName, idField, item) {
    if (!_allData) _allData = getEmptyData();
    if (!_allData[entityName]) _allData[entityName] = [];

    let list = _allData[entityName];
    let idx = list.findIndex(function (r) { return r[idField] === item[idField]; });

    if (idx !== -1) {
      list[idx] = Object.assign({}, list[idx], item);
    } else {
      list.push(item);
    }

    saveToCache();
    notify("data_changed", { entity: entityName, action: "upsert", item: item });
  }

  /**
   * Replace an entire entity array.
   */
  function setEntity(entityName, items) {
    if (!_allData) _allData = getEmptyData();
    _allData[entityName] = Array.isArray(items) ? items : [];
    saveToCache();
    notify("data_changed", { entity: entityName, action: "replace" });
  }

  /**
   * Remove an item from an entity array by ID.
   */
  function removeItem(entityName, idField, id) {
    if (!_allData || !_allData[entityName]) return;
    let list = _allData[entityName];
    let idx = list.findIndex(function (r) { return r[idField] === id; });
    if (idx !== -1) {
      list.splice(idx, 1);
      saveToCache();
      notify("data_changed", { entity: entityName, action: "remove", id: id });
    }
  }

  /**
   * Replace the entire allData object (e.g., after a full re-fetch).
   */
  function replaceAll(newData) {
    _allData = newData;
    _lastSynced = Date.now();
    _isLoaded = true;
    saveToCache();
    notify("data_changed", { entity: "*", action: "replace_all" });
  }

  /**
   * Force a manual re-sync from Google Sheets (🔄 Cloud Sync button).
   */
  async function forceSync() {
    return await syncFromCloud(false);
  }

  /**
   * Clear all in-memory data. Called on logout.
   */
  function clear() {
    _allData = null;
    _isLoaded = false;
    _isSyncing = false;
    _lastSynced = null;
  }

  // ---- Public API ----
  return {
    init: init,
    getData: getData,
    getEntity: getEntity,
    upsertItem: upsertItem,
    setEntity: setEntity,
    removeItem: removeItem,
    replaceAll: replaceAll,
    forceSync: forceSync,
    syncFromCloud: syncFromCloud,
    subscribe: subscribe,
    clear: clear,
    get isLoaded() { return _isLoaded; },
    get isSyncing() { return _isSyncing; },
    get lastSynced() { return _lastSynced; }
  };
})();
