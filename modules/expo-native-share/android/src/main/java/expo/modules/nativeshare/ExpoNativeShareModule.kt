package expo.modules.nativeshare

import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.Exceptions

import androidx.core.content.FileProvider
import java.io.File

class ExpoNativeShareModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoNativeShare")

    AsyncFunction("share") { options: Map<String, Any?> ->
      val currentActivity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val message = options["message"] as? String ?: ""
      val urls = options["urls"] as? List<String> ?: emptyList()

      val intent = Intent().apply {
        action = if (urls.size > 1) Intent.ACTION_SEND_MULTIPLE else Intent.ACTION_SEND
        type = "text/plain" // Default, will change if files are added
        if (message.isNotEmpty()) {
          putExtra(Intent.EXTRA_TEXT, message)
        }
      }

      if (urls.isNotEmpty()) {
        val uris = ArrayList<Uri>()
        urls.forEach { urlString ->
          try {
            val uri = if (urlString.startsWith("file://")) {
              val path = Uri.parse(urlString).path ?: return@forEach
              val file = File(path)
              val authority = "${context.packageName}.FileSystemFileProvider"
              FileProvider.getUriForFile(context, authority, file)
            } else {
              Uri.parse(urlString)
            }
            uris.add(uri)
          } catch (_: Exception) {}
        }
        
        if (uris.size > 1) {
          intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
          intent.type = "*/*"
        } else {
          intent.putExtra(Intent.EXTRA_STREAM, uris[0])
          intent.type = context.contentResolver.getType(uris[0]) ?: "*/*"
        }
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      val chooser = Intent.createChooser(intent, "Share Note")
      currentActivity.startActivity(chooser)
    }
  }
}
