/**
 * Domain extraction and grouping utilities for Tabi
 */

/**
 * Extract domain from a URL
 */
export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'other';
  }
}

/**
 * Group tabs by their domain
 * Returns an object with domains as keys and arrays of tabs as values
 */
export function groupTabsByDomain(tabs) {
  const groups = {};

  for (const tab of tabs) {
    const domain = tab.domain || extractDomain(tab.url);

    if (!groups[domain]) {
      groups[domain] = [];
    }

    groups[domain].push(tab);
  }

  // Sort tabs within each group by date (newest first)
  for (const domain in groups) {
    groups[domain].sort((a, b) => b.dateAdded - a.dateAdded);
  }

  return groups;
}

/**
 * Get a display-friendly name for a domain
 */
export function getDomainDisplayName(domain) {
  // Common domain mappings
  const displayNames = {
    'github.com': 'GitHub',
    'www.github.com': 'GitHub',
    'youtube.com': 'YouTube',
    'www.youtube.com': 'YouTube',
    'twitter.com': 'Twitter',
    'www.twitter.com': 'Twitter',
    'x.com': 'X (Twitter)',
    'www.x.com': 'X (Twitter)',
    'linkedin.com': 'LinkedIn',
    'www.linkedin.com': 'LinkedIn',
    'reddit.com': 'Reddit',
    'www.reddit.com': 'Reddit',
    'stackoverflow.com': 'Stack Overflow',
    'www.stackoverflow.com': 'Stack Overflow',
    'medium.com': 'Medium',
    'www.medium.com': 'Medium',
    'notion.so': 'Notion',
    'www.notion.so': 'Notion',
    'figma.com': 'Figma',
    'www.figma.com': 'Figma',
    'docs.google.com': 'Google Docs',
    'drive.google.com': 'Google Drive',
    'mail.google.com': 'Gmail',
    'calendar.google.com': 'Google Calendar',
    'amazon.com': 'Amazon',
    'www.amazon.com': 'Amazon',
    'netflix.com': 'Netflix',
    'www.netflix.com': 'Netflix',
    'spotify.com': 'Spotify',
    'open.spotify.com': 'Spotify',
    'twitch.tv': 'Twitch',
    'www.twitch.tv': 'Twitch',
    'discord.com': 'Discord',
    'www.discord.com': 'Discord',
    'slack.com': 'Slack',
    'app.slack.com': 'Slack'
  };

  if (displayNames[domain]) {
    return displayNames[domain];
  }

  // Remove www. prefix and capitalize first letter
  let cleanDomain = domain.replace(/^www\./, '');

  // Try to make it look nicer (capitalize first letter of each part)
  const parts = cleanDomain.split('.');
  if (parts.length > 1) {
    // Return the main part (e.g., "example" from "example.com")
    cleanDomain = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  return cleanDomain;
}

/**
 * Get favicon URL for a domain
 */
export function getDomainFavicon(domain) {
  // Use Google's favicon service as a fallback
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Get sorted domain groups (domains with most tabs first)
 */
export function getSortedDomainGroups(tabs) {
  const groups = groupTabsByDomain(tabs);

  // Convert to array and sort by tab count
  const sortedDomains = Object.keys(groups).sort((a, b) => {
    return groups[b].length - groups[a].length;
  });

  return sortedDomains.map(domain => ({
    domain,
    displayName: getDomainDisplayName(domain),
    tabs: groups[domain],
    count: groups[domain].length
  }));
}
