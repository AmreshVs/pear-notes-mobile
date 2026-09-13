package expo.modules.shareintake

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.Locale
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

private const val MODULE_NAME = "ExpoShareIntake"
private const val INBOX_CHANGED_EVENT = "onInboxChanged"
private const val INBOX_DIRECTORY = "share-intake"
private const val MANIFEST_FILE = "manifest.json"
private const val MANIFEST_TEMP_FILE = "manifest.json.tmp"
private const val MANIFEST_VERSION = 1
private const val CONSUMED_EXTRA = "expo.modules.shareintake.CONSUMED"
private const val COPY_BUFFER_BYTES = 256 * 1024
private const val MAX_FILE_NAME_LENGTH = 120
private const val SHARE_ID_SUFFIX_LENGTH = 8
private const val FALLBACK_FILE_NAME = "shared-file"
private const val FALLBACK_MIME_TYPE = "application/octet-stream"
private val SINGLE_WEB_URL = Regex("^https?://\\S+$", RegexOption.IGNORE_CASE)
private val UNSAFE_FILE_NAME_CHARACTERS = Regex("[\\\\/:*?\"<>|\\p{Cntrl}]")

private data class ShareRequest(
  val uris: List<Uri>,
  val text: String?,
  val subject: String?,
  val declaredMimeType: String?
)

private data class ShareResult(val itemCount: Int, val unreadableCount: Int)

class ExpoShareIntakeModule : Module() {
  private val executor = Executors.newSingleThreadExecutor()
  private val activeImports = AtomicInteger(0)
  private val intentLock = Any()

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  override fun definition() = ModuleDefinition {
    Name(MODULE_NAME)

    Events(INBOX_CHANGED_EVENT)

    AsyncFunction("importPendingShares") { promise: Promise ->
      claimIntent(appContext.currentActivity?.intent)
      val queued = runCatching { executor.execute { promise.resolve(null) } }
      if (queued.isFailure) promise.resolve(null)
    }

    Function("isPreparing") {
      activeImports.get() > 0
    }

    OnActivityEntersForeground {
      claimIntent(appContext.currentActivity?.intent)
    }

    OnNewIntent { intent ->
      claimIntent(intent)
    }

    OnDestroy {
      executor.shutdown()
    }
  }

  private fun claimIntent(intent: Intent?) {
    if (intent == null) return
    val request = runCatching {
      synchronized(intentLock) {
        if (!isUnclaimedShareIntent(intent)) return
        intent.putExtra(CONSUMED_EXTRA, true)
        readShareRequest(intent)
      }
    }.getOrNull() ?: return

    activeImports.incrementAndGet()
    emitInboxChanged(0)
    val queued = runCatching {
      executor.execute {
        val result = runCatching { writeShare(request) }.getOrElse { ShareResult(0, request.uris.size) }
        activeImports.decrementAndGet()
        emitInboxChanged(if (result.itemCount == 0) result.unreadableCount else 0)
      }
    }
    if (queued.isFailure) {
      activeImports.decrementAndGet()
      emitInboxChanged(request.uris.size)
    }
  }

  private fun emitInboxChanged(unreadableCount: Int) {
    runCatching {
      sendEvent(
        INBOX_CHANGED_EVENT,
        mapOf("preparing" to (activeImports.get() > 0), "unreadableCount" to unreadableCount)
      )
    }
  }

