package com.sizemore.retirement;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;

/**
 * Shares the plan's headline numbers (retirement date, plan confidence, total assets, net worth, how long the money
 * lasts, the monthly household budget) with BeyondStride's Today screen. Only apps the owner has allowed
 * ("Read Retirement Planner summary" permission) can read it.
 */
public class SummaryProvider extends ContentProvider {
    static final String AUTHORITY = "com.sizemore.retirement.summary";

    static void save(Context c, String json) {
        c.getSharedPreferences("summary", 0).edit().putString("json", json).putLong("at", System.currentTimeMillis()).apply();
        try { c.getContentResolver().notifyChange(Uri.parse("content://" + AUTHORITY + "/plan"), null); } catch (Exception ignored) { }
    }

    @Override public boolean onCreate() { return true; }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] args, String sort) {
        android.content.SharedPreferences p = getContext().getSharedPreferences("summary", 0);
        MatrixCursor c = new MatrixCursor(new String[]{"json", "at"});
        c.addRow(new Object[]{p.getString("json", ""), p.getLong("at", 0)});
        return c;
    }

    @Override public String getType(Uri uri) { return "vnd.android.cursor.item/vnd.retirement.summary"; }
    @Override public Uri insert(Uri uri, ContentValues v) { return null; }
    @Override public int delete(Uri uri, String s, String[] a) { return 0; }
    @Override public int update(Uri uri, ContentValues v, String s, String[] a) { return 0; }
}
