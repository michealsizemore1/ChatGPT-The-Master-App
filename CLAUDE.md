# Command Center: rules for every Claude session

- **Never delete anything from the Command Center website** unless the owner explicitly asks. Keep the website up, and keep `livetrack.html`.
- BeyondStride's **Life tab is permanent** (it lives in the BeyondStride app and bundles these files). "Disconnect the Command Center" means stop the Life tab syncing with this website. It never means removing the Life tab or its files/hooks (daily-planner-native.js, daily-planner-idb.js, etc.).
- Since Nov 21 2026: inside the app (`window.BSNative`) `daily-planner-sync.js` stays off, and on the website `daily-planner-beyondstride-review.js` reads no BeyondStride data. Chrome <-> computer sync still works.
- In My Life Master App, only the CC may ever be retired. Don't touch the other apps or shared files like `master-backup-shared.js`.
- The CC's own AI key (`ai_key`) stays in the browser. It is never synced and never mixed with BeyondStride's key.
- **Retirement Planner:** the owner uses the Android app, which has its own copy of the planner in `android-app/retirement/www/`. Make planner changes there (pushing rebuilds the app). Leave the website's root `retirement-planner*` files as they are unless the owner asks to update the website.
