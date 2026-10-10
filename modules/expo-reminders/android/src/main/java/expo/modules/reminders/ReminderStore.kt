package expo.modules.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject

private const val PREFS = "pearnotes-reminders"
private const val PREF_ITEMS = "items"

internal data class StoredReminder(
  val id: String,
  val title: String,
  val body: String,
  val atMs: Long,
  val url: String
)

private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

internal fun alarmIntent(context: Context, id: String, extras: Intent.() -> Unit = {}): PendingIntent {
  val intent = Intent(context, ReminderReceiver::class.java).apply {
    putExtra(EXTRA_ID, id)
    extras()
  }
  return PendingIntent.getBroadcast(
    context,
    id.hashCode(),
    intent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  )
}

internal fun loadReminders(context: Context): List<StoredReminder> {
  val raw = prefs(context).getString(PREF_ITEMS, null) ?: return emptyList()
  return try {
    val array = JSONArray(raw)
    (0 until array.length()).map { index ->
      val item = array.getJSONObject(index)
      StoredReminder(
        item.getString("id"),
        item.optString("title"),
        item.optString("body"),
        item.getLong("atMs"),
        item.optString("url")
      )
    }
  } catch (_: Exception) {
    emptyList()
  }
}

internal fun saveReminders(context: Context, items: List<StoredReminder>) {
  val array = JSONArray()
  items.forEach { item ->
    array.put(
      JSONObject()
        .put("id", item.id)
        .put("title", item.title)
        .put("body", item.body)
        .put("atMs", item.atMs)
        .put("url", item.url)
    )
  }
  prefs(context).edit().putString(PREF_ITEMS, array.toString()).apply()
}

internal fun armReminder(context: Context, alarms: AlarmManager, item: StoredReminder) {
  val pending = alarmIntent(context, item.id) {
    putExtra(EXTRA_TITLE, item.title)
    putExtra(EXTRA_BODY, item.body)
    putExtra(EXTRA_URL, item.url)
  }
  alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.atMs, pending)
}

internal fun cancelReminders(context: Context) {
  val alarms = context.getSystemService(AlarmManager::class.java)
  loadReminders(context).forEach { alarms?.cancel(alarmIntent(context, it.id)) }
  prefs(context).edit().remove(PREF_ITEMS).apply()
}

internal fun forgetReminder(context: Context, id: String) {
  saveReminders(context, loadReminders(context).filter { it.id != id })
}

internal fun rearmReminders(context: Context) {
  val alarms = context.getSystemService(AlarmManager::class.java) ?: return
  val now = System.currentTimeMillis()
  val upcoming = loadReminders(context).filter { it.atMs > now }
  saveReminders(context, upcoming)
  upcoming.forEach { armReminder(context, alarms, it) }
}
