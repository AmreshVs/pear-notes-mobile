const fs = require('fs')
const path = require('path')
const {
  AndroidConfig,
  IOSConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins')
const plist = require('@expo/plist').default

const PLUGIN_NAME = 'expo-share-intake'
const PLUGIN_VERSION = '1.0.0'
const EXTENSION_TARGET_NAME = 'PearNotesShareExtension'
const EXTENSION_BUNDLE_SUFFIX = 'ShareExtension'
const EXTENSION_SWIFT_FILE = 'ShareViewController.swift'
const EXTENSION_SOURCE_DIRECTORY = path.dirname(
  require.resolve(`./ios-extension/${EXTENSION_SWIFT_FILE}`),
)
const EXTENSION_INFO_PLIST = 'Info.plist'
const EXTENSION_ENTITLEMENTS = `${EXTENSION_TARGET_NAME}.entitlements`
const APP_GROUPS_ENTITLEMENT = 'com.apple.security.application-groups'
const APP_GROUP_INFO_KEY = 'PearNotesAppGroupIdentifier'
const URL_SCHEME_INFO_KEY = 'PearNotesURLScheme'
const SHARE_EXTENSION_POINT = 'com.apple.share-services'
const EXTENSION_MAX_ITEM_COUNT = 100
const EXTENSION_MAX_WEB_URL_COUNT = 1
const SHARE_ACTIONS = ['android.intent.action.SEND', 'android.intent.action.SEND_MULTIPLE']
const DEFAULT_CATEGORY = 'android.intent.category.DEFAULT'
const ANY_MIME_TYPE = '*/*'
const EXTENSION_RUNPATH_SEARCH_PATHS =
  '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"'

const quote = (value) => `"${String(value).replace(/^"|"$/g, '')}"`
const unquote = (value) => (typeof value === 'string' ? value.replace(/^"|"$/g, '') : value)

function getBundleIdentifier(config) {
  const bundleIdentifier = config.ios?.bundleIdentifier
  if (!bundleIdentifier) throw new Error(`${PLUGIN_NAME} requires ios.bundleIdentifier`)
  return bundleIdentifier
}

function getAppGroup(config) {
  return `group.${getBundleIdentifier(config)}`
}

function getUrlScheme(config) {
  const scheme = Array.isArray(config.scheme) ? config.scheme[0] : config.scheme
  if (!scheme) throw new Error(`${PLUGIN_NAME} requires a scheme`)
  return scheme
}

function withShareIntentFilters(config) {
  return withAndroidManifest(config, (modConfig) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(modConfig.modResults)
    const filters = activity['intent-filter'] ?? []
    const declaredActions = new Set(
      filters.flatMap((filter) => (filter.action ?? []).map((action) => action.$['android:name'])),
    )
    SHARE_ACTIONS.filter((action) => !declaredActions.has(action)).forEach((action) => {
      filters.push({
        action: [{ $: { 'android:name': action } }],
        category: [{ $: { 'android:name': DEFAULT_CATEGORY } }],
        data: [{ $: { 'android:mimeType': ANY_MIME_TYPE } }],
      })
    })
    activity['intent-filter'] = filters
    return modConfig
  })
}

function withAppGroupEntitlement(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    const appGroup = getAppGroup(config)
    const groups = modConfig.modResults[APP_GROUPS_ENTITLEMENT] ?? []
    if (!groups.includes(appGroup)) {
      modConfig.modResults[APP_GROUPS_ENTITLEMENT] = [...groups, appGroup]
    }
    return modConfig
  })
}

function withAppGroupInfo(config) {
  return withInfoPlist(config, (modConfig) => {
    modConfig.modResults[APP_GROUP_INFO_KEY] = getAppGroup(config)
    return modConfig
  })
}

