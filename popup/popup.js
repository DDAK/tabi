/**
 * Tabi Popup - Main UI Logic
 */

import * as storage from '../lib/storage.js';
import * as tabsManager from '../lib/tabs-manager.js';
import { getSortedDomainGroups, getDomainFavicon } from '../lib/domain-grouper.js';
import { searchTabsWithRelevance } from '../lib/search.js';
import { exportToJSON, importFromJSON, downloadJSON, readJSONFile } from '../lib/import-export.js';

// DOM Elements
let elements = {};

// State
let currentTab = null;
let selectedLabels = [];
let allLabels = [];
let savedTabs = [];
let settings = {};

/**
 * Initialize the popup
 */
async function init() {
  cacheElements();
  setupEventListeners();

  try {
    // Load data in parallel
    const [tabsData, labelsData, settingsData, currentTabInfo] = await Promise.all([
      tabsManager.getAllTabs(),
      storage.getAllLabels(),
      storage.getSettings(),
      getCurrentTabInfo()
    ]);

    savedTabs = tabsData;
    allLabels = labelsData;
    settings = settingsData;
    currentTab = currentTabInfo;

    // Render UI
    renderCurrentTab();
    renderLabelSelector();
    renderTabsList();
    renderSettings();
  } catch (error) {
    console.error('Error initializing popup:', error);
    showToast('Error loading data');
  }
}

/**
 * Cache DOM element references
 */
function cacheElements() {
  elements = {
    // Nav
    navTabs: document.querySelectorAll('.nav-tab'),

    // Views
    savedView: document.getElementById('saved-view'),
    settingsView: document.getElementById('settings-view'),

    // Save form
    currentFavicon: document.getElementById('current-favicon'),
    currentTitle: document.getElementById('current-title'),
    descriptionInput: document.getElementById('description-input'),
    labelSelector: document.getElementById('label-selector'),
    saveBtn: document.getElementById('save-btn'),

    // Search
    searchInput: document.getElementById('search-input'),

    // Tabs list
    tabsList: document.getElementById('tabs-list'),
    emptyState: document.getElementById('empty-state'),

    // Footer
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    importFile: document.getElementById('import-file'),

    // Settings
    storageMode: document.getElementById('storage-mode'),
    customLabelsList: document.getElementById('custom-labels-list'),
    newLabelInput: document.getElementById('new-label-input'),
    newLabelColor: document.getElementById('new-label-color'),
    addLabelBtn: document.getElementById('add-label-btn'),
    clearAllBtn: document.getElementById('clear-all-btn'),

    // Expand button
    expandBtn: document.getElementById('expand-btn')
  };
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Navigation
  elements.navTabs.forEach(tab => {
    if (tab.dataset.view) {
      tab.addEventListener('click', () => switchView(tab.dataset.view));
    }
  });

  // Expand to full page
  elements.expandBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('tabs/tabs.html') });
  });

  // Save form
  elements.saveBtn.addEventListener('click', handleSaveTab);

  // Search
  elements.searchInput.addEventListener('input', handleSearch);

  // Import/Export
  elements.exportBtn.addEventListener('click', handleExport);
  elements.importBtn.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', handleImport);

  // Settings
  elements.storageMode.addEventListener('change', handleStorageModeChange);
  elements.addLabelBtn.addEventListener('click', handleAddLabel);
  elements.clearAllBtn.addEventListener('click', handleClearAll);
}

/**
 * Switch between views (Saved / Settings)
 */
function switchView(viewName) {
  elements.navTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
  });

  elements.savedView.classList.toggle('active', viewName === 'saved');
  elements.settingsView.classList.toggle('active', viewName === 'settings');
}

/**
 * Get current tab information
 */
async function getCurrentTabInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      return null;
    }

    // Try to get meta description
    let description = '';
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const meta = document.querySelector('meta[name="description"]') ||
                       document.querySelector('meta[property="og:description"]');
          return meta?.content || '';
        }
      });
      description = results[0]?.result || '';
    } catch {
      // Can't execute script on chrome:// pages, etc.
    }

    return {
      url: tab.url,
      title: tab.title,
      favicon: tab.favIconUrl || '',
      description
    };
  } catch (error) {
    console.error('Error getting current tab:', error);
    return null;
  }
}

