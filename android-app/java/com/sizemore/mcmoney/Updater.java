package com.sizemore.mcmoney;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * In-app updates: finds the newest "money-app-N" release on GitHub, downloads MC-Money.apk and hands it
 * to Android's installer. Android asks once for "Install unknown apps"; later updates can go straight
 * through on Android 12+ once the app has installed itself.
 */
final class Updater {
    private static final String RELEASES_API =
            "https://api.github.com/repos/michealsizemore1/ChatGPT-The-Master-App/releases?per_page=100";
    private static final String TAG_PREFIX = "money-app-";
    private static final String ASSET_NAME = "MC-Money.apk";

    private Updater() { }

    static int currentBuild(Context ctx) {
        try {
            PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            long code = Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
            return (int) code;
        } catch (Exception e) {
            return 0;
        }
    }

    /** Returns JSON {current, latest, url} or {current, error}. Call off the main thread. */
    static String check(Context ctx) {
        int current = currentBuild(ctx);
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(RELEASES_API).openConnection();
            c.setConnectTimeout(12000);
            c.setReadTimeout(15000);
            c.setRequestProperty("Accept", "application/vnd.github+json");
            c.setRequestProperty("User-Agent", "MC-Money-app");
            if (c.getResponseCode() != 200) throw new Exception("GitHub answered " + c.getResponseCode());
            JSONArray releases = new JSONArray(readAll(c.getInputStream()));
            int latest = 0;
            String url = null;
            for (int i = 0; i < releases.length(); i++) {
                JSONObject r = releases.getJSONObject(i);
                String tag = r.optString("tag_name", "");
                if (!tag.startsWith(TAG_PREFIX) || r.optBoolean("draft") || r.optBoolean("prerelease")) continue;
                int build;
                try { build = Integer.parseInt(tag.substring(TAG_PREFIX.length())); } catch (Exception e) { continue; }
                if (build <= latest) continue;
                JSONArray assets = r.optJSONArray("assets");
                if (assets == null) continue;
                for (int a = 0; a < assets.length(); a++) {
                    JSONObject asset = assets.getJSONObject(a);
                    if (ASSET_NAME.equals(asset.optString("name"))) {
                        latest = build;
                        url = asset.optString("browser_download_url");
                    }
                }
            }
            JSONObject out = new JSONObject();
            out.put("current", current);
            out.put("latest", latest);
            if (url != null) out.put("url", url);
            return out.toString();
        } catch (Exception e) {
            try {
                JSONObject out = new JSONObject();
                out.put("current", current);
                out.put("error", "Couldn't reach GitHub. Check your internet connection and try again.");
                return out.toString();
            } catch (Exception ignored) {
                return "{\"current\":" + current + "}";
            }
        }
    }

    static boolean canInstall(Context ctx) {
        return Build.VERSION.SDK_INT < 26 || ctx.getPackageManager().canRequestPackageInstalls();
    }

    static Intent permissionIntent(Context ctx) {
        return new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + ctx.getPackageName()));
    }

    interface Progress { void update(String message); }

    /** Downloads and installs. Returns an error message, or null once handed to Android. Call off the main thread. */
    static String install(Activity act, String url, int build, Progress progress) {
        File file = new File(act.getCacheDir(), "update-" + build + ".apk");
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setInstanceFollowRedirects(true);
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setRequestProperty("User-Agent", "MC-Money-app");
            long total = c.getContentLength();
            InputStream in = c.getInputStream();
            OutputStream out = new FileOutputStream(file);
            try {
                byte[] buf = new byte[64 * 1024];
                long done = 0;
                int lastPct = -1, n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    done += n;
                    if (total > 0) {
                        int pct = (int) (done * 100 / total);
                        if (pct / 10 != lastPct / 10) { lastPct = pct; progress.update("Downloading version 1." + build + "… " + pct + "%"); }
                    }
                }
            } finally { in.close(); out.close(); }
            if (file.length() < 100000) return "The download looks incomplete. Try again.";

            progress.update("Installing version 1." + build + "…");
            PackageInstaller pi = act.getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            params.setAppPackageName(act.getPackageName());
            if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
            int id = pi.createSession(params);
            PackageInstaller.Session session = pi.openSession(id);
            try {
                OutputStream sout = session.openWrite("MC-Money.apk", 0, file.length());
                InputStream fin = new FileInputStream(file);
                try {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = fin.read(buf)) > 0) sout.write(buf, 0, n);
                    session.fsync(sout);
                } finally { fin.close(); sout.close(); }
                Intent done = new Intent(act, UpdateReceiver.class).setPackage(act.getPackageName());
                int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
                session.commit(PendingIntent.getBroadcast(act, id, done, flags).getIntentSender());
            } finally { session.close(); }
            return null;
        } catch (Exception e) {
            return "Update failed: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        } finally {
            file.delete();
        }
    }

    private static String readAll(InputStream in) throws Exception {
        try {
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[16 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
            return bos.toString("UTF-8");
        } finally { in.close(); }
    }
}
