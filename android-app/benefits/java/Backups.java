package com.sizemore.benefits;

import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/** Automatic backups: Downloads/Family Benefits Hub/Auto backups, newest 7 kept. */
final class Backups {
    private static final String SUBFOLDER = "Family Benefits Hub/Auto backups";
    private static final String PREFIX = "family-benefits-hub-auto-";
    private static final int KEEP = 7;

    private Backups() { }

    /** Saves one backup. Returns where it went (for the Settings text), or "" if it failed. */
    static String save(Context ctx, String name, String json) {
        try {
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            if (Build.VERSION.SDK_INT >= 29) {
                String rel = Environment.DIRECTORY_DOWNLOADS + "/" + SUBFOLDER;
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                cv.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                cv.put(MediaStore.MediaColumns.RELATIVE_PATH, rel);
                Uri uri = ctx.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) return "";
                try (OutputStream os = ctx.getContentResolver().openOutputStream(uri)) { os.write(bytes); }
                prune29(ctx, rel + "/");
                return "Downloads/" + SUBFOLDER;
            } else {
                File dir = new File(ctx.getExternalFilesDir(null), "Auto backups");
                dir.mkdirs();
                try (FileOutputStream os = new FileOutputStream(new File(dir, name))) { os.write(bytes); }
                File[] files = dir.listFiles((d, n) -> n.startsWith(PREFIX));
                if (files != null && files.length > KEEP) {
                    Arrays.sort(files, (x, y) -> y.getName().compareTo(x.getName()));
                    for (int i = KEEP; i < files.length; i++) files[i].delete();
                }
                return dir.getAbsolutePath();
            }
        } catch (Exception e) {
            return "";
        }
    }

    /** Deletes older automatic backups this app saved, keeping the newest [KEEP]. */
    private static void prune29(Context ctx, String relWithSlash) {
        Uri coll = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
        String[] proj = { MediaStore.MediaColumns._ID };
        String sel = MediaStore.MediaColumns.RELATIVE_PATH + "=? AND " + MediaStore.MediaColumns.DISPLAY_NAME + " LIKE ?";
        String[] args = { relWithSlash, PREFIX + "%" };
        try (Cursor c = ctx.getContentResolver().query(coll, proj, sel, args, MediaStore.MediaColumns.DATE_ADDED + " DESC")) {
            if (c == null) return;
            int n = 0;
            while (c.moveToNext()) {
                if (++n <= KEEP) continue;
                try { ctx.getContentResolver().delete(ContentUris.withAppendedId(coll, c.getLong(0)), null, null); }
                catch (Exception ignored) { } // a copy left by an earlier install can't be deleted by this one
            }
        } catch (Exception ignored) { }
    }
}
