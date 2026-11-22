package com.sizemore.mcmoney;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
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
    private WebView web;
    private ValueCallback<Uri[]> pendingFiles;
    private Uri cameraUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

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
                    // Stay on the budget page; other pages of the website don't exist inside the app.
                    return path == null || !path.endsWith("/www/index.html");
                }
                if ("http".equals(scheme) || "https".equals(scheme) || "mailto".equals(scheme) || "tel".equals(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                }
                return true;
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

    private boolean openFileChooser(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        if (pendingFiles != null) pendingFiles.onReceiveValue(null);
        pendingFiles = callback;
        cameraUri = null;

        boolean images = false;
        String[] accept = params.getAcceptTypes();
        if (accept != null) {
            for (String a : accept) {
                if (a != null && a.trim().startsWith("image")) images = true;
            }
        }

        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType(images ? "image/*" : "*/*");
        if (params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
            pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }

        Intent camera = null;
        if (images) {
            cameraUri = CaptureProvider.newPhotoUri(this);
            camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
            camera.setClipData(ClipData.newRawUri("photo", cameraUri));
            camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            List<ResolveInfo> cams = getPackageManager().queryIntentActivities(camera, PackageManager.MATCH_DEFAULT_ONLY);
            for (ResolveInfo ri : cams) {
                grantUriPermission(ri.activityInfo.packageName, cameraUri,
                        Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }
            if (cams.isEmpty()) camera = null;
        }

        Intent launch;
        if (camera != null && params.isCaptureEnabled()) {
            launch = camera;
        } else {
            launch = Intent.createChooser(pick, images ? "Add a photo" : "Choose a file");
            if (camera != null) launch.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
        }

        try {
            startActivityForResult(launch, FILE_REQUEST);
        } catch (Exception e) {
            pendingFiles.onReceiveValue(null);
            pendingFiles = null;
            toast("No app available to pick a file");
        }
        return true;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
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
            if (uris.isEmpty() && cameraUri != null && CaptureProvider.hasPhoto(this, cameraUri)) uris.add(cameraUri);
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

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private void toast(final String msg) {
        runOnUiThread(new Runnable() {
            @Override public void run() { Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show(); }
        });
    }

    private static final String DOWNLOAD_DIR = Environment.DIRECTORY_DOWNLOADS + "/MC Money";
    private static final String[] BACKUP_PREFIXES = {"my-life-master-app-backup-", "michael-cynthia-money-backup-"};
    private static final int BACKUPS_TO_KEEP = 14;

    /** Writes a file into Downloads/MC Money. Returns its content Uri (Android 10+) or null on older phones. */
    private Uri writeDownload(String safe, String type, byte[] bytes) throws Exception {
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.MediaColumns.DISPLAY_NAME, safe);
            cv.put(MediaStore.MediaColumns.MIME_TYPE, type);
            cv.put(MediaStore.MediaColumns.RELATIVE_PATH, DOWNLOAD_DIR);
            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
            if (uri == null) throw new Exception("Downloads folder unavailable");
            OutputStream os = getContentResolver().openOutputStream(uri);
            try { os.write(bytes); } finally { os.close(); }
            return uri;
        }
        File dir = new File(getExternalFilesDir(null), "Downloads");
        dir.mkdirs();
        FileOutputStream os = new FileOutputStream(new File(dir, safe));
        try { os.write(bytes); } finally { os.close(); }
        return null;
    }

    /** Keeps only the newest backups of each kind in Downloads/MC Money (only files this app saved). */
    private void pruneBackups(String savedName) {
        String prefix = null;
        for (String p : BACKUP_PREFIXES) if (savedName.startsWith(p)) prefix = p;
        if (prefix == null) return;
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                Uri base = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                Cursor c = getContentResolver().query(base,
                        new String[]{MediaStore.MediaColumns._ID},
                        MediaStore.MediaColumns.RELATIVE_PATH + "=? AND " + MediaStore.MediaColumns.DISPLAY_NAME + " LIKE ?",
                        new String[]{DOWNLOAD_DIR + "/", prefix + "%"},
                        MediaStore.MediaColumns.DATE_ADDED + " DESC");
                if (c == null) return;
                try {
                    int i = 0;
                    while (c.moveToNext()) {
                        if (i++ >= BACKUPS_TO_KEEP) {
                            getContentResolver().delete(ContentUris.withAppendedId(base, c.getLong(0)), null, null);
                        }
                    }
                } finally { c.close(); }
            } else {
                File[] files = new File(getExternalFilesDir(null), "Downloads").listFiles();
                if (files == null) return;
                List<File> backups = new ArrayList<>();
                for (File f : files) if (f.getName().startsWith(prefix)) backups.add(f);
                java.util.Collections.sort(backups, new java.util.Comparator<File>() {
                    @Override public int compare(File a, File b) { return Long.compare(b.lastModified(), a.lastModified()); }
                });
                for (int i = BACKUPS_TO_KEEP; i < backups.size(); i++) backups.get(i).delete();
            }
        } catch (Exception ignored) { }
    }

    private static String safeName(String name) {
        return (name == null || name.trim().isEmpty() ? "download" : name).replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    /** Lets the page save backups and CSV exports, and send a backup to Google Drive (or any app). */
    public class Bridge {
        @JavascriptInterface
        public boolean saveFile(String name, String mime, String base64) {
            try {
                String safe = safeName(name);
                String type = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
                Uri uri = writeDownload(safe, type, Base64.decode(base64, Base64.DEFAULT));
                pruneBackups(safe);
                toast("Saved " + safe + " to " + (uri != null ? "Downloads/MC Money" : "the app's Downloads folder"));
                return true;
            } catch (Exception e) {
                toast("Couldn't save file: " + e.getMessage());
                return false;
            }
        }

        @JavascriptInterface
        public boolean shareFile(String name, String mime, String base64) {
            try {
                String safe = safeName(name);
                final String type = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
                final Uri uri = writeDownload(safe, type, Base64.decode(base64, Base64.DEFAULT));
                pruneBackups(safe);
                if (uri == null) {
                    toast("Saved " + safe + ". Sharing needs Android 10 or newer.");
                    return true;
                }
                final String title = safe;
                runOnUiThread(new Runnable() {
                    @Override public void run() {
                        Intent send = new Intent(Intent.ACTION_SEND);
                        send.setType(type);
                        send.putExtra(Intent.EXTRA_STREAM, uri);
                        send.putExtra(Intent.EXTRA_SUBJECT, title);
                        send.setClipData(ClipData.newRawUri(title, uri));
                        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        try {
                            startActivity(Intent.createChooser(send, "Save backup to\u2026"));
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this, "No app available to share with", Toast.LENGTH_LONG).show();
                        }
                    }
                });
                return true;
            } catch (Exception e) {
                toast("Couldn't share file: " + e.getMessage());
                return false;
            }
        }
    }
}
