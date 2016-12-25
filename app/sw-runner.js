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
      e.ports[0].postMessage(true);
      break;
    
    case 'checkPouch':
      if (typeof db !== 'undefined') {
        e.ports[0].postMessage(true);
      } else {
        e.ports[0].postMessage({ error: true });
      }
      break;
      
    case 'readData':
      if (db) {
        e.ports[0].postMessage(db.get('data'));
      } else {
        e.ports[0].postMessage({ error: 'Pouch is unavailable' });
      }
      break;
    
    case 'pushToPouch':
      const data = e.data.data;
      db.get('data').catch(err => {
        if (err.name === 'not_found') {
          return data;
        } else {
          throw err;
        }
      }).then(resp => {
        const output = resp;
        output._id = 'data';
        output._rev = resp._rev || undefined;
        db.put(output).then(() => e.ports[0].postMessage(true));
      }).catch(err => {
        console.error('Error when pushing to Pouch', err);
        e.ports[0].postMessage({ error: 'Unknown error occured, check console for details' });
      });
      break;
      
    case 'deletePouch':
      if (db) {
        e.waitUntil(new Promise(r => {
          db.destroy().then(() => {
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
    }
  };
})();

// Import and use Firebase
/*importScripts('https://www.gstatic.com/firebasejs/3.6.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.6.1/firebase-auth.js');
importScripts('https://www.gstatic.com/firebasejs/3.6.1/firebase-database.js');*/