/**
 * Render current tab in save form
 */
function renderCurrentTab() {
  if (!currentTab) {
    elements.currentTitle.textContent = 'Unable to get tab info';
    elements.saveBtn.disabled = true;
    return;
  }

  elements.currentFavicon.src = currentTab.favicon || getDomainFavicon(currentTab.url);
  elements.currentTitle.textContent = currentTab.title || currentTab.url;
  elements.descriptionInput.value = currentTab.description || '';

  // Check if already saved
  const isAlreadySaved = savedTabs.some(t => t.url === currentTab.url);
  if (isAlreadySaved) {
    elements.saveBtn.textContent = 'Already Saved';
    elements.saveBtn.disabled = true;
  }
}

/**
 * Render label selector
 */
function renderLabelSelector() {
  elements.labelSelector.innerHTML = allLabels.map(label => `
    <span
      class="label-chip ${selectedLabels.includes(label.id) ? 'selected' : ''}"
      data-label-id="${label.id}"
      style="background-color: ${label.color}; color: white;"
    >
      ${label.name}
    </span>
  `).join('');

  // Add click handlers
  elements.labelSelector.querySelectorAll('.label-chip').forEach(chip => {
    chip.addEventListener('click', () => toggleLabel(chip.dataset.labelId));
  });
}

/**
 * Toggle label selection
 */
function toggleLabel(labelId) {
  const index = selectedLabels.indexOf(labelId);
  if (index === -1) {
    selectedLabels.push(labelId);
  } else {
    selectedLabels.splice(index, 1);
  }
  renderLabelSelector();
}

/**
 * Handle save tab
 */
async function handleSaveTab() {
  if (!currentTab) return;

  elements.saveBtn.disabled = true;
  elements.saveBtn.textContent = 'Saving...';

  try {
    const tabData = {
      url: currentTab.url,
      title: currentTab.title,
      description: elements.descriptionInput.value.trim(),
      labels: selectedLabels,
      favicon: currentTab.favicon
    };

    await tabsManager.saveTab(tabData);

    // Refresh data
    savedTabs = await tabsManager.getAllTabs();
    renderTabsList();

    elements.saveBtn.textContent = 'Saved!';
    showToast('Tab saved successfully');

    // Reset form
    selectedLabels = [];
    renderLabelSelector();

  } catch (error) {
    console.error('Error saving tab:', error);
    elements.saveBtn.textContent = 'Save Tab';
    elements.saveBtn.disabled = false;
    showToast('Error saving tab');
  }
}

/**
 * Render tabs list grouped by domain
 */
function renderTabsList(filteredTabs = null) {
  const tabs = filteredTabs || savedTabs;

  if (tabs.length === 0) {
    elements.emptyState.style.display = 'block';
    // Remove all domain groups
    elements.tabsList.querySelectorAll('.domain-group').forEach(el => el.remove());
    return;
  }

  elements.emptyState.style.display = 'none';

  const domainGroups = getSortedDomainGroups(tabs);

  const groupsHTML = domainGroups.map(group => `
    <div class="domain-group ${settings.groupsCollapsed?.[group.domain] ? 'collapsed' : ''}" data-domain="${group.domain}">
      <div class="group-header">
        <img class="domain-icon" src="${getDomainFavicon(group.domain)}" alt="">
        <span class="domain-name">${group.displayName}</span>
        <span class="tab-count">${group.count}</span>
        <button class="action-btn open-all" data-domain="${group.domain}">Open All</button>
        <span class="collapse-icon">&#9660;</span>
      </div>
      <div class="group-content">
        ${group.tabs.map(tab => renderTabEntry(tab)).join('')}
      </div>
    </div>
  `).join('');

  // Update DOM
  elements.tabsList.querySelectorAll('.domain-group').forEach(el => el.remove());
  elements.tabsList.insertAdjacentHTML('afterbegin', groupsHTML);

  // Add event listeners
  elements.tabsList.querySelectorAll('.group-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (!e.target.classList.contains('action-btn')) {
        toggleDomainGroup(header.parentElement);
      }
    });
  });

  elements.tabsList.querySelectorAll('.action-btn.open-all').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleOpenAllInDomain(btn.dataset.domain);
    });
  });

  elements.tabsList.querySelectorAll('.action-btn.open').forEach(btn => {
    btn.addEventListener('click', () => handleOpenTab(btn.dataset.tabId, false));
  });

  elements.tabsList.querySelectorAll('.action-btn.open-delete').forEach(btn => {
    btn.addEventListener('click', () => handleOpenTab(btn.dataset.tabId, true));
  });

  elements.tabsList.querySelectorAll('.action-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteTab(btn.dataset.tabId));
  });
}

