/**
 * Full-text search functionality for Tabi
 */

/**
 * Normalize text for search (lowercase, remove diacritics)
 */
export function normalizeSearchText(text) {
  if (!text) return '';

  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
}

/**
 * Check if a single tab matches the search query
 */
export function matchesQuery(tab, normalizedQuery) {
  const searchableFields = [
    tab.title,
    tab.description,
    tab.url,
    tab.domain,
    ...(tab.labels || [])
  ];

  const searchableText = normalizeSearchText(searchableFields.join(' '));
  return searchableText.includes(normalizedQuery);
}

/**
 * Search tabs by query
 * Returns filtered array of tabs matching the query
 */
export function searchTabs(tabs, query) {
  if (!query || query.trim() === '') {
    return tabs;
  }

  const normalizedQuery = normalizeSearchText(query);

  // If query is empty after normalization, return all tabs
  if (!normalizedQuery) {
    return tabs;
  }

  return tabs.filter(tab => matchesQuery(tab, normalizedQuery));
}

/**
 * Search with relevance scoring
 * Returns tabs sorted by relevance (title matches score higher than description matches)
 */
export function searchTabsWithRelevance(tabs, query) {
  if (!query || query.trim() === '') {
    return tabs;
  }

  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return tabs;
  }

  const scoredTabs = tabs
    .map(tab => {
      let score = 0;

      // Title match (highest priority)
      if (normalizeSearchText(tab.title).includes(normalizedQuery)) {
        score += 10;
      }

      // Domain match (high priority)
      if (normalizeSearchText(tab.domain).includes(normalizedQuery)) {
        score += 8;
      }

      // Label match (medium-high priority)
      const labelMatch = (tab.labels || []).some(label =>
        normalizeSearchText(label).includes(normalizedQuery)
      );
      if (labelMatch) {
        score += 6;
      }

      // Description match (medium priority)
      if (normalizeSearchText(tab.description).includes(normalizedQuery)) {
        score += 4;
      }

      // URL match (lower priority)
      if (normalizeSearchText(tab.url).includes(normalizedQuery)) {
        score += 2;
      }

      return { tab, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.tab);

  return scoredTabs;
}

/**
 * Highlight matching text in a string
 * Returns HTML string with <mark> tags around matches
 */
export function highlightMatches(text, query) {
  if (!text || !query) return text;

  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return text;

  // Create a case-insensitive regex for the query
  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  return text.replace(regex, '<mark>$1</mark>');
}
