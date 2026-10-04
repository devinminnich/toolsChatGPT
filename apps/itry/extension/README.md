# iTry browser extension prototype

Manifest V3 Chrome/Edge proof of concept. This first build is intentionally user-initiated: the extension reads the active page only when the user clicks a preference action.

## Local test

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select this `extension` directory.
4. Visit a product page and click the iTry extension.
5. Choose Love it, Something like this, Already own it, or Not interested.

The prototype stores the normalized selection locally. Backend sync is deferred until a dedicated iTry backend is configured.
