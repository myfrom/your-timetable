// Import sw-precache
importScripts('service-worker.js');

// Set required functions
(() => {
  self.onmessage = e => {
  switch (e.data.cmd) {
    case 'setupPouch':
      importScripts('bower_components/pouchdb/dist/pouchdb.min.js');
      if (!e.data.uid) {
        e.ports[0].postMessage({ error: 'No uid provided!' });
        break;
      } 
      db = new PouchDB(e.data.uid);
      db.get('data').then(() => e.ports[0].postMessage(true), err => {
        if (err.status === 404)
          db.put({ _id: 'data' }).then(() => e.ports[0].postMessage(true));
      });
      break;
    
    case 'checkPouch':
      if (typeof db !== 'undefined') {
        db.get('data').then(() => e.ports[0].postMessage(true), err => e.ports[0].postMessage({ error: err.toString() }));
      } else {
        e.ports[0].postMessage({ error: true });
      }
      break;
      
    case 'readData':
      if (db) {
        db.get('data').then(data => e.ports[0].postMessage(data));
      } else {
        e.ports[0].postMessage({ error: 'Pouch is unavailable' });
      }
      break;
    
    case 'pushToPouch':
      pushToPouch(e);
      break;
      
    case 'deletePouch':
      if (db) {
        e.waitUntil(new Promise(r => {
          db.destroy().then(() => {
            db = undefined;
            e.ports[0].postMessage(true);
            r();
          }, err => {
            e.ports[0].postMessage({ error: err });
            r();
          });
        }));
      } else {
        e.ports[0].postMessage(true);
      }
      break;
      
    default:
      console.warn(`Unknown message sent to Service Worker - command: ${e.data.cmd}`, e);
    }
  };
})();

function pushToPouch(e) {
  const data = e.data.data;
  db.get('data').catch(err => {
    if (err.name === 'not_found') {
      return data;
    } else {
      throw err;
    }
  }).then(resp => {
    const output = resp;
    output.config = data.config;
    output.settings = data.settings;
    output.timetable = data.timetable;
    output.lastEdit = data.lastEdit;
    output.events = data.events;
    output._id = 'data';
    output._rev = resp._rev || undefined;
    return db.put(output).catch(err => {
      if (err.status === 409) {
        pushToPouch(e);
        console.log('Conflict when pushing to Pouch, retrying');
      } else {
        console.error('Error when pushing to Pouch', err);
        e.ports[0].postMessage({ error: 'Unknown error occured, check console for details' });
      }
    });
  });
}

// Import and use Firebase
/*importScripts('https://www.gstatic.com/firebasejs/3.6.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.6.1/firebase-auth.js');
importScripts('https://www.gstatic.com/firebasejs/3.6.1/firebase-database.js');*/