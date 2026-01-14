<p align="center">
  <img src="icons/icon128.svg" alt="Tabi Logo" width="120" height="120">
</p>

<h1 align="center">Tabi</h1>

<p align="center">
  <strong>Your intelligent tab companion for Chrome & Brave</strong>
</p>

<p align="center">
  Save, organize, and retrieve your tabs with powerful search, smart domain grouping, and flexible labels.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-blue?style=flat-square" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Chrome-Extension-green?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Extension">
  <img src="https://img.shields.io/badge/Brave-Compatible-orange?style=flat-square&logo=brave&logoColor=white" alt="Brave Compatible">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License">
  <img src="https://img.shields.io/badge/Dependencies-Zero-brightgreen?style=flat-square" alt="Zero Dependencies">
</p>

---

## The Problem

We've all been there: **dozens of tabs** open, browser slowing down, and that one important page you meant to read later is buried somewhere in the chaos. You bookmark it, but bookmarks become a graveyard of forgotten links.

## The Solution

**Tabi** transforms how you manage tabs. Instead of losing important pages in browser clutter, save them to Tabi with a single click. Find anything instantly with smart search, organize with custom labels, and watch as your tabs automatically group by domain.

---

## Features

### Core Functionality

- **One-Click Save** — Save the current tab with all its metadata (title, description, favicon) instantly
- **Smart Domain Grouping** — Tabs automatically organize by domain with friendly names (GitHub, YouTube, etc.)
- **Flexible Labels** — Tag tabs with predefined labels (Work, Personal, Read Later) or create your own with custom colors
- **Powerful Search** — Find any tab instantly with relevance-ranked full-text search across titles, URLs, descriptions, and labels
- **Dual Storage Modes** — Choose between local storage (5MB) or sync storage (100KB, syncs across devices)

### Organization & Access

- **Multiple Views** — Quick popup access or full-page view for power users
- **Sorting Options** — Sort by date (newest/oldest) or alphabetically
- **Domain Filtering** — Filter tabs by specific domains
- **Collapsible Groups** — Keep your view clean with expandable domain groups

### Data Management

- **Export/Import** — Backup your data as JSON, restore anytime
- **Duplicate Prevention** — Smart detection prevents saving the same URL twice
- **Batch Operations** — Open or delete multiple tabs at once

---

## Installation

### From Source (Developer Mode)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tabi.git
   cd tabi
   ```

2. **Load in Chrome/Brave**
   - Navigate to `chrome://extensions` (or `brave://extensions`)
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the `tabi` folder

3. **Pin the extension** (optional)
   - Click the puzzle icon in your toolbar
   - Pin Tabi for quick access

### From Chrome Web Store

> Coming soon!

---

## Usage

### Saving a Tab

1. Navigate to any webpage you want to save
2. Click the Tabi icon in your toolbar
3. Click **Save Current Tab**
4. (Optional) Add labels before saving

### Finding Saved Tabs

- **Search**: Type in the search bar to find tabs by title, URL, description, or label
- **Filter**: Use the domain dropdown to filter by website
- **Sort**: Choose between date or alphabetical sorting

### Managing Labels

1. Open Tabi options (`Right-click icon → Options`)
2. Create custom labels with your preferred colors
3. Apply labels when saving or editing tabs

### Syncing Across Devices

1. Go to Options
2. Switch storage mode to **Sync**
3. Your tabs will sync via your Chrome/Google account

---

## Screenshots

<details>
<summary>📸 Click to view screenshots</summary>

### Popup View
*Quick access from your toolbar*

### Full Page View
*Expanded interface for managing large collections*

### Options Page
*Customize labels and storage settings*

</details>

---

## Tech Stack

Tabi is built with modern web technologies and zero external dependencies:

| Technology | Purpose |
|------------|---------|
| **Vanilla JavaScript (ES6+)** | Core logic with modules |
| **Chrome Extension APIs** | Storage, Tabs, Runtime |
| **Manifest V3** | Latest extension standard |
| **CSS3 Custom Properties** | Theming and styling |
| **Web Crypto API** | UUID generation |

### Architecture

```
tabi/
├── manifest.json          # Extension configuration
├── background/            # Service worker
├── popup/                 # Toolbar popup UI
├── tabs/                  # Full-page view
├── options/               # Settings page
├── lib/                   # Core business logic
│   ├── storage.js         # Storage abstraction
│   ├── tabs-manager.js    # Tab CRUD operations
│   ├── domain-grouper.js  # Domain organization
│   ├── search.js          # Full-text search
│   └── import-export.js   # Data portability
└── icons/                 # Extension icons
```

---

## Why Tabi?

| Feature | Tabi | Bookmarks | Other Extensions |
|---------|------|-----------|------------------|
| Domain grouping | ✅ | ❌ | ⚠️ Varies |
| Custom labels | ✅ | ❌ (Folders only) | ⚠️ Varies |
| Full-text search | ✅ | ⚠️ Limited | ⚠️ Varies |
| Cross-device sync | ✅ | ✅ | ⚠️ Often requires account |
| Privacy-first | ✅ | ✅ | ❌ Many require accounts |
| Zero dependencies | ✅ | N/A | ❌ Most use frameworks |
| Export/Import | ✅ | ✅ | ⚠️ Varies |

---

## Roadmap

- [ ] Chrome Web Store release
- [ ] Firefox support
- [ ] Keyboard shortcuts
- [ ] Tab collections/workspaces
- [ ] Dark mode
- [ ] Tab notes/annotations
- [ ] Browser history integration
- [ ] AI-powered auto-tagging

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Keep it dependency-free — vanilla JavaScript only
- Follow the existing code style
- Test in both Chrome and Brave
- Update documentation for new features

---

## Privacy

Tabi respects your privacy:

- **No external servers** — All data stays in your browser
- **No tracking** — Zero analytics or telemetry
- **No accounts** — Works completely offline
- **Your data, your control** — Export anytime

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Support

- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)

---

<p align="center">
  <strong>If Tabi helps you tame your tabs, consider giving it a ⭐</strong>
</p>

<p align="center">
  Made with ☕ and too many open tabs
</p>