function buildExtensionInfoPlist(config) {
  return {
    CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)',
    CFBundleDisplayName: config.name,
    CFBundleExecutable: '$(EXECUTABLE_NAME)',
    CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
    CFBundleInfoDictionaryVersion: '6.0',
    CFBundleName: '$(PRODUCT_NAME)',
    CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
    CFBundleShortVersionString: '$(MARKETING_VERSION)',
    CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
    [APP_GROUP_INFO_KEY]: getAppGroup(config),
    [URL_SCHEME_INFO_KEY]: getUrlScheme(config),
    NSExtension: {
      NSExtensionAttributes: {
        NSExtensionActivationRule: {
          NSExtensionActivationSupportsAttachmentsWithMaxCount: EXTENSION_MAX_ITEM_COUNT,
          NSExtensionActivationSupportsFileWithMaxCount: EXTENSION_MAX_ITEM_COUNT,
          NSExtensionActivationSupportsImageWithMaxCount: EXTENSION_MAX_ITEM_COUNT,
          NSExtensionActivationSupportsMovieWithMaxCount: EXTENSION_MAX_ITEM_COUNT,
          NSExtensionActivationSupportsText: true,
          NSExtensionActivationSupportsWebURLWithMaxCount: EXTENSION_MAX_WEB_URL_COUNT,
        },
      },
      NSExtensionPrincipalClass: '$(PRODUCT_MODULE_NAME).ShareViewController',
      NSExtensionPointIdentifier: SHARE_EXTENSION_POINT,
    },
  }
}

function withShareExtensionFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const targetDirectory = path.join(
        modConfig.modRequest.platformProjectRoot,
        EXTENSION_TARGET_NAME,
      )
      await fs.promises.mkdir(targetDirectory, { recursive: true })
      await fs.promises.copyFile(
        path.join(EXTENSION_SOURCE_DIRECTORY, EXTENSION_SWIFT_FILE),
        path.join(targetDirectory, EXTENSION_SWIFT_FILE),
      )
      await fs.promises.writeFile(
        path.join(targetDirectory, EXTENSION_INFO_PLIST),
        plist.build(buildExtensionInfoPlist(config)),
      )
      await fs.promises.writeFile(
        path.join(targetDirectory, EXTENSION_ENTITLEMENTS),
        plist.build({ [APP_GROUPS_ENTITLEMENT]: [getAppGroup(config)] }),
      )
      return modConfig
    },
  ])
}

function getBuildSettingsByConfigurationName(project, configurationListId) {
  return Object.fromEntries(
    IOSConfig.XcodeUtils.getBuildConfigurationsForListId(project, configurationListId).map(
      ([, configuration]) => [unquote(configuration.name), configuration.buildSettings],
    ),
  )
}

function applyExtensionBuildSettings(project, configurationListId, mainSettings, bundleIdentifier) {
  IOSConfig.XcodeUtils.getBuildConfigurationsForListId(project, configurationListId).forEach(
    ([, configuration]) => {
      const main = mainSettings[unquote(configuration.name)] ?? {}
      const parentBundleIdentifier = unquote(main.PRODUCT_BUNDLE_IDENTIFIER) || bundleIdentifier
      Object.assign(configuration.buildSettings, {
        APPLICATION_EXTENSION_API_ONLY: 'YES',
        CLANG_ENABLE_MODULES: 'YES',
        CODE_SIGN_ENTITLEMENTS: quote(`${EXTENSION_TARGET_NAME}/${EXTENSION_ENTITLEMENTS}`),
        CODE_SIGN_STYLE: main.CODE_SIGN_STYLE ?? 'Automatic',
        CURRENT_PROJECT_VERSION: main.CURRENT_PROJECT_VERSION ?? '1',
        DEVELOPMENT_TEAM: main.DEVELOPMENT_TEAM,
        GENERATE_INFOPLIST_FILE: 'NO',
        INFOPLIST_FILE: quote(`${EXTENSION_TARGET_NAME}/${EXTENSION_INFO_PLIST}`),
        IPHONEOS_DEPLOYMENT_TARGET: main.IPHONEOS_DEPLOYMENT_TARGET,
        LD_RUNPATH_SEARCH_PATHS: EXTENSION_RUNPATH_SEARCH_PATHS,
        MARKETING_VERSION: main.MARKETING_VERSION ?? '1.0',
        PRODUCT_BUNDLE_IDENTIFIER: quote(`${parentBundleIdentifier}.${EXTENSION_BUNDLE_SUFFIX}`),
        PRODUCT_NAME: quote('$(TARGET_NAME)'),
        SKIP_INSTALL: 'YES',
        SWIFT_VERSION: main.SWIFT_VERSION ?? '5.0',
        TARGETED_DEVICE_FAMILY: main.TARGETED_DEVICE_FAMILY ?? quote('1,2'),
      })
      if (!configuration.buildSettings.DEVELOPMENT_TEAM) {
        delete configuration.buildSettings.DEVELOPMENT_TEAM
      }
    },
  )
}

