package expo.modules.backgroundservice

import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoBackgroundServiceModule : Module() {
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
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          ContextCompat.startForegroundService(context, intent)
        } else {
          context.startService(intent)
        }
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

        context.startService(intent)
      }
    }

    Function("stop") {
      appContext.reactContext?.let { context ->
        val intent = Intent(context, BackupForegroundService::class.java).apply {
          action = BackupForegroundService.ACTION_STOP
        }
        
        context.startService(intent)
      }
    }
  }
}
