onmessage = function() {
  // Import SDKs
  importScripts('../bower_components/pouchdb/dist/pouchdb.min.js');
  importScripts('https://www.gstatic.com/firebasejs/3.1.0/firebase.js');
  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyDaMune3u4WZMti3aB66FWjX9aA_lWTLkQ",
    authDomain: "your-timetable.firebaseapp.com",
    databaseURL: "https://your-timetable.firebaseio.com",
    storageBucket: "your-timetable.appspot.com",
  };
  firebase.initializeApp(config);
}