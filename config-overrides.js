const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

function webpackOverride(config, env) {
  // Add fallbacks for node core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "stream": require.resolve("stream-browserify"),
    "vm": require.resolve("vm-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "buffer": require.resolve("buffer/"),
    "util": require.resolve("util/"),
    "assert": require.resolve("assert/"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify/browser"),
    "url": require.resolve("url/")
  };

  // Add path alias support for @/ -> src/
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname, 'src')
  };

  // FORCE override PostCSS with TailwindCSS
  const oneOfRule = config.module.rules.find(rule => rule.oneOf);
  if (oneOfRule) {
    oneOfRule.oneOf.forEach(rule => {
      if (rule.use) {
        rule.use.forEach(loader => {
          if (loader.loader && loader.loader.includes('postcss-loader')) {
            loader.options = {
              postcssOptions: {
                plugins: [
                  require('tailwindcss'),
                  require('autoprefixer'),
                ],
              },
            };
          }
        });
      }
    });
  }

  // Add Bundle Analyzer plugin when ANALYZE env variable is set
  if (process.env.ANALYZE === 'true') {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'server',
        analyzerPort: 8888,
        openAnalyzer: true,
        generateStatsFile: true,
        statsFilename: 'bundle-stats.json'
      })
    );
  }

  return config;
}

function jestOverride(config) {
  try {
    if (Array.isArray(config.transformIgnorePatterns)) {
      // Allow transforming ESM packages used in tests
      config.transformIgnorePatterns = [
        'node_modules/(?!(axios|react-syntax-highlighter)/)'
      ];
    }
  } catch (e) {
    // no-op: keep default config if structure differs
  }
  return config;
}

module.exports = {
  webpack: webpackOverride,
  jest: jestOverride,
};