/**
 * Render a single tab entry
 */
function renderTabEntry(tab) {
  const labels = tab.labels
    .map(labelId => allLabels.find(l => l.id === labelId))
    .filter(Boolean)
    .map(label => `<span class="tab-label" style="background-color: ${label.color}">${label.name}</span>`)
    .join('');

  const date = new Date(tab.dateAdded).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  return `
    <div class="tab-entry" data-tab-id="${tab.id}">
      <div class="tab-info">
        <a class="tab-link" href="${tab.url}" title="${tab.url}">
          ${tab.description || tab.title || tab.url}
        </a>
        <div class="tab-meta">
          <span class="tab-labels">${labels}</span>
          <span class="tab-date">${date}</span>
        </div>
      </div>
      <div class="tab-actions">
        <button class="action-btn open" data-tab-id="${tab.id}" title="Open">Open</button>
        <button class="action-btn open-delete" data-tab-id="${tab.id}" title="Open & Delete">Open+Del</button>
        <button class="action-btn delete" data-tab-id="${tab.id}" title="Delete">X</button>
      </div>
    </div>
  `;
}

/**
 * Toggle domain group collapse
 */
async function toggleDomainGroup(groupElement) {
  const domain = groupElement.dataset.domain;
  const isCollapsed = groupElement.classList.toggle('collapsed');

  // Save state
  settings.groupsCollapsed = settings.groupsCollapsed || {};
  settings.groupsCollapsed[domain] = isCollapsed;
  await storage.updateSettings({ groupsCollapsed: settings.groupsCollapsed });
}

/**
 * Handle search
 */
function handleSearch() {
  const query = elements.searchInput.value;
  const filteredTabs = searchTabsWithRelevance(savedTabs, query);
  renderTabsList(filteredTabs);
}

/**
 * Handle open tab
 */
async function handleOpenTab(tabId, deleteAfter) {
  try {
    await tabsManager.openTab(tabId, deleteAfter);

    if (deleteAfter) {
      savedTabs = await tabsManager.getAllTabs();
      renderTabsList();
      showToast('Tab opened and removed');
    }
  } catch (error) {
    console.error('Error opening tab:', error);
    showToast('Error opening tab');
  }
}

/**
 * Handle delete tab
 */
