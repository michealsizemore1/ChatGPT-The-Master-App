package com.sizemore.upkeep;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;

/**
 * App lock: asks for the fingerprint (or the phone's screen lock PIN/pattern/password) when the app
 * opens and after it has been away for a few minutes. Only works when the phone itself has a screen
 * lock; otherwise the app just opens. On by default; switch it off in Settings.
 */
final class AppLock {
    static final int CONFIRM_REQUEST = 2001;          // used on Android 8 and older
    static final long RELOCK_AFTER_MS = 5 * 60_000L;  // away longer than this locks again

    interface Result { void done(boolean ok); }

    private AppLock() { }

    static boolean enabled(Context ctx) { return ctx.getSharedPreferences("applock", 0).getBoolean("enabled", true); }
    static void setEnabled(Context ctx, boolean on) { ctx.getSharedPreferences("applock", 0).edit().putBoolean("enabled", on).apply(); }

    /** True when the phone has a screen lock, which the app lock relies on. */
    static boolean available(Context ctx) {
        KeyguardManager km = (KeyguardManager) ctx.getSystemService(Context.KEYGUARD_SERVICE);
        return km != null && km.isDeviceSecure();
    }

    static void prompt(Activity a, final Result result) {
        if (Build.VERSION.SDK_INT >= 28) {
            BiometricPrompt.Builder b = new BiometricPrompt.Builder(a)
                    .setTitle("Unlock Vehicle Upkeep")
                    .setSubtitle("Use your fingerprint or screen lock");
            if (Build.VERSION.SDK_INT >= 30) {
                b.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK
                        | BiometricManager.Authenticators.DEVICE_CREDENTIAL);
            } else {
                b.setDeviceCredentialAllowed(true);
            }
            try {
                b.build().authenticate(new CancellationSignal(), a.getMainExecutor(), new BiometricPrompt.AuthenticationCallback() {
                    @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) { result.done(true); }
                    @Override public void onAuthenticationError(int code, CharSequence msg) { result.done(false); }
                });
            } catch (Exception e) {
                result.done(true); // never lock someone out because the prompt itself failed
            }
        } else {
            KeyguardManager km = (KeyguardManager) a.getSystemService(Context.KEYGUARD_SERVICE);
            Intent i = km == null ? null : km.createConfirmDeviceCredentialIntent("Unlock Vehicle Upkeep", "Use your screen lock");
            if (i == null) { result.done(true); return; }
            a.startActivityForResult(i, CONFIRM_REQUEST); // MainActivity.onActivityResult finishes the unlock
        }
    }
}