function removeUndefinedAttributes(object) {
  Object.keys(object).forEach((key) => {
    if (object[key] === undefined || object[key] === 'undefined') delete object[key]
  })
}

function tidyExtensionFileReferences(project, fileNames) {
  const objects = project.hash.project.objects
  const fileReferences = objects.PBXFileReference ?? {}
  const buildFiles = objects.PBXBuildFile ?? {}
  const unbuiltFileReferenceIds = new Set()

  Object.entries(fileReferences).forEach(([id, reference]) => {
    if (typeof reference !== 'object' || !fileNames.includes(unquote(reference.path))) return
    removeUndefinedAttributes(reference)
    if (unquote(reference.path) === EXTENSION_ENTITLEMENTS) {
      reference.lastKnownFileType = 'text.plist.entitlements'
    }
    if (unquote(reference.path) !== EXTENSION_SWIFT_FILE) unbuiltFileReferenceIds.add(id)
  })

  Object.entries(buildFiles).forEach(([id, buildFile]) => {
    if (typeof buildFile !== 'object' || !unbuiltFileReferenceIds.has(buildFile.fileRef)) return
    delete buildFiles[id]
    delete buildFiles[`${id}_comment`]
  })
}

function tidyExtensionProduct(project, productReferenceId) {
  const reference = project.hash.project.objects.PBXFileReference?.[productReferenceId]
  if (reference) removeUndefinedAttributes(reference)
}

function ensureDependencySections(project) {
  const objects = project.hash.project.objects
  objects.PBXTargetDependency = objects.PBXTargetDependency ?? {}
  objects.PBXContainerItemProxy = objects.PBXContainerItemProxy ?? {}
}

function withShareExtensionTarget(config) {
  return withXcodeProject(config, (modConfig) => {
    const project = modConfig.modResults
    if (project.pbxTargetByName(EXTENSION_TARGET_NAME)) return modConfig

    const mainTarget = IOSConfig.XcodeUtils.getApplicationNativeTarget({
      project,
      projectName: modConfig.modRequest.projectName,
    })
    const mainSettings = getBuildSettingsByConfigurationName(
      project,
      mainTarget.target.buildConfigurationList,
    )
    const bundleIdentifier = `${getBundleIdentifier(config)}.${EXTENSION_BUNDLE_SUFFIX}`

    const group = project.addPbxGroup(
      [EXTENSION_SWIFT_FILE, EXTENSION_INFO_PLIST, EXTENSION_ENTITLEMENTS],
      EXTENSION_TARGET_NAME,
      EXTENSION_TARGET_NAME,
    )
    project.addToPbxGroup(group.uuid, project.getFirstProject().firstProject.mainGroup)

    const target = project.addTarget(
      EXTENSION_TARGET_NAME,
      'app_extension',
      EXTENSION_TARGET_NAME,
      bundleIdentifier,
    )
    project.addBuildPhase([EXTENSION_SWIFT_FILE], 'PBXSourcesBuildPhase', 'Sources', target.uuid)
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid)
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid)
    ensureDependencySections(project)
    project.addTargetDependency(mainTarget.uuid, [target.uuid])
    tidyExtensionFileReferences(project, [
      EXTENSION_SWIFT_FILE,
      EXTENSION_INFO_PLIST,
      EXTENSION_ENTITLEMENTS,
    ])
    tidyExtensionProduct(project, target.pbxNativeTarget.productReference)

    applyExtensionBuildSettings(
      project,
      target.pbxNativeTarget.buildConfigurationList,
      mainSettings,
      bundleIdentifier,
    )

    const developmentTeam = Object.values(mainSettings).find(
      (settings) => settings.DEVELOPMENT_TEAM,
    )?.DEVELOPMENT_TEAM
    if (developmentTeam) {
      project.addTargetAttribute('DevelopmentTeam', developmentTeam, target)
      project.addTargetAttribute('ProvisioningStyle', 'Automatic', target)
    }
    return modConfig
  })
}

function withShareIntake(config) {
  config = withShareIntentFilters(config)
  config = withAppGroupEntitlement(config)
  config = withAppGroupInfo(config)
  config = withShareExtensionFiles(config)
  config = withShareExtensionTarget(config)
  return config
}

module.exports = createRunOncePlugin(withShareIntake, PLUGIN_NAME, PLUGIN_VERSION)
