const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const pnpmStore = path.join(workspaceRoot, 'node_modules', '.pnpm');

const config = getDefaultConfig(projectRoot);

// Monorepo support: watch workspace root so Metro can resolve @superapp/shared
config.watchFolders = [workspaceRoot];

// Resolve modules from both project and workspace root node_modules
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(workspaceRoot, 'node_modules'),
];

// Build a lookup map from package-name -> resolved path from the pnpm virtual store.
// This runs once at startup and covers ALL transitive deps.
const buildPnpmMap = () => {
  const map = {};
  try {
    const entries = fs.readdirSync(pnpmStore);
    for (const entry of entries) {
      // entry looks like: "some-pkg@1.2.3_hash" or "@scope+pkg@1.2.3_hash"
      // Convert @scope+pkg -> @scope/pkg
      const pkgName = entry
        .replace(/\+/g, '/') // @scope+pkg -> @scope/pkg
        .replace(/@[^@/][^/]*$/, '') // strip @version suffix (last @... segment)
        .replace(/^@\//, '@'); // fix accidental leading @/

      // Actual path to the package inside the store
      const resolvedPath = path.join(pnpmStore, entry, 'node_modules');

      // The real package name might differ slightly; resolve by checking the
      // actual directory inside node_modules of this store entry
      const innerNm = path.join(pnpmStore, entry, 'node_modules');
      try {
        const innerPkgs = fs.readdirSync(innerNm);
        for (const inner of innerPkgs) {
          if (inner.startsWith('.')) continue;
          if (inner.startsWith('@')) {
            // scoped: list sub-entries
            const scopedDir = path.join(innerNm, inner);
            try {
              const scoped = fs.readdirSync(scopedDir);
              for (const s of scoped) {
                const fullName = `${inner}/${s}`;
                if (!map[fullName]) {
                  map[fullName] = path.join(scopedDir, s);
                }
              }
            } catch {}
          } else {
            if (!map[inner]) {
              map[inner] = path.join(innerNm, inner);
            }
          }
        }
      } catch {}
    }
  } catch (e) {
    console.warn('[metro.config] Could not read pnpm store:', e.message);
  }
  return map;
};

const pnpmMap = buildPnpmMap();

// Helper: resolve a package — local node_modules first, then pnpm store map
const resolve = (pkg) => {
  const local = path.join(projectRoot, 'node_modules', pkg);
  if (fs.existsSync(local)) return local;
  if (pnpmMap[pkg]) return pnpmMap[pkg];
  return path.join(workspaceRoot, 'node_modules', pkg);
};

// Static overrides for packages that MUST come from a specific location
config.resolver.extraNodeModules = new Proxy(
  {
    // Workspace packages
    '@superapp/shared': path.join(workspaceRoot, 'shared'),

    // Always prefer mobile-local copies for core framework
    expo: resolve('expo'),
    'expo-router': resolve('expo-router'),
    react: resolve('react'),
    'react-dom': resolve('react-dom'),
    'react-native': resolve('react-native'),
    'react-native-web': resolve('react-native-web'),
    'react-native-safe-area-context': resolve('react-native-safe-area-context'),
    'react-native-screens': resolve('react-native-screens'),
    'react-native-svg': resolve('react-native-svg'),
    'react-native-gesture-handler': resolve('react-native-gesture-handler'),
    'react-native-reanimated': resolve('react-native-reanimated'),
    '@expo/metro-runtime': resolve('@expo/metro-runtime'),
    '@expo/vector-icons': resolve('@expo/vector-icons'),
    'expo-modules-core': resolve('expo-modules-core'),
    '@react-navigation/native': resolve('@react-navigation/native'),
    '@react-navigation/native-stack': resolve('@react-navigation/native-stack'),
    '@react-navigation/bottom-tabs': resolve('@react-navigation/bottom-tabs'),
    '@react-navigation/core': resolve('@react-navigation/core'),
    '@react-navigation/elements': resolve('@react-navigation/elements'),
    '@react-navigation/routers': resolve('@react-navigation/routers'),
  },
  {
    // Fallback: for ANY package not explicitly listed above, try pnpm store map
    get(target, name) {
      if (typeof name !== 'string') return undefined;
      if (name in target) return target[name];

      // Handle subpaths: "pkg/subpath" or "@scope/pkg/subpath"
      const parts = name.split('/');
      let pkgName = parts[0];
      if (pkgName.startsWith('@') && parts.length > 1) {
        pkgName = `${parts[0]}/${parts[1]}`;
      }

      const baseDir = target[pkgName] || pnpmMap[pkgName];
      if (baseDir) {
        // Return the resolved path for the subpath
        const suffix = name.substring(pkgName.length);
        return path.join(baseDir, suffix);
      }

      return undefined;
    },
  }
);

// Enable symlinks for pnpm workspace
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
