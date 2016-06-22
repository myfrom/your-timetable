
module.exports = {
  staticFileGlobs: [
    '/index.html',
    '/manifest.json',
    '/bower_components/webcomponentsjs/webcomponents-lite.min.js',
    'https://www.gstatic.com/firebasejs/3.0.2/firebase.js', // Those two can be unnescesry
    'https://apis.google.com/js/platform.js' // Those two can be unnescesry
  ],
  navigateFallback: '/index.html'
};