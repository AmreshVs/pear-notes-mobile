package expo.modules.backgroundservice

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
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

    Function("isIgnoringBatteryOptimizations") {
      val context = appContext.reactContext ?: return@Function true
      val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        ?: return@Function true
      power.isIgnoringBatteryOptimizations(context.packageName)
    }

    Function("openBatteryOptimizationSettings") {
      val context = appContext.reactContext
      var opened = false
      if (context != null) {
        val list = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
          context.startActivity(list)
          opened = true
        } catch (e: Exception) {
          Log.e(TAG, "battery optimisation settings unavailable", e)
          val appSpecific = Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.fromParts("package", context.packageName, null)
          ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
          try {
            context.startActivity(appSpecific)
            opened = true
          } catch (inner: Exception) {
            Log.e(TAG, "app details settings unavailable", inner)
          }
        }
      }
      opened
    }

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
