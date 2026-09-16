const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withAppBuildGradle,
  withPodfile,
  withProjectBuildGradle,
  withSettingsGradle,
} = require('expo/config-plugins')

const PLUGIN_NAME = 'expo-local-ai'
const PLUGIN_VERSION = '1.0.0'
const OPENCL_LIBRARY = 'libOpenCL.so'
const OPENCL_PACKAGING_EXCLUDE = `excludes += "/lib/**/${OPENCL_LIBRARY}"`
const NATIVE_ADDONS_SCRIPT = 'scripts/prepare-native-addons.mjs'
const QVAC_NDK_VERSION = '29.0.14206865'

const PODFILE_SETUP = [
  "project_root = File.expand_path('..', __dir__)",
  "system('node', File.join(project_root, 'scripts', 'prepare-native-addons.mjs'), chdir: project_root) or raise 'scripts/prepare-native-addons.mjs failed'",
].join('\n')

const SETTINGS_GRADLE_SETUP = [
  'def nativeAddonsSetup = providers.exec {',
  '  workingDir(rootDir.parentFile)',
  '  commandLine("node", "scripts/prepare-native-addons.mjs")',
  '  ignoreExitValue = true',
  '}',
  'if (nativeAddonsSetup.result.get().exitValue != 0) {',
  '  throw new GradleException("scripts/prepare-native-addons.mjs failed\\n" + nativeAddonsSetup.standardOutput.asText.get() + nativeAddonsSetup.standardError.asText.get())',
  '}',
].join('\n')

function insertOnce(contents, anchor, insertion, label) {
  if (contents.includes(NATIVE_ADDONS_SCRIPT)) return contents
  if (!anchor.test(contents)) {
    throw new Error(
      `${PLUGIN_NAME}: could not find where to add the native addon setup in ${label}`,
    )
  }
  return contents.replace(anchor, insertion)
}

function withNativeAddonsSetup(config) {
  config = withPodfile(config, (mod) => {
    mod.modResults.contents = insertOnce(
      mod.modResults.contents,
      /^require 'json'\n/m,
      `require 'json'\n\n${PODFILE_SETUP}\n`,
      'the Podfile',
    )
    return mod
  })
  config = withSettingsGradle(config, (mod) => {
    mod.modResults.contents = insertOnce(
      mod.modResults.contents,
      /^rootProject\.name/m,
      `${SETTINGS_GRADLE_SETUP}\n\nrootProject.name`,
      'settings.gradle',
    )
    return mod
  })
  return config
}

function withOptionalOpenCL(config) {
  return withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults)
    const libraries = application['uses-native-library'] ?? []
    const existing = libraries.find((entry) => entry.$?.['android:name'] === OPENCL_LIBRARY)
    if (existing) {
      existing.$['android:required'] = 'false'
    } else {
      libraries.push({ $: { 'android:name': OPENCL_LIBRARY, 'android:required': 'false' } })
    }
    application['uses-native-library'] = libraries
    return mod
  })
}

function withOpenCLPackagingExclude(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes(OPENCL_PACKAGING_EXCLUDE)) return mod
    mod.modResults.contents = mod.modResults.contents.replace(
      /\nandroid\s*\{/,
      (match) =>
        `${match}\n    packagingOptions {\n        jniLibs {\n            ${OPENCL_PACKAGING_EXCLUDE}\n        }\n    }`,
    )
    return mod
  })
}

function withQvacNdkVersion(config) {
  return withProjectBuildGradle(config, (mod) => {
    const line = `ndkVersion = "${QVAC_NDK_VERSION}"`
    const contents = mod.modResults.contents
    if (/\bndkVersion\s*=/.test(contents)) {
      mod.modResults.contents = contents.replace(/\bndkVersion\s*=\s*["'][^"']*["']/, line)
    } else {
      mod.modResults.contents = contents.replace(
        /buildscript\s*\{\s*ext\s*\{/,
        (match) => `${match}\n    ${line}`,
      )
    }
    return mod
  })
}

function withLocalAi(config) {
  return withQvacNdkVersion(
    withOpenCLPackagingExclude(withOptionalOpenCL(withNativeAddonsSetup(config))),
  )
}

module.exports = createRunOncePlugin(withLocalAi, PLUGIN_NAME, PLUGIN_VERSION)
