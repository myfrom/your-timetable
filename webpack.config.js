const { resolve } = require('path'),
      cleanPlugin = require('clean-webpack-plugin'),
      htmlPlugin = require('html-webpack-plugin'),
      copyPlugin = require('copy-webpack-plugin'),
      injectCacheManifestPlugin = require('workbox-webpack-plugin').InjectManifest,
      progressPlugin = require('progress-bar-webpack-plugin');

function BabelOptions(dev) {
  const output = {
    presets: [
      ['@babel/preset-env', {
        useBuiltIns: 'entry',
        exclude: [ 'transform-classes' ]
      }]
    ],
    plugins: ['@babel/plugin-syntax-dynamic-import']
  };
  if (!dev) output.presets.push(['minify', { builtIns: false }]);
  return output;
}

module.exports = function(env) {

  const DEV = env && env.production ? false : true;

  return {
    mode: DEV ? 'development' : 'production',
    entry: {
      // App shell
      'js/index': resolve(__dirname, 'src/js/index.js'),
      // Lazy-loaded non-critical assets
      'elements/yta-add-dialog': resolve(__dirname, 'src/elements/yta-add-dialog.js'),
      'elements/yta-onboarding': resolve(__dirname, 'src/elements/yta-onboarding.js'),
      'elements/yta-setup-dialog': resolve(__dirname, 'src/elements/yta-setup-dialog.js'),
      'elements/yta-settings': resolve(__dirname, 'src/elements/yta-settings.js'),
      'elements/yta-about-page': resolve(__dirname, 'src/elements/yta-about-page.js'),
      'elements/yta-feedback-page': resolve(__dirname, 'src/elements/yta-feedback-dialog.js'),
      // Main pages
      'elements/yta-timetable-page': resolve(__dirname, 'src/elements/yta-timetable-page.js'),
      'elements/yta-search-page': resolve(__dirname, 'src/elements/yta-search-page.js'),
      'elements/yta-calendar-page': resolve(__dirname, 'src/elements/yta-calendar-page.js'),
      // Misc files that aren't directly imported
      'js/depr-setup-dialog-worker': resolve(__dirname, 'src/js/depr-setup-dialog-worker.js')

    },
    output: {
      path: resolve(__dirname, 'dist'),
      chunkFilename: 'src/[name]-[chunkhash].js',
      filename: 'src/[name].js'
    },
    devtool: DEV ? 'cheap-module-eval-source-map' : false,
    module: {
      rules: [
        { // For Polymer elements
          test: /\.el\.html$/,
          exclude: resolve(__dirname, 'node_modules'),
          use: [{
            loader: 'html-loader',
            options: {
              minimize: !DEV,
              attrs: [ ':data-wp-src' ]
            }
          }]
        },
        { // For the other HTML files
          test: /(?<!\.el)\.html$/,
          exclude: resolve(__dirname, 'node_modules'),
          use: [{
            loader: 'html-loader',
            options: {
              minimize: !DEV,
              attrs: [ 'link:href' ]
            }
          }]
        },
        {
          test: /\.js$/,
          exclude: resolve(__dirname, 'node-modules'),
          use: {
            loader: 'babel-loader',
            options: BabelOptions(DEV)
          }
        },
        {
          test: /\.css$/,
          use: [{
            loader: 'file-loader',
            options: {
              filename: '[path][name].css'
            }
          }, {
            loader: 'extract-loader'
          }, {
            loader: 'css-loader',
            options: {
              minimize: !DEV
            }
          }]
        },
        {
          test: /\.(gif|png|jpe?g|svg|ico)$/i,
          use: [{
            loader: 'file-loader',
            options: {
              filename: '[path]/[name].[ext]'
            }
          }, {
            loader: 'extract-loader'
          }
          /* , {
            loader: 'image-webpack-loader'
          } */]
        }
      ]
    },
    optimization: {
      splitChunks: {
        chunks: 'async',
        minSize: 30000,
        automaticNameDelimiter: '~',
        minChunks: 3,
        name: true,
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            chunks: 'all',
            reuseExistingChunk: true
          },
          utils: {
            test: /[\\/]src[\\/](js|misc)[\\/]/,
            chunks: 'all',
            reuseExistingChunk: true
          },
          default: {
            reuseExistingChunk: true,
            priority: -20
          }
        }
      }
    },
    plugins: [
      new progressPlugin(),
      new cleanPlugin(resolve(__dirname, 'dist')),
      new copyPlugin([
        './images/**/*.*',
        './src/locales/*.*',
        './favicon.ico',
        './manifest.json',
        './privacy-policy.html',
        './terms-and-conditions.html',
        './google0e69e72047fd937c.html', // Google site verification
        {
          from: './node_modules/web-animations-js/web-animations-next.min.js',
          to: './node_modules/web-animations-js/web-animations-next.min.js'
        },
        {
          from: './node_modules/dexie/dist/dexie.js',
          to: './node_modules/dexie/dist/dexie.js'
        },
        // TODO: This should be found by html-loader in index.html
        {
          from: './src/css/app-theme.css',
          to: './src/css/app-theme.css'
        }
      ]),
      new htmlPlugin({
        template: 'index.html',
        inject: 'body',
        // minify: !DEV,
        chunks: ['js/index']
      }),
      new injectCacheManifestPlugin({
        swSrc: resolve(__dirname, 'src/service-worker.js'),
        swDest: './service-worker.js',
        importWorkboxFrom: 'local',
        globDirectory: resolve(__dirname),
        globPatterns: [
          './images/**/*.*',
          './src/locales/*.*',
          './favicon.ico',
          './manifest.json',
          './privacy-policy.html',
          './terms-and-conditions.html',
          './node_modules/web-animations-js/web-animations-next.min.js',
          './node_modules/dexie/dist/dexie.js',
          './src/css/app-theme.css'
        ]
      })
    ],
    devServer: {
      contentBase: resolve(__dirname, 'dist')
    },
    optimization: {
      minimize: false
    }
  };
}