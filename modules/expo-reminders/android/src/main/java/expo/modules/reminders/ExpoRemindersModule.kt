package expo.modules.reminders

import android.Manifest
import android.app.AlarmManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.speech.tts.TextToSpeech
import android.speech.tts.Voice
import androidx.core.content.ContextCompat
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

private const val MAX_PENDING = 50

class ExpoRemindersModule : Module() {
  private var speech: TextToSpeech? = null
  private var speechReady = false
  private var pendingSpeech: Triple<String, String?, Promise>? = null

  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  private fun speechChunks(text: String, limit: Int): List<String> {
    val chunks = mutableListOf<String>()
    var rest = text.trim()
    while (rest.length > limit) {
      val window = rest.substring(0, limit)
      val sentence = maxOf(
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? "),
        window.lastIndexOf('\n')
      )
      val space = window.lastIndexOf(' ')
      val cut = when {
        sentence > 0 -> sentence + 1
        space > 0 -> space
        else -> limit
      }
      chunks.add(rest.substring(0, cut).trim())
      rest = rest.substring(cut).trim()
    }
    if (rest.isNotEmpty()) chunks.add(rest)
    return chunks
  }

  private fun offlineVoice(engine: TextToSpeech, language: String?): Voice? {
    val offline = (engine.voices ?: emptySet<Voice>()).filter {
      !it.isNetworkConnectionRequired &&
        !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
    }
    val wanted = if (language != null) Locale.forLanguageTag(language) else Locale.getDefault()
    return offline.firstOrNull { it.locale == wanted }
      ?: offline.firstOrNull { it.locale.language == wanted.language }
      ?: offline.firstOrNull()
  }

  private fun say(text: String, language: String?): Boolean {
    val engine = speech ?: return false
    val voice = offlineVoice(engine, language) ?: return false
    engine.voice = voice
    val limit = maxOf(1, TextToSpeech.getMaxSpeechInputLength() - 1)
    val stamp = System.currentTimeMillis()
    speechChunks(text, limit).forEachIndexed { index, chunk ->
      val mode = if (index == 0) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
      engine.speak(chunk, mode, null, "pearnotes-read-aloud-$stamp-$index")
    }
    return true
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoReminders")

    AsyncFunction("requestPermission") { promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        promise.resolve(true)
        return@AsyncFunction
      }
      val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED
      if (granted) {
        promise.resolve(true)
        return@AsyncFunction
      }
      val permissions = appContext.permissions
      if (permissions == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      Permissions.askForPermissionsWithPermissionsManager(permissions, promise, Manifest.permission.POST_NOTIFICATIONS)
    }

    AsyncFunction("schedule") { items: List<Map<String, Any?>> ->
      cancelReminders(context)
      ensureChannel(context, "Reminders")
      val alarms = context.getSystemService(AlarmManager::class.java) ?: return@AsyncFunction 0
      val now = System.currentTimeMillis()
      val upcoming = items
        .mapNotNull { item ->
          val id = item["id"] as? String ?: return@mapNotNull null
          val at = (item["atMs"] as? Number)?.toLong() ?: return@mapNotNull null
          if (at <= now) {
            null
          } else {
            StoredReminder(
              id,
              item["title"] as? String ?: "",
              item["body"] as? String ?: "",
              at,
              item["url"] as? String ?: ""
            )
          }
        }
        .sortedBy { it.atMs }
        .take(MAX_PENDING)
      upcoming.forEach { armReminder(context, alarms, it) }
      saveReminders(context, upcoming)
      upcoming.size
    }

    AsyncFunction("cancelAll") {
      cancelReminders(context)
    }

    AsyncFunction("speak") { text: String, language: String?, promise: Promise ->
      val engine = speech
      pendingSpeech?.third?.resolve(true)
      pendingSpeech = null
      if (engine == null) {
        pendingSpeech = Triple(text, language, promise)
        speech = TextToSpeech(context) { status ->
          speechReady = status == TextToSpeech.SUCCESS
          val queued = pendingSpeech
          pendingSpeech = null
          queued?.third?.resolve(if (speechReady) say(queued.first, queued.second) else false)
        }
      } else if (speechReady) {
        promise.resolve(say(text, language))
      } else {
        pendingSpeech = Triple(text, language, promise)
      }
    }

    Function("stopSpeaking") {
      pendingSpeech?.third?.resolve(true)
      pendingSpeech = null
      speech?.stop()
    }

    Function("isSpeaking") {
      speech?.isSpeaking == true
    }

    OnDestroy {
      speech?.shutdown()
      speech = null
    }
  }
}
