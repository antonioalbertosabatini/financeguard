package app.financeguard.quickadd

import android.os.Build
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import app.financeguard.R

internal object QuickAddAuth {
    fun authenticators(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Authenticators.BIOMETRIC_STRONG or Authenticators.DEVICE_CREDENTIAL
        } else {
            Authenticators.BIOMETRIC_WEAK or Authenticators.DEVICE_CREDENTIAL
        }
    }

    fun canAuthenticate(activity: FragmentActivity): Boolean {
        val result = BiometricManager.from(activity).canAuthenticate(authenticators())
        return result == BiometricManager.BIOMETRIC_SUCCESS
    }

    fun authenticate(
        activity: FragmentActivity,
        onResult: (ok: Boolean, code: String?) -> Unit
    ) {
        if (!canAuthenticate(activity)) {
            onResult(false, "unavailable")
            return
        }

        val executor = ContextCompat.getMainExecutor(activity)
        val prompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    onResult(true, null)
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    val code = when (errorCode) {
                        BiometricPrompt.ERROR_USER_CANCELED,
                        BiometricPrompt.ERROR_NEGATIVE_BUTTON,
                        BiometricPrompt.ERROR_CANCELED -> "canceled"
                        else -> "auth_failed"
                    }
                    onResult(false, code)
                }

                override fun onAuthenticationFailed() {
                    // Attesa di un altro tentativo; il risultato finale arriva da onAuthenticationError/Succeeded.
                }
            }
        )

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(activity.getString(R.string.quick_add_auth_title))
            .setSubtitle(activity.getString(R.string.quick_add_auth_subtitle))
            .setAllowedAuthenticators(authenticators())
            .build()

        prompt.authenticate(promptInfo)
    }
}
