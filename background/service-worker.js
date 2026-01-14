/**
 * Tabi Background Service Worker
 * Handles extension lifecycle and message passing
 */

import { initializeStorage } from '../lib/storage.js';

// Initialize storage on extension install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Tabi extension installed');
    await initializeStorage();
  } else if (details.reason === 'update') {
    console.log('Tabi extension updated');
    // Handle any migration if needed in future versions
  }
});

// Message handler for communication with popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getCurrentTab':
      getCurrentTab().then(sendResponse);
      return true; // Keep message channel open for async response

    case 'getPageMeta':
      getPageMeta(message.tabId).then(sendResponse);
      return true;

    default:
      console.warn('Unknown message action:', message.action);
  }
});

/**
 * Get the current active tab info
 */
async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      return { error: 'No active tab found' };
    }

    return {
      url: tab.url,
      title: tab.title,
      favicon: tab.favIconUrl || ''
    };
  } catch (error) {
    console.error('Error getting current tab:', error);
    return { error: error.message };
  }
}

/**
 * Get meta description from a page
 * Note: This requires scripting permission and only works on http/https pages
 */
async function getPageMeta(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const metaDescription = document.querySelector('meta[name="description"]');
        const ogDescription = document.querySelector('meta[property="og:description"]');

        return {
          description: metaDescription?.content || ogDescription?.content || '',
          title: document.title
        };
      }
    });

    return results[0]?.result || { description: '', title: '' };
  } catch (error) {
    // This can fail on chrome:// pages or if scripting permission is denied
    console.warn('Could not get page meta:', error);
    return { description: '', title: '' };
  }
}
