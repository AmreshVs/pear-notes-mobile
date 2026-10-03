const pkg = require('./package.json')
const { storeBuild } = require('./scripts/store-build')

module.exports = ({ config }) => {
  const build = storeBuild(pkg.version, pkg.buildNumber)
  return {
    ...config,
    version: pkg.version,
    ios: { ...config.ios, buildNumber: String(build) },
    android: { ...config.android, versionCode: build },
  }
}
