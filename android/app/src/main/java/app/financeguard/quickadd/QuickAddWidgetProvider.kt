package app.financeguard.quickadd

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import androidx.core.app.PendingIntentCompat
import app.financeguard.R

class QuickAddWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.quick_add_widget)
            val intent = Intent(context, QuickAddActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pending = PendingIntentCompat.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT,
                false
            ) ?: continue
            views.setOnClickPendingIntent(R.id.quick_add_widget_root, pending)
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}
