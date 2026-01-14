/**
 * Tab management operations for Tabi
 */

import * as storage from './storage.js';
import { extractDomain } from './domain-grouper.js';

/**
 * Generate a UUID v4
 */
function generateId() {
  return crypto.randomUUID();
}

/**
 * Save a new tab
 */
export async function saveTab(tabData) {
  const { tabs = [] } = await storage.get('tabs');

  const newTab = {
    id: generateId(),
    url: tabData.url,
    domain: extractDomain(tabData.url),
    title: tabData.title,
    description: tabData.description || '',
    labels: tabData.labels || [],
    dateAdded: Date.now(),
    favicon: tabData.favicon || ''
  };

  tabs.push(newTab);
  await storage.set({ tabs });
  return newTab;
}

/**
 * Update an existing tab
 */
export async function updateTab(id, updates) {
  const { tabs = [] } = await storage.get('tabs');

  const index = tabs.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('Tab not found');
  }

  tabs[index] = {
    ...tabs[index],
    ...updates,
    dateModified: Date.now()
  };

  await storage.set({ tabs });
  return tabs[index];
}

/**
 * Delete a tab by ID
 */
export async function deleteTab(id) {
  const { tabs = [] } = await storage.get('tabs');
  const filtered = tabs.filter(t => t.id !== id);
  await storage.set({ tabs: filtered });
}

/**
 * Get a single tab by ID
 */
export async function getTab(id) {
  const { tabs = [] } = await storage.get('tabs');
  return tabs.find(t => t.id === id);
}

/**
 * Get all saved tabs
 */
export async function getAllTabs() {
  const { tabs = [] } = await storage.get('tabs');
  return tabs;
}

/**
 * Open a saved tab in a new browser tab
 */
export async function openTab(id, deleteAfter = false) {
  const tab = await getTab(id);

  if (tab) {
    await chrome.tabs.create({ url: tab.url });

    if (deleteAfter) {
      await deleteTab(id);
    }
  }

  return tab;
}

/**
 * Open all tabs in a specific domain group
 */
export async function openAllInDomain(domain) {
  const { tabs = [] } = await storage.get('tabs');
  const domainTabs = tabs.filter(t => t.domain === domain);

  for (const tab of domainTabs) {
    await chrome.tabs.create({ url: tab.url });
  }

  return domainTabs.length;
}

/**
 * Delete all tabs in a specific domain group
 */
export async function deleteAllInDomain(domain) {
  const { tabs = [] } = await storage.get('tabs');
  const filtered = tabs.filter(t => t.domain !== domain);
  await storage.set({ tabs: filtered });
  return tabs.length - filtered.length;
}

/**
 * Check if a URL is already saved
 */
export async function isUrlSaved(url) {
  const { tabs = [] } = await storage.get('tabs');
  return tabs.some(t => t.url === url);
}

/**
 * Get tabs count
 */
export async function getTabsCount() {
  const { tabs = [] } = await storage.get('tabs');
  return tabs.length;
}

/**
 * Clear all saved tabs
 */
export async function clearAllTabs() {
  await storage.set({ tabs: [] });
}
