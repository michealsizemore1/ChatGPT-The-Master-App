package com.sizemore.benefits;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final int FILE_REQUEST = 1001;
    private static final String START_URL = "file:///android_asset/www/index.html";
    private static final String SITE = "https://michealsizemore1.github.io/ChatGPT-The-Master-App/";
    private static final String FOLDER = "Family Benefits Hub";
    private WebView web;
    private android.view.View lockView;
    private boolean locked = false, prompting = false;
    private long backgroundAt = 0;
    private ValueCallback<Uri[]> pendingFiles;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        android.widget.FrameLayout root = new android.widget.FrameLayout(this);
        root.addView(web);
        lockView = buildLockView();
        root.addView(lockView);
        setContentView(root);
        if (AppLock.enabled(this) && AppLock.available(this)) lock(); else lockView.setVisibility(android.view.View.GONE);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(), "AndroidApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String scheme = u.getScheme();
                if ("file".equals(scheme)) {
                    String path = u.getPath();
                    if (path != null && path.endsWith("/www/index.html")) return false;
                    // Other pages of the website aren't inside the app: open them on the website instead.
                    String page = u.getLastPathSegment();
                    if (page != null && page.endsWith(".html")) {
                        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(SITE + page))); } catch (Exception ignored) { }
                    }
                    return true;
                }
                if ("http".equals(scheme) || "https".equals(scheme) || "mailto".equals(scheme) || "tel".equals(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                startUpdateCheck(false, true);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                return openFileChooser(callback, params);
            }
        });

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) {
            web.loadUrl(START_URL);
        }
    }

    // ---------- In-app updates (see Updater) ----------
    private boolean installing = false;

    /** Checks GitHub in the background, then tells the page; on app start, mentions a new version once. */
    private void startUpdateCheck(final boolean force, final boolean announce) {
        new Thread(new Runnable() {
            @Override public void run() {
                Updater.check(getApplicationContext(), force);
                runOnUiThread(new Runnable() {
                    @Override public void run() {
                        sendUpdateStatus();
                        if (announce && Updater.updateAvailable(MainActivity.this)) {
                            int latest = Updater.latestBuild(MainActivity.this);
                            android.content.SharedPreferences p = getSharedPreferences("updater", 0);
                            if (p.getInt("announced", 0) != latest) {
                                p.edit().putInt("announced", latest).apply();
                                Toast.makeText(MainActivity.this, "Family Benefits Hub version 1." + latest + " is ready. Install it from Settings \u2192 App updates.", Toast.LENGTH_LONG).show();
                            }
                        }
                    }
                });
            }
        }).start();
    }

    private void sendUpdateStatus() {
        if (web == null) return;
        web.evaluateJavascript("window.onAppUpdateStatus && window.onAppUpdateStatus(" + Updater.status(this).toString() + ")", null);
    }

    private void sendUpdateMessage(String msg) {
        if (web == null) return;
        web.evaluateJavascript("window.onAppUpdateMessage && window.onAppUpdateMessage(" + org.json.JSONObject.quote(msg) + ")", null);
    }

    /** Import Backup: pick a file with Android's file picker (any type, since many phones don't tag .json files). */
    private boolean openFileChooser(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        if (pendingFiles != null) pendingFiles.onReceiveValue(null);
        pendingFiles = callback;
        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("*/*");
        if (params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
            pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }
        try {
            startActivityForResult(Intent.createChooser(pick, "Choose a backup file"), FILE_REQUEST);
        } catch (Exception e) {
            pendingFiles.onReceiveValue(null);
            pendingFiles = null;
            toast("No app available to pick a file");
        }
        return true;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == AppLock.CONFIRM_REQUEST) {
            prompting = false;
            if (resultCode == RESULT_OK) unlock();
            return;
        }
        if (requestCode == DriveBackup.LINK_REQUEST) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                String name = DriveBackup.onLinked(this, data.getData());
                toast("Linked " + name + ". Saving a backup to it now\u2026");
                web.evaluateJavascript("window.onDriveLinked && window.onDriveLinked()", null);
            }
            return;
        }
        if (requestCode != FILE_REQUEST) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        if (pendingFiles == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            List<Uri> uris = new ArrayList<>();
            if (data != null && data.getClipData() != null) {
                ClipData clip = data.getClipData();
                for (int i = 0; i < clip.getItemCount(); i++) {
                    Uri u = clip.getItemAt(i).getUri();
                    if (u != null) uris.add(u);
                }
            }
            if (uris.isEmpty() && data != null && data.getData() != null) uris.add(data.getData());
            if (!uris.isEmpty()) result = uris.toArray(new Uri[0]);
        }
        pendingFiles.onReceiveValue(result);
        pendingFiles = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    // Back closes the menu, then steps back through the sections you visited, then goes
    // to Start Here, and only then leaves the app (see handleAndroidBack in the page).
    @Override
    public void onBackPressed() {
        if (locked) { super.onBackPressed(); return; }
        web.evaluateJavascript("(window.handleAndroidBack && window.handleAndroidBack()) ? 'handled' : 'exit'", value -> {
            if (value == null || !value.contains("handled")) finish();
        });
    }

    // ---------- App lock (see AppLock) ----------
    @Override
    protected void onStart() {
        super.onStart();
        if (!locked && backgroundAt > 0 && System.currentTimeMillis() - backgroundAt > AppLock.RELOCK_AFTER_MS
                && AppLock.enabled(this) && AppLock.available(this)) lock();
        backgroundAt = 0;
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (!prompting && !locked) backgroundAt = System.currentTimeMillis();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (locked && !prompting) askToUnlock();
    }

    private void lock() {
        locked = true;
        lockView.setVisibility(android.view.View.VISIBLE);
        web.setVisibility(android.view.View.INVISIBLE);
    }

    private void unlock() {
        locked = false;
        lockView.setVisibility(android.view.View.GONE);
        web.setVisibility(android.view.View.VISIBLE);
    }

    private void askToUnlock() {
        if (!AppLock.available(this)) { unlock(); return; } // the phone's screen lock was removed
        prompting = true;
        AppLock.prompt(this, ok -> runOnUiThread(() -> {
            prompting = false;
            if (ok) unlock();
        }));
    }

    private android.view.View buildLockView() {
        android.widget.LinearLayout box = new android.widget.LinearLayout(this);
        box.setOrientation(android.widget.LinearLayout.VERTICAL);
        box.setGravity(android.view.Gravity.CENTER);
        box.setBackgroundColor(0xFF0B1F3A);
        int pad = (int) (32 * getResources().getDisplayMetrics().density);
        box.setPadding(pad, pad, pad, pad);
        android.widget.TextView title = new android.widget.TextView(this);
        title.setText("Family Benefits Hub is locked");
        title.setTextColor(0xFFFFFFFF);
        title.setTextSize(22);
        title.setGravity(android.view.Gravity.CENTER);
        android.widget.TextView sub = new android.widget.TextView(this);
        sub.setText("Use your fingerprint or screen lock to open your family's information.");
        sub.setTextColor(0xFFCFE6E0);
        sub.setTextSize(16);
        sub.setGravity(android.view.Gravity.CENTER);
        sub.setPadding(0, pad / 3, 0, pad / 2);
        android.widget.Button b = new android.widget.Button(this);
        b.setText("Unlock");
        b.setOnClickListener(v -> { if (!prompting) askToUnlock(); });
        box.addView(title);
        box.addView(sub);
        box.addView(b);
        box.setClickable(true); // nothing behind the lock screen can be tapped
        return box;
    }

    private void toast(final String msg) {
        runOnUiThread(new Runnable() {
            @Override public void run() { Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show(); }
        });
    }

    /** Lets the page save backups into the phone's Downloads folder, print, lock and update the app. */
    public class Bridge {
        @JavascriptInterface
        public String saveAutoBackup(String name, String json) {
            return Backups.save(getApplicationContext(), name, json);
        }

        /** Google Drive backup: pick a file in Drive once; each backup then overwrites it. */
        @JavascriptInterface
        public void linkDriveBackup() {
            runOnUiThread(() -> {
                try { startActivityForResult(DriveBackup.linkIntent(), DriveBackup.LINK_REQUEST); }
                catch (Exception e) { toast("Couldn't open the file picker"); }
            });
        }

        @JavascriptInterface
        public void unlinkDriveBackup() {
            DriveBackup.unlink(getApplicationContext());
        }

        @JavascriptInterface
        public String driveBackupStatus() {
            return DriveBackup.status(getApplicationContext());
        }

        /** Writes in the background (Drive can be slow), then calls window.onDriveBackupResult(error or ""). */
        @JavascriptInterface
        public boolean writeDriveBackup(final String json) {
            if (!DriveBackup.linked(getApplicationContext())) return false;
            new Thread(() -> {
                final String err = DriveBackup.write(getApplicationContext(), json);
                runOnUiThread(() -> web.evaluateJavascript("window.onDriveBackupResult && window.onDriveBackupResult("
                        + org.json.JSONObject.quote(err == null ? "" : err) + ")", null));
            }).start();
            return true;
        }

        /** "Send a copy": saves the backup to Downloads, then opens the share sheet (Save to Drive, email, ...). */
        @JavascriptInterface
        public boolean shareBackup(String name, String json) {
            final String where = Backups.save(getApplicationContext(), name, json);
            final Uri uri = Backups.lastUri();
            if (uri == null) { toast(where.isEmpty() ? "Couldn't save the backup" : "Saved to " + where + ". Sharing needs Android 10 or newer."); return !where.isEmpty(); }
            final String title = name;
            runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("application/json");
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.putExtra(Intent.EXTRA_SUBJECT, title);
                send.setClipData(ClipData.newRawUri(title, uri));
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try { startActivity(Intent.createChooser(send, "Send backup to\u2026")); }
                catch (Exception e) { toast("No app available to share with"); }
            });
            return true;
        }

        @JavascriptInterface
        public String appLockStatus() {
            try {
                return new org.json.JSONObject().put("enabled", AppLock.enabled(MainActivity.this))
                        .put("available", AppLock.available(MainActivity.this)).toString();
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface
        public void setAppLock(boolean on) {
            AppLock.setEnabled(MainActivity.this, on);
        }

        /** Print This Section / Print Entire Site: Android's print screen (print or Save as PDF). Tells the page when it closes. */
        @JavascriptInterface
        public void printPage() {
            runOnUiThread(() -> {
                final android.print.PrintDocumentAdapter inner = web.createPrintDocumentAdapter("Family Benefits Hub");
                android.print.PrintDocumentAdapter wrapped = new android.print.PrintDocumentAdapter() {
                    @Override public void onStart() { inner.onStart(); }
                    @Override public void onLayout(android.print.PrintAttributes oldA, android.print.PrintAttributes newA,
                            android.os.CancellationSignal cancel, LayoutResultCallback cb, Bundle extras) {
                        inner.onLayout(oldA, newA, cancel, cb, extras);
                    }
                    @Override public void onWrite(android.print.PageRange[] pages, android.os.ParcelFileDescriptor dest,
                            android.os.CancellationSignal cancel, WriteResultCallback cb) {
                        inner.onWrite(pages, dest, cancel, cb);
                    }
                    @Override public void onFinish() {
                        inner.onFinish();
                        web.evaluateJavascript("window.dispatchEvent(new Event('afterprint'))", null);
                    }
                };
                android.print.PrintManager pm = (android.print.PrintManager) getSystemService(PRINT_SERVICE);
                try { pm.print("Family Benefits Hub", wrapped, new android.print.PrintAttributes.Builder().build()); }
                catch (Exception e) {
                    toast("Couldn't open printing: " + e.getMessage());
                    web.evaluateJavascript("window.dispatchEvent(new Event('afterprint'))", null);
                }
            });
        }

        @JavascriptInterface
        public String appUpdateStatus() {
            return Updater.status(MainActivity.this).toString();
        }

        @JavascriptInterface
        public void checkForAppUpdate() {
            runOnUiThread(new Runnable() { @Override public void run() { sendUpdateMessage("Checking for updates\u2026"); } });
            startUpdateCheck(true, false);
        }

        @JavascriptInterface
        public void installAppUpdate() {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    if (installing) return;
                    if (!Updater.canInstall(MainActivity.this)) {
                        sendUpdateMessage("Turn on \"Allow from this source\" for Family Benefits Hub, then come back and tap Install again.");
                        try { startActivity(Updater.permissionIntent(MainActivity.this)); } catch (Exception e) {
                            try { startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); } catch (Exception ignored) { }
                        }
                        return;
                    }
                    installing = true;
                    final int build = Updater.latestBuild(MainActivity.this);
                    sendUpdateMessage("Downloading version 1." + build + "\u2026");
                    new Thread(new Runnable() {
                        int last = -1;
                        @Override public void run() {
                            final String err = Updater.install(getApplicationContext(), new Updater.Progress() {
                                @Override public void onProgress(final int pct) {
                                    if (pct / 5 == last) return;
                                    last = pct / 5;
                                    runOnUiThread(new Runnable() { @Override public void run() { sendUpdateMessage("Downloading version 1." + build + "\u2026 " + pct + "%"); } });
                                }
                            });
                            runOnUiThread(new Runnable() {
                                @Override public void run() {
                                    installing = false;
                                    sendUpdateMessage(err != null ? err : "Installing version 1." + build + "\u2026 Confirm if Android asks. The app closes when it's done; open it again to use the new version.");
                                }
                            });
                        }
                    }).start();
                }
            });
        }

        @JavascriptInterface
        public boolean saveFile(String name, String mime, String base64) {
            return write(name, mime, base64, false);
        }

        @JavascriptInterface
        public boolean openFile(String name, String mime, String base64) {
            return write(name, mime, base64, true);
        }

        private boolean write(String name, String mime, String base64, boolean open) {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                String safe = (name == null || name.trim().isEmpty() ? "download" : name).replaceAll("[\\\\/:*?\"<>|]", "_");
                String type = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
                String where;
                Uri uri = null;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, safe);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, type);
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + FOLDER);
                    uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (uri == null) throw new Exception("Downloads folder unavailable");
                    OutputStream os = getContentResolver().openOutputStream(uri);
                    try { os.write(bytes); } finally { os.close(); }
                    where = "Downloads/" + FOLDER;
                } else {
                    File dir = new File(getExternalFilesDir(null), "Downloads");
                    dir.mkdirs();
                    FileOutputStream os = new FileOutputStream(new File(dir, safe));
                    try { os.write(bytes); } finally { os.close(); }
                    where = dir.getAbsolutePath();
                }
                if (open && uri != null) {
                    final Intent view = new Intent(Intent.ACTION_VIEW);
                    view.setDataAndType(uri, type);
                    view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    final String saved = where;
                    runOnUiThread(new Runnable() {
                        @Override public void run() {
                            try { startActivity(view); }
                            catch (Exception e) { toast("No app found to open this. It's saved in " + saved + "."); }
                        }
                    });
                } else {
                    toast("Saved " + safe + " to " + where);
                }
                return true;
            } catch (Exception e) {
                toast("Couldn't save file: " + e.getMessage());
                return false;
            }
        }
    }
}
