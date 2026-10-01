package app.financeguard.quickadd

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Due chiavi AES-256-GCM in Android Keystore, mai esportabili.
 *
 * Catalogo (conti/categorie, senza importi): senza user-auth, così la WebView
 * può aggiornarlo a vault sbloccato senza un prompt biometrico a ogni commit.
 * Coda (importi): richiede sblocco del telefono; timeout 120s dopo l'auth.
 */
internal object QuickAddCrypto {
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    const val CATALOG_ALIAS = "fg_quickadd_catalog_v1"
    const val QUEUE_ALIAS = "fg_quickadd_queue_v1"
    private const val GCM_TAG_BITS = 128
    private const val IV_BYTES = 12
    private const val AUTH_VALIDITY_SECONDS = 120

    fun getOrCreateCatalogKey(): SecretKey =
        getOrCreateKey(CATALOG_ALIAS, requireUserAuth = false)

    fun getOrCreateQueueKey(): SecretKey =
        getOrCreateKey(QUEUE_ALIAS, requireUserAuth = true)

    fun deleteKeys() {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        if (keyStore.containsAlias(CATALOG_ALIAS)) keyStore.deleteEntry(CATALOG_ALIAS)
        if (keyStore.containsAlias(QUEUE_ALIAS)) keyStore.deleteEntry(QUEUE_ALIAS)
    }

    fun encrypt(key: SecretKey, plaintext: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv
        val ciphertext = cipher.doFinal(plaintext)
        return iv + ciphertext
    }

    fun decrypt(key: SecretKey, blob: ByteArray): ByteArray {
        require(blob.size > IV_BYTES) { "ciphertext too short" }
        val iv = blob.copyOfRange(0, IV_BYTES)
        val ciphertext = blob.copyOfRange(IV_BYTES, blob.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_BITS, iv))
        return cipher.doFinal(ciphertext)
    }

    private fun getOrCreateKey(alias: String, requireUserAuth: Boolean): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val existing = keyStore.getEntry(alias, null) as? KeyStore.SecretKeyEntry
        if (existing != null) return existing.secretKey

        val purposes = KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        val builder = KeyGenParameterSpec.Builder(alias, purposes)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)
            .setUserAuthenticationRequired(requireUserAuth)

        if (requireUserAuth) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                builder.setUserAuthenticationParameters(
                    AUTH_VALIDITY_SECONDS,
                    KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL
                )
            } else {
                @Suppress("DEPRECATION")
                builder.setUserAuthenticationValidityDurationSeconds(AUTH_VALIDITY_SECONDS)
            }
        }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        generator.init(builder.build())
        return generator.generateKey()
    }
}
