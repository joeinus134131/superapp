const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo support: watch workspace root so Metro can resolve @superapp/shared
config.watchFolders = [workspaceRoot];

// Resolve modules from both project and workspace root
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(workspaceRoot, 'node_modules'),
];

// Map @superapp/shared to local package path
config.resolver.extraNodeModules = {
  '@superapp/shared': path.join(workspaceRoot, 'packages/shared'),
};

module.exports = config;
