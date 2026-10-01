package app.financeguard.quickadd

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.nio.charset.StandardCharsets
import java.util.UUID

internal data class CatalogAccount(
    val id: String,
    val name: String,
    val type: String,
    val icon: String
)

internal data class CatalogCategory(
    val id: String,
    val name: String,
    val type: String,
    val icon: String
)

internal data class QuickAddCatalog(
    val accounts: List<CatalogAccount>,
    val categories: List<CatalogCategory>,
    val language: String,
    val defaultCurrency: String,
    val defaultAccountId: String?,
    val defaultExpenseCategoryId: String?,
    val defaultIncomeCategoryId: String?
)

internal data class PendingItem(
    val id: String,
    val amount: Int,
    val type: String,
    val categoryId: String,
    val accountId: String,
    val date: String
)

internal object QuickAddStore {
    private const val PREFS = "quick_add"
    private const val KEY_ENABLED = "enabled"
    private const val DIR = "quickadd"
    private const val CATALOG_FILE = "catalog.bin"
    private const val QUEUE_FILE = "queue.bin"

    @Volatile
    private var lastDrained: List<PendingItem>? = null

    fun isEnabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_ENABLED, false)

    fun enable(context: Context) {
        QuickAddCrypto.getOrCreateCatalogKey()
        QuickAddCrypto.getOrCreateQueueKey()
        dir(context).mkdirs()
        prefs(context).edit().putBoolean(KEY_ENABLED, true).apply()
    }

    fun disable(context: Context) {
        lastDrained = null
        catalogFile(context).delete()
        queueFile(context).delete()
        QuickAddCrypto.deleteKeys()
        prefs(context).edit().clear().apply()
    }

    fun queueIsEmpty(context: Context): Boolean {
        val file = queueFile(context)
        return !file.exists() || file.length() == 0L
    }

    fun setCatalogJson(context: Context, catalogJson: String) {
        require(isEnabled(context)) { "quick add disabled" }
        val key = QuickAddCrypto.getOrCreateCatalogKey()
        val blob = QuickAddCrypto.encrypt(key, catalogJson.toByteArray(StandardCharsets.UTF_8))
        writeFile(catalogFile(context), blob)
    }

    fun readCatalog(context: Context): QuickAddCatalog? {
        if (!isEnabled(context)) return null
        val file = catalogFile(context)
        if (!file.exists() || file.length() == 0L) return null
        val key = QuickAddCrypto.getOrCreateCatalogKey()
        val json = String(QuickAddCrypto.decrypt(key, file.readBytes()), StandardCharsets.UTF_8)
        return parseCatalog(JSONObject(json))
    }

    fun appendPending(context: Context, item: PendingItem) {
        require(isEnabled(context)) { "quick add disabled" }
        val current = readQueue(context).toMutableList()
        current.add(item)
        writeQueue(context, current)
        lastDrained = current
    }

    fun readQueue(context: Context): List<PendingItem> {
        if (!isEnabled(context) || queueIsEmpty(context)) {
            lastDrained = emptyList()
            return emptyList()
        }
        val key = QuickAddCrypto.getOrCreateQueueKey()
        val json = String(QuickAddCrypto.decrypt(key, queueFile(context).readBytes()), StandardCharsets.UTF_8)
        val items = parseQueue(JSONArray(json))
        lastDrained = items
        return items
    }

    fun rememberDrained(items: List<PendingItem>) {
        lastDrained = items
    }

    fun clearPending(context: Context, ids: Set<String>) {
        val current = lastDrained ?: readQueue(context)
        val remaining = current.filter { it.id !in ids }
        writeQueue(context, remaining)
        lastDrained = remaining
    }

    fun newPendingId(): String = "qa_${UUID.randomUUID().toString().replace("-", "").take(16)}"

    fun updateCatalogDefaults(
        context: Context,
        accountId: String,
        type: String,
        categoryId: String
    ) {
        val catalog = readCatalog(context) ?: return
        val updated = catalog.copy(
            defaultAccountId = accountId,
            defaultExpenseCategoryId = if (type == "expense") categoryId else catalog.defaultExpenseCategoryId,
            defaultIncomeCategoryId = if (type == "income") categoryId else catalog.defaultIncomeCategoryId
        )
        setCatalogJson(context, catalogToJson(updated).toString())
    }

    private fun writeQueue(context: Context, items: List<PendingItem>) {
        val file = queueFile(context)
        if (items.isEmpty()) {
            file.delete()
            return
        }
        val key = QuickAddCrypto.getOrCreateQueueKey()
        val blob = QuickAddCrypto.encrypt(key, queueToJson(items).toString().toByteArray(StandardCharsets.UTF_8))
        writeFile(file, blob)
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun dir(context: Context) = File(context.applicationContext.filesDir, DIR)

    private fun catalogFile(context: Context) = File(dir(context), CATALOG_FILE)

    private fun queueFile(context: Context) = File(dir(context), QUEUE_FILE)

    private fun writeFile(file: File, bytes: ByteArray) {
        file.parentFile?.mkdirs()
        file.writeBytes(bytes)
    }

    private fun parseCatalog(obj: JSONObject): QuickAddCatalog {
        val accounts = mutableListOf<CatalogAccount>()
        val accountsArr = obj.optJSONArray("accounts") ?: JSONArray()
        for (i in 0 until accountsArr.length()) {
            val item = accountsArr.optJSONObject(i) ?: continue
            val id = item.optString("id")
            val name = item.optString("name")
            if (id.isEmpty() || name.isEmpty()) continue
            accounts.add(
                CatalogAccount(
                    id = id,
                    name = name,
                    type = item.optString("type"),
                    icon = item.optString("icon")
                )
            )
        }
        val categories = mutableListOf<CatalogCategory>()
        val catArr = obj.optJSONArray("categories") ?: JSONArray()
        for (i in 0 until catArr.length()) {
            val item = catArr.optJSONObject(i) ?: continue
            val id = item.optString("id")
            val name = item.optString("name")
            if (id.isEmpty() || name.isEmpty()) continue
            categories.add(
                CatalogCategory(
                    id = id,
                    name = name,
                    type = item.optString("type"),
                    icon = item.optString("icon")
                )
            )
        }
        val defaults = obj.optJSONObject("defaults")
        return QuickAddCatalog(
            accounts = accounts,
            categories = categories,
            language = obj.optString("language", "it"),
            defaultCurrency = obj.optString("defaultCurrency", "EUR"),
            defaultAccountId = defaults?.optString("accountId")?.ifEmpty { null },
            defaultExpenseCategoryId = defaults?.optString("expenseCategoryId")?.ifEmpty { null },
            defaultIncomeCategoryId = defaults?.optString("incomeCategoryId")?.ifEmpty { null }
        )
    }

    private fun catalogToJson(catalog: QuickAddCatalog): JSONObject {
        val accounts = JSONArray()
        catalog.accounts.forEach { account ->
            accounts.put(
                JSONObject()
                    .put("id", account.id)
                    .put("name", account.name)
                    .put("type", account.type)
                    .put("icon", account.icon)
            )
        }
        val categories = JSONArray()
        catalog.categories.forEach { category ->
            categories.put(
                JSONObject()
                    .put("id", category.id)
                    .put("name", category.name)
                    .put("type", category.type)
                    .put("icon", category.icon)
            )
        }
        val defaults = JSONObject()
            .put("accountId", catalog.defaultAccountId ?: "")
            .put("expenseCategoryId", catalog.defaultExpenseCategoryId ?: "")
            .put("incomeCategoryId", catalog.defaultIncomeCategoryId ?: "")
        return JSONObject()
            .put("accounts", accounts)
            .put("categories", categories)
            .put("language", catalog.language)
            .put("defaultCurrency", catalog.defaultCurrency)
            .put("defaults", defaults)
    }

    private fun parseQueue(arr: JSONArray): List<PendingItem> {
        val items = mutableListOf<PendingItem>()
        for (i in 0 until arr.length()) {
            val item = arr.optJSONObject(i) ?: continue
            val id = item.optString("id")
            val type = item.optString("type")
            val categoryId = item.optString("categoryId")
            val accountId = item.optString("accountId")
            val date = item.optString("date")
            val amount = item.optInt("amount", -1)
            if (id.isEmpty() || amount <= 0) continue
            items.add(
                PendingItem(
                    id = id,
                    amount = amount,
                    type = type,
                    categoryId = categoryId,
                    accountId = accountId,
                    date = date
                )
            )
        }
        return items
    }

    private fun queueToJson(items: List<PendingItem>): JSONArray {
        val arr = JSONArray()
        items.forEach { item ->
            arr.put(
                JSONObject()
                    .put("id", item.id)
                    .put("amount", item.amount)
                    .put("type", item.type)
                    .put("categoryId", item.categoryId)
                    .put("accountId", item.accountId)
                    .put("date", item.date)
            )
        }
        return arr
    }
}
