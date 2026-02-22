const path = require('path');

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
        oneOfRule.oneOf.unshift({
          test: /\.(js|mjs|jsx|ts|tsx)$/,
          include: [
            path.resolve(__dirname, 'node_modules/expo-sqlite'),
            path.resolve(__dirname, 'node_modules/expo-modules-core'),
            path.resolve(__dirname, 'node_modules/expo'),
          ],
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              presets: [require.resolve('babel-preset-react-app')],
              cacheDirectory: true,
              cacheCompression: false,
              compact: false,
            },
          },
        });
      }

      return webpackConfig;
    },
  },
};