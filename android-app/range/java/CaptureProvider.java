package com.sizemore.range;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** Gives the camera app a place to write a full-size photo for receipt scanning. */
public class CaptureProvider extends ContentProvider {
    static final String AUTHORITY = "com.sizemore.range.capture";

    static Uri newPhotoUri(Context c) {
        File dir = new File(c.getCacheDir(), "capture");
        dir.mkdirs();
        File[] old = dir.listFiles();
        if (old != null) for (File f : old) f.delete();
        return Uri.parse("content://" + AUTHORITY + "/photo_" + System.currentTimeMillis() + ".jpg");
    }

    static boolean hasPhoto(Context c, Uri u) {
        File f = fileFor(c, u);
        return f != null && f.length() > 0;
    }

    private static File fileFor(Context c, Uri u) {
        String name = u.getLastPathSegment();
        if (c == null || name == null || name.contains("/") || name.contains("..")) return null;
        return new File(new File(c.getCacheDir(), "capture"), name);
    }

    @Override public boolean onCreate() { return true; }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = fileFor(getContext(), uri);
        if (f == null) throw new FileNotFoundException(String.valueOf(uri));
        f.getParentFile().mkdirs();
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.parseMode(mode));
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File f = fileFor(getContext(), uri);
        MatrixCursor c = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
        if (f != null) c.addRow(new Object[]{f.getName(), f.length()});
        return c;
    }

    @Override public String getType(Uri uri) { return "image/jpeg"; }
    @Override public Uri insert(Uri uri, ContentValues values) { return null; }
    @Override public int delete(Uri uri, String selection, String[] selectionArgs) { return 0; }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) { return 0; }
}
