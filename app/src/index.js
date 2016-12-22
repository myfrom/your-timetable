// Google Analyitcs
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-74403254-2', 'auto');
ga('send', 'pageview');


// Dynamicly add link[rel="import"]
function importHref(href, isAsync = false) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'import';
    link.href = href;
    if (isAsync) link.setAttribute('async', '');
    link.onload = e => resolve();
    link.onerror = e => reject(new Error(`Error loading import: ${e.target.href}`));
    document.head.appendChild(link);
  });
}

// Do we need this?

// // Cookie reader
// // From http://stackoverflow.com/questions/5639346
// (function(){
//   let cookies;
//   function readCookie(name,c,C,i){
//     if (cookies){ return cookies[name]; }
//     c = document.cookie.split('; ');
//     cookies = {};
//     for(i=c.length-1; i>=0; i--){
//       C = c[i].split('=');
//       cookies[C[0]] = C[1];
//     }
//     return cookies[name];
//   }
//   window.readCookie = readCookie;
// })();

// // Chrome test
// // From http://stackoverflow.com/questions/4565112
// function isChrome() {
//   const isChromium = window.chrome,
//       winNav = window.navigator,
//       vendorName = winNav.vendor,
//       isOpera = winNav.userAgent.indexOf("OPR") > -1,
//       isIEedge = winNav.userAgent.indexOf("Edge") > -1,
//       isIOSChrome = winNav.userAgent.match("CriOS");
//   if (isIOSChrome){
//     return true
//   } else if (isChromium !== null && isChromium !== undefined && vendorName === "Google Inc." && isOpera == false && isIEedge == false) {
//     return true
//   } else { 
//     return false 
//   }
// }