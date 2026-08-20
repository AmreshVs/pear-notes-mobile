package expo.modules.backgroundservice

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoBackgroundServiceModule : Module() {
  private fun deliver(intent: Intent, context: Context, asForeground: Boolean) {
    try {
      if (asForeground && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ContextCompat.startForegroundService(context, intent)
      } else {
        context.startService(intent)
      }
    } catch (e: Exception) {
      Log.e(TAG, "service intent rejected: ${intent.action}", e)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoBackgroundService")

    Function("start") { title: String, message: String, maxProgress: Int ->
      appContext.reactContext?.let { context ->
        val intent = Intent(context, BackupForegroundService::class.java).apply {
          action = BackupForegroundService.ACTION_START
          putExtra(BackupForegroundService.EXTRA_TITLE, title)
          putExtra(BackupForegroundService.EXTRA_MESSAGE, message)
          putExtra(BackupForegroundService.EXTRA_MAX_PROGRESS, maxProgress)
        }

        deliver(intent, context, true)
      }
    }

    Function("update") { title: String, progress: Int, message: String, maxProgress: Int ->
      appContext.reactContext?.let { context ->
        val intent = Intent(context, BackupForegroundService::class.java).apply {
          action = BackupForegroundService.ACTION_UPDATE
          putExtra(BackupForegroundService.EXTRA_TITLE, title)
          putExtra(BackupForegroundService.EXTRA_MESSAGE, message)
          putExtra(BackupForegroundService.EXTRA_PROGRESS, progress)
          putExtra(BackupForegroundService.EXTRA_MAX_PROGRESS, maxProgress)
        }

        deliver(intent, context, false)
      }
    }

    Function("stop") { completionTitle: String?, completionMessage: String? ->
      appContext.reactContext?.let { context ->
        val intent = Intent(context, BackupForegroundService::class.java).apply {
          action = BackupForegroundService.ACTION_STOP
          if (completionTitle != null) {
            putExtra(BackupForegroundService.EXTRA_TITLE, completionTitle)
            putExtra(BackupForegroundService.EXTRA_MESSAGE, completionMessage ?: "")
          }
        }

        deliver(intent, context, false)
      }
    }
  }

  companion object {
    private const val TAG = "ExpoBackgroundService"
  }
}
