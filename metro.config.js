/* eslint-env node */
const path = require('path')

const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const config = getDefaultConfig(projectRoot)

// @pear-notes/core is consumed via `npm link` during local development
// (or a plain symlink). Metro resolves a symlinked package's requires
// against its own node_modules, not the app's — so React-context-carrying
// packages (react, react-redux, redux, ...) end up duplicated between
// core's node_modules and the app's, breaking hooks/Provider context.
// Force these to always resolve to this app's single copy.
const singletonPackages = ['react', 'react-redux', '@reduxjs/toolkit', 'redux-saga', 'redux']
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...Object.fromEntries(
    singletonPackages.map((pkg) => [pkg, path.resolve(projectRoot, 'node_modules', pkg)]),
  ),
}
config.resolver.unstable_enableSymlinks = true
config.watchFolders = [path.resolve(projectRoot, '../SharedLocales')]

module.exports = config
