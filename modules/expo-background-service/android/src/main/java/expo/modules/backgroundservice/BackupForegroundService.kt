package expo.modules.backgroundservice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class BackupForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "backup_channel"
        const val NOTIFICATION_ID = 12345
        const val COMPLETION_NOTIFICATION_ID = 12346

        const val ACTION_START = "ACTION_START"
        const val ACTION_UPDATE = "ACTION_UPDATE"
        const val ACTION_STOP = "ACTION_STOP"

        const val EXTRA_TITLE = "EXTRA_TITLE"
        const val EXTRA_MESSAGE = "EXTRA_MESSAGE"
        const val EXTRA_PROGRESS = "EXTRA_PROGRESS"
        const val EXTRA_MAX_PROGRESS = "EXTRA_MAX_PROGRESS"
    }

    private var currentTitle: String = "Backup in progress"

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_NOT_STICKY

        when (action) {
            ACTION_START -> {
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "Backup in progress"
                currentTitle = title
                val message = intent.getStringExtra(EXTRA_MESSAGE) ?: ""
                val maxProgress = intent.getIntExtra(EXTRA_MAX_PROGRESS, 100)
                startForegroundService(title, message, maxProgress)
            }
            ACTION_UPDATE -> {
                val title = intent.getStringExtra(EXTRA_TITLE) ?: currentTitle
                currentTitle = title
                val message = intent.getStringExtra(EXTRA_MESSAGE) ?: ""
                val progress = intent.getIntExtra(EXTRA_PROGRESS, 0)
                val maxProgress = intent.getIntExtra(EXTRA_MAX_PROGRESS, 100)
                updateNotification(title, message, progress, maxProgress)
            }
            ACTION_STOP -> {
                val completionTitle = intent.getStringExtra(EXTRA_TITLE)
                if (completionTitle != null) {
                    postCompletionNotification(
                        completionTitle,
                        intent.getStringExtra(EXTRA_MESSAGE) ?: ""
                    )
                }
                stopForeground(true)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onTimeout(startId: Int) {
        stopForeground(true)
        stopSelf()
    }

    private fun startForegroundService(title: String, message: String, maxProgress: Int) {
        createNotificationChannel()

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Try to find default app icon, or use a fallback
        val iconRes = applicationInfo.icon

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(iconRes)
            .setContentIntent(pendingIntent)
            .setOngoing(true)

        if (maxProgress > 0) builder.setProgress(maxProgress, 0, false)

        startForeground(NOTIFICATION_ID, builder.build())
    }

    private fun updateNotification(title: String, message: String, progress: Int, maxProgress: Int) {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val iconRes = applicationInfo.icon

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(iconRes)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)

        if (maxProgress > 0) builder.setProgress(maxProgress, progress, false)

        notificationManager.notify(NOTIFICATION_ID, builder.build())
    }

    private fun postCompletionNotification(title: String, message: String) {
        createNotificationChannel()

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(applicationInfo.icon)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(COMPLETION_NOTIFICATION_ID, builder.build())
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Backup Progress"
            val descriptionText = "Shows progress for backup and restore operations"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
