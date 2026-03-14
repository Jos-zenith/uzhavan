const path = require('path');

const babelLoaderOptions = {
  presets: [require.resolve('babel-preset-react-app')],
  cacheDirectory: true,
  cacheCompression: false,
  compact: false,
};

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.alias = {
        ...(webpackConfig.resolve.alias || {}),
        'react-native$': 'react-native-web',
      };

      const oneOfRule = webpackConfig.module.rules.find((rule) =>
        Array.isArray(rule.oneOf)
      );

      if (oneOfRule) {
        // Insert both rules at the front of oneOf.
        // Order matters: the SQLiteModule-specific rule must come BEFORE the
        // general expo-sqlite rule so it wins the oneOf match for that file.
        oneOfRule.oneOf.unshift(
          // Rule 1 (most specific): patch SQLiteModule.ts to use import.meta.url
          // so webpack 5 automatically bundles the web worker instead of expecting
          // a pre-built file at /worker. Loaders run right-to-left:
          //   patchWorkerUrl (text replace) → babel-loader (TS → JS)
          {
            test: /SQLiteModule\.ts$/,
            include: path.resolve(__dirname, 'node_modules/expo-sqlite/web'),
            use: [
              { loader: require.resolve('babel-loader'), options: babelLoaderOptions },
              { loader: path.join(__dirname, 'scripts/patchWorkerUrl.js') },
            ],
          },
          // Rule 2: compile all other expo-sqlite / expo modules with babel
          {
            test: /\.(js|mjs|jsx|ts|tsx)$/,
            include: [
              path.resolve(__dirname, 'node_modules/expo-sqlite'),
              path.resolve(__dirname, 'node_modules/expo-modules-core'),
              path.resolve(__dirname, 'node_modules/expo'),
            ],
            use: {
              loader: require.resolve('babel-loader'),
              options: babelLoaderOptions,
            },
          }
        );
      }

      return webpackConfig;
    },
  },
};