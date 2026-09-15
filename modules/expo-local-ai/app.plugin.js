const { execFileSync } = require('child_process')
const path = require('path')
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withProjectBuildGradle,
} = require('expo/config-plugins')

const PLUGIN_NAME = 'expo-local-ai'
const PLUGIN_VERSION = '1.0.0'
const OPENCL_LIBRARY = 'libOpenCL.so'
const OPENCL_PACKAGING_EXCLUDE = `excludes += "/lib/**/${OPENCL_LIBRARY}"`
const BUILD_SCRIPTS = ['scripts/build-qvac-bundle.mjs', 'scripts/patch-bare-kit-linker.mjs']
const QVAC_NDK_VERSION = '29.0.14206865'

function runBuildScripts(projectRoot) {
  for (const script of BUILD_SCRIPTS) {
    execFileSync(process.execPath, [path.join(projectRoot, script)], { cwd: projectRoot, stdio: 'inherit' })
  }
}

function withQvacWorkerBundle(config) {
  let built = false
  const build = (mod) => {
    if (!built) {
      runBuildScripts(mod.modRequest.projectRoot)
      built = true
    }
    return mod
  }
  config = withDangerousMod(config, ['android', build])
  config = withDangerousMod(config, ['ios', build])
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
      mod.modResults.contents = contents.replace(/buildscript\s*\{\s*ext\s*\{/, (match) => `${match}\n    ${line}`)
    }
    return mod
  })
}

function withLocalAi(config) {
  return withQvacNdkVersion(
    withOpenCLPackagingExclude(withOptionalOpenCL(withQvacWorkerBundle(config))),
  )
}

module.exports = createRunOncePlugin(withLocalAi, PLUGIN_NAME, PLUGIN_VERSION)
