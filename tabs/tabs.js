/**
 * Tabi Full Page View
 */

import * as storage from '../lib/storage.js';
import * as tabsManager from '../lib/tabs-manager.js';
import { getSortedDomainGroups, getDomainFavicon, getDomainDisplayName } from '../lib/domain-grouper.js';
import { searchTabsWithRelevance } from '../lib/search.js';
import { exportToJSON, importFromJSON, downloadJSON, readJSONFile } from '../lib/import-export.js';

// State
let allTabs = [];
let allLabels = [];
let filteredTabs = [];
let selectedDomain = 'all';
let selectedLabels = [];
let searchQuery = '';
let sortOrder = 'date-desc';

/**
 * Initialize the page
 */
async function init() {
  try {
    // Load data
    const [tabsData, labelsData] = await Promise.all([
      tabsManager.getAllTabs(),
      storage.getAllLabels()
    ]);

    allTabs = tabsData;
    allLabels = labelsData;

    // Initial render
    renderDomainNav();
    renderLabelsFilter();
    applyFilters();
    setupEventListeners();

  } catch (error) {
    console.error('Error initializing:', error);
    showToast('Error loading data');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Search
  document.getElementById('search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    applyFilters();
  });

  // Sort
  document.getElementById('sort-select').addEventListener('change', (e) => {
    sortOrder = e.target.value;
    applyFilters();
  });

  // Open all visible
  document.getElementById('open-all-btn').addEventListener('click', handleOpenAllVisible);

  // Import/Export
  document.getElementById('export-btn').addEventListener('click', handleExport);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', handleImport);

  // Settings
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

/**
 * Render domain navigation
 */
function renderDomainNav() {
  const nav = document.getElementById('domain-nav');
  const domainGroups = getSortedDomainGroups(allTabs);

  // Update all tabs count
  document.getElementById('all-count').textContent = allTabs.length;

  // Generate domain items
  const domainsHTML = domainGroups.map(group => `
    <div class="nav-item ${selectedDomain === group.domain ? 'active' : ''}" data-domain="${group.domain}">
      <span class="nav-icon">
        <img src="${getDomainFavicon(group.domain)}" alt="">
      </span>
      <span class="nav-label">${group.displayName}</span>
      <span class="nav-count">${group.count}</span>
    </div>
  `).join('');

  // Keep "All Tabs" item, add domain items
  const allTabsItem = nav.querySelector('[data-domain="all"]');
  nav.innerHTML = '';
  nav.appendChild(allTabsItem);
  nav.insertAdjacentHTML('beforeend', domainsHTML);

  // Update active state for "All Tabs"
  allTabsItem.classList.toggle('active', selectedDomain === 'all');

  // Add click handlers
  nav.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      selectedDomain = item.dataset.domain;
      renderDomainNav();
      applyFilters();
    });
  });
}

/**
 * Render labels filter
 */
