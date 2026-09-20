import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sheetView = path.join(
  projectRoot,
  'node_modules',
  '@expo',
  'ui',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'ui',
  'ModalBottomSheetView.kt',
)

const MARKER = '// @generated pear-notes-sheet-edge-to-edge'

const IMPORT_ANCHOR = 'import androidx.compose.runtime.LaunchedEffect\n'
const IMPORTS = [
  'import android.os.Build\n',
  'import androidx.compose.runtime.SideEffect\n',
  'import androidx.compose.ui.platform.LocalView\n',
  'import androidx.compose.ui.window.DialogWindowProvider\n',
  'import androidx.core.view.WindowCompat\n',
]

const CONTENT_ANCHOR = `  ) {
    Children(UIComposableScope(), filter = { !isSlotView(it) })
  }`

const PATCHED_CONTENT = `  ) {
    ${MARKER}
    val sheetWindow = (LocalView.current.parent as? DialogWindowProvider)?.window
    if (sheetWindow != null) {
      SideEffect {
        WindowCompat.setDecorFitsSystemWindows(sheetWindow, false)
        sheetWindow.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          sheetWindow.isNavigationBarContrastEnforced = false
        }
      }
    }
    Children(UIComposableScope(), filter = { !isSlotView(it) })
  }`

if (!fs.existsSync(sheetView)) {
  console.log('@expo/ui is not installed, skipping bottom sheet edge-to-edge patch')
  process.exit(0)
}

let source = fs.readFileSync(sheetView, 'utf8')

if (source.includes(MARKER)) {
  console.log('@expo/ui bottom sheet already patched for edge-to-edge')
  process.exit(0)
}

if (!source.includes(CONTENT_ANCHOR)) {
  console.error(
    [
      'Could not patch @expo/ui ModalBottomSheetView.kt for edge-to-edge.',
      'The upstream content block changed, so Android bottom sheets will paint',
      'an opaque system navigation bar over the sheet.',
      `Re-check ${path.relative(projectRoot, sheetView)} and update this script.`,
    ].join('\n'),
  )
  process.exit(1)
}

if (!source.includes(IMPORT_ANCHOR)) {
  console.error(
    `Could not find the import anchor in ${path.relative(projectRoot, sheetView)}; update this script.`,
  )
  process.exit(1)
}

const missingImports = IMPORTS.filter((line) => !source.includes(line))
source = source.replace(IMPORT_ANCHOR, `${IMPORT_ANCHOR}${missingImports.join('')}`)
source = source.replace(CONTENT_ANCHOR, PATCHED_CONTENT)

fs.writeFileSync(sheetView, source)

console.log('Patched @expo/ui bottom sheet to draw edge-to-edge behind the navigation bar')
