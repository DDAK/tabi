/**
 * Storage abstraction layer for Tabi
 * Supports switching between chrome.storage.local and chrome.storage.sync
 */

// Predefined labels
export const PREDEFINED_LABELS = [
  { id: 'work', name: 'Work', color: '#3B82F6', isCustom: false },
  { id: 'personal', name: 'Personal', color: '#10B981', isCustom: false },
  { id: 'read-later', name: 'Read Later', color: '#F59E0B', isCustom: false },
  { id: 'reference', name: 'Reference', color: '#8B5CF6', isCustom: false },
  { id: 'learning', name: 'Learning', color: '#EC4899', isCustom: false },
  { id: 'shopping', name: 'Shopping', color: '#EF4444', isCustom: false }
];

// Default settings
const DEFAULT_SETTINGS = {
  storageMode: 'local',
  defaultLabels: [],
  groupsCollapsed: {}
};

// Cache for storage mode
let cachedStorageMode = null;

/**
 * Get the current storage area based on settings
 */
export async function getStorageArea() {
  if (cachedStorageMode === null) {
    // Always read settings from local storage
    const result = await chrome.storage.local.get('settings');
    cachedStorageMode = result.settings?.storageMode || 'local';
  }
  return cachedStorageMode === 'sync' ? chrome.storage.sync : chrome.storage.local;
}

/**
 * Get data from storage
 */
export async function get(keys) {
  const storage = await getStorageArea();
  return storage.get(keys);
}

/**
 * Set data in storage
 */
export async function set(items) {
  const storage = await getStorageArea();
  return storage.set(items);
}

/**
 * Remove data from storage
 */
export async function remove(keys) {
  const storage = await getStorageArea();
  return storage.remove(keys);
}

/**
 * Clear all data from storage
 */
export async function clear() {
  const storage = await getStorageArea();
  return storage.clear();
}

/**
 * Get settings (always from local storage)
 */
export async function getSettings() {
  const result = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

/**
 * Update settings
 */
export async function updateSettings(updates) {
  const current = await getSettings();
  const newSettings = { ...current, ...updates };

  // If storage mode changed, we need to migrate data
  if (updates.storageMode && updates.storageMode !== current.storageMode) {
    await migrateStorage(current.storageMode, updates.storageMode);
    cachedStorageMode = updates.storageMode;
  }

  // Settings are always stored in local storage
  await chrome.storage.local.set({ settings: newSettings });
  return newSettings;
}

/**
 * Migrate data between storage types
 */
export async function migrateStorage(fromMode, toMode) {
  const fromStorage = fromMode === 'sync' ? chrome.storage.sync : chrome.storage.local;
  const toStorage = toMode === 'sync' ? chrome.storage.sync : chrome.storage.local;

  // Get data from source (excluding settings)
  const data = await fromStorage.get(['tabs', 'customLabels']);

  // Check if target can accommodate the data (sync has 100KB limit)
  if (toMode === 'sync') {
    const dataSize = JSON.stringify(data).length;
    if (dataSize > 100000) { // ~100KB
      throw new Error('Data too large for sync storage. Please reduce saved tabs first.');
    }
  }

  // Set data in target
  await toStorage.set(data);

  // Clear data from source (but keep settings in local)
  if (fromMode !== 'local') {
    await fromStorage.remove(['tabs', 'customLabels']);
  }
}

/**
 * Initialize storage with defaults (called on install)
 */
export async function initializeStorage() {
  const existing = await chrome.storage.local.get(['settings', 'tabs', 'customLabels']);

  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }

  if (!existing.tabs) {
    await chrome.storage.local.set({ tabs: [] });
  }

  if (!existing.customLabels) {
    await chrome.storage.local.set({ customLabels: [] });
  }
}

/**
 * Get all labels (predefined + custom)
 */
export async function getAllLabels() {
  const { customLabels = [] } = await get('customLabels');
  return [...PREDEFINED_LABELS, ...customLabels];
}

/**
 * Add a custom label
 */
export async function addCustomLabel(name, color) {
  const { customLabels = [] } = await get('customLabels');

  const newLabel = {
    id: `custom-${Date.now()}`,
    name,
    color,
    isCustom: true
  };

  customLabels.push(newLabel);
  await set({ customLabels });
  return newLabel;
}

/**
 * Delete a custom label
 */
export async function deleteCustomLabel(labelId) {
  const { customLabels = [] } = await get('customLabels');
  const filtered = customLabels.filter(l => l.id !== labelId);
  await set({ customLabels: filtered });
}
