package expo.modules.reminders

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

internal const val CHANNEL_ID = "pearnotes-reminders"
internal const val EXTRA_ID = "id"
internal const val EXTRA_TITLE = "title"
internal const val EXTRA_BODY = "body"
internal const val EXTRA_URL = "url"

internal fun ensureChannel(context: Context, name: String) {
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
  val manager = context.getSystemService(NotificationManager::class.java) ?: return
  if (manager.getNotificationChannel(CHANNEL_ID) != null) return
  manager.createNotificationChannel(
    NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_DEFAULT)
  )
}

class ReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(EXTRA_ID) ?: return
    forgetReminder(context, id)
    val url = intent.getStringExtra(EXTRA_URL) ?: ""
    ensureChannel(context, "Reminders")
    val open = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val tap = PendingIntent.getActivity(
      context,
      id.hashCode(),
      open,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(intent.getStringExtra(EXTRA_TITLE) ?: "")
      .setContentText(intent.getStringExtra(EXTRA_BODY) ?: "")
      .setAutoCancel(true)
      .setContentIntent(tap)
      .build()
    try {
      NotificationManagerCompat.from(context).notify(id.hashCode(), notification)
    } catch (_: SecurityException) {
    }
  }
}