  private fun isUnclaimedShareIntent(intent: Intent): Boolean {
    val isShareAction = intent.action == Intent.ACTION_SEND || intent.action == Intent.ACTION_SEND_MULTIPLE
    val isFromHistory = (intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0
    return isShareAction && !isFromHistory && !intent.getBooleanExtra(CONSUMED_EXTRA, false)
  }

  private fun readShareRequest(intent: Intent): ShareRequest {
    val uris = LinkedHashSet<Uri>()
    readStreamExtras(intent).forEach { uris.add(it) }
    var clipText: String? = null
    intent.clipData?.let { clip ->
      for (index in 0 until clip.itemCount) {
        val item = clip.getItemAt(index)
        item.uri?.let { uris.add(it) }
        if (clipText == null) clipText = item.text?.toString()
      }
    }
    val extraText = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
    val text = (extraText ?: clipText)?.trim()?.takeIf { it.isNotEmpty() }
    val subject = intent.getCharSequenceExtra(Intent.EXTRA_SUBJECT)?.toString()?.trim()?.takeIf { it.isNotEmpty() }
    return ShareRequest(uris.toList(), text, subject, intent.type)
  }

  @Suppress("DEPRECATION")
  private fun readStreamExtras(intent: Intent): List<Uri> {
    val single = runCatching { intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM) }.getOrNull()
    val multiple = runCatching { intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM) }.getOrNull()
    return listOfNotNull(single) + multiple.orEmpty().filterNotNull()
  }

  private fun writeShare(request: ShareRequest): ShareResult {
    val shareId = "${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(SHARE_ID_SUFFIX_LENGTH)}"
    val directory = File(File(context.filesDir, INBOX_DIRECTORY), shareId)
    if (!directory.mkdirs()) return ShareResult(0, request.uris.size)

    try {
      val items = JSONArray()
      buildTextItem(request)?.let { items.put(it) }
      val usedNames = HashSet<String>()
      var skipped = 0
      for (uri in request.uris) {
        val item = runCatching { copySharedUri(uri, directory, usedNames, request.declaredMimeType) }.getOrNull()
        if (item == null) skipped += 1 else items.put(item)
      }

      if (items.length() == 0) {
        directory.deleteRecursively()
        return ShareResult(0, skipped)
      }

      val manifest = JSONObject()
        .put("version", MANIFEST_VERSION)
        .put("id", shareId)
        .put("createdAt", System.currentTimeMillis())
        .put("skipped", skipped)
        .put("items", items)
      val temporaryManifest = File(directory, MANIFEST_TEMP_FILE)
      temporaryManifest.writeText(manifest.toString())
      check(temporaryManifest.renameTo(File(directory, MANIFEST_FILE)))
      return ShareResult(items.length(), skipped)
    } catch (error: Throwable) {
      directory.deleteRecursively()
      throw error
    }
  }

  private fun buildTextItem(request: ShareRequest): JSONObject? {
    val text = request.text ?: return null
    val title = request.subject?.takeIf { !text.contains(it) }
    val item = if (SINGLE_WEB_URL.matches(text)) {
      JSONObject().put("kind", "url").put("url", text)
    } else {
      JSONObject().put("kind", "text").put("text", text)
    }
    title?.let { item.put("title", it) }
    return item
  }

  private fun copySharedUri(
    uri: Uri,
    directory: File,
    usedNames: MutableSet<String>,
    declaredMimeType: String?
  ): JSONObject? {
    if (!isForeignReadableUri(uri)) return null
    val displayName = queryDisplayName(uri)
    val mimeType = resolveMimeType(uri, displayName, declaredMimeType)
    val fileName = allocateFileName(displayName, mimeType, usedNames)
    val target = File(directory, fileName)
    try {
      val input = context.contentResolver.openInputStream(uri) ?: return null
      input.use { source ->
        FileOutputStream(target).use { sink -> source.copyTo(sink, COPY_BUFFER_BYTES) }
      }
    } catch (error: Throwable) {
      target.delete()
      throw error
    }
    return JSONObject()
      .put("kind", "file")
      .put("file", fileName)
      .put("name", fileName)
      .put("mimeType", mimeType)
      .put("size", target.length())
  }

  private fun queryDisplayName(uri: Uri): String? {
    if (uri.scheme != ContentResolver.SCHEME_CONTENT) return uri.lastPathSegment
    val queried = runCatching {
      context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        val column = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (column >= 0 && cursor.moveToFirst() && !cursor.isNull(column)) cursor.getString(column) else null
      }
    }.getOrNull()
    return queried?.takeIf { it.isNotBlank() } ?: uri.lastPathSegment
  }

  private fun resolveMimeType(uri: Uri, displayName: String?, declaredMimeType: String?): String {
    val resolved = runCatching { context.contentResolver.getType(uri) }.getOrNull()
    val fromExtension = displayName
      ?.substringAfterLast('.', "")
      ?.lowercase(Locale.ROOT)
      ?.takeIf { it.isNotEmpty() }
      ?.let { MimeTypeMap.getSingleton().getMimeTypeFromExtension(it) }
    return listOf(resolved, fromExtension, declaredMimeType).firstOrNull { isConcreteMimeType(it) }
      ?: FALLBACK_MIME_TYPE
  }

  private fun isConcreteMimeType(value: String?): Boolean =
    !value.isNullOrBlank() && value.contains('/') && !value.contains('*')

  private fun allocateFileName(rawName: String?, mimeType: String, usedNames: MutableSet<String>): String {
    val cleaned = (rawName ?: "")
      .substringAfterLast('/')
      .replace(UNSAFE_FILE_NAME_CHARACTERS, "_")
      .trim()
      .trimStart('.')
      .ifEmpty { FALLBACK_FILE_NAME }
    val existingExtension = cleaned.substringAfterLast('.', "")
    val extension = existingExtension.ifEmpty {
      MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: ""
    }
    val baseName = (if (existingExtension.isEmpty()) cleaned else cleaned.substringBeforeLast('.'))
      .take(MAX_FILE_NAME_LENGTH)
      .ifEmpty { FALLBACK_FILE_NAME }

    var candidate = composeFileName(baseName, extension)
    var suffix = 2
    while (!usedNames.add(candidate.lowercase(Locale.ROOT)) || candidate == MANIFEST_FILE || candidate == MANIFEST_TEMP_FILE) {
      candidate = composeFileName("$baseName-$suffix", extension)
      suffix += 1
    }
    return candidate
  }

  private fun composeFileName(baseName: String, extension: String): String =
    if (extension.isEmpty()) baseName else "$baseName.$extension"

  private fun isForeignReadableUri(uri: Uri): Boolean = when (uri.scheme?.lowercase(Locale.ROOT)) {
    ContentResolver.SCHEME_CONTENT -> isForeignContentUri(uri)
    ContentResolver.SCHEME_FILE -> isForeignFileUri(uri)
    else -> false
  }

  @Suppress("DEPRECATION")
  private fun isForeignContentUri(uri: Uri): Boolean {
    val authority = uri.authority ?: return false
    if (authority == context.packageName || authority.startsWith("${context.packageName}.")) return false
    val provider = runCatching { context.packageManager.resolveContentProvider(authority, 0) }.getOrNull()
    return provider?.packageName != context.packageName
  }

  private fun isForeignFileUri(uri: Uri): Boolean {
    val path = uri.path ?: return false
    val canonicalPath = runCatching { File(path).canonicalPath }.getOrNull() ?: return false
    return privateStorageRoots().none { root ->
      canonicalPath == root || canonicalPath.startsWith("$root${File.separator}")
    }
  }

  private fun privateStorageRoots(): List<String> {
    val roots = listOfNotNull(
      context.applicationInfo.dataDir,
      context.filesDir.parent,
      context.cacheDir.parent,
      context.getExternalFilesDir(null)?.parentFile?.path,
      context.externalCacheDir?.parentFile?.path,
      "/data/data/${context.packageName}"
    )
    return roots.mapNotNull { runCatching { File(it).canonicalPath }.getOrNull() }.distinct()
  }
}