function renderLabelsFilter() {
  const container = document.getElementById('labels-filter');

  container.innerHTML = allLabels.map(label => `
    <span
      class="label-filter ${selectedLabels.includes(label.id) ? 'active' : ''}"
      data-label-id="${label.id}"
      style="background-color: ${label.color}"
    >
      ${label.name}
    </span>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.label-filter').forEach(chip => {
    chip.addEventListener('click', () => {
      const labelId = chip.dataset.labelId;
      const index = selectedLabels.indexOf(labelId);

      if (index === -1) {
        selectedLabels.push(labelId);
      } else {
        selectedLabels.splice(index, 1);
      }

      renderLabelsFilter();
      applyFilters();
    });
  });
}

/**
 * Apply all filters and render tabs
 */
function applyFilters() {
  // Start with all tabs
  let tabs = [...allTabs];

  // Filter by domain
  if (selectedDomain !== 'all') {
    tabs = tabs.filter(tab => tab.domain === selectedDomain);
  }

  // Filter by labels
  if (selectedLabels.length > 0) {
    tabs = tabs.filter(tab =>
      selectedLabels.some(labelId => tab.labels.includes(labelId))
    );
  }

  // Filter by search
  if (searchQuery) {
    tabs = searchTabsWithRelevance(tabs, searchQuery);
  }

  // Sort
  tabs = sortTabs(tabs, sortOrder);

  filteredTabs = tabs;

  // Update UI
  updateHeader();
  renderTabs();
}

/**
 * Sort tabs
 */
function sortTabs(tabs, order) {
  const sorted = [...tabs];

  switch (order) {
    case 'date-desc':
      sorted.sort((a, b) => b.dateAdded - a.dateAdded);
      break;
    case 'date-asc':
      sorted.sort((a, b) => a.dateAdded - b.dateAdded);
      break;
    case 'alpha-asc':
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'alpha-desc':
      sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      break;
  }

  return sorted;
}

/**
 * Update header info
 */
function updateHeader() {
  const title = selectedDomain === 'all'
    ? 'All Tabs'
    : getDomainDisplayName(selectedDomain);

  document.getElementById('page-title').textContent = title;
  document.getElementById('visible-count').textContent = `${filteredTabs.length} tabs`;
}

/**
 * Render tabs
 */
function renderTabs() {
  const container = document.getElementById('tabs-container');
  const emptyState = document.getElementById('empty-state');

  if (filteredTabs.length === 0) {
    emptyState.style.display = 'flex';
    // Remove existing grid
    const existingGrid = container.querySelector('.tabs-grid');
    if (existingGrid) existingGrid.remove();
    return;
  }

  emptyState.style.display = 'none';

  // Group by domain if showing all
  if (selectedDomain === 'all' && !searchQuery) {
    renderGroupedTabs(container);
  } else {
    renderFlatTabs(container);
  }
}

/**
 * Render tabs grouped by domain
 */
function renderGroupedTabs(container) {
  const groups = getSortedDomainGroups(filteredTabs);

  const html = groups.map(group => `
    <div class="domain-section" data-domain="${group.domain}">
      <div class="domain-group-header">
        <img class="domain-group-icon" src="${getDomainFavicon(group.domain)}" alt="">
        <span class="domain-group-name">${group.displayName}</span>
        <span class="domain-group-count">${group.count} tabs</span>
        <div class="domain-group-actions">
          <button class="btn" data-action="open-all-domain" data-domain="${group.domain}">Open All</button>
        </div>
      </div>
      <div class="tabs-grid">
        ${group.tabs.map(tab => renderTabCard(tab)).join('')}
      </div>
    </div>
  `).join('');

  // Update container
  const existingContent = container.querySelector('.tabs-content');
  if (existingContent) {
    existingContent.innerHTML = html;
  } else {
    container.insertAdjacentHTML('beforeend', `<div class="tabs-content">${html}</div>`);
  }

  attachTabEventListeners(container);
}

/**
 * Render tabs in flat grid
 */
function renderFlatTabs(container) {
  const html = `
    <div class="tabs-grid">
      ${filteredTabs.map(tab => renderTabCard(tab)).join('')}
    </div>
  `;

  // Update container
  const existingContent = container.querySelector('.tabs-content');
  if (existingContent) {
    existingContent.innerHTML = html;
  } else {
    container.insertAdjacentHTML('beforeend', `<div class="tabs-content">${html}</div>`);
  }

  attachTabEventListeners(container);
}

/**
 * Render a single tab card
 */
function renderTabCard(tab) {
  const labels = tab.labels
    .map(labelId => allLabels.find(l => l.id === labelId))
    .filter(Boolean)
    .map(label => `<span class="tab-label" style="background-color: ${label.color}">${label.name}</span>`)
    .join('');

  const date = new Date(tab.dateAdded).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return `
    <div class="tab-card" data-tab-id="${tab.id}">
      <div class="tab-card-header">
        <img class="tab-favicon" src="${tab.favicon || getDomainFavicon(tab.domain)}" alt="">
        <div class="tab-title-section">
          <div class="tab-title" title="${tab.title}">${tab.title || 'Untitled'}</div>
          <div class="tab-domain">${tab.domain}</div>
        </div>
      </div>
      ${tab.description ? `<div class="tab-description">${tab.description}</div>` : ''}
      <div class="tab-meta">
        <div class="tab-labels">${labels}</div>
        <div class="tab-date">${date}</div>
      </div>
      <div class="tab-actions">
        <button class="tab-action primary" data-action="open" data-tab-id="${tab.id}">Open</button>
        <button class="tab-action" data-action="open-delete" data-tab-id="${tab.id}">Open & Delete</button>
        <button class="tab-action danger" data-action="delete" data-tab-id="${tab.id}">Delete</button>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to tab actions
 */
function attachTabEventListeners(container) {
  // Open
  container.querySelectorAll('[data-action="open"]').forEach(btn => {
    btn.addEventListener('click', () => handleOpenTab(btn.dataset.tabId, false));
  });

  // Open & Delete
  container.querySelectorAll('[data-action="open-delete"]').forEach(btn => {
    btn.addEventListener('click', () => handleOpenTab(btn.dataset.tabId, true));
  });

  // Delete
  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteTab(btn.dataset.tabId));
  });

  // Open all in domain
  container.querySelectorAll('[data-action="open-all-domain"]').forEach(btn => {
    btn.addEventListener('click', () => handleOpenAllInDomain(btn.dataset.domain));
  });
}

/**
 * Handle open tab
 */
async function handleOpenTab(tabId, deleteAfter) {
  try {
    await tabsManager.openTab(tabId, deleteAfter);

    if (deleteAfter) {
      await refreshData();
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
    await refreshData();
    showToast('Tab removed');
  } catch (error) {
    console.error('Error deleting tab:', error);
    showToast('Error removing tab');
  }
}

/**
 * Handle open all in domain
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
 * Handle open all visible tabs
 */
async function handleOpenAllVisible() {
  if (filteredTabs.length === 0) {
    showToast('No tabs to open');
    return;
  }

  if (filteredTabs.length > 10) {
    if (!confirm(`Open ${filteredTabs.length} tabs? This may slow down your browser.`)) {
      return;
    }
  }

  try {
    for (const tab of filteredTabs) {
      await chrome.tabs.create({ url: tab.url });
    }
    showToast(`Opened ${filteredTabs.length} tabs`);
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

    await refreshData();
    showToast(`Imported ${result.tabsImported} tabs`);
  } catch (error) {
    console.error('Error importing:', error);
    showToast(`Import failed: ${error.message}`);
  }

  event.target.value = '';
}

/**
 * Refresh data from storage
 */
async function refreshData() {
  allTabs = await tabsManager.getAllTabs();
  allLabels = await storage.getAllLabels();

  renderDomainNav();
  renderLabelsFilter();
  applyFilters();
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
