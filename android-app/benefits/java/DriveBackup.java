package com.sizemore.benefits;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Google Drive backup without a Google sign-in inside the app: the person picks (once) where to
 * save a backup file with Android's own file picker, choosing Google Drive. The app keeps
 * permission to that one file and overwrites it with each automatic or manual backup.
 * The Drive app uploads the change in the background, and Drive keeps its own older versions.
 */
final class DriveBackup {
    static final int LINK_REQUEST = 3001;
    private static final String PREFS = "drive_backup";

    private DriveBackup() {}

    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, 0); }

    static Intent linkIntent() {
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("application/json");
        i.putExtra(Intent.EXTRA_TITLE, "Family Benefits Hub backup.json");
        return i;
    }

    /** Called with the file the person created in the picker. Returns its display name. */
    static String onLinked(Context c, Uri uri) {
        unlink(c);
        boolean kept = true;
        try {
            c.getContentResolver().takePersistableUriPermission(uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        } catch (Exception e) {
            try {
                c.getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            } catch (Exception e2) { kept = false; }
        }
        String name = displayName(c, uri);
        prefs(c).edit()
                .putString("uri", uri.toString())
                .putString("name", name)
                .putString("where", uri.getAuthority() != null && uri.getAuthority().contains("google.android.apps.docs") ? "Google Drive" : "")
                .putBoolean("kept", kept)
                .remove("lastAt").remove("error")
                .apply();
        return name;
    }

    static void unlink(Context c) {
        String s = prefs(c).getString("uri", null);
        if (s != null) {
            try {
                c.getContentResolver().releasePersistableUriPermission(Uri.parse(s),
                        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            } catch (Exception ignored) {}
        }
        prefs(c).edit().clear().apply();
    }

    static String status(Context c) {
        SharedPreferences p = prefs(c);
        try {
            return new org.json.JSONObject()
                    .put("linked", p.getString("uri", null) != null)
                    .put("name", p.getString("name", ""))
                    .put("where", p.getString("where", ""))
                    .put("lastAt", p.getLong("lastAt", 0))
                    .put("error", p.getString("error", ""))
                    .toString();
        } catch (Exception e) { return "{}"; }
    }

    static boolean linked(Context c) { return prefs(c).getString("uri", null) != null; }

    /** Overwrites the linked file. Returns null when it worked, otherwise a message for the person. */
    static String write(Context c, String json) {
        SharedPreferences p = prefs(c);
        String s = p.getString("uri", null);
        if (s == null) return "No Google Drive file is linked.";
        Uri uri = Uri.parse(s);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        String err = null;
        try {
            OutputStream os;
            try { os = c.getContentResolver().openOutputStream(uri, "wt"); }
            catch (Exception e) { os = c.getContentResolver().openOutputStream(uri, "w"); }
            if (os == null) throw new Exception("the file couldn't be opened");
            try { os.write(bytes); os.flush(); } finally { os.close(); }
        } catch (SecurityException e) {
            err = "The app lost permission to the Google Drive file. Tap \"Choose Google Drive file\" to link it again.";
        } catch (Exception e) {
            String m = e.getMessage();
            err = (m != null && m.toLowerCase().contains("not found") || e instanceof java.io.FileNotFoundException)
                    ? "The Google Drive file was moved or deleted. Tap \"Choose Google Drive file\" to link a new one."
                    : "Couldn't save to Google Drive: " + (m == null ? e.getClass().getSimpleName() : m);
        }
        if (err == null) p.edit().putLong("lastAt", System.currentTimeMillis()).remove("error").apply();
        else p.edit().putString("error", err).apply();
        return err;
    }

    private static String displayName(Context c, Uri uri) {
        try (Cursor cur = c.getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cur != null && cur.moveToFirst()) {
                String n = cur.getString(0);
                if (n != null && !n.isEmpty()) return n;
            }
        } catch (Exception ignored) {}
        return "Family Benefits Hub backup.json";
    }
}
