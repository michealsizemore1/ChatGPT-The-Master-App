package com.sizemore.nhl;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * In-app updates, modeled on BeyondStride's Updater. Looks for the newest "nhl-app-N" release of
 * this repo on GitHub, downloads its NHL-Faceoff.apk and hands it to Android's installer.
 * N is the build number and matches the app's versionCode (both come from the workflow's run number).
 * Android asks to confirm the first time (and needs "Install unknown apps" switched on for this app).
 */
public final class Updater {
    private static final String API = "https://api.github.com/repos/michealsizemore1/ChatGPT-The-Master-App/releases?per_page=40";
    private static final String TAG_PREFIX = "nhl-app-";
    private static final String ASSET = "NHL-Faceoff.apk";
    private static final long MIN_GAP_MS = 3L * 3_600_000L; // automatic checks at most every 3 hours

    public interface Progress { void onProgress(int pct); }

    private Updater() { }

    private static SharedPreferences prefs(Context ctx) { return ctx.getSharedPreferences("updater", 0); }

    /** This app's build number (the N in "version 1.N"). */
    public static int currentBuild(Context ctx) {
        try {
            PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            long code = Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
            return (int) code;
        } catch (Exception e) { return 0; }
    }

    public static int latestBuild(Context ctx) { return prefs(ctx).getInt("build", 0); }
    public static boolean updateAvailable(Context ctx) {
        return latestBuild(ctx) > currentBuild(ctx) && prefs(ctx).getString("url", null) != null;
    }

    /** What the Settings card shows. */
    public static JSONObject status(Context ctx) {
        JSONObject o = new JSONObject();
        try {
            SharedPreferences p = prefs(ctx);
            o.put("current", currentBuild(ctx));
            o.put("latest", p.getInt("build", 0));
            o.put("available", updateAvailable(ctx));
            o.put("checkedAt", p.getLong("checked", 0));
            o.put("error", p.getString("error", ""));
        } catch (Exception ignored) { }
        return o;
    }

    /** Asks GitHub for the newest release. Blocking: call off the main thread. */
    public static void check(Context ctx, boolean force) {
        SharedPreferences p = prefs(ctx);
        if (!force && System.currentTimeMillis() - p.getLong("checked", 0) < MIN_GAP_MS) return;
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(API).openConnection();
            c.setConnectTimeout(12_000);
            c.setReadTimeout(15_000);
            c.setRequestProperty("Accept", "application/vnd.github+json");
            c.setRequestProperty("User-Agent", "NHLFaceoff-app");
            if (c.getResponseCode() != 200) {
                p.edit().putString("error", "GitHub didn't answer (" + c.getResponseCode() + "). Try again later.").apply();
                return;
            }
            JSONArray releases = new JSONArray(readAll(c.getInputStream()));
            int best = 0;
            String bestUrl = null;
            for (int i = 0; i < releases.length(); i++) {
                JSONObject r = releases.getJSONObject(i);
                if (r.optBoolean("draft") || r.optBoolean("prerelease")) continue;
                String tag = r.optString("tag_name");
                if (!tag.startsWith(TAG_PREFIX)) continue;
                int n;
                try { n = Integer.parseInt(tag.substring(TAG_PREFIX.length())); } catch (Exception e) { continue; }
                if (n <= best) continue;
                JSONArray assets = r.optJSONArray("assets");
                if (assets == null) continue;
                for (int j = 0; j < assets.length(); j++) {
                    JSONObject a = assets.getJSONObject(j);
                    if (ASSET.equals(a.optString("name"))) { best = n; bestUrl = a.optString("browser_download_url"); }
                }
            }
            p.edit().putLong("checked", System.currentTimeMillis()).putInt("build", best)
                    .putString("url", bestUrl).putString("error", "").apply();
        } catch (Exception e) {
            p.edit().putString("error", "Couldn't check for updates. Make sure you're online.").apply();
        }
    }

    /** Is Android's "Install unknown apps" switch on for this app? */
    public static boolean canInstall(Context ctx) {
        return Build.VERSION.SDK_INT < 26 || ctx.getPackageManager().canRequestPackageInstalls();
    }

    public static Intent permissionIntent(Context ctx) {
        return new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx.getPackageName()))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    }

    /** Downloads the newest APK and hands it to Android. Returns an error message, or null. Blocking. */
    public static String install(Context ctx, Progress progress) {
        String url = prefs(ctx).getString("url", null);
        int build = latestBuild(ctx);
        if (url == null || build <= currentBuild(ctx)) return "You already have the newest version.";
        File file = new File(ctx.getCacheDir(), "update-" + build + ".apk");
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setInstanceFollowRedirects(true);
            c.setConnectTimeout(15_000);
            c.setReadTimeout(30_000);
            c.setRequestProperty("User-Agent", "NHLFaceoff-app");
            long total = c.getContentLengthLong();
            try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(file)) {
                byte[] buf = new byte[64 * 1024];
                long done = 0;
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    done += n;
                    if (total > 0) progress.onProgress((int) (done * 100 / total));
                }
            }
            if (file.length() < 100_000) return "The download looks incomplete. Try again.";
            PackageInstaller pi = ctx.getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            params.setAppPackageName(ctx.getPackageName());
            if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
            int id = pi.createSession(params);
            try (PackageInstaller.Session s = pi.openSession(id)) {
                try (OutputStream out = s.openWrite("NHLFaceoff.apk", 0, file.length());
                     InputStream in = new FileInputStream(file)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    s.fsync(out);
                }
                Intent intent = new Intent(ctx, UpdateReceiver.class).setPackage(ctx.getPackageName());
                int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
                s.commit(PendingIntent.getBroadcast(ctx, id, intent, flags).getIntentSender());
            }
            return null;
        } catch (Exception e) {
            return "Update failed: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        } finally {
            file.delete(); // the installer has its own copy once committed
        }
    }

    private static String readAll(InputStream in) throws java.io.IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[16 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
        return bos.toString("UTF-8");
    }

    /** Android's installer reports back here; when it needs your OK, its confirm screen is opened. */
    public static class UpdateReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context ctx, Intent intent) {
            int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999);
            if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                Intent confirm;
                if (Build.VERSION.SDK_INT >= 33) confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
                else confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                if (confirm != null) ctx.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } else if (status != PackageInstaller.STATUS_SUCCESS) {
                String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
                Toast.makeText(ctx, "Update: " + (msg != null ? msg : "install didn't finish"), Toast.LENGTH_LONG).show();
            }
        }
    }
}
