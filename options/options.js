/**
 * Tabi Options Page
 */

import * as storage from '../lib/storage.js';
import * as tabsManager from '../lib/tabs-manager.js';
import { groupTabsByDomain } from '../lib/domain-grouper.js';
import { exportToJSON, importFromJSON, downloadJSON, readJSONFile } from '../lib/import-export.js';

// State
let settings = {};
let allLabels = [];
let savedTabs = [];

/**
 * Initialize options page
 */
async function init() {
  try {
    // Load data
    const [settingsData, labelsData, tabsData] = await Promise.all([
      storage.getSettings(),
      storage.getAllLabels(),
      tabsManager.getAllTabs()
    ]);

    settings = settingsData;
    allLabels = labelsData;
    savedTabs = tabsData;

    // Render UI
    renderSettings();
    renderLabels();
    renderStats();
    setupEventListeners();

  } catch (error) {
    console.error('Error initializing options:', error);
    showToast('Error loading settings');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Storage mode
  document.getElementById('storage-mode').addEventListener('change', handleStorageModeChange);

  // Labels
  document.getElementById('add-label-btn').addEventListener('click', handleAddLabel);

  // Data management
  document.getElementById('export-btn').addEventListener('click', handleExport);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', handleImport);
  document.getElementById('clear-btn').addEventListener('click', handleClearAll);
}

/**
 * Render settings
 */
function renderSettings() {
  document.getElementById('storage-mode').value = settings.storageMode || 'local';
}

/**
 * Render labels list
 */
function renderLabels() {
  const labelsList = document.getElementById('labels-list');

  const labelsHTML = allLabels.map(label => `
    <div class="label-item" data-label-id="${label.id}">
      <span class="label-color" style="background-color: ${label.color}"></span>
      <span class="label-name">${label.name}</span>
      <span class="label-type">${label.isCustom ? 'Custom' : 'Default'}</span>
      ${label.isCustom ? `<button class="label-delete" data-label-id="${label.id}">&times;</button>` : ''}
    </div>
  `).join('');

  labelsList.innerHTML = labelsHTML || '<p style="color: var(--text-secondary);">No labels</p>';

  // Add delete handlers
  labelsList.querySelectorAll('.label-delete').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteLabel(btn.dataset.labelId));
  });
}

/**
 * Render statistics
 */
function renderStats() {
  const domains = groupTabsByDomain(savedTabs);

  document.getElementById('tabs-count').textContent = savedTabs.length;
  document.getElementById('domains-count').textContent = Object.keys(domains).length;
  document.getElementById('labels-count').textContent = allLabels.length;
}

/**
 * Handle storage mode change
 */
async function handleStorageModeChange(event) {
  const newMode = event.target.value;

  if (newMode === settings.storageMode) return;

  const confirmMsg = newMode === 'sync'
    ? 'Switch to sync storage? Data will sync across devices but is limited to 100KB.'
    : 'Switch to local storage? Data will only be available on this device.';

  if (!confirm(confirmMsg)) {
    event.target.value = settings.storageMode;
    return;
  }

  try {
    await storage.updateSettings({ storageMode: newMode });
    settings.storageMode = newMode;
    showToast(`Storage mode changed to ${newMode}`);
  } catch (error) {
    console.error('Error changing storage mode:', error);
    event.target.value = settings.storageMode;
    showToast(`Error: ${error.message}`);
  }
}

/**
 * Handle add label
 */
async function handleAddLabel() {
  const nameInput = document.getElementById('new-label-name');
  const colorInput = document.getElementById('new-label-color');

  const name = nameInput.value.trim();
  const color = colorInput.value;

  if (!name) {
    showToast('Please enter a label name');
    return;
  }

  try {
    await storage.addCustomLabel(name, color);
    allLabels = await storage.getAllLabels();

    nameInput.value = '';
    renderLabels();
    renderStats();
    showToast('Label added');
  } catch (error) {
    console.error('Error adding label:', error);
    showToast('Error adding label');
  }
}

/**
 * Handle delete label
 */
async function handleDeleteLabel(labelId) {
  if (!confirm('Delete this label? It will be removed from all saved tabs.')) {
    return;
  }

  try {
    await storage.deleteCustomLabel(labelId);

    // Remove label from all tabs
    for (const tab of savedTabs) {
      if (tab.labels.includes(labelId)) {
        await tabsManager.updateTab(tab.id, {
          labels: tab.labels.filter(l => l !== labelId)
        });
      }
    }

    allLabels = await storage.getAllLabels();
    savedTabs = await tabsManager.getAllTabs();

    renderLabels();
    renderStats();
    showToast('Label deleted');
  } catch (error) {
    console.error('Error deleting label:', error);
    showToast('Error deleting label');
  }
}

/**
 * Handle export
 */
async function handleExport() {
  try {
    const data = await exportToJSON();
    const filename = `tabi-export-${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON(data, filename);
    showToast('Export downloaded');
  } catch (error) {
    console.error('Error exporting:', error);
    showToast('Error exporting data');
  }
}

/**
 * Handle import
 */
async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const mode = confirm('Merge with existing data? Click Cancel to replace all data.')
    ? 'merge'
    : 'replace';

  try {
    const data = await readJSONFile(file);
    const result = await importFromJSON(data, mode);

    // Refresh data
    savedTabs = await tabsManager.getAllTabs();
    allLabels = await storage.getAllLabels();

    renderLabels();
    renderStats();

    showToast(`Imported ${result.tabsImported} tabs`);
  } catch (error) {
    console.error('Error importing:', error);
    showToast(`Import failed: ${error.message}`);
  }

  event.target.value = '';
}

/**
 * Handle clear all
 */
async function handleClearAll() {
  if (!confirm('This will delete ALL saved tabs and custom labels. This cannot be undone!')) {
    return;
  }

  try {
    await tabsManager.clearAllTabs();
    await storage.set({ customLabels: [] });

    savedTabs = [];
    allLabels = await storage.getAllLabels();

    renderLabels();
    renderStats();
    showToast('All data cleared');
  } catch (error) {
    console.error('Error clearing data:', error);
    showToast('Error clearing data');
  }
}

/**
 * Show toast notification
 */
function showToast(message, duration = 2000) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
