/**
 * Import/Export functionality for Tabi
 */

import * as storage from './storage.js';

/**
 * Export all data to JSON
 */
export async function exportToJSON() {
  const { tabs = [] } = await storage.get('tabs');
  const { customLabels = [] } = await storage.get('customLabels');
  const settings = await storage.getSettings();

  const exportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    data: {
      tabs,
      customLabels,
      settings
    }
  };

  return exportData;
}

/**
 * Validate import data structure
 */
export function validateImportData(data) {
  const errors = [];

  if (!data) {
    errors.push('No data provided');
    return { valid: false, errors };
  }

  if (!data.data) {
    errors.push('Missing "data" property');
    return { valid: false, errors };
  }

  if (!Array.isArray(data.data.tabs)) {
    errors.push('Missing or invalid "tabs" array');
  } else {
    // Validate tab structure
    data.data.tabs.forEach((tab, index) => {
      if (!tab.url) {
        errors.push(`Tab at index ${index} missing "url"`);
      }
      if (!tab.title) {
        errors.push(`Tab at index ${index} missing "title"`);
      }
    });
  }

  if (data.data.customLabels && !Array.isArray(data.data.customLabels)) {
    errors.push('Invalid "customLabels" - must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Import data from JSON
 * @param {Object} data - The parsed JSON data
 * @param {string} mode - 'merge' to add to existing, 'replace' to overwrite
 */
export async function importFromJSON(data, mode = 'merge') {
  const validation = validateImportData(data);

  if (!validation.valid) {
    throw new Error(`Invalid import data: ${validation.errors.join(', ')}`);
  }

  const importedTabs = data.data.tabs;
  const importedLabels = data.data.customLabels || [];

  if (mode === 'replace') {
    // Replace all existing data
    await storage.set({ tabs: importedTabs });
    await storage.set({ customLabels: importedLabels });
  } else {
    // Merge with existing data
    const { tabs: existingTabs = [] } = await storage.get('tabs');
    const { customLabels: existingLabels = [] } = await storage.get('customLabels');

    // Add imported tabs, avoiding duplicates by URL
    const existingUrls = new Set(existingTabs.map(t => t.url));
    const newTabs = importedTabs.filter(t => !existingUrls.has(t.url));

    // Ensure imported tabs have IDs
    const tabsToAdd = newTabs.map(tab => ({
      ...tab,
      id: tab.id || crypto.randomUUID(),
      dateAdded: tab.dateAdded || Date.now()
    }));

    await storage.set({ tabs: [...existingTabs, ...tabsToAdd] });

    // Merge custom labels
    const existingLabelIds = new Set(existingLabels.map(l => l.id));
    const newLabels = importedLabels.filter(l => !existingLabelIds.has(l.id));
    await storage.set({ customLabels: [...existingLabels, ...newLabels] });

    return {
      tabsImported: tabsToAdd.length,
      tabsSkipped: importedTabs.length - tabsToAdd.length,
      labelsImported: newLabels.length
    };
  }

  return {
    tabsImported: importedTabs.length,
    tabsSkipped: 0,
    labelsImported: importedLabels.length
  };
}

/**
 * Trigger a file download in the browser
 */
export function downloadJSON(data, filename = 'tabi-export.json') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Read and parse a JSON file
 */
export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
