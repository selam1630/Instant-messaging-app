const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      'react-native': require.resolve('react-native'),
    },
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native') {
        // For modules that import AsyncStorage from 'react-native',
        // we need to redirect it. But since we can't easily patch,
        // let's try a different approach.
        return context.resolveRequest(context, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
