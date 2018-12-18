// Babel Polyfill
import '@babel/polyfill';

// Google Analytics
(() => {
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  /** @global */
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'UA-74403254-2');
})();


// Notifier options
(() => {
  window.NotifierOptions = {
    elementsImported: true
  }
})();


// Initiate AppState object
/** @global */
window.AppState = {
  readyCheck: {}
};


// Lazy load Web Components polyfill
import(/* webpackPrefetch: true */ '@webcomponents/webcomponentsjs/webcomponents-loader.js')
// And then the app shell
  .then(() => {
    import(/* webpackPrefetch: true */ '../elements/yta-shell.js')
      .then(() => {
        /** @global */
        window.appShell = document.createElement('yta-shell');
      });
    // And also icons
    import('../misc/ycons.js');
  });