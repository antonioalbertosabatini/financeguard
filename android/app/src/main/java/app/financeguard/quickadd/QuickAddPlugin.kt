package app.financeguard.quickadd

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONException

@CapacitorPlugin(name = "QuickAdd")
class QuickAddPlugin : Plugin() {
    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val ret = JSObject()
        ret.put("value", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun isEnabled(call: PluginCall) {
        val ret = JSObject()
        ret.put("value", QuickAddStore.isEnabled(context))
        call.resolve(ret)
    }

    @PluginMethod
    fun enable(call: PluginCall) {
        val activity = activity
        if (activity == null) {
            call.reject("Activity not available", "no_activity")
            return
        }
        activity.runOnUiThread {
            if (!QuickAddAuth.canAuthenticate(activity)) {
                call.reject("Device authentication is not available", "unavailable")
                return@runOnUiThread
            }
            QuickAddAuth.authenticate(activity) { ok, code ->
                if (!ok) {
                    call.reject("Authentication failed", code ?: "auth_failed")
                    return@authenticate
                }
                try {
                    QuickAddStore.enable(context)
                    call.resolve()
                } catch (e: Exception) {
                    call.reject(e.message ?: "enable failed", "enable_failed")
                }
            }
        }
    }

    @PluginMethod
    fun disable(call: PluginCall) {
        QuickAddStore.disable(context)
        call.resolve()
    }

    @PluginMethod
    fun setCatalog(call: PluginCall) {
        val catalogJson = call.getString("catalogJson")
        if (catalogJson.isNullOrEmpty()) {
            call.reject("catalogJson is required", "invalid_catalog")
            return
        }
        if (!QuickAddStore.isEnabled(context)) {
            call.resolve()
            return
        }
        try {
            QuickAddStore.setCatalogJson(context, catalogJson)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "setCatalog failed", "catalog_failed")
        }
    }

    @PluginMethod
    fun drainPending(call: PluginCall) {
        if (!QuickAddStore.isEnabled(context) || QuickAddStore.queueIsEmpty(context)) {
            call.resolve(itemsResult(emptyList()))
            return
        }
        val activity = activity
        if (activity == null) {
            call.reject("Activity not available", "no_activity")
            return
        }
        activity.runOnUiThread {
            QuickAddAuth.authenticate(activity) { ok, code ->
                if (!ok) {
                    call.reject("Authentication failed", code ?: "auth_failed")
                    return@authenticate
                }
                try {
                    val items = QuickAddStore.readQueue(context)
                    QuickAddStore.rememberDrained(items)
                    call.resolve(itemsResult(items))
                } catch (e: Exception) {
                    call.reject(e.message ?: "drain failed", "drain_failed")
                }
            }
        }
    }

    @PluginMethod
    fun clearPending(call: PluginCall) {
        val ids = mutableSetOf<String>()
        val array = call.getArray("ids")
        if (array != null) {
            for (i in 0 until array.length()) {
                try {
                    val value = array.getString(i)
                    if (!value.isNullOrEmpty()) ids.add(value)
                } catch (_: JSONException) {
                    // skip malformed entries
                }
            }
        }
        if (!QuickAddStore.isEnabled(context)) {
            call.resolve()
            return
        }
        try {
            QuickAddStore.clearPending(context, ids)
            call.resolve()
        } catch (_: Exception) {
            val activity = activity
            if (activity == null) {
                call.reject("Activity not available", "no_activity")
                return
            }
            activity.runOnUiThread {
                QuickAddAuth.authenticate(activity) { ok, code ->
                    if (!ok) {
                        call.reject("Authentication failed", code ?: "auth_failed")
                        return@authenticate
                    }
                    try {
                        QuickAddStore.clearPending(context, ids)
                        call.resolve()
                    } catch (e: Exception) {
                        call.reject(e.message ?: "clear failed", "clear_failed")
                    }
                }
            }
        }
    }

    private fun itemsResult(items: List<PendingItem>): JSObject {
        val arr = JSArray()
        items.forEach { item ->
            val obj = JSObject()
            obj.put("id", item.id)
            obj.put("amount", item.amount)
            obj.put("type", item.type)
            obj.put("categoryId", item.categoryId)
            obj.put("accountId", item.accountId)
            obj.put("date", item.date)
            arr.put(obj)
        }
        val ret = JSObject()
        ret.put("items", arr)
        return ret
    }
}