async function handleDeleteTab(tabId) {
  try {
    await tabsManager.deleteTab(tabId);
    savedTabs = await tabsManager.getAllTabs();
    renderTabsList();
    showToast('Tab removed');

    // Check if current tab can now be saved
    if (currentTab && !savedTabs.some(t => t.url === currentTab.url)) {
      elements.saveBtn.textContent = 'Save Tab';
      elements.saveBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error deleting tab:', error);
    showToast('Error removing tab');
  }
}

/**
 * Handle open all tabs in domain
 */
async function handleOpenAllInDomain(domain) {
  try {
    const count = await tabsManager.openAllInDomain(domain);
    showToast(`Opened ${count} tabs`);
  } catch (error) {
    console.error('Error opening tabs:', error);
    showToast('Error opening tabs');
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

  try {
    const data = await readJSONFile(file);
    const result = await importFromJSON(data, 'merge');

    // Refresh data
    savedTabs = await tabsManager.getAllTabs();
    allLabels = await storage.getAllLabels();

    renderTabsList();
    renderLabelSelector();

    showToast(`Imported ${result.tabsImported} tabs (${result.tabsSkipped} skipped)`);
  } catch (error) {
    console.error('Error importing:', error);
    showToast(`Import failed: ${error.message}`);
  }

  // Reset file input
  event.target.value = '';
}

/**
 * Render settings view
 */
function renderSettings() {
  elements.storageMode.value = settings.storageMode || 'local';
  renderCustomLabels();
}

/**
 * Render custom labels in settings
 */
function renderCustomLabels() {
  const customLabels = allLabels.filter(l => l.isCustom);

  if (customLabels.length === 0) {
    elements.customLabelsList.innerHTML = '<p style="color: var(--text-secondary); font-size: 12px;">No custom labels yet</p>';
    return;
  }

  elements.customLabelsList.innerHTML = customLabels.map(label => `
    <div class="custom-label-item" data-label-id="${label.id}">
      <span class="custom-label-color" style="background-color: ${label.color}"></span>
      <span class="custom-label-name">${label.name}</span>
      <button class="custom-label-delete" data-label-id="${label.id}">&times;</button>
    </div>
  `).join('');

  // Add delete handlers
  elements.customLabelsList.querySelectorAll('.custom-label-delete').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteLabel(btn.dataset.labelId));
  });
}

/**
 * Handle storage mode change
 */
async function handleStorageModeChange() {
  const newMode = elements.storageMode.value;

  if (newMode === settings.storageMode) return;

  const confirmMsg = newMode === 'sync'
    ? 'Switching to sync storage. Data will be available across devices but limited to 100KB. Continue?'
    : 'Switching to local storage. Data will only be available on this device. Continue?';

  if (!confirm(confirmMsg)) {
    elements.storageMode.value = settings.storageMode;
    return;
  }

  try {
    await storage.updateSettings({ storageMode: newMode });
    settings.storageMode = newMode;
    showToast(`Storage mode changed to ${newMode}`);
  } catch (error) {
    console.error('Error changing storage mode:', error);
    elements.storageMode.value = settings.storageMode;
    showToast(`Error: ${error.message}`);
  }
}

/**
 * Handle add custom label
 */
async function handleAddLabel() {
  const name = elements.newLabelInput.value.trim();
  const color = elements.newLabelColor.value;

  if (!name) {
    showToast('Please enter a label name');
    return;
  }

  try {
    await storage.addCustomLabel(name, color);
    allLabels = await storage.getAllLabels();

    elements.newLabelInput.value = '';
    renderCustomLabels();
    renderLabelSelector();
    showToast('Label added');
  } catch (error) {
    console.error('Error adding label:', error);
    showToast('Error adding label');
  }
}

/**
 * Handle delete custom label
 */
async function handleDeleteLabel(labelId) {
  if (!confirm('Delete this label? It will be removed from all tabs.')) {
    return;
  }

  try {
    await storage.deleteCustomLabel(labelId);
    allLabels = await storage.getAllLabels();

    // Remove label from all tabs
    for (const tab of savedTabs) {
      if (tab.labels.includes(labelId)) {
        await tabsManager.updateTab(tab.id, {
          labels: tab.labels.filter(l => l !== labelId)
        });
      }
    }

    savedTabs = await tabsManager.getAllTabs();
    renderCustomLabels();
    renderLabelSelector();
    renderTabsList();
    showToast('Label deleted');
  } catch (error) {
    console.error('Error deleting label:', error);
    showToast('Error deleting label');
  }
}

/**
 * Handle clear all data
 */
async function handleClearAll() {
  if (!confirm('This will delete ALL saved tabs and custom labels. This cannot be undone. Continue?')) {
    return;
  }

  try {
    await tabsManager.clearAllTabs();
    await storage.set({ customLabels: [] });

    savedTabs = [];
    allLabels = await storage.getAllLabels();
    selectedLabels = [];

    renderTabsList();
    renderLabelSelector();
    renderCustomLabels();
    renderCurrentTab();

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
  // Remove existing toast
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
