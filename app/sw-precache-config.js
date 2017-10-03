module.exports = {
  importScripts: ['/sw-logic.js'],
  runtimeCaching: [{
    urlPattern: '/*',
    handler: 'fastest'
  }]
};