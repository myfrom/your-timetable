module.exports = {
  importScripts: ['/sw-logic.js'],
  runtimeCaching: [{
    urlPattern: /^\/(?!__\/).*/,
    handler: 'fastest'
  }],
  navigateFallbackWhitelist: [
    /^\/(?!__\/).*/
  ]
};