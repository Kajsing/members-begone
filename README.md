# Members Begone

A small, privacy-friendly Chrome extension that removes YouTube's `Members only` videos from the home feed, search results, recommendations, and sidebars.

The extension does not unlock members-only content or bypass payment. It only removes the video cards YouTube displays as promotions in your feed.

## Features

- Removes members-only cards completely by default, allowing the feed to close the gap.
- Can display a neutral placeholder instead.
- Responds to YouTube's SPA navigation and dynamically loaded cards.
- Prefers YouTube's structural members-only marker and uses localized badge text as a fallback.
- Includes no tracking, network requests, or third-party runtime dependencies.
- Requests access only to YouTube, synchronized settings, and the active tab while the popup is open.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this project directory.
5. Reload any YouTube tabs that were already open.

Click the extension icon to pause or resume filtering, or to switch between fully removing cards and displaying placeholders.

## Development

The project has no npm packages to install. Node.js 20 or newer is used only for validation and tests.

```powershell
npm run verify
```

After making changes, open `chrome://extensions` and click the reload button on the extension card.

## How it works

`src/detector.js` recognizes members-only badges and locates the smallest safe YouTube renderer card. `src/content.js` observes dynamic DOM changes and marks matching cards. `src/content.css` hides them or renders a placeholder. The popup stores only `enabled` and `mode` in `chrome.storage.sync`.

See [DOCUMENTATION.md](DOCUMENTATION.md) for architecture, maintenance guidance, and known limitations.

## Privacy

See [PRIVACY.md](PRIVACY.md). In short, this extension does not transmit browser data off the device.
